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
    Task<CalendarEventDto> CreateEventAsync(CreateCalendarEventDto dto);
}

public class CalendarService(
    IDistributedCache cache,
    FamilyContext familyContext,
    ILogger<CalendarService> logger) : ICalendarService
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    private Family Family => familyContext.Current
        ?? throw new InvalidOperationException("CalendarService requires a family in context.");

    /// <summary>Cache key namespaced by family so tenants do not see each other's events.</summary>
    private string CacheKey => $"calendar:events:{Family.Id}";

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

    public async Task<CalendarEventDto> CreateEventAsync(CreateCalendarEventDto dto)
    {
        var family = Family;
        if (string.IsNullOrEmpty(family.GoogleCalendarId))
            throw new InvalidOperationException("Google Calendar is not configured for this family (missing GoogleCalendarId).");

        // Insert requires write access — service account credential with Calendar scope.
        var initializer = BuildInitializer(family, readWrite: true)
            ?? throw new InvalidOperationException(
                "Google Calendar service account is not configured for this family. " +
                "Set GoogleServiceAccountJson on the family to enable event creation.");

        var service = new Google.Apis.Calendar.v3.CalendarService(initializer);

        var newEvent = new Event
        {
            Summary = dto.Title,
            Description = dto.Description,
            Location = dto.Location,
            Attendees = dto.AttendeeEmails?.Select(email => new EventAttendee { Email = email }).ToList(),
        };

        if (dto.AllDay)
        {
            // Google requires date-only (YYYY-MM-DD) for all-day events; end is exclusive.
            newEvent.Start = new EventDateTime { Date = dto.Start.ToString("yyyy-MM-dd") };
            newEvent.End = new EventDateTime { Date = dto.End.ToString("yyyy-MM-dd") };
        }
        else
        {
            newEvent.Start = new EventDateTime { DateTimeDateTimeOffset = new DateTimeOffset(dto.Start, TimeSpan.Zero) };
            newEvent.End = new EventDateTime { DateTimeDateTimeOffset = new DateTimeOffset(dto.End, TimeSpan.Zero) };
        }

        var created = await service.Events.Insert(newEvent, family.GoogleCalendarId).ExecuteAsync();
        logger.LogInformation("Created Google Calendar event {EventId} for family {FamilyId}", created.Id, family.Id);

        // Invalidate cache so the next read reflects the new event.
        await cache.RemoveAsync(CacheKey);

        return MapEvent(created);
    }

    public async Task SyncAsync()
    {
        try
        {
            var family = Family;
            if (string.IsNullOrEmpty(family.GoogleCalendarId))
            {
                logger.LogWarning("Family {FamilyId} has no GoogleCalendarId. Skipping sync.", family.Id);
                return;
            }

            var initializer = BuildInitializer(family, readWrite: false);
            if (initializer is null)
            {
                logger.LogWarning("Family {FamilyId} has no Google credentials configured. Skipping sync.", family.Id);
                return;
            }

            var service = new Google.Apis.Calendar.v3.CalendarService(initializer);

            var request = service.Events.List(family.GoogleCalendarId);
            // Sync a wide window so the UI can navigate freely without re-fetching
            // from Google: 2 weeks back through 2 months forward.
            request.TimeMinDateTimeOffset = DateTimeOffset.UtcNow.AddDays(-14);
            request.TimeMaxDateTimeOffset = DateTimeOffset.UtcNow.AddMonths(2);
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

            logger.LogInformation("Synced {Count} calendar events for family {FamilyId}", events.Count, family.Id);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to sync calendar for family {FamilyId}", familyContext.Current?.Id);
            throw;
        }
    }

    /// <summary>
    /// Builds a Google API initializer from the family's stored credentials.
    /// Prefers service-account JSON (required for write access). Falls back to
    /// API key for read-only public-calendar access. Returns null when nothing
    /// is configured.
    /// </summary>
    private BaseClientService.Initializer? BuildInitializer(Family family, bool readWrite)
    {
        if (!string.IsNullOrEmpty(family.GoogleServiceAccountJson))
        {
            logger.LogDebug("Family {FamilyId}: using service account auth (readWrite={ReadWrite})", family.Id, readWrite);
            var scope = readWrite
                ? Google.Apis.Calendar.v3.CalendarService.Scope.Calendar
                : Google.Apis.Calendar.v3.CalendarService.Scope.CalendarReadonly;
            var credential = GoogleCredential.FromJson(family.GoogleServiceAccountJson).CreateScoped(scope);

            return new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "FosterCentralCommand"
            };
        }

        if (!readWrite && !string.IsNullOrEmpty(family.GoogleApiKey))
        {
            logger.LogDebug("Family {FamilyId}: using API key auth (read-only)", family.Id);
            return new BaseClientService.Initializer
            {
                ApiKey = family.GoogleApiKey,
                ApplicationName = "FosterCentralCommand"
            };
        }

        return null;
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
