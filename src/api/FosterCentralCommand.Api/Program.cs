using Microsoft.Azure.Cosmos;
using System.Text.Json.Serialization;
using FosterCentralCommand.Api.Repositories;
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

// CORS for React dev server
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins("http://localhost:5173", "http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
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
}

app.UseCors();
app.MapControllers();

app.Run();
