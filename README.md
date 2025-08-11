# Money Me App 2025

A comprehensive money management application built with Angular frontend and Node.js backend with PostgreSQL database.

## 🚀 Quick Start

### Option 1: Docker (Recommended)
```bash
# Install Docker Desktop for Windows first
# Then run:
npm run docker:up
npm run dev:all
```

### Option 2: Local PostgreSQL
```bash
# Install PostgreSQL locally, then:
npm run dev
```

### Option 3: Windows Batch File
```bash
# Double-click start-app.bat
```

## 🛠️ Prerequisites

- Node.js 18+ 
- Angular CLI
- PostgreSQL 15+ (or Docker)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd money-me-app-2025
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ..
   ```

## 🗄️ Database Setup

### With Docker (Easiest)
```bash
npm run docker:up
```
This will:
- Start PostgreSQL on port 5432
- Create database `money_me_app`
- Create user `money_me_user` with password `money_me_password`
- Run initialization scripts automatically

### Local PostgreSQL Installation
1. Download from [PostgreSQL.org](https://www.postgresql.org/download/windows/)
2. Install with default settings
3. Create database and user:
   ```sql
   CREATE DATABASE money_me_app;
   CREATE USER money_me_user WITH PASSWORD 'money_me_password';
   GRANT ALL PRIVILEGES ON DATABASE money_me_app TO money_me_user;
   ```

## 🚀 Running the App

### Development Mode
```bash
# Start both frontend and backend
npm run dev

# Start with database
npm run dev:all

# Start only backend
npm run backend

# Start only frontend
npm run start
```

### Production Mode
```bash
npm run build
npm run backend:start
```

## 📱 Available Scripts

- `npm run start` - Start Angular frontend
- `npm run backend` - Start Node.js backend
- `npm run dev` - Start both frontend and backend
- `npm run docker:up` - Start PostgreSQL with Docker
- `npm run docker:down` - Stop PostgreSQL
- `npm run dev:all` - Start everything (PostgreSQL + Frontend + Backend)

## 🔧 Configuration

### Environment Variables
Create `.env` file in backend directory:
```env
DB_USER=money_me_user
DB_HOST=localhost
DB_NAME=money_me_app
DB_PASSWORD=money_me_password
DB_PORT=5432
PORT=3000
```

## 🏗️ Architecture

- **Frontend**: Angular 17 with Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with connection pooling
- **API**: RESTful endpoints for transactions and categories

## 📊 Database Schema

- **categories**: User-defined transaction categories
- **transactions**: Individual financial transactions
- **recurring_transactions**: Recurring transaction patterns

## 🧪 Testing

```bash
# Frontend tests
npm run test

# Backend tests (coming soon)
cd backend && npm test
```

## 📝 Development Notes

- Uses `[class.hidden]` instead of `*ngIf` for better performance
- SCSS files for styling
- Custom dropdown components with add/edit capabilities
- Form validation with dynamic button states
- Responsive design with Tailwind CSS

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Use different ports
ng serve --port 4201
# or
npm run backend -- --port 3001
```

### Database Connection Issues
1. Check if PostgreSQL is running
2. Verify credentials in `.env` file
3. Ensure database exists
4. Check firewall settings

### Docker Issues
1. Ensure Docker Desktop is running
2. Check if ports 5432 and 3000 are available
3. Restart Docker Desktop if needed

## 📞 Support

For issues or questions, please check the troubleshooting section above or create an issue in the repository.