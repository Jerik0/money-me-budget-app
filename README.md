# Money Me App 2025

A comprehensive money management application built with Angular frontend, Node.js/Express backend, and PostgreSQL database.

## 🚀 Quick Start

### Single Command Startup (Recommended)

The easiest way to start all three components is using one of these commands:

**Windows (PowerShell - Recommended):**
```bash
npm run start:all
# or
powershell -ExecutionPolicy Bypass -File start-app.ps1
```

**Windows (Command Prompt):**
```bash
npm run start
# or
start-app.bat
```

**Manual Startup:**
```bash
# Start database and backend
docker-compose up -d

# Start frontend (in a new terminal)
ng serve
```

## 🏗️ Architecture

- **Frontend**: Angular 20 with Tailwind CSS
- **Backend**: Node.js/Express API
- **Database**: PostgreSQL 15 with Docker
- **Styling**: SCSS with Tailwind CSS

## 📁 Project Structure

```
money-me-app-2025/
├── src/                    # Angular frontend
│   ├── app/
│   │   ├── components/     # Angular components
│   │   ├── services/       # Angular services
│   │   └── interfaces/     # TypeScript interfaces
├── backend/                # Node.js backend
│   ├── src/
│   │   ├── controllers/    # API controllers
│   │   ├── database/       # Database connection & schema
│   │   └── routes/         # API routes
└── docker-compose.yml      # Database & backend containers
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- Angular CLI
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Available Scripts

- `npm run start:all` - Start all services (PowerShell)
- `npm run start` - Start all services (Command Prompt)
- `npm run build` - Build Angular app
- `npm run docker:up` - Start database & backend only
- `npm run docker:down` - Stop database & backend

### Ports
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **Database**: localhost:5432

## 🐛 Troubleshooting

### Port Conflicts
If you get port conflicts, the startup scripts will automatically:
1. Stop any existing processes on ports 3000 and 4200
2. Stop existing Docker containers
3. Start fresh services

### Database Connection Issues
- Ensure Docker is running
- Check that PostgreSQL container is healthy: `docker ps`
- Verify database credentials in `docker-compose.yml`

### Frontend Not Loading
- Check if Angular is running: `netstat -an | findstr :4200`
- Restart with: `ng serve`

## 📝 Notes

- The app uses SCSS files for styling (not CSS)
- Buttons use subtle shading feedback instead of outlines
- Toggled content uses `[class.hidden]` for instant performance
- Main accent color is teal with gradients
- All components use separate HTML template files