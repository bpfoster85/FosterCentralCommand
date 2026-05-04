# Infrastructure

Azure infrastructure defined with Bicep for Foster Central Command.

## Resources

- **Azure Container Apps** – Hosts the API and frontend containers
- **Azure Container Apps Environment** – Shared environment with Log Analytics
- **Azure Database for PostgreSQL Flexible Server** – Application database
- **Azure Cache for Redis** – Calendar event caching for near-real-time updates
- **Log Analytics Workspace** – Centralized logging

## Deployment

### Prerequisites

- Azure CLI installed and logged in
- Azure subscription
- Resource group created

### Deploy

```bash
# Create resource group
az group create --name fcc-dev-rg --location eastus

# Deploy infrastructure
az deployment group create \
  --resource-group fcc-dev-rg \
  --template-file main.bicep \
  --parameters parameters/dev.bicepparam \
  --parameters postgresAdminPassword='<your-secure-password>' \
  --parameters googleCalendarId='<your-calendar-id>' \
  --parameters googleApiKey='<your-api-key>'
```

### Environments

| Environment | Parameter File |
|-------------|---------------|
| Development | `parameters/dev.bicepparam` |
| Production  | `parameters/prod.bicepparam` |
