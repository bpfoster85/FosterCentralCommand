using FosterCentralCommand.Api.Models;

namespace FosterCentralCommand.Api.Repositories.Json;

/// <summary>
/// The in-memory cache and write coordinator for the single JSON data document.
///
/// Lifecycle:
/// <list type="number">
///   <item>On startup <see cref="InitializeAsync"/> loads the document from the
///   backend into memory (creating an empty one on first run).</item>
///   <item>Repositories read straight from the cached document via
///   <see cref="ReadAsync"/> — no I/O.</item>
///   <item>Mutations go through <see cref="WriteAsync(System.Func{JsonDataDocument,object})"/>,
///   which applies the change in memory, rewrites the whole document to the
///   backend under an ETag precondition, and retries against a fresh copy if a
///   concurrent writer won the race.</item>
/// </list>
///
/// A single <see cref="SemaphoreSlim"/> serializes access in-process; the ETag
/// guards the rare cross-replica overlap. Reads and write-results are returned
/// as deep copies so callers can never mutate the cached document by reference
/// (matching the old "fresh object per Cosmos read" behavior).
/// </summary>
public sealed class JsonDataStore(IJsonStoreBackend backend, ILogger<JsonDataStore> logger)
{
    private const int MaxWriteAttempts = 5;

    private readonly SemaphoreSlim _gate = new(1, 1);
    private JsonDataDocument _doc = new();
    private string? _etag;
    private bool _initialized;

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        await _gate.WaitAsync(ct);
        try
        {
            var load = await backend.TryLoadAsync(ct);
            if (load is { } existing)
            {
                _doc = JsonStoreSerialization.Deserialize<JsonDataDocument>(existing.Json) ?? new JsonDataDocument();
                _etag = existing.ETag;
                logger.LogInformation("JSON data document loaded from store.");
            }
            else
            {
                // First run: create an empty document.
                _doc = new JsonDataDocument();
                try
                {
                    _etag = await backend.SaveAsync(JsonStoreSerialization.Serialize(_doc), expectedETag: null, ct);
                    logger.LogInformation("JSON data document did not exist; created an empty one.");
                }
                catch (JsonStoreConcurrencyException)
                {
                    // Another replica created it first — adopt theirs.
                    var reload = await backend.TryLoadAsync(ct);
                    _doc = reload is { } r
                        ? JsonStoreSerialization.Deserialize<JsonDataDocument>(r.Json) ?? new JsonDataDocument()
                        : new JsonDataDocument();
                    _etag = reload?.ETag;
                }
            }
            _initialized = true;
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// Runs <paramref name="projector"/> against the cached document under the
    /// lock and returns a deep copy of its result.
    /// </summary>
    public async Task<T> ReadAsync<T>(Func<JsonDataDocument, T> projector, CancellationToken ct = default)
    {
        EnsureInitialized();
        await _gate.WaitAsync(ct);
        try
        {
            return JsonStoreSerialization.Clone(projector(_doc))!;
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// Applies <paramref name="mutator"/> to the cached document, persists the
    /// whole document with optimistic concurrency, and returns a deep copy of
    /// the mutator's result. Retries against a freshly reloaded document if a
    /// concurrent write is detected.
    /// </summary>
    public async Task<T> WriteAsync<T>(Func<JsonDataDocument, T> mutator, CancellationToken ct = default)
    {
        EnsureInitialized();
        await _gate.WaitAsync(ct);
        try
        {
            for (var attempt = 1; ; attempt++)
            {
                var result = mutator(_doc);
                try
                {
                    _etag = await backend.SaveAsync(JsonStoreSerialization.Serialize(_doc), _etag, ct);
                    return JsonStoreSerialization.Clone(result)!;
                }
                catch (JsonStoreConcurrencyException) when (attempt < MaxWriteAttempts)
                {
                    logger.LogWarning(
                        "Concurrent write to JSON data document (attempt {Attempt}); reloading and retrying.",
                        attempt);
                    await ReloadLockedAsync(ct);
                }
            }
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>Mutation that returns nothing.</summary>
    public Task WriteAsync(Action<JsonDataDocument> mutator, CancellationToken ct = default) =>
        WriteAsync<object?>(doc => { mutator(doc); return null; }, ct);

    private async Task ReloadLockedAsync(CancellationToken ct)
    {
        var reload = await backend.TryLoadAsync(ct);
        _doc = reload is { } r
            ? JsonStoreSerialization.Deserialize<JsonDataDocument>(r.Json) ?? new JsonDataDocument()
            : new JsonDataDocument();
        _etag = reload?.ETag;
    }

    private void EnsureInitialized()
    {
        if (!_initialized)
            throw new InvalidOperationException("JsonDataStore.InitializeAsync must be called before use.");
    }
}
