param name string
param location string
param tags object
param logAnalyticsWorkspaceId string
param logAnalyticsKey string

resource environment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspaceId
        sharedKey: logAnalyticsKey
      }
    }
  }
}

output environmentId string = environment.id
