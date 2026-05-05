using FosterCentralCommand.Api.Controllers;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FosterCentralCommand.Api.Tests.Controllers;

public class CalendarControllerTests
{
    [Fact]
    public async Task GetEvents_ReturnsOk_WithServicePayload()
    {
        var expected = new List<CalendarEventDto>
        {
            new(
                Id: "1",
                GoogleEventId: "g-1",
                Title: "Family Dinner",
                Start: DateTime.UtcNow,
                End: DateTime.UtcNow.AddHours(2),
                AllDay: false,
                Description: null,
                Location: "Home",
                AttendeeEmails: new List<string> { "a@example.com" },
                CalendarId: "cal",
                UpdatedAt: DateTime.UtcNow)
        };

        var service = new FakeCalendarService { Events = expected };
        var controller = new CalendarController(service);

        var result = await controller.GetEvents(null, null, new[] { "a@example.com" });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsAssignableFrom<IEnumerable<CalendarEventDto>>(ok.Value);
        Assert.Single(payload);
    }

    [Fact]
    public async Task Sync_ReturnsOkMessage_WhenServiceCompletes()
    {
        var service = new FakeCalendarService();
        var controller = new CalendarController(service);

        var result = await controller.Sync();

        Assert.IsType<OkObjectResult>(result);
        Assert.True(service.SyncCalled);
    }

    private sealed class FakeCalendarService : ICalendarService
    {
        public IEnumerable<CalendarEventDto> Events { get; set; } = Enumerable.Empty<CalendarEventDto>();
        public bool SyncCalled { get; private set; }

        public Task<IEnumerable<CalendarEventDto>> GetEventsAsync(DateTime? start, DateTime? end, IEnumerable<string>? profileEmails)
            => Task.FromResult(Events);

        public Task SyncAsync()
        {
            SyncCalled = true;
            return Task.CompletedTask;
        }
    }
}
