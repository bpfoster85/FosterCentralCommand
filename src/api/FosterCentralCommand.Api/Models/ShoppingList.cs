using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FosterCentralCommand.Api.Models;

[Table("shopping_lists")]
public class ShoppingList
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(200)]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    [Column("description")]
    public string? Description { get; set; }

    [Column("is_favorite")]
    public bool IsFavorite { get; set; }

    [Column("created_by_profile_id")]
    public Guid CreatedByProfileId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("CreatedByProfileId")]
    public Profile? CreatedByProfile { get; set; }

    public ICollection<ListItem> Items { get; set; } = [];
}
