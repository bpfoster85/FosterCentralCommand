using FosterCentralCommand.Api.Models;

namespace FosterCentralCommand.Api.Services;

/// <summary>
/// Per-request context that holds the <see cref="Family"/> resolved from the
/// incoming <c>X-Family-Id</c> header. Populated by
/// <c>FamilyContextMiddleware</c> and consumed by services and controllers
/// that need to scope data to a specific family.
/// </summary>
public class FamilyContext
{
    public Family? Current { get; set; }

    /// <summary>
    /// The current family's id. Throws when no family is set — callers that
    /// reach this point should already be past the middleware gate.
    /// </summary>
    public string CurrentId => Current?.Id
        ?? throw new InvalidOperationException("No family in context. Was the request gated by FamilyContextMiddleware?");
}
