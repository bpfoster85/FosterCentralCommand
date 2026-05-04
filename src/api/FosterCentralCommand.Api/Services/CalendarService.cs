using System.Text.Json;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Microsoft.Extensions.Caching.Distributed;

namespace FosterCentralCommand.Api.Services;

public interface ICalendarService
{
    Task<IEnumerable<CalendarEventDto>> GetEventsAsync(DateTime? start, DateTime? end, IEnumerable<string>? profileEmails);
    Task SyncAsync();
}

public class CalendarService(
    IDistributedCache cache,
    IConfiguration configuration,
    ILogger<CalendarService> logger) : ICalendarService
{
    private const string CacheKey = "calendar:events";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public async Task<IEnumerable<CalendarEventDto>> GetEventsAsync(
        DateTime? start, DateTime? end, IEnumerable<string>? profileEmails)
    {
        var events = await GetCachedEventsAsync();

        if (start.HasValue)
            events = events.Where(e => e.End >= start.Value);
        if (end.HasValue)
            events = events.Where(e => e.Start <= end.Value);

        var emailList = profileEmails?.ToList();
        if (emailList != null && emailList.Count > 0)
            events = events.Where(e => e.AttendeeEmails.Any(a => emailList.Contains(a, StringComparer.OrdinalIgnoreCase)));

        return events;
    }

    public async Task SyncAsync()
    {
        try
        {
            var calendarId = configuration["Google:CalendarId"];
            var apiKey = configuration["Google:ApiKey"];

            if (string.IsNullOrEmpty(calendarId) || string.IsNullOrEmpty(apiKey))
            {
                logger.LogWarning("Google Calendar not configured. Skipping sync.");
                return;
            }

            var service = new Google.Apis.Calendar.v3.CalendarService(new BaseClientService.Initializer
            {
                ApiKey = apiKey,
                ApplicationName = "FosterCentralCommand"
            });

            var request = service.Events.List(calendarId);
            request.TimeMinDateTimeOffset = DateTimeOffset.UtcNow.AddMonths(-3);
            request.TimeMaxDateTimeOffset = DateTimeOffset.UtcNow.AddMonths(6);
            request.SingleEvents = true;
            request.OrderBy = EventsResource.ListRequest.OrderByEnum.StartTime;
            request.MaxResults = 500;

            var result = await request.ExecuteAsync();
            var events = result.Items?.Select(MapEvent).ToList() ?? [];

            var json = JsonSerializer.Serialize(events);
            await cache.SetStringAsync(CacheKey, json, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = CacheDuration
            });

            logger.LogInformation("Synced {Count} calendar events", events.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to sync calendar");
            throw;
        }
    }

    private async Task<IEnumerable<CalendarEventDto>> GetCachedEventsAsync()
    {
        var json = await cache.GetStringAsync(CacheKey);
        if (string.IsNullOrEmpty(json))
        {
            await SyncAsync();
            json = await cache.GetStringAsync(CacheKey) ?? "[]";
        }
        return JsonSerializer.Deserialize<List<CalendarEventDto>>(json) ?? [];
    }

    private static CalendarEventDto MapEvent(Event e)
    {
        var start = e.Start.DateTimeDateTimeOffset?.UtcDateTime ?? DateTime.Parse(e.Start.Date);
        var end = e.End.DateTimeDateTimeOffset?.UtcDateTime ?? DateTime.Parse(e.End.Date);
        var attendees = e.Attendees?.Select(a => a.Email).Where(x => x != null).Select(x => x!).ToList() ?? [];

        return new CalendarEventDto(
            Id: e.Id ?? Guid.NewGuid().ToString(),
            GoogleEventId: e.Id ?? string.Empty,
            Title: e.Summary ?? "(No Title)",
            Start: start,
            End: end,
            AllDay: e.Start.DateTimeDateTimeOffset == null,
            Description: e.Description,
            Location: e.Location,
            AttendeeEmails: attendees,
            CalendarId: e.Organizer?.Email ?? string.Empty,
            UpdatedAt: e.UpdatedDateTimeOffset?.UtcDateTime ?? DateTime.UtcNow
        );
    }
}
