# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack Excel ⇄ PostgreSQL application with document processing capabilities (PDF, text, images). Built with Next.js 14 (frontend) and Fastify (backend), supporting intelligent document chunking with 15+ metadata fields per chunk.

## Development Commands

### Docker (Recommended)
```bash
# Start all services (frontend, backend, PostgreSQL, pgAdmin)
docker-compose up --build

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [backend|frontend|postgres]

# Remove volumes and data
docker-compose down -v
```

### Local Development

#### Backend (Port 3001)
```bash
cd backend
npm install
npm run dev        # Development with hot reload (tsx watch)
npm run build      # TypeScript compilation to dist/
npm start          # Production (runs compiled JS)
npm run lint       # ESLint
npm test           # Jest tests
```

#### Frontend (Port 3000)
```bash
cd frontend
npm install
npm run dev        # Next.js development server
npm run build      # Production build
npm start          # Production server
npm run lint       # Next.js linting
```

### Testing
```bash
# Backend: Run all tests (unit + integration)
cd backend && npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run specific test file
npm test -- importController.test.ts

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Integration Tests**: Located in `backend/tests/integration/`, these tests verify complete API endpoint functionality with real HTTP requests and database operations. Requires a test database (`excel_import_test`).

## Architecture Overview

### Three-Tier Architecture
```
Frontend (Next.js App Router)
    ↓ HTTP/JSON
Backend (Fastify REST API)
    ↓ PostgreSQL Protocol
Database (PostgreSQL + pgAdmin)
```

### Backend Structure (Layered Architecture)

The backend follows a **3-layer architecture** pattern:

1. **Routes Layer** (`backend/src/routes/`): HTTP handlers, request validation, response formatting
2. **Service Layer** (`backend/src/services/`): Business logic, orchestration between repositories
3. **Repository Layer** (`backend/src/repositories/`): Direct database operations, SQL queries

**Important**: New features follow this pattern:
- Routes call Services (never Repositories directly)
- Services call Repositories and contain business logic
- Repositories only handle database operations
- Controllers (`backend/src/controllers/`) wrap Services for testability

Example flow for Excel import:
```
upload.ts (route) → ImportController → ImportService → ImportRepository → PostgreSQL
```

### Key Backend Files

- `backend/src/index.ts`: Server initialization, plugin registration, route registration
- `backend/src/utils/database.ts`: Connection pool management (max 20 connections)
- `backend/src/utils/excelParser.ts`: XLSX parsing and automatic type detection
- `backend/src/utils/fileStorage.ts`: Temporary file handling
- `backend/src/utils/metadataEnhancer.ts`: Document chunking metadata (language detection, readability scores)

### Frontend Structure

Next.js 14 App Router with TypeScript:
```
frontend/src/
├── app/
│   ├── page.tsx           # Main page with 3 tabs (Import/Export/Process)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Dark theme styles
├── components/            # 12 reusable components
│   ├── FileUpload.tsx     # Excel upload with drag-drop
│   ├── SheetPreview.tsx   # Editable preview with type detection
│   ├── ImportResults.tsx  # Import success/error display
│   ├── ExportTable.tsx    # Table selection and export
│   ├── DocumentProcessor.tsx  # Document upload/processing orchestration
│   └── [others]           # Chunking, storage, modals
└── lib/
    └── api.ts             # Centralized API client functions
