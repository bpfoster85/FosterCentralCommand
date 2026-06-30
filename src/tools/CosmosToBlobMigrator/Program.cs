using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories.Json;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;

// One-time migration: read every Cosmos container into the single JSON data
// document and write it to the new store (Azure Blob in prod, local file in dev).
//
// Configure via env vars, appsettings.json, or --Key=Value args. Examples:
//   CosmosDb__AccountEndpoint, CosmosDb__AccountKey
//   BlobStore__ConnectionString  (omit to write to BlobStore__LocalFilePath)
//
//   dotnet run --project src/tools/CosmosToBlobMigrator -- \
//     --CosmosDb:AccountEndpoint=https://...:443/ --CosmosDb:AccountKey=... \
//     --BlobStore:ConnectionString="DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"

var config = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json", optional: true)
    .AddEnvironmentVariables()
    .AddCommandLine(args)
    .Build();

string Require(string key) =>
    config[key] is { Length: > 0 } v ? v : throw new InvalidOperationException($"Missing required config '{key}'.");

var cosmosEndpoint = Require("CosmosDb:AccountEndpoint");
var cosmosKey = Require("CosmosDb:AccountKey");
var databaseName = config["CosmosDb:DatabaseName"] ?? "fostercc";
var profilesContainer = config["CosmosDb:ProfilesContainer"] ?? "profiles";
var shoppingListsContainer = config["CosmosDb:ShoppingListsContainer"] ?? "shoppingLists";
var goalsContainer = config["CosmosDb:GoalsContainer"] ?? "goals";
var choresContainer = config["CosmosDb:ChoresContainer"] ?? "chores";
var familiesContainer = config["CosmosDb:FamiliesContainer"] ?? "families";
var starLedgerContainer = config["CosmosDb:StarLedgerContainer"] ?? "starLedger";

var storeOptions = new JsonStoreOptions
{
    ConnectionString = config["BlobStore:ConnectionString"] ?? string.Empty,
    ContainerName = config["BlobStore:ContainerName"] ?? "fostercc",
    BlobName = config["BlobStore:BlobName"] ?? "data.json",
    LocalFilePath = config["BlobStore:LocalFilePath"] ?? "data/fostercc.json",
};

Console.WriteLine($"Connecting to Cosmos database '{databaseName}'...");
using var cosmos = new CosmosClient(cosmosEndpoint, cosmosKey, new CosmosClientOptions
{
    SerializerOptions = new CosmosSerializationOptions { PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase },
});
var db = cosmos.GetDatabase(databaseName);

async Task<List<T>> ReadAllAsync<T>(string containerName)
{
    var results = new List<T>();
    try
    {
        var container = db.GetContainer(containerName);
        using var iterator = container.GetItemQueryIterator<T>("SELECT * FROM c");
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());
    }
    catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
    {
        Console.WriteLine($"  {containerName}: container not found — skipping.");
        return results;
    }
    Console.WriteLine($"  {containerName}: {results.Count}");
    return results;
}

Console.WriteLine("Reading containers...");
var document = new JsonDataDocument
{
    Families = await ReadAllAsync<Family>(familiesContainer),
    Profiles = await ReadAllAsync<Profile>(profilesContainer),
    ShoppingLists = await ReadAllAsync<ShoppingList>(shoppingListsContainer),
    Goals = await ReadAllAsync<Goal>(goalsContainer),
    Chores = await ReadAllAsync<Chore>(choresContainer),
    StarLedger = await ReadAllAsync<StarLedgerEntry>(starLedgerContainer),
};

IJsonStoreBackend backend = storeOptions.UsesAzureBlob
    ? new AzureBlobJsonStoreBackend(storeOptions)
    : new LocalFileJsonStoreBackend(storeOptions);

var json = JsonStoreSerialization.Serialize(document);

// Overwrite any existing document (use its current version tag if present).
var existing = await backend.TryLoadAsync();
if (existing is not null)
    Console.WriteLine("Target document already exists — it will be overwritten.");
await backend.SaveAsync(json, existing?.ETag);

var target = storeOptions.UsesAzureBlob
    ? $"blob {storeOptions.ContainerName}/{storeOptions.BlobName}"
    : $"file {Path.GetFullPath(storeOptions.LocalFilePath)}";
Console.WriteLine($"Wrote {json.Length:N0} bytes to {target}.");
Console.WriteLine("Migration complete.");
