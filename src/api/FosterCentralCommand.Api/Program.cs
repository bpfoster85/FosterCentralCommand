using Microsoft.Azure.Cosmos;
using System.Text.Json.Serialization;
using FosterCentralCommand.Api.Middleware;
using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories;
using FosterCentralCommand.Api.Security;
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
    allowedOrigins = ["http://localhost:5173", "http://localhost:3000","https://www.fosterclan.net"];
}

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders(FamilyContextMiddleware.HeaderName);
    });
});

// CosmosDB
var cosmosOptions = builder.Configuration
    .GetSection(CosmosDbOptions.SectionName)
    .Get<CosmosDbOptions>() ?? new CosmosDbOptions();

builder.Services.AddSingleton(cosmosOptions);
builder.Services.AddSingleton(_ => new CosmosClient(
    cosmosOptions.AccountEndpoint,
    cosmosOptions.AccountKey,
    new CosmosClientOptions
    {
        SerializerOptions = new CosmosSerializationOptions
        {
            PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase
        }
    }));
builder.Services.AddScoped<IProfileRepository, CosmosProfileRepository>();
builder.Services.AddScoped<IShoppingListRepository, CosmosShoppingListRepository>();
builder.Services.AddScoped<IGoalRepository, CosmosGoalRepository>();
builder.Services.AddScoped<IChoreRepository, CosmosChoreRepository>();
builder.Services.AddScoped<IFamilyRepository, CosmosFamilyRepository>();

// Per-request family context populated by FamilyContextMiddleware.
builder.Services.AddScoped<FamilyContext>();

// In-process distributed cache
builder.Services.AddDistributedMemoryCache();

// Services
builder.Services.AddScoped<ICalendarService, CalendarService>();

var app = builder.Build();

// Initialize CosmosDB containers on startup
using (var scope = app.Services.CreateScope())
{
    var cosmosClient = scope.ServiceProvider.GetRequiredService<CosmosClient>();
    var options = scope.ServiceProvider.GetRequiredService<CosmosDbOptions>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await CosmosInitializer.InitializeAsync(cosmosClient, options, logger);

    // One-time migration: if no families exist yet but legacy Google config is
    // present, seed a "Default" family from it so existing deployments keep
    // working. The id is logged so the dev can plug it into the frontend.
    var familyRepo = scope.ServiceProvider.GetRequiredService<IFamilyRepository>();
    var existing = (await familyRepo.GetAllAsync()).ToList();
    if (existing.Count == 0)
    {
        var calId = builder.Configuration["Google:CalendarId"];
        var apiKey = builder.Configuration["Google:ApiKey"];
        var saPath = builder.Configuration["Google:ServiceAccountKeyPath"];
        string? saJson = null;
        if (!string.IsNullOrEmpty(saPath) && File.Exists(saPath))
        {
            saJson = await File.ReadAllTextAsync(saPath);
        }

        if (!string.IsNullOrEmpty(calId) || !string.IsNullOrEmpty(apiKey) || !string.IsNullOrEmpty(saJson))
        {
            // Bootstrap password — read from config (Bootstrap:DefaultFamilyPassword)
            // so the dev can override it via user-secrets. Falls back to a known
            // dev value and the family password can be rotated via PUT /api/families.
            var bootstrapPassword =
                builder.Configuration["Bootstrap:DefaultFamilyPassword"] ?? "fostercc";

            var seeded = await familyRepo.CreateAsync(new Family
            {
                Name = "Default",
                NameNormalized = "default",
                GoogleCalendarId = calId,
                GoogleApiKey = apiKey,
                GoogleServiceAccountJson = saJson,
                PasswordHash = PasswordHasher.Hash(bootstrapPassword),
            });
            logger.LogInformation(
                "Seeded default family {FamilyId}. Login with name=\"Default\" password=\"{Password}\".",
                seeded.Id, bootstrapPassword);
        }
        else
        {
            logger.LogInformation(
                "No families exist and no Google config available to seed one. Create a family via POST /api/families.");
        }
    }
    else
    {
        // Backfill NameNormalized / PasswordHash for families created before
        // login was added so existing families can still sign in.
        foreach (var f in existing)
        {
            var dirty = false;
            if (string.IsNullOrEmpty(f.NameNormalized) && !string.IsNullOrEmpty(f.Name))
            {
                f.NameNormalized = f.Name.Trim().ToLowerInvariant();
                dirty = true;
            }
            if (string.IsNullOrEmpty(f.PasswordHash))
            {
                var bootstrapPassword =
                    builder.Configuration["Bootstrap:DefaultFamilyPassword"] ?? "fostercc";
                f.PasswordHash = PasswordHasher.Hash(bootstrapPassword);
                dirty = true;
                logger.LogWarning(
                    "Family {FamilyId} ({Name}) had no password — seeded \"{Password}\". Rotate via PUT /api/families.",
                    f.Id, f.Name, bootstrapPassword);
            }
            if (dirty) await familyRepo.UpdateAsync(f);
        }
    }
}

app.UseCors();
app.UseMiddleware<FamilyContextMiddleware>();
app.MapControllers();

app.Run();
