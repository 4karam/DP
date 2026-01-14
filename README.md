# Excel ⇄ PostgreSQL + Document Processor 🚀

A complete full-stack application for importing/exporting Excel and JSON files, and processing documents (PDF, Text, Images) with intelligent text chunking and rich metadata enrichment.

## ✨ Features

### 📥 Excel Import
- Upload Excel files with drag & drop
- Automatic type detection (TEXT, INTEGER, FLOAT, BOOLEAN, DATE, TIMESTAMP)
- Preview with editable columns
- Customize table names
- Bulk import with transaction safety

### 📊 JSON Import
- Upload JSON files (.json) or JSONL (.jsonl)
- Support for JSON arrays and JSON Lines format
- Automatic type detection for all fields
- Preview with editable columns
- Direct import to PostgreSQL

### 📤 Excel Export
- Export any PostgreSQL table to Excel
- Custom column name mapping
- Support for Excel (.xlsx) and JSONL formats
- Batch processing for large tables
- Real-time progress tracking

### 📚 Document Processing
- Upload: PDF, Text, Images (with OCR + Arabic support)
- Chunk: 5 intelligent strategies
  - Character-based (fixed size)
  - Recursive (structure-aware) ⭐ Recommended
  - Sentence-based
  - Paragraph-based
  - Markdown-aware
- Metadata: 15+ fields per chunk
  - Language detection (English, Arabic, mixed)
  - Readability score (0-100)
  - Content analysis (URLs, numbers)
  - OCR confidence
  - Navigation links (prev/next)
- Storage: Create new or add to existing tables
- Query: Filter by file, language, readability

## 🏗️ Architecture

```
Frontend (Next.js - Port 3000)
    ↓
Backend (Fastify - Port 3001)
    ├── Excel routes (upload, preview, import, export)
    ├── JSON routes (upload, preview, import)
    ├── Document routes (upload, extract, chunk, save)
    └── Chunk management (query, statistics)
    ↓
PostgreSQL Database
```

## 📋 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, Tailwind CSS, TypeScript |
| **Backend** | Fastify, Node.js, TypeScript |
| **Document Processing** | PDF.js, Tesseract.js, sentence-splitter, wink-nlp |
| **Database** | PostgreSQL 12+ |
| **Type Detection** | Custom inference engine |

## 🚀 Quick Start

### Option 1: Docker Compose (Easiest) ⭐ Recommended

Start all services with a single command:

```bash
docker-compose up --build
```

Then open: **http://localhost:3000**

**Services automatically started:**
- Frontend (Next.js) - http://localhost:3000
- Backend (Fastify) - http://localhost:3001
- PostgreSQL - localhost:5432
- pgAdmin - http://localhost:5050

### Option 2: Local Development (3 steps)

#### Step 1: Install Dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

#### Step 2: Start Services
```bash
# Terminal 1: Backend (port 3001)
cd backend && npm run dev

# Terminal 2: Frontend (port 3000)
cd frontend && npm run dev
```

#### Step 3: Open Application
```
http://localhost:3000
```

### Features Available
- **📥 Import Excel** - Excel to PostgreSQL
- **📋 Import JSON** - JSON/JSONL to PostgreSQL
- **📤 Export Table** - PostgreSQL to Excel/JSONL
- **📚 Process Documents** - PDF/Text/Images with chunking

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [START_HERE.md](START_HERE.md) | 3-step quick start |
| [QUICK_RUN_GUIDE.md](QUICK_RUN_GUIDE.md) | Complete setup guide |
| [SETUP.md](SETUP.md) | Environment configuration |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design details |
| [BACKEND_INTEGRATION_GUIDE.md](BACKEND_INTEGRATION_GUIDE.md) | Backend architecture |
| [FRONTEND_QUICK_REFERENCE.md](FRONTEND_QUICK_REFERENCE.md) | Frontend components |
| [INTEGRATION_COMPLETE.md](INTEGRATION_COMPLETE.md) | Integration status |
| [RUN_COMMANDS.sh](RUN_COMMANDS.sh) | Copy-paste commands |

## ⚙️ Environment Setup

### Prerequisites for Docker (Recommended)
- Docker
- Docker Compose
- 4GB free disk space

