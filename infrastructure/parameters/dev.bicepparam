using '../main.bicep'

param environmentName = 'dev'
param location = 'eastus'
param postgresAdminLogin = 'fccadmin'
param postgresAdminPassword = '' // Set via --parameters or Key Vault reference
param googleCalendarId = ''
param googleApiKey = ''
