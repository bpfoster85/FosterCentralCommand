using FosterCentralCommand.Api.Models;

namespace FosterCentralCommand.Api.DTOs;

public record StarLedgerEntryDto(
    Guid Id,
    Guid ProfileId,
    string ProfileName,
    string ProfileColor,
    int Delta,
    StarLedgerReason Reason,
    StarLedgerSourceType SourceType,
    Guid? SourceId,
    string SourceTitle,
    string? OccurrenceDate,
    string? Note,
    DateTime CreatedAt
);
