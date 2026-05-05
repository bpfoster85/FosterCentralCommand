namespace FosterCentralCommand.Api.Repositories;

public class CosmosDbOptions
{
    public const string SectionName = "CosmosDb";

    public string AccountEndpoint { get; set; } = string.Empty;
    public string AccountKey { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = "fostercc";
    public string ProfilesContainer { get; set; } = "profiles";
    public string ShoppingListsContainer { get; set; } = "shoppingLists";
    public string GoalsContainer { get; set; } = "goals";
    public string ChoresContainer { get; set; } = "chores";
    public string FamiliesContainer { get; set; } = "families";
}
