using Microsoft.Azure.Cosmos;

namespace FosterCentralCommand.Api.Repositories;

public static class CosmosInitializer
{
    public static async Task InitializeAsync(CosmosClient client, CosmosDbOptions options, ILogger logger)
    {
        try
        {
            var dbResponse = await client.CreateDatabaseIfNotExistsAsync(options.DatabaseName);
            var db = dbResponse.Database;

            await db.CreateContainerIfNotExistsAsync(new ContainerProperties
            {
                Id = options.ProfilesContainer,
                PartitionKeyPath = "/id"
            });

            await db.CreateContainerIfNotExistsAsync(new ContainerProperties
            {
                Id = options.ShoppingListsContainer,
                PartitionKeyPath = "/id"
            });

            logger.LogInformation("CosmosDB database '{Database}' and containers initialized.", options.DatabaseName);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "CosmosDB initialization failed – database may not be available yet.");
        }
    }
}
