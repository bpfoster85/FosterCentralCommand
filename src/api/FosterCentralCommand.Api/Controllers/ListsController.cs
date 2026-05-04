using Microsoft.AspNetCore.Mvc;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories;

namespace FosterCentralCommand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ListsController(IShoppingListRepository listRepo) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ShoppingListDto>>> GetAll()
    {
        var lists = await listRepo.GetAllAsync();
        return Ok(lists.Select(MapToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ShoppingListDto>> GetById(Guid id)
    {
        var list = await listRepo.GetByIdAsync(id.ToString());
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
            CreatedByProfileId = request.CreatedByProfileId.ToString()
        };
        var created = await listRepo.CreateAsync(list);
        return CreatedAtAction(nameof(GetById), new { id = Guid.Parse(created.Id) }, MapToDto(created));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ShoppingListDto>> Update(Guid id, [FromBody] UpdateListRequest request)
    {
        var list = await listRepo.GetByIdAsync(id.ToString());
        if (list == null) return NotFound();

        if (request.Title != null) list.Title = request.Title;
        if (request.Description != null) list.Description = request.Description;
        if (request.IsFavorite.HasValue) list.IsFavorite = request.IsFavorite.Value;
        list.UpdatedAt = DateTime.UtcNow;

        var updated = await listRepo.UpdateAsync(list);
        return Ok(MapToDto(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var list = await listRepo.GetByIdAsync(id.ToString());
        if (list == null) return NotFound();
        await listRepo.DeleteAsync(id.ToString());
        return NoContent();
    }

    [HttpPatch("{id:guid}/favorite")]
    public async Task<ActionResult<ShoppingListDto>> ToggleFavorite(Guid id)
    {
        var list = await listRepo.GetByIdAsync(id.ToString());
        if (list == null) return NotFound();
        list.IsFavorite = !list.IsFavorite;
        list.UpdatedAt = DateTime.UtcNow;
        var updated = await listRepo.UpdateAsync(list);
        return Ok(MapToDto(updated));
    }

    // --- List Items ---

    [HttpGet("{listId:guid}/items")]
    public async Task<ActionResult<IEnumerable<ListItemDto>>> GetItems(Guid listId)
    {
        var list = await listRepo.GetByIdAsync(listId.ToString());
        if (list == null) return NotFound();
        return Ok(list.Items.OrderBy(i => i.CreatedAt).Select(MapItemToDto));
    }

    [HttpPost("{listId:guid}/items")]
    public async Task<ActionResult<ListItemDto>> CreateItem(Guid listId, [FromBody] CreateListItemRequest request)
    {
        var list = await listRepo.GetByIdAsync(listId.ToString());
        if (list == null) return NotFound();

        var item = new ListItem
        {
            ListId = listId.ToString(),
            Title = request.Title,
            Description = request.Description,
            IsChecked = request.IsChecked,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            CreatedByProfileId = request.CreatedByProfileId.ToString(),
            AttendeeProfileIds = request.AttendeeProfileIds?.Select(g => g.ToString()).ToList() ?? []
        };

        list.Items.Add(item);
        list.UpdatedAt = DateTime.UtcNow;
        await listRepo.UpdateAsync(list);

        return CreatedAtAction(nameof(GetItems), new { listId }, MapItemToDto(item));
    }

    [HttpPut("{listId:guid}/items/{itemId:guid}")]
    public async Task<ActionResult<ListItemDto>> UpdateItem(Guid listId, Guid itemId, [FromBody] UpdateListItemRequest request)
    {
        var list = await listRepo.GetByIdAsync(listId.ToString());
        if (list == null) return NotFound();

        var item = list.Items.FirstOrDefault(i => i.Id == itemId.ToString());
        if (item == null) return NotFound();

        if (request.Title != null) item.Title = request.Title;
        if (request.Description != null) item.Description = request.Description;
        if (request.IsChecked.HasValue) item.IsChecked = request.IsChecked.Value;
        if (request.StartDate.HasValue) item.StartDate = request.StartDate;
        if (request.EndDate.HasValue) item.EndDate = request.EndDate;
        if (request.AttendeeProfileIds != null)
            item.AttendeeProfileIds = request.AttendeeProfileIds.Select(g => g.ToString()).ToList();
        item.UpdatedAt = DateTime.UtcNow;

        list.UpdatedAt = DateTime.UtcNow;
        await listRepo.UpdateAsync(list);

        return Ok(MapItemToDto(item));
    }

    [HttpDelete("{listId:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> DeleteItem(Guid listId, Guid itemId)
    {
        var list = await listRepo.GetByIdAsync(listId.ToString());
        if (list == null) return NotFound();

        var item = list.Items.FirstOrDefault(i => i.Id == itemId.ToString());
        if (item == null) return NotFound();

        list.Items.Remove(item);
        list.UpdatedAt = DateTime.UtcNow;
        await listRepo.UpdateAsync(list);

        return NoContent();
    }

    [HttpPatch("{listId:guid}/items/{itemId:guid}/toggle")]
    public async Task<ActionResult<ListItemDto>> ToggleItem(Guid listId, Guid itemId)
    {
        var list = await listRepo.GetByIdAsync(listId.ToString());
        if (list == null) return NotFound();

        var item = list.Items.FirstOrDefault(i => i.Id == itemId.ToString());
        if (item == null) return NotFound();

        item.IsChecked = !item.IsChecked;
        item.UpdatedAt = DateTime.UtcNow;
        list.UpdatedAt = DateTime.UtcNow;
        await listRepo.UpdateAsync(list);

        return Ok(MapItemToDto(item));
    }

    private static ShoppingListDto MapToDto(ShoppingList l) => new(
        Guid.TryParse(l.Id, out var lid) ? lid : Guid.Empty,
        l.Title, l.Description, l.IsFavorite,
        Guid.TryParse(l.CreatedByProfileId, out var cbpid) ? cbpid : Guid.Empty,
        l.CreatedAt, l.UpdatedAt,
        l.Items.Count,
        l.Items.Count(i => i.IsChecked)
    );

    private static ListItemDto MapItemToDto(ListItem i) => new(
        Guid.TryParse(i.Id, out var iid) ? iid : Guid.Empty,
        Guid.TryParse(i.ListId, out var ilid) ? ilid : Guid.Empty,
        i.Title,
        i.Description,
        i.IsChecked,
        i.StartDate,
        i.EndDate,
        i.AttendeeProfileIds
            .Select(a => Guid.TryParse(a, out var ag) ? ag : Guid.Empty)
            .Where(g => g != Guid.Empty)
            .ToList(),
        Guid.TryParse(i.CreatedByProfileId, out var icbpid) ? icbpid : Guid.Empty,
        i.CreatedAt,
        i.UpdatedAt
    );
}
