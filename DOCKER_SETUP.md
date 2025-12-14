# Docker Setup Guide 🐳

Complete containerization of the Excel to PostgreSQL application with all services (Frontend, Backend, and PostgreSQL).

## Quick Start

**One command to start everything:**

```bash
docker-compose up --build
```

Then open: **http://localhost:3000**

## Architecture

```
┌─────────────────────────────────────────────────┐
│            Docker Compose Network              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────┐  ┌────────────────────┐  │
│  │   Frontend      │  │     Backend        │  │
│  │  (Next.js)      │  │    (Fastify)       │  │
│  │  Port: 3000     │  │    Port: 3001      │  │
│  └─────────────────┘  └────────────────────┘  │
│                              │                 │
│                              ↓                 │
│                      ┌─────────────────┐      │
│                      │   PostgreSQL    │      │
│                      │   Port: 5432    │      │
│                      └─────────────────┘      │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │         pgAdmin (Database GUI)          │  │
│  │         Port: 5050                      │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Services

### 1. Frontend (Next.js)
- **Image**: Built from `frontend/Dockerfile`
- **Port**: 3000
- **URL**: http://localhost:3000
- **Health Check**: Every 30 seconds
- **Environment**:
  - `NEXT_PUBLIC_API_URL=http://localhost:3001`
- **Depends On**: Backend (healthy)

### 2. Backend (Fastify)
- **Image**: Built from `backend/Dockerfile`
- **Port**: 3001
- **URL**: http://localhost:3001
- **Health Check**: Every 30 seconds
- **Environment**:
  - `DATABASE_URL=postgresql://excel_user:excel_password@postgres:5432/excel_import`
  - `PORT=3001`
  - `HOST=0.0.0.0`
  - `CORS_ORIGIN=http://localhost:3000`
  - `MAX_FILE_SIZE=52428800` (50MB)
  - `NODE_ENV=production`
- **Depends On**: PostgreSQL (healthy)

### 3. PostgreSQL
- **Image**: `postgres:15-alpine`
- **Port**: 5432
- **Credentials**:
  - Username: `excel_user`
  - Password: `excel_password`
  - Database: `excel_import`
- **Initialization**: `init.sql`
- **Volumes**: `postgres_data` (persistent storage)
- **Health Check**: Every 10 seconds

### 4. pgAdmin (Optional)
- **Image**: `dpage/pgadmin4:latest`
- **Port**: 5050
- **URL**: http://localhost:5050
- **Credentials**:
  - Email: `admin@example.com`
  - Password: `admin`
- **Use Case**: GUI database management

## Getting Started

### Prerequisites
- Docker (version 20.10+)
- Docker Compose (version 2.0+)
- 4GB free disk space
- Ports 3000, 3001, 5432, 5050 available

### Installation

