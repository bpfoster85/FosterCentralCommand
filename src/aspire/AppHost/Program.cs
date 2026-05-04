var builder = DistributedApplication.CreateBuilder(args);

var cosmos = builder.AddAzureCosmosDB("cosmos")
    .RunAsEmulator();

var database = cosmos.AddCosmosDatabase("fostercc");

var redis = builder.AddRedis("redis");

var api = builder.AddProject<Projects.FosterCentralCommand_Api>("api")
    .WithReference(database)
    .WithReference(redis)
    .WaitFor(database)
    .WaitFor(redis);

builder.Build().Run();