### Prerequisites for Local Development
- Node.js 18+
- PostgreSQL 12+
- 2GB free disk space

### Backend Configuration (.env)
```
DATABASE_URL=postgresql://excel_user:excel_password@postgres:5432/excel_import
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000
MAX_FILE_SIZE=52428800
NODE_ENV=production
```

### Frontend Configuration (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Docker Services

When using `docker-compose up`:

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Frontend | 3000 | http://localhost:3000 | Next.js application |
| Backend | 3001 | http://localhost:3001 | Fastify API server |
| PostgreSQL | 5432 | localhost:5432 | Database |
| pgAdmin | 5050 | http://localhost:5050 | Database management |

**Docker Compose commands:**
```bash
# Start all services (with rebuild)
docker-compose up --build

# Start services in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Remove volumes and data
docker-compose down -v
```

## 🎯 What You Can Do

### Excel Import Workflow
1. Upload Excel file
2. Preview data with auto-detected types
3. Customize columns and table names
4. Import to PostgreSQL

### Excel Export Workflow
1. Select table to export
2. Map column names
3. Generate Excel file
4. Download

### Document Processing Workflow
1. Upload document (PDF, text, image)
2. Configure chunking method and parameters
3. Choose storage (new table or existing)
4. Store chunks with 15+ metadata fields
5. Query and analyze chunks

## 🔌 API Endpoints

### Excel Import/Export
```
POST   /api/upload              → Upload Excel
POST   /api/preview             → Preview data
POST   /api/import              → Import to DB
GET    /api/export/tables       → List tables
POST   /api/export/schema       → Get schema
POST   /api/export/approve-keys → Confirm mapping
POST   /api/export/process      → Generate file
GET    /api/export/download/:id → Download
```

### JSON Import
```
POST   /api/json/upload         → Upload JSON
POST   /api/json/preview        → Preview data
POST   /api/json/import         → Import to DB
```

### Document Processing
```
POST   /api/documents/upload    → Upload file
POST   /api/documents/extract   → Extract text
POST   /api/documents/chunk     → Create chunks
GET    /api/documents/tables    → List tables
POST   /api/documents/save      → Save chunks
```

### Chunk Queries
```
GET    /api/chunks?tableId=...            → Query chunks
GET    /api/chunk-stats?tableId=...       → Statistics
POST   /api/create-chunk-table            → Create table
POST   /api/insert-chunks                 → Insert chunks
```

## 🔒 Security

✅ SQL injection prevention (parameterized queries)
✅ File type validation
✅ File size limits (50MB)
✅ CORS protection
✅ Transaction safety
✅ Automatic input sanitization

## 📊 Performance

| Operation | Speed |
|-----------|-------|
| Small Excel (< 5MB) | < 2 seconds |
| Medium Excel (5-50MB) | 2-5 seconds |
| PDF extraction | 1-2 seconds |
| OCR on images | 5-10 seconds |
| Bulk insert | 10K-50K rows/sec |
| Query with filters | < 100ms |

## 🎓 Project Status

✅ **Excel Import** - Fully implemented
✅ **Excel Export** - Fully implemented
✅ **Document Processing** - Fully implemented
✅ **Frontend** - All 3 tabs complete
✅ **Backend** - Integrated single service
✅ **Database** - Optimized with indexes
✅ **Documentation** - Comprehensive

**Status**: 🚀 **Production Ready**

## 🆘 Troubleshooting

**Port already in use?**
```bash
# Find and kill process
lsof -i :3001  # Backend
lsof -i :3000  # Frontend
lsof -i :5432  # PostgreSQL
```

**Database connection failed?**
```bash
# Verify PostgreSQL is running
pg_isready

# Check .env DATABASE_URL
cat backend/.env
```

**npm install fails?**
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

See **[QUICK_RUN_GUIDE.md](QUICK_RUN_GUIDE.md)** for detailed troubleshooting.

## 📈 Version Info

| Component | Version |
|-----------|---------|
| System | 2.0.0 (Integrated) |
| Node.js | 18+ |
| React | 18+ |
| Next.js | 14+ |
| PostgreSQL | 12+ |

## 📝 License

MIT

---

**Last Updated**: January 15, 2026
**Maintainer**: Excel to PostgreSQL Team
**Status**: ✅ Production Ready
