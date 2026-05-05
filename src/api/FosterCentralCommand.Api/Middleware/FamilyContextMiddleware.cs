using FosterCentralCommand.Api.Repositories;
using FosterCentralCommand.Api.Services;

namespace FosterCentralCommand.Api.Middleware;

/// <summary>
/// Reads the <c>X-Family-Id</c> header on every request, looks up the
/// matching <see cref="Models.Family"/>, and attaches it to the request-scoped
/// <see cref="FamilyContext"/>. Requests without a valid family id receive
/// HTTP 401.
///
/// Bypasses the check for:
///   - CORS preflight (OPTIONS)
///   - The <c>/api/families</c> admin endpoints (gated by an admin key instead)
///   - Any path listed in <see cref="BypassPrefixes"/>
/// </summary>
public class FamilyContextMiddleware(RequestDelegate next, ILogger<FamilyContextMiddleware> logger)
{
    public const string HeaderName = "X-Family-Id";

    private static readonly string[] BypassPrefixes =
    [
        "/api/families",
        "/api/auth",
        "/api/health",
    ];

    public async Task InvokeAsync(HttpContext ctx, FamilyContext familyContext, IFamilyRepository repo)
    {
        if (HttpMethods.IsOptions(ctx.Request.Method) || ShouldBypass(ctx.Request.Path))
        {
            await next(ctx);
            return;
        }

        if (!ctx.Request.Headers.TryGetValue(HeaderName, out var headerValues)
            || string.IsNullOrWhiteSpace(headerValues.ToString()))
        {
            await Reject(ctx, "Missing X-Family-Id header.");
            return;
        }

        var familyId = headerValues.ToString().Trim();
        var family = await repo.GetByIdAsync(familyId);
        if (family is null)
        {
            logger.LogWarning("Rejected request with unknown family id {FamilyId}", familyId);
            await Reject(ctx, "Unknown family.");
            return;
        }

        familyContext.Current = family;
        await next(ctx);
    }

    private static bool ShouldBypass(PathString path)
    {
        var value = path.Value ?? string.Empty;
        foreach (var prefix in BypassPrefixes)
        {
            if (value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }

    private static Task Reject(HttpContext ctx, string error)
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return ctx.Response.WriteAsJsonAsync(new { error });
    }
}
