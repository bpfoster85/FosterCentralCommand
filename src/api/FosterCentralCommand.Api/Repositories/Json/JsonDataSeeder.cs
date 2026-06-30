using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Security;

namespace FosterCentralCommand.Api.Repositories.Json;

/// <summary>
/// One-time-ish startup maintenance, ported from the old Cosmos bootstrap in
/// <c>Program.cs</c>. Operates entirely on the in-memory document and persists
/// once. Every step is idempotent so it is safe to run on every boot:
/// <list type="bullet">
///   <item>Seed a "Default" family from legacy Google config when none exist.</item>
///   <item>Backfill <c>NameNormalized</c> / <c>PasswordHash</c> on older families.</item>
///   <item>Backfill <c>FamilyId</c> on per-family records that predate multi-tenancy.</item>
///   <item>Remove the legacy "Analogy Activity" chore.</item>
///   <item>Seed Sarah's default chores.</item>
/// </list>
/// </summary>
public static class JsonDataSeeder
{
    public static async Task RunAsync(JsonDataStore store, IConfiguration config, ILogger logger)
    {
        // Read any service-account key file up front — the mutator below is sync.
        var calId = config["Google:CalendarId"];
        var apiKey = config["Google:ApiKey"];
        var saPath = config["Google:ServiceAccountKeyPath"];
        string? saJson = null;
        if (!string.IsNullOrEmpty(saPath) && File.Exists(saPath))
            saJson = await File.ReadAllTextAsync(saPath);

        var bootstrapPassword = config["Bootstrap:DefaultFamilyPassword"] ?? "fostercc";
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        await store.WriteAsync(doc =>
        {
            if (doc.Families.Count == 0)
            {
                if (!string.IsNullOrEmpty(calId) || !string.IsNullOrEmpty(apiKey) || !string.IsNullOrEmpty(saJson))
                {
                    var seeded = new Family
                    {
                        Name = "Default",
                        NameNormalized = "default",
                        GoogleCalendarId = calId,
                        GoogleApiKey = apiKey,
                        GoogleServiceAccountJson = saJson,
                        PasswordHash = PasswordHasher.Hash(bootstrapPassword),
                    };
                    doc.Families.Add(seeded);
                    logger.LogInformation(
                        "Seeded default family {FamilyId}. Login with name=\"Default\" password=\"{Password}\".",
                        seeded.Id, bootstrapPassword);
                }
                else
                {
                    logger.LogInformation(
                        "No families exist and no Google config available to seed one. Create a family via POST /api/families.");
                }
            }
            else
            {
                foreach (var f in doc.Families)
                {
                    if (string.IsNullOrEmpty(f.NameNormalized) && !string.IsNullOrEmpty(f.Name))
                        f.NameNormalized = f.Name.Trim().ToLowerInvariant();

                    if (string.IsNullOrEmpty(f.PasswordHash))
                    {
                        f.PasswordHash = PasswordHasher.Hash(bootstrapPassword);
                        logger.LogWarning(
                            "Family {FamilyId} ({Name}) had no password — seeded \"{Password}\". Rotate via PUT /api/families.",
                            f.Id, f.Name, bootstrapPassword);
                    }
                }
            }

            var defaultFamilyId = doc.Families.FirstOrDefault()?.Id;
            if (string.IsNullOrEmpty(defaultFamilyId))
                return;

            BackfillFamilyId(doc.Chores, c => c.FamilyId, (c, v) => c.FamilyId = v, defaultFamilyId, "chores", logger);
            BackfillFamilyId(doc.Profiles, p => p.FamilyId, (p, v) => p.FamilyId = v, defaultFamilyId, "profiles", logger);
            BackfillFamilyId(doc.Goals, g => g.FamilyId, (g, v) => g.FamilyId = v, defaultFamilyId, "goals", logger);
            BackfillFamilyId(doc.ShoppingLists, l => l.FamilyId, (l, v) => l.FamilyId = v, defaultFamilyId, "shoppingLists", logger);

            RemoveChoresByTitle(doc, defaultFamilyId, "Analogy Activity", logger);
            SeedChores(doc, defaultFamilyId, today, logger);
        });
    }

    private static void BackfillFamilyId<T>(
        List<T> items,
        Func<T, string> getFamilyId,
        Action<T, string> setFamilyId,
        string defaultFamilyId,
        string label,
        ILogger logger)
    {
        var migrated = 0;
        foreach (var item in items)
        {
            if (string.IsNullOrEmpty(getFamilyId(item)))
            {
                setFamilyId(item, defaultFamilyId);
                migrated++;
            }
        }

        if (migrated > 0)
            logger.LogInformation(
                "Backfilled FamilyId on {Count} {Label} record(s) → family {FamilyId}.",
                migrated, label, defaultFamilyId);
    }

    private static void RemoveChoresByTitle(JsonDataDocument doc, string familyId, string title, ILogger logger)
    {
        var removed = doc.Chores.RemoveAll(c =>
            c.FamilyId == familyId && string.Equals(c.Title?.Trim(), title, StringComparison.OrdinalIgnoreCase));

        if (removed > 0)
            logger.LogInformation(
                "Removed {Count} chore(s) titled '{Title}' from family {FamilyId}.", removed, title, familyId);
    }

    private static void SeedChores(JsonDataDocument doc, string familyId, DateTime today, ILogger logger)
    {
        var profiles = doc.Profiles.Where(p => p.FamilyId == familyId).ToList();
        if (profiles.Count == 0)
        {
            logger.LogInformation("SeedChores: no profiles found for family {FamilyId} — skipping.", familyId);
            return;
        }

        var existing = new HashSet<string>(
            doc.Chores.Where(c => c.FamilyId == familyId)
                .Select(c => $"{c.Title.Trim().ToLowerInvariant()}|{c.AssignedProfileId}"),
            StringComparer.OrdinalIgnoreCase);

        var seeded = 0;

        void CreateIfMissing(string profileId, string title, int starValue)
        {
            var key = $"{title.Trim().ToLowerInvariant()}|{profileId}";
            if (!existing.Add(key)) return;

            doc.Chores.Add(new Chore
            {
                FamilyId = familyId,
                Title = title,
                AssignedProfileId = profileId,
                StarValue = starValue,
                DueDate = today,
                Recurrence = ChoreRecurrence.Daily,
            });
            seeded++;
        }

        var sarah = profiles.FirstOrDefault(p =>
            string.Equals(p.Name.Trim(), "Sarah", StringComparison.OrdinalIgnoreCase));
        if (sarah is not null)
        {
            CreateIfMissing(sarah.Id, "Work Out", starValue: 2);
            CreateIfMissing(sarah.Id, "Read Book", starValue: 1);
        }
        else
        {
            logger.LogWarning("SeedChores: profile 'Sarah' not found — skipping Sarah-specific chores.");
        }

        if (seeded > 0)
            logger.LogInformation("SeedChores: created {Count} new chore(s) for family {FamilyId}.", seeded, familyId);
    }
}
