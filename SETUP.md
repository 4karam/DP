# 🚀 Complete Setup Guide

This guide will walk you through setting up the Excel to PostgreSQL import system from scratch.

## 📋 Prerequisites

- **Node.js** 18.0 or higher ([Download](https://nodejs.org/))
- **PostgreSQL** 12.0 or higher ([Download](https://www.postgresql.org/download/))
- **npm** or **yarn** package manager
- A terminal/command prompt

## 🔧 Step 1: PostgreSQL Setup

### 1.1 Create Database

Open your PostgreSQL client (psql, pgAdmin, etc.) and create a new database:

```sql
CREATE DATABASE excel_import;
```

### 1.2 Create User (Optional but Recommended)

```sql
CREATE USER excel_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE excel_import TO excel_user;
```

### 1.3 Get Connection String

Your connection string should look like:
```
postgresql://username:password@localhost:5432/database_name
```

Example:
```
postgresql://excel_user:your_secure_password@localhost:5432/excel_import
```

## 🔨 Step 2: Backend Setup

### 2.1 Navigate to Backend Directory

```bash
cd backend
```

### 2.2 Install Dependencies

```bash
npm install
```

This will install:
- Fastify (web server)
- PostgreSQL client (pg)
- Excel parser (xlsx)
- Multipart form support
- CORS support
- TypeScript and development tools

### 2.3 Create Environment File

```bash
cp .env.example .env
```

### 2.4 Edit .env File

Open `.env` in your text editor and update with your PostgreSQL credentials:

```env
# Your PostgreSQL connection string
DATABASE_URL=postgresql://excel_user:your_secure_password@localhost:5432/excel_import

# Server port (default: 3001)
PORT=3001

# Server host
HOST=0.0.0.0

# Max file size in bytes (default: 50MB)
MAX_FILE_SIZE=52428800

# CORS origin (your frontend URL)
CORS_ORIGIN=http://localhost:3000
```

### 2.5 Start Backend Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

You should see:
```
🔌 Connecting to PostgreSQL...
✅ Database connected
🚀 Server ready!
📍 API: http://localhost:3001/api
💚 Health: http://localhost:3001/api/health
```

### 2.6 Verify Backend

Open your browser or use curl:
```bash
curl http://localhost:3001/api/health
```

You should see:
```json
{
  "success": true,
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-..."
}
```

## 🎨 Step 3: Frontend Setup

### 3.1 Open New Terminal

Keep the backend running and open a new terminal window.

### 3.2 Navigate to Frontend Directory

```bash
cd frontend
```

### 3.3 Install Dependencies

```bash
npm install
```

This will install:
- Next.js 14 (React framework with App Router)
- React and React DOM
- Tailwind CSS (styling)
- React Dropzone (file upload)
- TypeScript

### 3.4 Create Environment File

```bash
cp .env.local.example .env.local
```

### 3.5 Edit .env.local File

Open `.env.local` and verify/update the API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3.6 Start Frontend Development Server

```bash
npm run dev
```

You should see:
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Ready in X.Xs
```

### 3.7 Open Application

Open your browser and navigate to:
```
http://localhost:3000
```

## ✅ Step 4: Verify Installation

### 4.1 Check Backend Health

Visit: `http://localhost:3001/api/health`

Should return healthy status.

### 4.2 Test File Upload

1. Open `http://localhost:3000`
2. You should see a dark-themed interface with a file upload area
3. Try dragging and dropping an Excel file or clicking to browse

### 4.3 Test Full Workflow

1. **Upload** a sample Excel file
2. **Preview** the detected sheets and columns
3. **Edit** column names or types if needed
4. **Import** to PostgreSQL
5. **View** the success report

## 🗃️ Step 5: Verify Database Tables

After a successful import, check your PostgreSQL database:

```sql
-- Connect to your database
\c excel_import

-- List all tables
\dt

-- View table structure
\d your_table_name

-- View data
SELECT * FROM your_table_name LIMIT 10;
```

## 🔍 Troubleshooting

### Backend Issues

**Problem: "DATABASE_URL environment variable is required"**
- Solution: Make sure you created the `.env` file in the backend directory with valid DATABASE_URL

**Problem: "Database connection test failed"**
- Solution: Verify PostgreSQL is running and connection string is correct
- Test connection: `psql postgresql://username:password@localhost:5432/database`

**Problem: "Port 3001 already in use"**
- Solution: Change PORT in `.env` to a different port (e.g., 3002)

### Frontend Issues

**Problem: "Failed to upload file"**
- Solution: Ensure backend is running on http://localhost:3001
- Check NEXT_PUBLIC_API_URL in `.env.local`

**Problem: "Network error"**
- Solution: Check that backend and frontend are running
- Verify CORS settings in backend `.env`

### File Upload Issues

**Problem: "Invalid file type"**
- Solution: Only .xlsx, .xls, and .xlsm files are supported
- Make sure file is a valid Excel file

**Problem: "File size exceeds limit"**
- Solution: Default limit is 50MB
- Increase MAX_FILE_SIZE in backend `.env` if needed

## 🌐 Production Deployment

### Backend Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables
3. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start dist/index.js --name excel-api
```

### Frontend Deployment

1. Build for production:
```bash
npm run build
```

2. Start production server:
```bash
npm start
```

Or deploy to:
- Vercel (recommended for Next.js)
- Netlify
- Your own server with Node.js

### Environment Variables for Production

**Backend:**
- Update DATABASE_URL with production database
- Set CORS_ORIGIN to your frontend domain
- Consider using environment-specific configs

**Frontend:**
- Update NEXT_PUBLIC_API_URL to your production API URL

## 📚 Additional Resources

### Sample Excel File

Create a test Excel file with:
- Multiple sheets
- Various data types (text, numbers, dates, booleans)
- Headers in the first row

### API Testing

Use tools like Postman or curl to test API endpoints:

```bash
# Upload file
curl -X POST http://localhost:3001/api/upload \
  -F "file=@path/to/your/file.xlsx"

# Preview file
curl -X POST http://localhost:3001/api/preview \
  -H "Content-Type: application/json" \
  -d '{"fileId": "your-file-id"}'
```

## 🎉 Success!

You now have a fully functional Excel to PostgreSQL import system!

- **Backend API**: http://localhost:3001/api
- **Frontend UI**: http://localhost:3000
- **Database**: Your PostgreSQL instance

## 📞 Support

If you encounter any issues:
1. Check the console logs in both backend and frontend terminals
2. Verify all environment variables are set correctly
3. Ensure PostgreSQL is running and accessible
4. Review the troubleshooting section above

Happy importing! 🚀
