// Foster Central Command - Azure Infrastructure
// Deploys: Azure Container Apps, CosmosDB, Azure Cache for Redis

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environmentName string = 'dev'

@description('Azure region for all resources')
param location string = resourceGroup().location

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

// CosmosDB Account, Database and Containers
module cosmos 'modules/cosmosdb.bicep' = {
  name: 'cosmos'
  params: {
    name: '${prefix}-cosmos'
    location: location
    tags: tags
    databaseName: 'fostercc'
    profilesContainerName: 'profiles'
    shoppingListsContainerName: 'shoppingLists'
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
        name: 'CosmosDb__AccountEndpoint'
        value: cosmos.outputs.accountEndpoint
      }
      {
        name: 'CosmosDb__AccountKey'
        secretRef: 'cosmos-key'
      }
      {
        name: 'CosmosDb__DatabaseName'
        value: 'fostercc'
      }
      {
        name: 'ConnectionStrings__Redis'
        value: '${redis.outputs.hostName}:6380,password=${redis.outputs.primaryKey},ssl=true'
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

// Frontend Container App
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
output cosmosEndpoint string = cosmos.outputs.accountEndpoint
output redisHost string = redis.outputs.hostName
