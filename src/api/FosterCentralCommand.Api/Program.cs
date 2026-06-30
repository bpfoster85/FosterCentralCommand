using System.Text.Json.Serialization;
using FosterCentralCommand.Api.Middleware;
using FosterCentralCommand.Api.Repositories;
using FosterCentralCommand.Api.Repositories.Json;
using FosterCentralCommand.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        // Accept and emit enums as strings (e.g. "Weekly" instead of 2).
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();

// CORS — origins come from configuration ("Cors:AllowedOrigins" array or
// "Cors__AllowedOrigins__0" env vars). Falls back to local dev origins.
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>();

if (allowedOrigins is null || allowedOrigins.Length == 0)
{
    allowedOrigins = new[] { "http://localhost:5173", "http://localhost:3000", "https://www.fosterclan.net" };
}

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .SetIsOriginAllowedToAllowWildcardSubdomains()
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders(FamilyContextMiddleware.HeaderName);
    });
});

// JSON document store. The entire dataset lives in one JSON document that is
// loaded into memory on startup and rewritten on every mutation. A Storage
// connection string selects the durable Azure Blob backend; without one the
// app falls back to a local file so it runs with zero cloud dependencies.
var storeOptions = builder.Configuration
    .GetSection(JsonStoreOptions.SectionName)
    .Get<JsonStoreOptions>() ?? new JsonStoreOptions();

builder.Services.AddSingleton(storeOptions);
builder.Services.AddSingleton<IJsonStoreBackend>(_ => storeOptions.UsesAzureBlob
    ? new AzureBlobJsonStoreBackend(storeOptions)
    : new LocalFileJsonStoreBackend(storeOptions));
builder.Services.AddSingleton<JsonDataStore>();

// Repositories — each reads/writes the in-memory document. Per-family repos are
// scoped because they depend on the request-scoped FamilyContext; the family
// directory itself is global (used by login).
builder.Services.AddScoped<IProfileRepository, JsonProfileRepository>();
builder.Services.AddScoped<IShoppingListRepository, JsonShoppingListRepository>();
builder.Services.AddScoped<IGoalRepository, JsonGoalRepository>();
builder.Services.AddScoped<IChoreRepository, JsonChoreRepository>();
builder.Services.AddScoped<IStarLedgerRepository, JsonStarLedgerRepository>();
builder.Services.AddScoped<IFamilyRepository, JsonFamilyRepository>();

// Per-request family context populated by FamilyContextMiddleware.
builder.Services.AddScoped<FamilyContext>();

// In-process cache used by CalendarService for Google Calendar event caching.
builder.Services.AddDistributedMemoryCache();

// Services
builder.Services.AddScoped<ICalendarService, CalendarService>();

var app = builder.Build();

// Load the document into memory and run idempotent startup maintenance
// (seed default family, backfill legacy records, seed default chores).
var store = app.Services.GetRequiredService<JsonDataStore>();
await store.InitializeAsync();
await JsonDataSeeder.RunAsync(store, app.Configuration, app.Services.GetRequiredService<ILogger<Program>>());

app.UseCors();
app.UseMiddleware<FamilyContextMiddleware>();
app.MapControllers();

app.Run();
