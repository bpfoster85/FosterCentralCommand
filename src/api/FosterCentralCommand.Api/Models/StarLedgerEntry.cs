using System.Text.Json.Serialization;

namespace FosterCentralCommand.Api.Models;

public enum StarLedgerReason
{
    ChoreApproved = 0,
    ChoreUnapproved = 1,
    ChoreUncompleted = 2,
    GoalSpent = 3,
    ManualAdjustment = 4,
    CustomAward = 5,
}

public enum StarLedgerSourceType
{
    Chore = 0,
    Goal = 1,
    Manual = 2,
}

/// <summary>
/// Immutable, append-only record of a change to a profile's star balance.
/// Captured from <see cref="Controllers.ChoresController"/> approvals,
/// <see cref="Controllers.GoalsController.SpendStars"/>, and
/// <see cref="Controllers.ProfilesController.AdjustStars"/>. Surfaced via
/// the Audit modal on the Goals page.
/// </summary>
public class StarLedgerEntry
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string FamilyId { get; set; } = string.Empty;

    public string ProfileId { get; set; } = string.Empty;

    /// <summary>Snapshot of the profile's name at the time of the change.</summary>
    public string ProfileName { get; set; } = string.Empty;

    /// <summary>Snapshot of the profile's color at the time of the change.</summary>
    public string ProfileColor { get; set; } = string.Empty;

    /// <summary>Signed star change. Positive = awarded, negative = removed/spent.</summary>
    public int Delta { get; set; }

    public StarLedgerReason Reason { get; set; }

    public StarLedgerSourceType SourceType { get; set; }

    /// <summary>Id of the originating chore/goal. Empty for manual adjustments.</summary>
    public string SourceId { get; set; } = string.Empty;

    /// <summary>Snapshot of the source's title (chore/goal) at the time of the change.</summary>
    public string SourceTitle { get; set; } = string.Empty;

    /// <summary>
    /// For chore-related entries, the "yyyy-MM-dd" occurrence date. Null otherwise.
    /// </summary>
    public string? OccurrenceDate { get; set; }

    /// <summary>Optional free-form note (e.g. manual adjustment reason).</summary>
    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
