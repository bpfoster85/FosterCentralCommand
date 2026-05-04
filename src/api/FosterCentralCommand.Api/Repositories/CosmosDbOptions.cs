namespace FosterCentralCommand.Api.Repositories;

public class CosmosDbOptions
{
    public const string SectionName = "CosmosDb";

    public string AccountEndpoint { get; set; } = string.Empty;
    public string AccountKey { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = "fostercc";
    public string ProfilesContainer { get; set; } = "profiles";
    public string ShoppingListsContainer { get; set; } = "shoppingLists";
}
