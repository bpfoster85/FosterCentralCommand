using System.Text.Json.Serialization;

namespace FosterCentralCommand.Api.Models;

/// <summary>
/// A tenant in the system. Every request that reads or writes family data
/// must include an <c>X-Family-Id</c> header whose value matches a Family.Id;
/// the middleware looks the family up and attaches it to the request scope.
///
/// Google Calendar credentials are stored per-family so each family can connect
/// their own calendar without sharing keys. Cosmos encrypts items at rest, but
/// these fields should still be treated as sensitive.
/// </summary>
public class Family
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Lower-cased, trimmed copy of <see cref="Name"/> used for case-insensitive
    /// lookups during login. Always set via <c>family.Name = ...</c> through the
    /// repository / controller, which keeps this field in sync.
    /// </summary>
    public string NameNormalized { get; set; } = string.Empty;

    /// <summary>
    /// PBKDF2-SHA256 hash of the family password. Stored as
    /// <c>{iterations}.{base64(salt)}.{base64(hash)}</c>. Never returned over
    /// the wire — login endpoints only echo back the family id.
    /// </summary>
    public string? PasswordHash { get; set; }

    /// <summary>Google Calendar id (typically an email address).</summary>
    public string? GoogleCalendarId { get; set; }

    /// <summary>API key for read-only access to public Google calendars.</summary>
    public string? GoogleApiKey { get; set; }

    /// <summary>
    /// Full contents of a Google service-account JSON key file. Required to
    /// create events (write access). When null, the family is read-only and
    /// must rely on <see cref="GoogleApiKey"/>.
    /// </summary>
    public string? GoogleServiceAccountJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
