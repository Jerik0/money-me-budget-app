# Money Me App 2025

A comprehensive money management application built with Angular frontend, Node.js/Express backend, and PostgreSQL database. Features recurring transaction management, timeline projections, and a modern calendar-based interface.

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

### Frontend Architecture
- **Framework**: Angular 20 with standalone components
- **Styling**: Tailwind CSS with custom SCSS
- **State Management**: Service-based with RxJS observables
- **Component Architecture**: Modular, single-responsibility components

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL 15 with Docker
- **API**: RESTful endpoints for transactions and categories
- **Data Layer**: Direct database connections with connection pooling

### Service Architecture
The application follows a service-oriented architecture with clear separation of concerns:

#### Core Services (`src/app/services/`)
- **`TransactionService`**: Manages transaction CRUD operations and API communication
- **`TimelineService`**: Handles timeline calculations, projections, and data grouping
- **`StorageService`**: Manages local storage and persistence
- **`ApiService`**: Centralized HTTP client for backend communication
- **`RecurrenceService`**: Manages recurring transaction patterns and calculations

#### Component Services (`src/app/components/transactions/`)
- **`RecurringTransactionService`**: Generates and manages recurring transactions
- **`RecurringTransactionHelperService`**: Helper utilities for recurring transaction logic
- **`CalendarDataService`**: Manages calendar view data and caching
- **`CalendarNavigationService`**: Handles month/year navigation and date calculations
- **`TransactionManagementService`**: Manages transaction form state and validation

## 📁 Project Structure

```
money-me-app-2025/
├── src/                    # Angular frontend
│   ├── app/
│   │   ├── components/     # Angular components
│   │   │   ├── transactions/           # Transaction management
│   │   │   │   ├── transactions.component.ts          # Main component (497 lines)
│   │   │   │   ├── recurring-transaction.service.ts   # Recurring transaction logic
│   │   │   │   ├── recurring-transaction-helper.service.ts # Helper utilities
│   │   │   │   ├── calendar-data.service.ts           # Calendar data management
│   │   │   │   ├── calendar-navigation.service.ts     # Navigation logic
│   │   │   │   ├── transaction-management.service.ts  # Form management
│   │   │   │   └── transactions.constants.ts          # Constants and options
│   │   │   ├── dashboard/              # Dashboard component
│   │   │   ├── balance-projection-chart/ # Balance projection visualization
│   │   │   └── shared/                 # Reusable components
│   │   │       ├── custom-dropdown/     # Custom dropdown component
│   │   │       └── custom-modal/        # Modal component
│   │   ├── services/       # Core Angular services
│   │   ├── interfaces/     # TypeScript interfaces
│   │   ├── enums/          # Application enums
│   │   └── utils/          # Utility functions
├── backend/                # Node.js backend
│   ├── src/
│   │   ├── controllers/    # API controllers
│   │   ├── database/       # Database connection & schema
│   │   │   ├── connection.js           # Database connection config
│   │   │   ├── schema.js              # Database schema definition
│   │   │   └── migrations/            # Database migration scripts
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

## 🗄️ Database Interaction

### Database Schema
The application uses a PostgreSQL database with the following key tables:

- **`transactions`**: Stores all transaction data including recurring transactions
- **`categories`**: Manages transaction categories
- **`recurring_patterns`**: Stores recurring transaction patterns and frequencies

### Database Connection
- **Host**: `postgres` (Docker container name)
- **Port**: 5432
- **Database**: `money_me_app`
- **Username**: `postgres_admin`
- **Password**: `password123`

**Important**: The application connects to the Docker database, not localhost. The connection is configured in `backend/src/database/connection.js`.

### Database Operations
The application performs the following database operations:

1. **Transaction Management**:
   - Fetch all transactions
   - Fetch recurring transactions
   - Insert new transactions
   - Update existing transactions
   - Delete transactions

2. **Recurring Transaction Generation**:
   - Automatically generates recurring transactions based on patterns
   - Supports daily, weekly, monthly, and yearly frequencies
   - Handles complex date calculations and month boundaries

3. **Data Migration**:
   - Database initialization scripts
   - Sample data insertion
   - Schema updates and migrations

### Database Access & Management

**Connection Details:**
- **Host**: postgres (Docker container)
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

**Running Database Migrations:**
```bash
# Navigate to backend directory
cd backend

# Run migrations
node src/database/migrations/run-migration.js

# Insert sample data
node src/database/insert-transactions.sql
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

## 🎯 Key Features

### Transaction Management
- **Recurring Transactions**: Support for daily, weekly, monthly, and yearly recurring transactions
- **Category Management**: Flexible category system with add/edit capabilities
- **Transaction Timeline**: Visual timeline showing transaction history and projections
- **Balance Projections**: Future balance calculations based on recurring transactions

### Calendar Interface
- **Month Navigation**: Easy month/year navigation with dropdown picker
- **3-Month View**: Shows current month plus two following months
- **Transaction Display**: Transactions displayed on their respective dates
- **Responsive Design**: Works on desktop and mobile devices

### Data Persistence
- **Local Storage**: User preferences and settings stored locally
- **Database Storage**: All transaction data stored in PostgreSQL
- **Real-time Updates**: Changes reflected immediately across all views

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

**Important**: The application connects to the Docker database (`postgres`), not localhost. Check `backend/src/database/connection.js` for the correct connection settings.

### Frontend Not Loading
- Check if Angular is running: `netstat -an | findstr :4200`
- Restart with: `ng serve`

### Transaction Data Not Showing
- Verify database has data: `docker exec -it money-me-postgres psql -U postgres_admin -d money_me_app -c "SELECT COUNT(*) FROM transactions;"`
- Check browser console for errors
- Verify backend API is responding: `curl http://localhost:3000/api/transactions`

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

## 📝 Development Notes

### Code Organization
- **Component Size**: Main transactions component reduced from 744 to 497 lines (33% reduction)
- **Service Architecture**: Business logic moved to appropriate services
- **Single Responsibility**: Each service has a clear, focused purpose
- **Maintainability**: Code is easier to understand, test, and modify

### Styling Guidelines
- The app uses SCSS files for styling (not CSS)
- Buttons use subtle shading feedback instead of outlines
- Toggled content uses `[class.hidden]` for instant performance
- Main accent color is teal with gradients
- All components use separate HTML template files

### Performance Considerations
- **Caching**: Calendar data service implements caching to prevent infinite loops
- **Lazy Loading**: Services are loaded only when needed
- **Efficient Filtering**: Timeline filtering optimized for performance
- **Memory Management**: Proper cleanup of subscriptions and caches

## 🔄 Recent Updates

### Refactoring Completed
- ✅ Moved complex timeline logic to `TimelineService`
- ✅ Consolidated recurring transaction logic in `RecurringTransactionService`
- ✅ Separated calendar data management into `CalendarDataService`
- ✅ Improved component maintainability and testability
- ✅ Fixed transaction data display issues

### Architecture Improvements
- ✅ Service-oriented architecture with clear separation of concerns
- ✅ Reduced component complexity and improved maintainability
- ✅ Better error handling and debugging capabilities
- ✅ Improved code organization and readability