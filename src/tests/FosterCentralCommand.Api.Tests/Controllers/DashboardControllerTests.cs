using FosterCentralCommand.Api.Controllers;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories;
using FosterCentralCommand.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FosterCentralCommand.Api.Tests.Controllers;

public class DashboardControllerTests
{
    [Fact]
    public void GetDadsSwearJar_ReturnsCurrentCount()
    {
        var family = new Family { DadsSwearJarCount = 7 };
        var controller = new DashboardController(new FakeFamilyRepository(), new FamilyContext { Current = family });

        var result = controller.GetDadsSwearJar();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<DadsSwearJarDto>(ok.Value);
        Assert.Equal(7, dto.Count);
    }

    [Fact]
    public async Task AddToDadsSwearJar_IncrementsAndPersists()
    {
        var family = new Family { Id = Guid.NewGuid().ToString(), DadsSwearJarCount = 2 };
        var repo = new FakeFamilyRepository { Current = family };
        var controller = new DashboardController(repo, new FamilyContext { Current = family });

        var result = await controller.AddToDadsSwearJar();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<DadsSwearJarDto>(ok.Value);
        Assert.Equal(3, dto.Count);
        Assert.True(repo.UpdateCalled);
    }

    [Fact]
    public void GetChecklist_WithNoConfiguredItem_ReturnsNullItem()
    {
        var family = new Family();
        var controller = new DashboardController(new FakeFamilyRepository(), new FamilyContext { Current = family });

        var result = controller.GetChecklist();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<DashboardChecklistDto>(ok.Value);
        Assert.Null(dto.Item);
    }

    [Fact]
    public async Task SetChecklistItem_CreatesAndPersistsSingleItem()
    {
        var family = new Family { Id = Guid.NewGuid().ToString() };
        var repo = new FakeFamilyRepository { Current = family };
        var controller = new DashboardController(repo, new FamilyContext { Current = family });

        var result = await controller.SetChecklistItem(new SetDashboardChecklistItemRequest("Water plants", "pi pi-leaf"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<DashboardChecklistDto>(ok.Value);
        Assert.NotNull(dto.Item);
        Assert.Equal("Water plants", dto.Item!.Title);
        Assert.Equal("pi pi-leaf", dto.Item.Logo);
        Assert.Single(family.ChecklistItems);
        Assert.True(repo.UpdateCalled);
    }

    [Fact]
    public async Task SetChecklistItem_PreservesIdAndCompletionsWhenUpdatingExisting()
    {
        var family = new Family { Id = Guid.NewGuid().ToString() };
        family.ChecklistItems.Add(new ChecklistItemDefinition { Title = "Old", Logo = "pi pi-home" });
        var existingId = family.ChecklistItems[0].Id;
        family.ChecklistCompletions.Add(new ChecklistItemCompletion { ItemId = existingId, DateKey = "2026-06-10", CompletedAtUtc = DateTime.UtcNow });
        var repo = new FakeFamilyRepository { Current = family };
        var controller = new DashboardController(repo, new FamilyContext { Current = family });

        var result = await controller.SetChecklistItem(new SetDashboardChecklistItemRequest("New title", "pi pi-leaf"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<DashboardChecklistDto>(ok.Value);
        Assert.Equal(existingId, dto.Item!.Id);
        Assert.Single(family.ChecklistItems);
        Assert.Single(family.ChecklistCompletions);
    }

    [Fact]
    public async Task ClearChecklistItem_RemovesItemAndCompletions()
    {
        var family = new Family { Id = Guid.NewGuid().ToString() };
        family.ChecklistItems.Add(new ChecklistItemDefinition { Title = "X", Logo = "pi pi-home" });
        family.ChecklistCompletions.Add(new ChecklistItemCompletion { ItemId = family.ChecklistItems[0].Id, DateKey = "2026-06-10" });
        var repo = new FakeFamilyRepository { Current = family };
        var controller = new DashboardController(repo, new FamilyContext { Current = family });

        var result = await controller.ClearChecklistItem();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<DashboardChecklistDto>(ok.Value);
        Assert.Null(dto.Item);
        Assert.Empty(family.ChecklistItems);
        Assert.Empty(family.ChecklistCompletions);
    }

    [Fact]
    public async Task ToggleChecklistItem_AddsAndRemovesCompletion()
    {
        var family = new Family { Id = Guid.NewGuid().ToString() };
        family.ChecklistItems.Add(new ChecklistItemDefinition { Title = "Water plants", Logo = "pi pi-leaf" });
        var item = family.ChecklistItems[0];
        var repo = new FakeFamilyRepository { Current = family };
        var controller = new DashboardController(repo, new FamilyContext { Current = family });

        var addResult = await controller.ToggleChecklistItem(new ToggleDashboardChecklistItemRequest("2026-06-10"));
        var addOk = Assert.IsType<OkObjectResult>(addResult.Result);
        var addDto = Assert.IsType<DashboardChecklistDto>(addOk.Value);
        Assert.NotNull(addDto.Item);
        Assert.Equal(item.Id, addDto.Item!.Id);
        Assert.True(addDto.Item.CheckedToday);
        Assert.True(repo.UpdateCalled);

        var removeResult = await controller.ToggleChecklistItem(new ToggleDashboardChecklistItemRequest("2026-06-10"));
        var removeOk = Assert.IsType<OkObjectResult>(removeResult.Result);
        var removeDto = Assert.IsType<DashboardChecklistDto>(removeOk.Value);
        Assert.False(removeDto.Item!.CheckedToday);
    }

    [Fact]
    public async Task ToggleChecklistItem_WithoutConfiguredItem_ReturnsNotFound()
    {
        var family = new Family { Id = Guid.NewGuid().ToString() };
        var repo = new FakeFamilyRepository { Current = family };
        var controller = new DashboardController(repo, new FamilyContext { Current = family });

        var result = await controller.ToggleChecklistItem(new ToggleDashboardChecklistItemRequest("2026-06-10"));

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    private sealed class FakeFamilyRepository : IFamilyRepository
    {
        public Family? Current { get; set; }
        public bool UpdateCalled { get; private set; }

        public Task<IEnumerable<Family>> GetAllAsync() =>
            Task.FromResult(Enumerable.Empty<Family>());

        public Task<Family?> GetByIdAsync(string id) =>
            Task.FromResult(Current?.Id == id ? Current : null);

        public Task<Family?> GetByNameAsync(string name) =>
            Task.FromResult<Family?>(null);

        public Task<Family> CreateAsync(Family family) =>
            Task.FromResult(family);

        public Task<Family> UpdateAsync(Family family)
        {
            UpdateCalled = true;
            Current = family;
            return Task.FromResult(family);
        }

        public Task DeleteAsync(string id) => Task.CompletedTask;
    }
}
