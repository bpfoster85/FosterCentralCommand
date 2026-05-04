using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FosterCentralCommand.Api.Data;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;

namespace FosterCentralCommand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ListsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ShoppingListDto>>> GetAll()
    {
        var lists = await db.ShoppingLists
            .Include(l => l.Items)
            .OrderBy(l => l.Title)
            .ToListAsync();

        return Ok(lists.Select(MapToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ShoppingListDto>> GetById(Guid id)
    {
        var list = await db.ShoppingLists
            .Include(l => l.Items)
            .FirstOrDefaultAsync(l => l.Id == id);
        return list == null ? NotFound() : Ok(MapToDto(list));
    }

    [HttpPost]
    public async Task<ActionResult<ShoppingListDto>> Create([FromBody] CreateListRequest request)
    {
        var list = new ShoppingList
        {
            Title = request.Title,
            Description = request.Description,
            IsFavorite = request.IsFavorite,
            CreatedByProfileId = request.CreatedByProfileId
        };
        db.ShoppingLists.Add(list);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = list.Id }, MapToDto(list));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ShoppingListDto>> Update(Guid id, [FromBody] UpdateListRequest request)
    {
        var list = await db.ShoppingLists.Include(l => l.Items).FirstOrDefaultAsync(l => l.Id == id);
        if (list == null) return NotFound();

        if (request.Title != null) list.Title = request.Title;
        if (request.Description != null) list.Description = request.Description;
        if (request.IsFavorite.HasValue) list.IsFavorite = request.IsFavorite.Value;
        list.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(MapToDto(list));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var list = await db.ShoppingLists.FindAsync(id);
        if (list == null) return NotFound();
        db.ShoppingLists.Remove(list);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}/favorite")]
    public async Task<ActionResult<ShoppingListDto>> ToggleFavorite(Guid id)
    {
        var list = await db.ShoppingLists.Include(l => l.Items).FirstOrDefaultAsync(l => l.Id == id);
        if (list == null) return NotFound();
        list.IsFavorite = !list.IsFavorite;
        list.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(MapToDto(list));
    }

    // --- List Items ---

    [HttpGet("{listId:guid}/items")]
    public async Task<ActionResult<IEnumerable<ListItemDto>>> GetItems(Guid listId)
    {
        var items = await db.ListItems
            .Include(i => i.Attendees)
            .Where(i => i.ListId == listId)
            .OrderBy(i => i.CreatedAt)
            .ToListAsync();
        return Ok(items.Select(MapItemToDto));
    }

    [HttpPost("{listId:guid}/items")]
    public async Task<ActionResult<ListItemDto>> CreateItem(Guid listId, [FromBody] CreateListItemRequest request)
    {
        var list = await db.ShoppingLists.FindAsync(listId);
        if (list == null) return NotFound();

        var item = new ListItem
        {
            ListId = listId,
            Title = request.Title,
            Description = request.Description,
            IsChecked = request.IsChecked,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            CreatedByProfileId = request.CreatedByProfileId
        };

        db.ListItems.Add(item);
        await db.SaveChangesAsync();

        if (request.AttendeeProfileIds != null)
        {
            foreach (var profileId in request.AttendeeProfileIds)
            {
                db.ListItemAttendees.Add(new ListItemAttendee { ListItemId = item.Id, ProfileId = profileId });
            }
            await db.SaveChangesAsync();
        }

        var itemWithAttendees = await db.ListItems
            .Include(i => i.Attendees)
            .FirstAsync(i => i.Id == item.Id);

        return CreatedAtAction(nameof(GetItems), new { listId }, MapItemToDto(itemWithAttendees));
    }

    [HttpPut("{listId:guid}/items/{itemId:guid}")]
    public async Task<ActionResult<ListItemDto>> UpdateItem(Guid listId, Guid itemId, [FromBody] UpdateListItemRequest request)
    {
        var item = await db.ListItems
            .Include(i => i.Attendees)
            .FirstOrDefaultAsync(i => i.Id == itemId && i.ListId == listId);
        if (item == null) return NotFound();

        if (request.Title != null) item.Title = request.Title;
        if (request.Description != null) item.Description = request.Description;
        if (request.IsChecked.HasValue) item.IsChecked = request.IsChecked.Value;
        if (request.StartDate.HasValue) item.StartDate = request.StartDate;
        if (request.EndDate.HasValue) item.EndDate = request.EndDate;
        item.UpdatedAt = DateTime.UtcNow;

        if (request.AttendeeProfileIds != null)
        {
            db.ListItemAttendees.RemoveRange(item.Attendees);
            foreach (var profileId in request.AttendeeProfileIds)
            {
                db.ListItemAttendees.Add(new ListItemAttendee { ListItemId = item.Id, ProfileId = profileId });
            }
        }

        await db.SaveChangesAsync();
        return Ok(MapItemToDto(item));
    }

    [HttpDelete("{listId:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> DeleteItem(Guid listId, Guid itemId)
    {
        var item = await db.ListItems.FirstOrDefaultAsync(i => i.Id == itemId && i.ListId == listId);
        if (item == null) return NotFound();
        db.ListItems.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{listId:guid}/items/{itemId:guid}/toggle")]
    public async Task<ActionResult<ListItemDto>> ToggleItem(Guid listId, Guid itemId)
    {
        var item = await db.ListItems
            .Include(i => i.Attendees)
            .FirstOrDefaultAsync(i => i.Id == itemId && i.ListId == listId);
        if (item == null) return NotFound();
        item.IsChecked = !item.IsChecked;
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(MapItemToDto(item));
    }

    private static ShoppingListDto MapToDto(ShoppingList l) => new(
        l.Id, l.Title, l.Description, l.IsFavorite, l.CreatedByProfileId,
        l.CreatedAt, l.UpdatedAt,
        l.Items?.Count ?? 0,
        l.Items?.Count(i => i.IsChecked) ?? 0
    );

    private static ListItemDto MapItemToDto(ListItem i) => new(
        i.Id, i.ListId, i.Title, i.Description, i.IsChecked,
        i.StartDate, i.EndDate,
        i.Attendees?.Select(a => a.ProfileId).ToList() ?? [],
        i.CreatedByProfileId, i.CreatedAt, i.UpdatedAt
    );
}
