using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FosterCentralCommand.Api.Models;

[Table("list_items")]
public class ListItem
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("list_id")]
    public Guid ListId { get; set; }

    [Required]
    [MaxLength(300)]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    [Column("description")]
    public string? Description { get; set; }

    [Column("is_checked")]
    public bool IsChecked { get; set; }

    [Column("start_date")]
    public DateTime? StartDate { get; set; }

    [Column("end_date")]
    public DateTime? EndDate { get; set; }

    [Column("created_by_profile_id")]
    public Guid CreatedByProfileId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("ListId")]
    public ShoppingList? ShoppingList { get; set; }

    [ForeignKey("CreatedByProfileId")]
    public Profile? CreatedByProfile { get; set; }

    public ICollection<ListItemAttendee> Attendees { get; set; } = [];
}
