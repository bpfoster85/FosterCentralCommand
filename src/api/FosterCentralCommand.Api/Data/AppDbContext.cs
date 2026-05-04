using Microsoft.EntityFrameworkCore;
using FosterCentralCommand.Api.Models;

namespace FosterCentralCommand.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<ShoppingList> ShoppingLists => Set<ShoppingList>();
    public DbSet<ListItem> ListItems => Set<ListItem>();
    public DbSet<ListItemAttendee> ListItemAttendees => Set<ListItemAttendee>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Composite key for join table
        modelBuilder.Entity<ListItemAttendee>()
            .HasKey(x => new { x.ListItemId, x.ProfileId });

        modelBuilder.Entity<ListItemAttendee>()
            .HasOne(x => x.ListItem)
            .WithMany(x => x.Attendees)
            .HasForeignKey(x => x.ListItemId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ListItemAttendee>()
            .HasOne(x => x.Profile)
            .WithMany(x => x.ListItemAttendees)
            .HasForeignKey(x => x.ProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ShoppingList>()
            .HasOne(x => x.CreatedByProfile)
            .WithMany(x => x.CreatedShoppingLists)
            .HasForeignKey(x => x.CreatedByProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ListItem>()
            .HasOne(x => x.ShoppingList)
            .WithMany(x => x.Items)
            .HasForeignKey(x => x.ListId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ListItem>()
            .HasOne(x => x.CreatedByProfile)
            .WithMany(x => x.CreatedListItems)
            .HasForeignKey(x => x.CreatedByProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        // Unique email on profiles
        modelBuilder.Entity<Profile>()
            .HasIndex(x => x.Email)
            .IsUnique();
    }
}
