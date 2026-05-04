param name string
param location string
param tags object
param adminLogin string
@secure()
param adminPassword string
param databaseName string
param skuName string = 'Standard_D2ds_v4'
param skuTier string = 'GeneralPurpose'
param storageSizeGB int = 32
param backupRetentionDays int = 7

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    version: '16'
    storage: {
      storageSizeGB: storageSizeGB
    }
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgresServer
  name: databaseName
  properties: {
    charset: 'utf8'
    collation: 'en_US.utf8'
  }
}

// Allow Azure services to access the database
resource firewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

output fqdn string = postgresServer.properties.fullyQualifiedDomainName
output serverId string = postgresServer.id