1. **Download Docker**:
   - Windows/Mac: [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Linux: `sudo apt-get install docker.io docker-compose` (Ubuntu/Debian)

2. **Verify Installation**:
   ```bash
   docker --version
   docker-compose --version
   ```

### Running Services

#### Start All Services
```bash
docker-compose up --build
```

This will:
1. Build backend image from `backend/Dockerfile`
2. Build frontend image from `frontend/Dockerfile`
3. Pull PostgreSQL and pgAdmin images
4. Create a shared network `excel-network`
5. Start all 4 services
6. Show logs in your terminal

Output should show:
```
excel-postgres_1   | database system is ready to accept connections
excel-backend_1    | Server running on port 3001
excel-frontend_1   | Local: http://localhost:3000
```

#### Start in Background
```bash
docker-compose up -d --build
```

View logs:
```bash
docker-compose logs -f
```

#### Stop All Services
```bash
docker-compose down
```

#### Remove Data and Start Fresh
```bash
docker-compose down -v
```

This removes all volumes (PostgreSQL data, pgAdmin settings).

## Docker Compose Commands

### Status and Monitoring

```bash
# List running containers
docker-compose ps

# View logs (all services)
docker-compose logs

# View logs (specific service)
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# View live logs (follow)
docker-compose logs -f backend

# Container statistics (CPU, memory)
docker stats
```

### Building and Rebuilding

```bash
# Build images
docker-compose build

# Build specific service
docker-compose build backend

# Build and start (with rebuild)
docker-compose up --build

# Rebuild without cache
docker-compose build --no-cache
```

### Cleanup

```bash
# Stop containers (data preserved)
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Remove all unused images
docker image prune

# Full cleanup
docker system prune -a
```

## Accessing Services

### Frontend Application
- **URL**: http://localhost:3000
- **Features**: Excel import, Excel export, Document processing

### Backend API
- **Base URL**: http://localhost:3001
- **Docs**: Available in code (see `backend/src/routes/`)
- **Health Check**: http://localhost:3001/api/health

### Database Management
- **pgAdmin UI**: http://localhost:5050
- **Direct Connection**:
  ```
  Host: localhost
  Port: 5432
  User: excel_user
  Password: excel_password
  Database: excel_import
  ```

### Command Line Database Access
```bash
# From host machine (requires PostgreSQL client)
psql -h localhost -U excel_user -d excel_import

# From inside container
docker-compose exec postgres psql -U excel_user -d excel_import
```

## Environment Variables

### Backend (Auto-configured in docker-compose.yml)
```env
DATABASE_URL=postgresql://excel_user:excel_password@postgres:5432/excel_import
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000
MAX_FILE_SIZE=52428800
NODE_ENV=production
```

### Frontend (Auto-configured in docker-compose.yml)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### PostgreSQL (Auto-configured in docker-compose.yml)
```env
POSTGRES_USER=excel_user
POSTGRES_PASSWORD=excel_password
POSTGRES_DB=excel_import
```

## Dockerfiles Overview

### Backend Dockerfile
- **Base Image**: `node:18-alpine` (production stage)
- **Multi-stage Build**: Reduces image size
- **Features**:
  - Build TypeScript to JavaScript
  - Install only production dependencies
  - Health check via curl
  - Optimized Alpine Linux

**Size**: ~400MB

### Frontend Dockerfile
- **Base Image**: `node:18-alpine` (production stage)
- **Multi-stage Build**: Optimizes for Next.js
- **Features**:
  - Next.js build optimization
  - Standalone output
  - Health check via curl
  - Optimized Alpine Linux

**Size**: ~300MB

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process (macOS/Linux)
kill -9 <PID>

# Windows (PowerShell)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Failed

```bash
# Check if PostgreSQL is healthy
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Verify connection from host
psql -h localhost -U excel_user -d excel_import
```

### Container Crashes on Start

```bash
# View detailed logs
docker-compose logs [service-name]

# Rebuild without cache
docker-compose build --no-cache

# Start with verbose output
docker-compose up --verbose
```

### Out of Disk Space

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Check disk usage
docker system df
```

### Can't Access Frontend/Backend

```bash
# Verify containers are running
docker-compose ps

# Check network connectivity
docker network inspect excel-network

# Restart services
docker-compose restart
```

## Performance Tips

1. **Use `.dockerignore` files** - Speeds up builds by excluding unnecessary files
2. **Build images once** - `docker-compose build` before `up` if needed
3. **Monitor resource usage** - `docker stats` shows real-time usage
4. **Clean up regularly** - `docker system prune` removes unused resources
5. **Use Alpine images** - Smaller, faster containers

## Production Considerations

### For Production Deployment

The current docker-compose setup is suitable for **development and testing**. For production:

1. **Use secrets management** (don't hardcode credentials)
2. **Change default PostgreSQL password**
3. **Enable SSL/TLS** for connections
4. **Use external database** (RDS, Cloud SQL)
5. **Set up logging** (centralized, not console output)
6. **Configure backup strategy** for volumes
7. **Use reverse proxy** (Nginx, Traefik)
8. **Enable authentication** in application code
9. **Configure rate limiting** and CORS properly
10. **Use load balancer** for multiple instances

### Production docker-compose Example
```yaml
services:
  backend:
    environment:
      DATABASE_URL: ${DATABASE_URL}  # From secrets
      CORS_ORIGIN: ${CORS_ORIGIN}
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G

  frontend:
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    restart: always
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

## Docker Compose File Locations

```
project-root/
├── docker-compose.yml          ← Main compose file
├── init.sql                    ← Database initialization
├── backend/
│   ├── Dockerfile              ← Backend image definition
│   └── .dockerignore           ← Files to exclude
└── frontend/
    ├── Dockerfile              ← Frontend image definition
    └── .dockerignore           ← Files to exclude
```

## File Sizes

| Component | Size |
|-----------|------|
| Backend Image | ~400MB |
| Frontend Image | ~300MB |
| PostgreSQL Image | ~180MB |
| pgAdmin Image | ~250MB |
| **Total (compressed)** | ~250MB |
| **Total (extracted)** | ~1.1GB |

## Network Details

**Network Name**: `excel-network` (bridge)

**Services on Network**:
- postgres (hostname: `postgres`)
- backend (hostname: `backend`)
- frontend (hostname: `frontend`)
- pgadmin (hostname: `pgadmin`)

**Internal Communication**:
- Backend connects to PostgreSQL via: `postgresql://excel_user:excel_password@postgres:5432/excel_import`
- Frontend connects to Backend via: `http://backend:3001` (inside container)
- Frontend connects to Backend via: `http://localhost:3001` (from host)

## Volumes

```
excel_postgres_data    (PostgreSQL data - persistent)
excel_pgadmin_data     (pgAdmin config - persistent)
```

View volumes:
```bash
docker volume ls
docker volume inspect excel-postgres-postgres_data
```

## Health Checks

All services have health checks configured:

```bash
# Check container health
docker-compose ps

# View health check status
docker inspect excel-backend | grep -A 5 "Health"
```

## Next Steps

1. ✅ Run `docker-compose up --build`
2. ✅ Open http://localhost:3000
3. ✅ Test Excel import feature
4. ✅ Test Document processing
5. ✅ Access pgAdmin at http://localhost:5050
6. ✅ Use application normally

## Support

For issues:
1. Check logs: `docker-compose logs [service]`
2. Verify Docker installation: `docker --version`
3. Ensure ports are available: `lsof -i :3000`
4. Check disk space: `df -h`
5. Try rebuilding: `docker-compose build --no-cache`

---

**Docker Setup Complete! 🎉**

All services are containerized and ready to run with a single command:
```bash
docker-compose up --build
```

