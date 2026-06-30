# Foster Central Command

A Progressive Web Application (PWA) family command center featuring a Google Calendar integration, collaborative lists (todo/reminders), profile management, and a customizable dashboard.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI Components | PrimeReact + PrimeFlex |
| Calendar | FullCalendar + Google Calendar API |
| Dashboard | react-grid-layout (drag & resize) |
| Backend | .NET 10 Web API |
| Data store | Single JSON document — Azure Blob Storage (cloud) / local file (dev) |
| Caching | In-memory (JSON document loaded once on startup) |
| Container | Docker |
| Hosting | Azure Container Apps |

## Project Structure

```
FosterCentralCommand/
├── src/
│   ├── frontend/                   # React PWA
│   │   ├── src/
│   │   │   ├── api/                # API client layer
│   │   │   ├── components/
│   │   │   │   ├── calendar/       # FullCalendar widget
│   │   │   │   ├── dashboard/      # Drag-and-drop grid
│   │   │   │   ├── layout/         # AppShell navigation
│   │   │   │   ├── lists/          # Lists + items
│   │   │   │   └── profiles/       # Profile cards
│   │   │   ├── hooks/              # React hooks (useProfiles, useLists, etc.)
│   │   │   ├── pages/              # Route pages
│   │   │   └── types/              # TypeScript types
│   │   └── vite.config.ts
│   ├── api/
│   │   └── FosterCentralCommand.Api/    # .NET Web API
│   │       ├── Controllers/             # REST controllers
│   │       ├── DTOs/                    # Request/response models
│   │       ├── Models/                  # Domain models + JsonDataDocument (the aggregate)
│   │       ├── Repositories/            # 6 repository interfaces + Json/ implementations
│   │       │   └── Json/                # JsonDataStore (cache + concurrency) + per-entity repos
│   │       └── Services/                # CalendarService (Google Calendar + in-memory cache)
│   ├── tools/
│   │   └── CosmosToBlobMigrator/        # One-time Cosmos → Blob JSON export tool

│   └── FosterCentralCommand.slnx        # .NET solution file
└── Dockerfile                           # API container image (multi-stage, .NET 10)
```

## Features

### Dashboard (Command Center)
- **Draggable, resizable panels** – customize your layout (persisted in localStorage)
- **Full-screen mode** per panel
- **Calendar panel** with profile filtering
- **Favorite lists** panel + all lists panel

### Calendar
- Syncs with **Google Calendar** (public or service account)
- Views: **Month, Week, Day, Agenda (List)**
- **Filter by family profile** (linked via email address)
- Near-real-time updates via an **in-memory cache** (refreshed every 5 minutes)
- Event detail popup

### Lists (Todo + Reminders)
- Create **multiple named lists** (grocery, chores, etc.)
- List items with: title, description, date/date-range, attendees
- **Check off items** with progress tracking
- **Favorite lists** appear on the dashboard
- Tracks who created each item

### Profiles
- CRUD family member profiles (name, email, color)
- Profiles link to calendar attendees (by email)
- Profiles link to list item attendees

## Getting Started

### Prerequisites

- Node.js 20+
- .NET 10 SDK
- Docker (for building the API container image)
- Google Calendar API key (optional, for calendar sync)

