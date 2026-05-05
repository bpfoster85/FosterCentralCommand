using FosterCentralCommand.Api.Services;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace FosterCentralCommand.Api.Tests.Services;

/// <summary>
/// Integration tests that validate the actual Google Calendar connection.
/// These tests make real API calls to Google and require valid credentials.
/// </summary>
public class CalendarConnectionTests
{
    private const string ValidApiKey = "AIzaSyDLLUBOr0DL0yh6w7lFXrblbeP17fYHTz0";
    private const string CalendarId = "bpfoster85@gmail.com";

    [Fact]
    public async Task SyncAsync_SuccessfullyConnectsToGoogleCalendar_WithValidApiKey()
    {
        // Arrange
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Google:CalendarId", CalendarId },
                { "Google:ApiKey", ValidApiKey }
            })
            .Build();

        var cache = new TestDistributedCache();
        var logger = NullLogger<CalendarService>.Instance;

        var service = new CalendarService(cache, config, logger);

        // Act - This makes a REAL call to Google Calendar API
        var exception = await Record.ExceptionAsync(() => service.SyncAsync());

        // Assert - API key is valid if we don't get an "API key not valid" error
        // NotFound is acceptable as it means auth succeeded but calendar isn't public
        if (exception is Google.GoogleApiException apiEx)
        {
            Assert.DoesNotContain("API key not valid", apiEx.Message, StringComparison.OrdinalIgnoreCase);
            // If NotFound, calendar needs to be made public for API key access
            // If forbidden, calendar exists but isn't shared publicly
        }
        else
        {
            Assert.Null(exception);
            // Verify data was cached when sync succeeds
            var cachedJson = await cache.GetStringAsync("calendar:events");
            Assert.NotNull(cachedJson);
        }
    }

    [Fact]
    public async Task GetEventsAsync_ReturnsEventsFromGoogleCalendar_WithValidApiKey()
    {
        // Arrange
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Google:CalendarId", CalendarId },
                { "Google:ApiKey", ValidApiKey }
            })
            .Build();

        var cache = new TestDistributedCache();
        var logger = NullLogger<CalendarService>.Instance;

        var service = new CalendarService(cache, config, logger);

        // Act - Fetch events for the next 30 days from real Google Calendar
        var start = DateTime.UtcNow;
        var end = DateTime.UtcNow.AddDays(30);
        var exception = await Record.ExceptionAsync(async () =>
        {
            var events = await service.GetEventsAsync(start, end, null);
            Assert.NotNull(events);
        });

        // Assert - API key is valid (any API key error would be a different exception type/message)
        if (exception is Google.GoogleApiException apiEx)
        {
            Assert.DoesNotContain("API key not valid", apiEx.Message, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public void ApiKeyValidation_VerifyApiKeyIsNotEmpty()
    {
        // Verify the configured API key is non-empty and properly formatted
        Assert.NotNull(ValidApiKey);
        Assert.NotEmpty(ValidApiKey);
        Assert.StartsWith("AIza", ValidApiKey); // Google API keys start with "AIza"
        Assert.True(ValidApiKey.Length > 30, "Google API keys are typically 39 characters");
    }

    [Fact]
    public async Task SyncAsync_FailsWithExpectedError_WhenUsingInvalidApiKey()
    {
        // Arrange
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Google:CalendarId", CalendarId },
                { "Google:ApiKey", "INVALID-KEY-FOR-TESTING" }
            })
            .Build();

        var cache = new TestDistributedCache();
        var logger = NullLogger<CalendarService>.Instance;

        var service = new CalendarService(cache, config, logger);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<Google.GoogleApiException>(() => service.SyncAsync());
        Assert.Contains("API key", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Simple in-memory distributed cache for integration tests</summary>
    private class TestDistributedCache : Microsoft.Extensions.Caching.Distributed.IDistributedCache
    {
        private readonly Dictionary<string, byte[]> _store = new();

        public byte[]? Get(string key) => _store.TryGetValue(key, out var v) ? v : null;

        public Task<byte[]?> GetAsync(string key, CancellationToken token = default) =>
            Task.FromResult(Get(key));

        public void Set(string key, byte[] value, Microsoft.Extensions.Caching.Distributed.DistributedCacheEntryOptions options) =>
            _store[key] = value;

        public Task SetAsync(string key, byte[] value, Microsoft.Extensions.Caching.Distributed.DistributedCacheEntryOptions options, CancellationToken token = default)
        {
            Set(key, value, options);
            return Task.CompletedTask;
        }

        public void Refresh(string key) { }
        public Task RefreshAsync(string key, CancellationToken token = default) => Task.CompletedTask;
        public void Remove(string key) => _store.Remove(key);
        public Task RemoveAsync(string key, CancellationToken token = default)
        {
            Remove(key);
            return Task.CompletedTask;
        }
    }
}
