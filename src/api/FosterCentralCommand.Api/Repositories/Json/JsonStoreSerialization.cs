using System.Text.Json;
using System.Text.Json.Serialization;

namespace FosterCentralCommand.Api.Repositories.Json;

/// <summary>
/// Shared serialization settings for the JSON data document. The store and the
/// one-time migrator both use these so the on-disk shape is identical and round
/// trips cleanly. Indented + camelCase + string enums keeps the file readable
/// (the whole point of "it's just a JSON file").
/// </summary>
public static class JsonStoreSerialization
{
    public static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() },
    };

    public static string Serialize<T>(T value) => JsonSerializer.Serialize(value, Options);

    public static T? Deserialize<T>(string json) => JsonSerializer.Deserialize<T>(json, Options);

    /// <summary>Deep copy via a serialize/deserialize round trip.</summary>
    public static T? Clone<T>(T value) =>
        value is null ? default : JsonSerializer.Deserialize<T>(JsonSerializer.SerializeToUtf8Bytes(value, Options), Options);
}
