using System.Text;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace FosterCentralCommand.Api.Repositories.Json;

/// <summary>
/// Durable backend that stores the JSON document as a single blob. Uses blob
/// ETags for optimistic concurrency so concurrent writers (e.g. during a
/// deploy where an old and new revision briefly overlap) can never silently
/// clobber each other.
///
/// Enable blob versioning on the container to get automatic, point-in-time
/// backups — every write becomes a recoverable version.
/// </summary>
public sealed class AzureBlobJsonStoreBackend : IJsonStoreBackend
{
    private readonly BlobClient _blob;
    private readonly BlobContainerClient _container;
    private readonly SemaphoreSlim _ensureGate = new(1, 1);
    private bool _ensured;

    public AzureBlobJsonStoreBackend(JsonStoreOptions options)
    {
        var service = new BlobServiceClient(options.ConnectionString);
        _container = service.GetBlobContainerClient(options.ContainerName);
        _blob = _container.GetBlobClient(options.BlobName);
    }

    public async Task<JsonStoreLoad?> TryLoadAsync(CancellationToken ct = default)
    {
        await EnsureContainerAsync(ct);
        try
        {
            var response = await _blob.DownloadContentAsync(ct);
            var json = response.Value.Content.ToString();
            var etag = response.Value.Details.ETag.ToString();
            return new JsonStoreLoad(json, etag);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }

    public async Task<string> SaveAsync(string json, string? expectedETag, CancellationToken ct = default)
    {
        await EnsureContainerAsync(ct);

        // expectedETag == null means "this should be the first write" — only
        // create the blob if it does not already exist. Otherwise require the
        // stored ETag to still match what we last read.
        var conditions = expectedETag is null
            ? new BlobRequestConditions { IfNoneMatch = ETag.All }
            : new BlobRequestConditions { IfMatch = new ETag(expectedETag) };

        var options = new BlobUploadOptions
        {
            Conditions = conditions,
            HttpHeaders = new BlobHttpHeaders { ContentType = "application/json" },
        };

        try
        {
            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(json));
            var response = await _blob.UploadAsync(stream, options, ct);
            return response.Value.ETag.ToString();
        }
        catch (RequestFailedException ex) when (ex.Status is 409 or 412)
        {
            // 412: ETag mismatch (someone wrote since we read).
            // 409: blob already existed on a first-write (IfNoneMatch) attempt.
            throw new JsonStoreConcurrencyException(
                "The data document was modified concurrently; reload and retry.");
        }
    }

    private async Task EnsureContainerAsync(CancellationToken ct)
    {
        if (_ensured) return;
        await _ensureGate.WaitAsync(ct);
        try
        {
            if (_ensured) return;
            await _container.CreateIfNotExistsAsync(cancellationToken: ct);
            _ensured = true;
        }
        finally
        {
            _ensureGate.Release();
        }
    }
}
