using Microsoft.AspNetCore.Mvc;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Services;

namespace FosterCentralCommand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CalendarController(ICalendarService calendarService) : ControllerBase
{
    [HttpGet("events")]
    public async Task<ActionResult<IEnumerable<CalendarEventDto>>> GetEvents(
        [FromQuery] DateTime? start,
        [FromQuery] DateTime? end,
        [FromQuery] string[]? profileEmails)
    {
        var events = await calendarService.GetEventsAsync(start, end, profileEmails);
        return Ok(events);
    }

    [HttpPost("sync")]
    public async Task<IActionResult> Sync()
    {
        await calendarService.SyncAsync();
        return Ok(new { message = "Calendar synced successfully" });
    }

    [HttpPost("events")]
    public async Task<ActionResult<CalendarEventDto>> CreateEvent([FromBody] CreateCalendarEventDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Title is required." });
        if (dto.End < dto.Start)
            return BadRequest(new { message = "End must be after start." });

        try
        {
            var created = await calendarService.CreateEventAsync(dto);
            return CreatedAtAction(nameof(GetEvents), new { }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
