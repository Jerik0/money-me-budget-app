# Money Me App 2025

A comprehensive money management application built with Angular frontend, Node.js/Express backend, and PostgreSQL database.

## 🚀 Quick Start

### 🎯 Essential Commands (Copy & Paste)

```bash
# Start everything
npm run start:all

# Stop everything  
npm run stop:all

# Restart everything
npm run restart:all
```

**Note:** These commands use PowerShell scripts. If you encounter execution policy issues, run:
```bash
powershell -ExecutionPolicy Bypass -File start-app.ps1
```

### 🗄️ Quick Database Access

```bash
# Connect to database
docker exec -it money-me-postgres psql -U postgres_admin -d money_me_app

# View database logs
docker logs money-me-postgres

# Backup database
docker exec money-me-postgres pg_dump -U postgres_admin money_me_app > backup.sql
```

### Single Command Management

**Start everything:**
```bash
npm run start:all    # PowerShell (Recommended)
```

**Stop everything:**
```bash
npm run stop:all     # PowerShell (Recommended)
```

**Restart everything:**
```bash
npm run restart:all  # PowerShell (Recommended)
```

### Manual Startup (Alternative)

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

**Start Services:**
- `npm run start:all` - Start all services (PowerShell - Recommended)

**Stop Services:**
- `npm run stop:all` - Stop all services (PowerShell - Recommended)

**Restart Services:**
- `npm run restart:all` - Restart all services (PowerShell - Recommended)

**Other Commands:**
- `npm run build` - Build Angular app
- `npm run docker:up` - Start database & backend only
- `npm run docker:down` - Stop database & backend

### Ports
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **Database**: localhost:5432

### 🗄️ Database Access & Management

**Connection Details:**
- **Host**: localhost (or 127.0.0.1)
- **Port**: 5432
- **Database**: money_me_app
- **Username**: postgres_admin
- **Password**: password123

**Connect via psql (PostgreSQL CLI):**
```bash
# Connect to the database
psql -h localhost -p 5432 -U postgres_admin -d money_me_app

# Or if you have psql in PATH
psql postgresql://postgres_admin:password123@localhost:5432/money_me_app
```

**Connect via Docker:**
```bash
# Access PostgreSQL shell directly in the container
docker exec -it money-me-postgres psql -U postgres_admin -d money_me_app

# Or bash into the container first
docker exec -it money-me-postgres bash
psql -U postgres_admin -d money_me_app
```

**Common Database Commands:**
```sql
-- List all tables
\dt

-- List all schemas
\dn

-- Describe a table structure
\d table_name

-- List all databases
\l

-- Switch databases
\c database_name

-- Exit psql
\q
```

**Database Management:**
```bash
# View database logs
docker logs money-me-postgres

# Backup database
docker exec money-me-postgres pg_dump -U postgres_admin money_me_app > backup.sql

# Restore database
docker exec -i money-me-postgres psql -U postgres_admin -d money_me_app < backup.sql

# Reset database (WARNING: This will delete all data)
docker-compose down -v
docker-compose up -d
```

**GUI Database Tools:**
```bash
# Popular PostgreSQL GUI clients you can use:
# - pgAdmin (web-based, free)
# - DBeaver (cross-platform, free)
# - DataGrip (JetBrains, paid)
# - TablePlus (macOS/Windows, paid)

# Connection settings for any GUI client:
# Host: localhost
# Port: 5432
# Database: money_me_app
# Username: postgres_admin
# Password: password123
```

### 🎯 Benefits of Single-Command Management

**Start Command (`npm run start:all`):**
- Automatically stops conflicting processes
- Coordinates Docker containers and local services
- Waits for each service to be healthy before proceeding
- Includes intelligent frontend detection with timeout handling
- Perfect for initial setup or after system restarts

**Stop Command (`npm run stop:all`):**
- Cleanly stops all services in the correct order
- Frees up ports 3000, 4200, and 5432
- Provides detailed status of what was stopped
- Safe to run multiple times

**Restart Command (`npm run restart:all`):**
- Complete service refresh - perfect for troubleshooting
- Stops everything cleanly, then starts fresh
- Ensures no lingering processes or port conflicts
- Ideal after code changes or when services become unresponsive

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
- Test connection: `docker exec money-me-postgres pg_isready -U postgres_admin`
- Check container logs: `docker logs money-me-postgres`
- Verify port 5432 is accessible: `netstat -an | findstr :5432`

### Frontend Not Loading
- Check if Angular is running: `netstat -an | findstr :4200`
- Restart with: `ng serve`

### PowerShell Files Opening in Editor Instead of Running
**Problem**: `.ps1` files open in Notepad++ or another text editor instead of executing.

**Solutions**:
1. **Use npm commands** (Recommended):
   ```bash
   npm run start:all
   npm run stop:all
   npm run restart:all
   ```

2. **Direct PowerShell execution**:
   ```bash
   powershell -ExecutionPolicy Bypass -File start-app.ps1
   ```

3. **Force PowerShell execution**:
   ```bash
   powershell -ExecutionPolicy Bypass -File start-app.ps1
   ```

4. **Fix file association** (Advanced):
   - Right-click a `.ps1` file → "Open with" → "Choose another app"
   - Select "Windows PowerShell" and check "Always use this app"

## 📝 Notes

- The app uses SCSS files for styling (not CSS)
- Buttons use subtle shading feedback instead of outlines
- Toggled content uses `[class.hidden]` for instant performance
- Main accent color is teal with gradients
- All components use separate HTML template files