using FosterCentralCommand.Api.Controllers;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace FosterCentralCommand.Api.Tests.Controllers;

public class ListsControllerTests
{
    [Fact]
    public async Task ToggleFavorite_ReturnsNotFound_WhenListMissing()
    {
        var repo = new FakeShoppingListRepository();
        var controller = new ListsController(repo);

        var result = await controller.ToggleFavorite(Guid.NewGuid());

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task ToggleFavorite_FlipsFlag_AndPersists()
    {
        var listId = Guid.NewGuid();
        var list = new ShoppingList
        {
            Id = listId.ToString(),
            Title = "Groceries",
            CreatedByProfileId = Guid.NewGuid().ToString(),
            IsFavorite = false
        };

        var repo = new FakeShoppingListRepository { CurrentList = list };
        var controller = new ListsController(repo);

        var result = await controller.ToggleFavorite(listId);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<ShoppingListDto>(ok.Value);
        Assert.True(dto.IsFavorite);
        Assert.True(repo.UpdateCalled);
    }

    [Fact]
    public async Task CreateItem_AddsItemToList_AndReturnsCreated()
    {
        var listId = Guid.NewGuid();
        var creatorId = Guid.NewGuid();
        var attendeeId = Guid.NewGuid();

        var list = new ShoppingList
        {
            Id = listId.ToString(),
            Title = "Weekend",
            CreatedByProfileId = creatorId.ToString()
        };

        var repo = new FakeShoppingListRepository { CurrentList = list };
        var controller = new ListsController(repo);

        var request = new CreateListItemRequest(
            Title: "Buy milk",
            Description: "2 gallons",
            IsChecked: false,
            StartDate: null,
            EndDate: null,
            AttendeeProfileIds: new List<Guid> { attendeeId },
            CreatedByProfileId: creatorId
        );

        var result = await controller.CreateItem(listId, request);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<ListItemDto>(created.Value);
        Assert.Equal("Buy milk", dto.Title);
        Assert.Single(list.Items);
        Assert.True(repo.UpdateCalled);
    }

    private sealed class FakeShoppingListRepository : IShoppingListRepository
    {
        public ShoppingList? CurrentList { get; set; }
        public bool UpdateCalled { get; private set; }

        public Task<ShoppingList> CreateAsync(ShoppingList list)
            => Task.FromResult(list);

        public Task DeleteAsync(string id)
            => Task.CompletedTask;

        public Task<IEnumerable<ShoppingList>> GetAllAsync()
            => Task.FromResult(Enumerable.Empty<ShoppingList>());

        public Task<ShoppingList?> GetByIdAsync(string id)
            => Task.FromResult(CurrentList?.Id == id ? CurrentList : null);

        public Task<ShoppingList> UpdateAsync(ShoppingList list)
        {
            UpdateCalled = true;
            CurrentList = list;
            return Task.FromResult(list);
        }
    }
}
