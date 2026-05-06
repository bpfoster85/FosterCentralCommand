# syntax=docker/dockerfile:1.7

# ---------- build stage ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore as a distinct layer for better caching
COPY src/api/FosterCentralCommand.Api/FosterCentralCommand.Api.csproj api/FosterCentralCommand.Api/
RUN dotnet restore api/FosterCentralCommand.Api/FosterCentralCommand.Api.csproj

# Copy the rest of the API source and publish a framework-dependent app
COPY src/api/ api/
RUN dotnet publish api/FosterCentralCommand.Api/FosterCentralCommand.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ---------- runtime stage ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_HTTP_PORTS=8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true

COPY --from=build /app/publish ./

EXPOSE 8080

# Non-root user provided by the aspnet base image
USER $APP_UID

ENTRYPOINT ["dotnet", "FosterCentralCommand.Api.dll"]
