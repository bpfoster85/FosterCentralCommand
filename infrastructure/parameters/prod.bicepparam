using '../main.bicep'

param environmentName = 'prod'
param location = 'eastus'
param postgresAdminLogin = 'fccadmin'
param postgresAdminPassword = '' // Set via Key Vault reference in CI/CD
param googleCalendarId = ''
param googleApiKey = ''
