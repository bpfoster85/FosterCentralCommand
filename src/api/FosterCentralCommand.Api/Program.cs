using Microsoft.Azure.Cosmos;
using System.Text.Json.Serialization;
using FosterCentralCommand.Api.Middleware;
using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories;
using FosterCentralCommand.Api.Repositories.Caching;
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
// Cosmos repositories. Each per-family repo is registered as the concrete
// CosmosXxxRepository, then exposed via its interface through a caching
// decorator (CachedXxxRepository) so controllers and services transparently
// hit IDistributedCache before falling back to Cosmos. Writes invalidate
// the family's slice. The family repo itself is not cached — auth lookups
// stay direct.
builder.Services.AddScoped<CosmosProfileRepository>();
builder.Services.AddScoped<CosmosShoppingListRepository>();
builder.Services.AddScoped<CosmosGoalRepository>();
builder.Services.AddScoped<CosmosChoreRepository>();

builder.Services.AddScoped<IProfileRepository>(sp => new CachedProfileRepository(
    sp.GetRequiredService<CosmosProfileRepository>(),
    sp.GetRequiredService<FamilyCache>(),
    sp.GetRequiredService<FamilyContext>()));
builder.Services.AddScoped<IShoppingListRepository>(sp => new CachedShoppingListRepository(
    sp.GetRequiredService<CosmosShoppingListRepository>(),
    sp.GetRequiredService<FamilyCache>(),
    sp.GetRequiredService<FamilyContext>()));
builder.Services.AddScoped<IGoalRepository>(sp => new CachedGoalRepository(
    sp.GetRequiredService<CosmosGoalRepository>(),
    sp.GetRequiredService<FamilyCache>(),
    sp.GetRequiredService<FamilyContext>()));
builder.Services.AddScoped<IChoreRepository>(sp => new CachedChoreRepository(
    sp.GetRequiredService<CosmosChoreRepository>(),
    sp.GetRequiredService<FamilyCache>(),
    sp.GetRequiredService<FamilyContext>()));

builder.Services.AddScoped<IFamilyRepository, CosmosFamilyRepository>();

// Per-request family context populated by FamilyContextMiddleware.
builder.Services.AddScoped<FamilyContext>();

// In-process distributed cache + per-family caching helper used by the
// repository decorators above.
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSingleton<FamilyCache>();

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

    // Backfill FamilyId on legacy per-family resources (chores, profiles,
    // goals, shopping lists) so the family-scoped repos can find them.
    // Records with a missing/empty FamilyId are assigned to the first family,
    // which preserves single-tenant deployments. Records that already have a
    // FamilyId are left untouched.
    var defaultFamilyId = existing
        .Concat((await familyRepo.GetAllAsync()).ToList())
        .Select(f => f.Id)
        .FirstOrDefault();
    if (!string.IsNullOrEmpty(defaultFamilyId))
    {
        var database = cosmosClient.GetDatabase(options.DatabaseName);

        await BackfillFamilyIdAsync<Chore>(database.GetContainer(options.ChoresContainer), defaultFamilyId, logger);
        await BackfillFamilyIdAsync<Profile>(database.GetContainer(options.ProfilesContainer), defaultFamilyId, logger);
        await BackfillFamilyIdAsync<Goal>(database.GetContainer(options.GoalsContainer), defaultFamilyId, logger);
        await BackfillFamilyIdAsync<ShoppingList>(database.GetContainer(options.ShoppingListsContainer), defaultFamilyId, logger);
    }
}

app.UseCors();
app.UseMiddleware<FamilyContextMiddleware>();
app.MapControllers();

app.Run();

// One-shot backfill: any item in <paramref name="container"/> with an empty
// FamilyId is rewritten to belong to <paramref name="defaultFamilyId"/>.
static async Task BackfillFamilyIdAsync<T>(Container container, string defaultFamilyId, ILogger logger)
    where T : class
{
    var query = new QueryDefinition(
        "SELECT * FROM c WHERE NOT IS_DEFINED(c.familyId) OR c.familyId = '' OR c.familyId = null");
    using var iterator = container.GetItemQueryIterator<dynamic>(query);

    var migrated = 0;
    while (iterator.HasMoreResults)
    {
        var page = await iterator.ReadNextAsync();
        foreach (var item in page)
        {
            string id = item.id;
            item.familyId = defaultFamilyId;
            await container.ReplaceItemAsync<dynamic>(item, id, new PartitionKey(id));
            migrated++;
        }
    }

    if (migrated > 0)
    {
        logger.LogInformation(
            "Backfilled FamilyId on {Count} {Container} record(s) → family {FamilyId}.",
            migrated, container.Id, defaultFamilyId);
    }
}
