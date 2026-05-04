using Microsoft.Azure.Cosmos;
using FosterCentralCommand.Api.Repositories;
using FosterCentralCommand.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

// Redis Cache
var redisConnectionString = builder.Configuration.GetConnectionString("Redis")
    ?? "localhost:6379";
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = redisConnectionString;
    options.InstanceName = "FCC:";
});

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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.MapControllers();

app.Run();
