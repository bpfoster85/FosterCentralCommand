using System.Text.Json.Serialization;

namespace FosterCentralCommand.Api.Models;

public enum ChoreRecurrence
{
    None = 0,
    Daily = 1,
    Weekly = 2,
    EveryOtherDay = 3
}

public class Chore
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    /// <summary>Profile assigned to this chore.</summary>
    public string AssignedProfileId { get; set; } = string.Empty;

    /// <summary>Stars awarded each time an occurrence of this chore is completed.</summary>
    public int StarValue { get; set; }

    /// <summary>
    /// For non-recurring chores: the single due date.
    /// For recurring chores: the start date of the recurrence (occurrences begin on/after this).
    /// </summary>
    public DateTime DueDate { get; set; }

    public ChoreRecurrence Recurrence { get; set; } = ChoreRecurrence.None;

    /// <summary>Days of the week (0=Sunday..6=Saturday) when Recurrence == Weekly.</summary>
    public List<int> RecurrenceDaysOfWeek { get; set; } = [];

    /// <summary>Optional cut-off for recurring chores.</summary>
    public DateTime? RecurrenceEndDate { get; set; }

    /// <summary>
    /// Calendar dates ("yyyy-MM-dd") on which the assignee marked an occurrence
    /// of this chore complete. Stars are NOT awarded until an admin approves.
    /// </summary>
    public List<string> CompletedDates { get; set; } = [];

    /// <summary>
    /// Calendar dates ("yyyy-MM-dd") on which an admin has approved a completion.
    /// Approving awards <see cref="StarValue"/> stars to the assigned profile;
    /// unapproving refunds them. Approval requires the date to also be in
    /// <see cref="CompletedDates"/>.
    /// </summary>
    public List<string> ApprovedDates { get; set; } = [];

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