```

**State Management**: React useState with prop drilling (no Redux/Context needed for this scale)

## Database

### Connection Management

- **Development**: Use `DATABASE_URL` from `backend/.env`
- **Docker**: PostgreSQL runs on port 5432, credentials in docker-compose.yml
- **Connection Pool**: Max 20 connections, 30s idle timeout, 2s connection timeout
- **Custom Databases**: Import/Export features support custom database URLs at runtime

### Metadata Tables

- `chunk_tables`: Automatically created on server startup to track document chunk tables
- Dynamic tables created by user actions (Excel imports, document chunking)

## JSON Processing

### Supported Formats (`jsonParser.ts`)

- **JSON Array**: `[{"key": "value"}, {"key": "value"}]`
- **JSONL (JSON Lines)**: One JSON object per line
- All objects must have consistent structure (same keys)
- Automatic type detection for columns (same logic as Excel)
- Max file size: 50MB

### Import Flow

1. Upload → Validate JSON/JSONL format
2. Preview → Parse, detect types, return first 10 rows
3. Import → User edits columns/table name → Bulk insert with transaction safety

## Excel Processing

### Type Detection Logic (`excelParser.ts`)

Automatic inference order:
1. **BOOLEAN**: true/false/yes/no (case-insensitive)
2. **INTEGER**: Whole numbers without decimals
3. **FLOAT**: Numbers with decimals
4. **DATE**: Valid date strings (ISO 8601, MM/DD/YYYY, etc.)
5. **TIMESTAMP**: Datetime with time component
6. **TEXT**: Fallback for everything else

### Import Flow

1. Upload → Temporary file storage with UUID
2. Preview → Parse Excel, detect types, return first 10 rows
3. Import → User edits columns/table name → Bulk insert with transaction safety

### Export Flow

1. List tables → Query PostgreSQL schema
2. Get schema → Show column types and first row
3. Approve keys → User customizes column mapping
4. Process → Batch query (1000 rows/batch) → Generate XLSX or JSONL
5. Download → Stream file with automatic cleanup

## Document Processing

### Supported Formats

- PDF (via pdf.js)
- Text files (.txt, .md)
- Images (.png, .jpg, .jpeg with OCR via tesseract.js + Arabic support)

### Chunking Strategies

1. **Character-based**: Fixed size chunks (e.g., 1000 chars)
2. **Recursive** ⭐ Recommended: Structure-aware splitting (respects paragraphs, sentences)
3. **Sentence-based**: Natural sentence boundaries
4. **Paragraph-based**: Split on double newlines
5. **Markdown-aware**: Preserves markdown structure

### Metadata Fields (15+)

Every chunk includes:
- `chunk_index`, `content`, `char_count`, `word_count`
- `language` (English/Arabic/Mixed detection)
- `readability_score` (0-100)
- `has_urls`, `has_numbers`, `url_count`, `number_count`
- `ocr_confidence` (for images)
- `prev_chunk_id`, `next_chunk_id` (navigation)
- `source_file`, `page_number`, `created_at`

## Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://excel_user:excel_password@postgres:5432/excel_import
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000
MAX_FILE_SIZE=52428800  # 50MB
NODE_ENV=production
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## API Endpoints Summary

### Excel Import/Export
- `POST /api/upload` - Upload Excel file
- `POST /api/preview` - Preview with type detection
- `POST /api/import` - Import to PostgreSQL
- `GET /api/export/tables` - List all tables
- `POST /api/export/schema` - Get table schema
- `POST /api/export/approve-keys` - Approve column mapping
- `POST /api/export/process` - Generate export file
- `GET /api/export/download/:sessionId` - Download file

### JSON Import
- `POST /api/json/upload` - Upload JSON file
- `POST /api/json/preview` - Preview with type detection
- `POST /api/json/import` - Import to PostgreSQL

### Document Processing
- `POST /api/upload-document` - Upload document
- `POST /api/chunk-document` - Apply chunking strategy
- `POST /api/save-chunks` - Save to database
- `GET /api/chunk-tables` - List chunk tables
- `POST /api/create-chunk-table` - Create new table
- `POST /api/insert-chunks` - Insert chunks
- `GET /api/chunks` - Query chunks with filters
- `GET /api/chunk-stats` - Get statistics

### Health
- `GET /api/health` - Health check
- `POST /api/testConnection` - Test custom DB connection

## Code Patterns

### Transaction Safety

All database operations use transactions:
```typescript
await client.query('BEGIN');
try {
  // operations
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
}
```

### SQL Injection Prevention

Always use parameterized queries:
```typescript
// Good
await client.query('SELECT * FROM $1 WHERE id = $2', [tableName, id]);

// Bad - Never concatenate user input
await client.query(`SELECT * FROM ${tableName} WHERE id = ${id}`);
```

### File Storage Cleanup

Temporary files are automatically cleaned:
- On graceful shutdown (SIGTERM/SIGINT)
- After successful import/export
- 1-hour TTL for abandoned files

## Testing

### Test Structure

Tests located in `backend/tests/`:

**Unit Tests** (mock dependencies):
- `controllers/*.test.ts` - Controller unit tests
- `repositories/*.test.ts` - Repository tests with mocked DB
- `services/*.test.ts` - Service business logic tests

**Integration Tests** (`integration/` - test real endpoints):
- `import.test.ts` - Excel import endpoints (upload, preview, import)
- `export.test.ts` - Excel export endpoints (tables, schema, process, download)
- `document-processing.test.ts` - Document upload, chunking, and saving
- `chunk-management.test.ts` - Chunk table operations and queries
- `health.test.ts` - Health checks and connection testing
- `setup.ts` - Test app initialization and cleanup utilities
- `fixtures.ts` - Reusable test data (Excel files, documents, chunks)

### Integration Test Setup

1. **Create test database**:
```bash
createdb excel_import_test
```

2. **Environment**: Tests use `.env.test` with `excel_import_test` database

3. **Run tests**:
```bash
npm run test:integration
```

Integration tests automatically:
- Initialize Fastify app with all routes
- Connect to test database
- Clean up all test data after each test
- Close connections on teardown

Jest configuration in `backend/jest.config.js` with ts-jest preset.

## Docker Services

| Service | Port | Container Name | Purpose |
|---------|------|---------------|---------|
| Frontend | 3000 | excel-frontend | Next.js app |
| Backend | 3001 | excel-backend | Fastify API |
| PostgreSQL | 5432 | excel-postgres | Database |
| pgAdmin | 5050 | excel-pgadmin | DB management UI |

Health checks configured for all services with automatic dependency management.

## Performance Characteristics

- Small Excel (< 5MB): < 2 seconds
- Medium Excel (5-50MB): 2-5 seconds
- Bulk insert: 10K-50K rows/sec
- PDF extraction: 1-2 seconds
- OCR on images: 5-10 seconds
- Chunk queries: < 100ms

## Security Measures

- Parameterized SQL queries (no string concatenation)
- File type validation on upload
- 50MB file size limit
- CORS protection with origin whitelist
- Transaction rollback on errors
- Automatic input sanitization via TypeScript types
