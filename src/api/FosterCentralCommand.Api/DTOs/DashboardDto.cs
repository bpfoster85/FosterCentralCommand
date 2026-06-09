using System.ComponentModel.DataAnnotations;

namespace FosterCentralCommand.Api.DTOs;

public record DadsSwearJarDto(
    int Count,
    DateTime UpdatedAt
);

public record AddDadsSwearJarRequest(
    [Range(1, 1000)] int Amount = 1
);
