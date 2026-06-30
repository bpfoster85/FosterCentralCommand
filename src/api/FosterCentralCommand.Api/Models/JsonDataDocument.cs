namespace FosterCentralCommand.Api.Models;

/// <summary>
/// The entire application dataset, serialized to a single JSON document and
/// persisted in Azure Blob Storage (prod) or a plain file (local dev).
///
/// The document is loaded into memory once on startup and rewritten in full on
/// every mutation. At family-command-center scale the whole thing is a handful
/// of small collections, so the read-everything / write-everything approach is
/// both simple and fast. Each top-level list mirrors what used to be a Cosmos
/// container.
/// </summary>
public class JsonDataDocument
{
    /// <summary>Tenants. Global (not scoped) — login resolves a family here.</summary>
    public List<Family> Families { get; set; } = [];

    public List<Profile> Profiles { get; set; } = [];

    public List<ShoppingList> ShoppingLists { get; set; } = [];

    public List<Goal> Goals { get; set; } = [];

    public List<Chore> Chores { get; set; } = [];

    /// <summary>Append-only star ledger entries.</summary>
    public List<StarLedgerEntry> StarLedger { get; set; } = [];
}
