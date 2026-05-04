# Foster Central Command

A Progressive Web Application (PWA) family command center featuring a Google Calendar integration, collaborative lists (todo/reminders), profile management, and a customizable dashboard.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI Components | PrimeReact + PrimeFlex |
| Calendar | FullCalendar + Google Calendar API |
| Dashboard | react-grid-layout (drag & resize) |
| Backend | .NET 9 Web API |
| ORM | Entity Framework Core |
| Database | PostgreSQL |
| Cache | Azure Cache for Redis |
| Orchestration | .NET Aspire |
| Infrastructure | Azure Bicep |
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
│   │       ├── Data/                    # EF Core DbContext + Migrations
│   │       ├── DTOs/                    # Request/response models
│   │       ├── Models/                  # EF Core entities
│   │       └── Services/               # CalendarService (Google + Redis)
│   ├── aspire/
│   │   ├── AppHost/                     # .NET Aspire orchestration
│   │   └── ServiceDefaults/             # Shared OpenTelemetry defaults
│   └── FosterCentralCommand.sln         # .NET solution file
└── infrastructure/
    ├── main.bicep                        # Root Bicep template
    ├── modules/                          # Reusable Bicep modules
    │   ├── container-app.bicep
    │   ├── container-apps-env.bicep
    │   ├── log-analytics.bicep
    │   ├── postgres.bicep
    │   └── redis.bicep
    └── parameters/
        ├── dev.bicepparam
        └── prod.bicepparam
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
- Near-real-time updates via **Redis cache** (refreshed every 5 minutes)
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
- .NET 9 SDK
- PostgreSQL 16
- Redis (or Docker)
- Google Calendar API key (optional, for calendar sync)

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

API runs at http://localhost:5000

### Run with .NET Aspire (recommended)

```bash
cd src/aspire/AppHost
dotnet run
```

Opens the Aspire dashboard. Automatically starts PostgreSQL, Redis, and the API.

### Environment Variables

| Variable | Description |
|---|---|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string |
| `ConnectionStrings__Redis` | Redis connection string |
| `Google__CalendarId` | Google Calendar ID to sync |
| `Google__ApiKey` | Google API Key with Calendar API enabled |

### Deploy to Azure

```bash
az group create --name fcc-dev-rg --location eastus

az deployment group create \
  --resource-group fcc-dev-rg \
  --template-file infrastructure/main.bicep \
  --parameters infrastructure/parameters/dev.bicepparam \
  --parameters postgresAdminPassword='<secure-password>' \
  --parameters googleCalendarId='<calendar-id>' \
  --parameters googleApiKey='<api-key>'
```

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