param name string
param location string
param tags object
param skuName string = 'Basic'
param skuFamily string = 'C'
param skuCapacity int = 1

resource redis 'Microsoft.Cache/Redis@2023-08-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: {
      name: skuName
      family: skuFamily
      capacity: skuCapacity
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}

output hostName string = redis.properties.hostName
output primaryKey string = redis.listKeys().primaryKey
output id string = redis.id
