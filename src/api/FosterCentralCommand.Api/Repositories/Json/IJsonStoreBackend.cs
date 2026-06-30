namespace FosterCentralCommand.Api.Repositories.Json;

/// <summary>
/// Thrown when a conditional save fails because the underlying document was
/// changed by someone else since it was last read (ETag mismatch). The
/// <see cref="JsonDataStore"/> reacts by reloading and retrying the mutation.
/// </summary>
public sealed class JsonStoreConcurrencyException(string message) : Exception(message);

/// <summary>
/// Result of loading the document from a backend: the raw JSON plus the
/// version tag (ETag for blobs, a content hash for files) used for optimistic
/// concurrency on the next save.
/// </summary>
public readonly record struct JsonStoreLoad(string Json, string ETag);

/// <summary>
/// Persistence primitive for the single JSON document. Two implementations
/// exist: <see cref="AzureBlobJsonStoreBackend"/> (durable, prod) and
/// <see cref="LocalFileJsonStoreBackend"/> (local dev). All in-memory caching,
/// locking and retry logic lives in <see cref="JsonDataStore"/> — backends only
/// move bytes and enforce the ETag precondition.
/// </summary>
public interface IJsonStoreBackend
{
    /// <summary>
    /// Loads the current document, or <c>null</c> if it does not exist yet.
    /// </summary>
    Task<JsonStoreLoad?> TryLoadAsync(CancellationToken ct = default);

    /// <summary>
    /// Saves <paramref name="json"/>.
    /// When <paramref name="expectedETag"/> is non-null, the save must only
    /// succeed if the stored version still matches it; otherwise a
    /// <see cref="JsonStoreConcurrencyException"/> is thrown. When null, the
    /// save creates the document only if it does not already exist (also
    /// surfaced as a concurrency conflict if it does).
    /// </summary>
    /// <returns>The new version tag (ETag) after the write.</returns>
    Task<string> SaveAsync(string json, string? expectedETag, CancellationToken ct = default);
}
