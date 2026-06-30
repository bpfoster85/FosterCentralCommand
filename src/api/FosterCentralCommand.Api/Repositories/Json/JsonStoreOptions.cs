namespace FosterCentralCommand.Api.Repositories.Json;

/// <summary>
/// Configuration for the JSON document store. Bound from the "BlobStore"
/// configuration section (or <c>BlobStore__*</c> environment variables).
///
/// Backend selection:
/// <list type="bullet">
///   <item>If <see cref="ConnectionString"/> is set, the Azure Blob backend is
///   used and the document is stored as <see cref="BlobName"/> inside
///   <see cref="ContainerName"/>.</item>
///   <item>Otherwise the local-file backend is used and the document lives at
///   <see cref="LocalFilePath"/> — handy for local dev with no Azure account.</item>
/// </list>
/// </summary>
public class JsonStoreOptions
{
    public const string SectionName = "BlobStore";

    /// <summary>
    /// Azure Storage connection string. When provided, the Azure Blob backend
    /// is selected. Supports <c>UseDevelopmentStorage=true</c> for Azurite.
    /// </summary>
    public string ConnectionString { get; set; } = string.Empty;

    /// <summary>Blob container that holds the data document.</summary>
    public string ContainerName { get; set; } = "fostercc";

    /// <summary>Name of the single JSON blob that holds the whole dataset.</summary>
    public string BlobName { get; set; } = "data.json";

    /// <summary>
    /// File path used by the local-file backend when no
    /// <see cref="ConnectionString"/> is configured.
    /// </summary>
    public string LocalFilePath { get; set; } = "data/fostercc.json";

    /// <summary>
    /// True when an Azure Storage connection string is configured and the Azure
    /// Blob backend should be used.
    /// </summary>
    public bool UsesAzureBlob => !string.IsNullOrWhiteSpace(ConnectionString);
}