> **No database to install.** In development the API persists to a local JSON
> file (`data/fostercc.json` by default), so it runs with zero external
> dependencies. In the cloud it persists the same JSON document to Azure Blob
> Storage. See [Data storage & backups](#data-storage--backups).

### Run the Frontend

```bash
cd src/frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173

### Run the API

```bash
# Set environment variables or update appsettings.Development.json
cd src/api/FosterCentralCommand.Api
dotnet run
```

API runs at http://localhost:5076

With no `BlobStore__ConnectionString` configured (the default in
`appsettings.Development.json`), the API uses the **local file backend** and
writes all data to `data/fostercc.json` under the API project. Delete that file
to start from an empty store.

### Environment Variables

| Variable | Description |
|---|---|
| `BlobStore__ConnectionString` | Azure Storage connection string. **When set**, data persists to Blob Storage; when empty, the API uses the local file backend. |
| `BlobStore__ContainerName` | Blob container holding the data document (default `fostercc`). |
| `BlobStore__BlobName` | Blob name for the JSON document (default `data.json`). |
| `BlobStore__LocalFilePath` | Path used by the local file backend when no connection string is set (default `data/fostercc.json`). |
| `Google__CalendarId` | Google Calendar ID to sync |
| `Google__ApiKey` | Google API Key with Calendar API enabled |

### Build and run the API container

The `Dockerfile` at the repo root produces a framework-dependent ASP.NET image listening on port `8080`.

```bash
# Build (run from the repo root so the build context picks up src/api/)
docker build -t fostercentralcommand-api:local .

# Run locally — pass config via env vars (double underscores map to nested keys)
docker run --rm -p 8080:8080 \
  -e BlobStore__ConnectionString='DefaultEndpointsProtocol=https;AccountName=<acct>;AccountKey=<key>;EndpointSuffix=core.windows.net' \
  -e BlobStore__ContainerName='fostercc' \
  -e BlobStore__BlobName='data.json' \
  -e Google__CalendarId='<calendar-id>' \
  -e Google__ApiKey='<api-key>' \
  fostercentralcommand-api:local
```

The image runs as the non-root `app` user provided by the `mcr.microsoft.com/dotnet/aspnet:10.0` base image and is suitable for hosting in Azure Container Apps, ACI, AKS, or any other container runtime.

## Data storage & backups

All application data (families, profiles, lists, goals, chores, star ledger) is
stored as a **single JSON document**. On startup the API loads it into memory
once; every mutation rewrites the whole document. At this scale (a handful of
records per family) this is fast and removes the need for a database.

**Backends** (selected automatically by configuration):

| Environment | Backend | Where data lives |
|---|---|---|
| Cloud (Container Apps) | Azure Blob Storage | blob `data.json` in container `fostercc` |
| Local dev | Local file | `data/fostercc.json` under the API project |

The backend is **Azure Blob Storage whenever `BlobStore__ConnectionString` is
set**, otherwise it falls back to the local file. Concurrency is handled with
Blob **ETag** optimistic locking: if two writers race, the loser reloads the
latest document and replays its change. The deploy workflow pins the Container
App to **`--max-replicas 1`** so the in-memory cache stays the single source of
truth; the ETag check is the safety net during deploy overlap.

### Backups

Enable **Blob versioning** on the storage account (Storage account → Data
management → Data protection → *Enable versioning for blobs*). Every write then
produces a new immutable version of `data.json`, so restoring a previous state
is a point-and-click "promote previous version" — no separate backup job
needed. You can also just download `data.json` at any time for an offline copy.

### One-time migration from Cosmos DB

If you are cutting over from the previous Azure Cosmos DB deployment, run the
`CosmosToBlobMigrator` tool **once** to export the live Cosmos data into the new
JSON document before (or at) cutover:

```bash
cd src/tools/CosmosToBlobMigrator

dotnet run -- \
  --CosmosDb:AccountEndpoint='https://<your-cosmos>.documents.azure.com:443/' \
  --CosmosDb:AccountKey='<cosmos-key>' \
  --CosmosDb:DatabaseName='fostercc' \
  --BlobStore:ConnectionString='DefaultEndpointsProtocol=https;AccountName=<acct>;AccountKey=<key>;EndpointSuffix=core.windows.net' \
  --BlobStore:ContainerName='fostercc' \
  --BlobStore:BlobName='data.json'
```

The tool reads every Cosmos container, builds the aggregate JSON document, and
writes it to the configured backend (Blob Storage, or a local file if no
connection string is given). It overwrites the target document, so run it
against an empty/new blob. After verifying the app reads the migrated data, the
Cosmos account can be decommissioned.

## PWA Install

The app can be installed on any device (iOS, Android, desktop) as a Progressive Web App. The app runs in **fullscreen mode** without browser chrome, and supports **touch gestures** for navigation.

## Configuration

### Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project and enable the **Google Calendar API**
3. Create an **API Key** (restrict to Calendar API)
4. Set your Google Calendar to **public** or use a service account
5. Add your Calendar ID and API Key to the app configuration

### Profiles and Calendar Filtering

When you create a profile with an email address, the calendar will filter events to show only those where that email appears as an attendee. This lets you view "Sarah's events" or "all family events" on the same calendar.