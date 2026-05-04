using System.ComponentModel.DataAnnotations.Schema;

namespace FosterCentralCommand.Api.Models;

[Table("list_item_attendees")]
public class ListItemAttendee
{
    [Column("list_item_id")]
    public Guid ListItemId { get; set; }

    [Column("profile_id")]
    public Guid ProfileId { get; set; }

    [ForeignKey("ListItemId")]
    public ListItem? ListItem { get; set; }

    [ForeignKey("ProfileId")]
    public Profile? Profile { get; set; }
}
