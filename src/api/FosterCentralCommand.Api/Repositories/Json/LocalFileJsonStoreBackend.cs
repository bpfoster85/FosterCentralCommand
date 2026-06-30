using System.Security.Cryptography;
using System.Text;

namespace FosterCentralCommand.Api.Repositories.Json;

/// <summary>
/// Local-development backend that stores the JSON document as a plain file on
/// disk. Selected automatically when no Azure Storage connection string is
/// configured, so developers can run the API with zero cloud dependencies.
///
/// A SHA-256 content hash stands in for the blob ETag to provide best-effort
/// optimistic concurrency. Writes are atomic (temp file + replace).
/// </summary>
public sealed class LocalFileJsonStoreBackend : IJsonStoreBackend
{
    private readonly string _path;

    public LocalFileJsonStoreBackend(JsonStoreOptions options)
    {
        _path = Path.GetFullPath(options.LocalFilePath);
    }

    public async Task<JsonStoreLoad?> TryLoadAsync(CancellationToken ct = default)
    {
        if (!File.Exists(_path)) return null;
        var json = await File.ReadAllTextAsync(_path, ct);
        return new JsonStoreLoad(json, Hash(json));
    }

    public async Task<string> SaveAsync(string json, string? expectedETag, CancellationToken ct = default)
    {
        var directory = Path.GetDirectoryName(_path);
        if (!string.IsNullOrEmpty(directory))
            Directory.CreateDirectory(directory);

        var currentETag = File.Exists(_path) ? Hash(await File.ReadAllTextAsync(_path, ct)) : null;

        // Same conflict semantics as the blob backend: a null expected ETag means
        // "first write" (file must not exist); otherwise the on-disk content must
        // still match what the caller last read.
        var conflict = expectedETag is null
            ? currentETag is not null
            : currentETag != expectedETag;

        if (conflict)
        {
            throw new JsonStoreConcurrencyException(
                "The data document was modified concurrently; reload and retry.");
        }

        var temp = _path + ".tmp";
        await File.WriteAllTextAsync(temp, json, ct);
        File.Move(temp, _path, overwrite: true);

        return Hash(json);
    }

    private static string Hash(string json) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json)));
}
