// Foster Central Command - Azure Infrastructure
// Deploys: Azure Container Apps, PostgreSQL Flexible Server, Azure Cache for Redis

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environmentName string = 'dev'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Administrator login for PostgreSQL')
param postgresAdminLogin string = 'fccadmin'

@secure()
@description('Administrator password for PostgreSQL')
param postgresAdminPassword string

@description('Google Calendar ID for calendar sync')
param googleCalendarId string = ''

@secure()
@description('Google API Key for calendar sync')
param googleApiKey string = ''

var prefix = 'fcc-${environmentName}'
var tags = {
  project: 'FosterCentralCommand'
  environment: environmentName
}

// Log Analytics Workspace for Container Apps
module logAnalytics 'modules/log-analytics.bicep' = {
  name: 'logAnalytics'
  params: {
    name: '${prefix}-logs'
    location: location
    tags: tags
  }
}

// Container Apps Environment
module containerAppsEnv 'modules/container-apps-env.bicep' = {
  name: 'containerAppsEnv'
  params: {
    name: '${prefix}-env'
    location: location
    tags: tags
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
    logAnalyticsKey: logAnalytics.outputs.primarySharedKey
  }
}

// PostgreSQL Flexible Server
module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    name: '${prefix}-postgres'
    location: location
    tags: tags
    adminLogin: postgresAdminLogin
    adminPassword: postgresAdminPassword
    databaseName: 'fostercc'
  }
}

// Azure Cache for Redis
module redis 'modules/redis.bicep' = {
  name: 'redis'
  params: {
    name: '${prefix}-redis'
    location: location
    tags: tags
  }
}

// API Container App
module api 'modules/container-app.bicep' = {
  name: 'api'
  params: {
    name: '${prefix}-api'
    location: location
    tags: tags
    containerAppsEnvironmentId: containerAppsEnv.outputs.environmentId
    containerImage: 'mcr.microsoft.com/dotnet/aspnet:9.0'
    targetPort: 8080
    env: [
      {
        name: 'ConnectionStrings__DefaultConnection'
        value: 'Host=${postgres.outputs.fqdn};Database=fostercc;Username=${postgresAdminLogin};Password=${postgresAdminPassword};SSL Mode=Require;Trust Server Certificate=true'
      }
      {
        name: 'ConnectionStrings__Redis'
        value: '${redis.outputs.hostName}:6380,password=${redis.outputs.primaryKey},ssl=True,abortConnect=False'
      }
      {
        name: 'Google__CalendarId'
        value: googleCalendarId
      }
      {
        name: 'Google__ApiKey'
        value: googleApiKey
      }
      {
        name: 'ASPNETCORE_ENVIRONMENT'
        value: environmentName == 'prod' ? 'Production' : 'Staging'
      }
    ]
  }
}

// Frontend Container App (static web app alternative)
module frontend 'modules/container-app.bicep' = {
  name: 'frontend'
  params: {
    name: '${prefix}-frontend'
    location: location
    tags: tags
    containerAppsEnvironmentId: containerAppsEnv.outputs.environmentId
    containerImage: 'nginx:alpine'
    targetPort: 80
    env: []
    isPublic: true
  }
}

output apiUrl string = api.outputs.url
output frontendUrl string = frontend.outputs.url
output postgresHost string = postgres.outputs.fqdn
output redisHost string = redis.outputs.hostName
