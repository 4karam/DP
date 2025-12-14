# 🏛️ Architecture & Best Practices

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser Client                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Next.js 14 Frontend (React + TypeScript)             │ │
│  │  • App Router (Server/Client Components)              │ │
│  │  • Tailwind CSS (Dark Theme)                          │ │
│  │  • React Dropzone (File Upload)                       │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │
                    HTTP REST API (JSON)
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   Fastify Backend Server                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Routes Layer                                          │ │
│  │  • /api/upload   - Multipart file handling            │ │
│  │  • /api/preview  - Excel parsing                      │ │
│  │  • /api/import   - Database operations                │ │
│  │  • /api/health   - Health checks                      │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Services Layer                                        │ │
│  │  • Import Service - Table creation & bulk insert      │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Utilities Layer                                       │ │
│  │  • Excel Parser - XLSX reading & type detection       │ │
│  │  • Database Pool - Connection management              │ │
│  │  • File Storage - Temporary file handling             │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │
                    PostgreSQL Protocol
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    PostgreSQL Database                       │
│  • Dynamic table creation                                    │
│  • Parameterized queries (SQL injection prevention)          │
│  • Transaction support                                       │
│  • Connection pooling (max 20 connections)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Details

### Frontend Architecture

#### Technology Stack
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first CSS with dark theme
- **React Dropzone**: Drag-and-drop file upload

#### Directory Structure
```
frontend/src/
├── app/
│   ├── layout.tsx          # Root layout (metadata, fonts)
│   ├── page.tsx            # Main application page
│   └── globals.css         # Global styles & theme
├── components/
│   ├── FileUpload.tsx      # Drag-and-drop upload component
│   ├── SheetPreview.tsx    # Sheet preview & editing
│   └── ImportResults.tsx   # Results display
└── lib/
    └── api.ts              # API client functions
```

#### State Management
- **React useState**: Local component state
- **Prop drilling**: Parent-to-child communication
- **No global state**: Simple, predictable data flow

#### UI/UX Design Principles
1. **Progressive Disclosure**: Show only relevant information at each step
2. **Visual Feedback**: Loading states, progress indicators, animations
3. **Error Handling**: Clear, actionable error messages
4. **Accessibility**: Semantic HTML, keyboard navigation
5. **Dark Theme**: Reduced eye strain, modern aesthetic

---

### Backend Architecture

#### Technology Stack
- **Fastify**: High-performance web framework
- **TypeScript**: Type safety and developer experience
- **pg (node-postgres)**: PostgreSQL client
- **xlsx**: Excel file parsing
- **@fastify/multipart**: File upload support
- **@fastify/cors**: Cross-origin requests

#### Directory Structure
```
backend/src/
├── index.ts                # Server initialization & routing
├── routes/
│   ├── upload.ts           # File upload handler
│   ├── preview.ts          # Preview generation
│   ├── import.ts           # Import orchestration
│   └── health.ts           # Health check
├── services/
│   └── importService.ts    # Database operations
└── utils/
    ├── database.ts         # Connection pool management
    ├── excelParser.ts      # Excel parsing & type detection
    └── fileStorage.ts      # Temporary file storage
```

#### Design Patterns

##### 1. **Separation of Concerns**
- Routes: HTTP request/response handling
- Services: Business logic
- Utils: Reusable helpers

##### 2. **Dependency Injection**
- Database pool initialized once
- Shared across all routes via imports

##### 3. **Error Handling**
- Try-catch blocks in all async operations
- Consistent error response format
- Transaction rollback on failures

##### 4. **Resource Management**
- Connection pooling for database
- Automatic file cleanup (1-hour expiration)
- Graceful shutdown handlers

---

## Data Flow

### Complete Import Workflow

```
┌──────────┐
│  User    │
└────┬─────┘
     │
     │ 1. Drag & drop Excel file
     ▼
┌──────────────────┐
│  FileUpload      │
│  Component       │
└────┬─────────────┘
     │
     │ 2. POST /api/upload (multipart/form-data)
     ▼
┌──────────────────┐
│  Upload Route    │──────┐
└────┬─────────────┘      │
     │                    │ 3. Store in memory
     │ 4. Return fileId   │
     ▼                    ▼
┌──────────────────┐  ┌──────────────┐
│  Main Page       │  │ File Storage │
└────┬─────────────┘  └──────────────┘
     │
     │ 5. POST /api/preview { fileId }
     ▼
┌──────────────────┐
│  Preview Route   │──────┐
└────┬─────────────┘      │
     │                    │ 6. Parse Excel
     │                    │    - Extract sheets
     │                    │    - Detect types
     │                    │    - Sample data
     │                    ▼
     │              ┌──────────────┐
     │              │ Excel Parser │
     │              └──────────────┘
     │ 7. Return preview data
     ▼
┌──────────────────┐
│  SheetPreview    │
│  Components      │
└────┬─────────────┘
     │
     │ 8. User edits columns
     │
     │ 9. POST /api/import { fileId, tables }
     ▼
┌──────────────────┐
│  Import Route    │
└────┬─────────────┘
     │
     │ 10. For each table:
     ▼
┌──────────────────┐
│  Import Service  │──────┐
└────┬─────────────┘      │
     │                    │ 11. BEGIN transaction
     │                    │ 12. DROP TABLE IF EXISTS
     │                    │ 13. CREATE TABLE
     │                    │ 14. Bulk INSERT (batches)
     │                    │ 15. COMMIT transaction
     │                    ▼
     │              ┌──────────────┐
     │              │  PostgreSQL  │
     │              └──────────────┘
     │ 16. Return results
     ▼
┌──────────────────┐
│  ImportResults   │
│  Component       │
└──────────────────┘
```

---

## Performance Optimizations

### 1. **Bulk Insert Operations**
```typescript
// Insert 1000 rows per batch
const batchSize = 1000;
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);
  // Build single INSERT with multiple VALUES
  await client.query(insertSQL, values);
}
```

**Benefits:**
- 10-100x faster than individual INSERTs
- Reduces network round-trips
- Optimizes database write operations

### 2. **Connection Pooling**
```typescript
const pool = new Pool({
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle after 30s
  connectionTimeoutMillis: 2000
});
```

**Benefits:**
- Reuses connections
- Prevents connection exhaustion
- Handles concurrent requests efficiently

### 3. **Type Detection Sampling**
```typescript
// Only analyze first 1000 rows for type detection
const sample = nonNullValues.slice(0, 1000);
```

**Benefits:**
- Faster preview generation
- Consistent performance regardless of file size
- Accurate type detection for most datasets

### 4. **In-Memory File Storage**
```typescript
const fileStorage = new Map<string, StoredFile>();
```

**Benefits:**
- No disk I/O overhead
- Fast file access
- Automatic cleanup via expiration

### 5. **Transaction Safety**
```typescript
await client.query('BEGIN');
try {
  await createTable();
  await insertData();
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
}
```

**Benefits:**
- All-or-nothing semantics
- Data consistency
- Automatic rollback on errors

---

## Security Best Practices

### 1. **SQL Injection Prevention**
```typescript
// ✅ GOOD: Parameterized queries
await client.query('INSERT INTO table (col) VALUES ($1)', [value]);

// ❌ BAD: String concatenation
await client.query(`INSERT INTO table (col) VALUES ('${value}')`);
```

### 2. **Input Validation**
```typescript
// File type validation
const validTypes = ['.xlsx', '.xls', '.xlsm'];

// File size validation
if (buffer.length > MAX_FILE_SIZE) throw new Error();

// Column name sanitization
name.toLowerCase().replace(/[^a-z0-9_]/g, '_')
```

### 3. **CORS Configuration**
```typescript
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN, // Specific origin, not '*'
  credentials: true
});
```

### 4. **Environment Variables**
```typescript
// ✅ GOOD: Never commit credentials
DATABASE_URL=postgresql://...

// ❌ BAD: Hardcoded credentials
const url = 'postgresql://user:pass@...';
```

### 5. **Error Message Sanitization**
```typescript
// ✅ GOOD: Generic error to client
return { error: 'Failed to import data' };

// ❌ BAD: Exposes internal details
return { error: error.stack };
```

---

## Error Handling Strategy

### 1. **Layered Error Handling**
```
Route Layer     → Catch HTTP errors, return JSON
Service Layer   → Catch business logic errors
Database Layer  → Catch connection/query errors
```

### 2. **Transaction Rollback**
All database operations use transactions:
- Success: COMMIT
- Failure: ROLLBACK
- Ensures data consistency

### 3. **User-Friendly Messages**
```typescript
// Technical error
"column 'abc' of relation 'table' does not exist"

// User-friendly error
"Failed to create table. Please check your column names."
```

### 4. **Logging**
- Development: Detailed console logs
- Production: Structured logging (JSON)
- Error tracking: Integrate with Sentry/Datadog

---

## Testing Strategy

### Recommended Test Coverage

#### Backend Tests
```javascript
// Unit Tests
- excelParser.detectColumnType()
- excelParser.sanitizeColumnName()
- database.withClient()

// Integration Tests
- POST /api/upload with valid file
- POST /api/preview with fileId
- POST /api/import end-to-end

// E2E Tests
- Complete workflow: upload → preview → import
```

#### Frontend Tests
```javascript
// Component Tests
- FileUpload rendering and interaction
- SheetPreview column editing
- ImportResults display

// Integration Tests
- API calls with mock responses
- Error handling flows
- State management
```

### Testing Tools
- **Backend**: Jest, Supertest
- **Frontend**: Jest, React Testing Library
- **E2E**: Playwright, Cypress

---

## Scalability Considerations

### Current Limitations
- **File Storage**: In-memory (single server)
- **Concurrency**: Limited by connection pool (20)
- **File Size**: 50MB max

### Scaling Solutions

#### 1. **Horizontal Scaling**
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Server 1 │     │ Server 2 │     │ Server 3 │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     └────────────────┼────────────────┘
                      │
                ┌─────▼──────┐
                │   Redis    │ ← Shared file storage
                └────────────┘
```

#### 2. **Database Scaling**
- Read replicas for queries
- Partitioning for large tables
- Indexing on frequently queried columns

#### 3. **Large File Handling**
- Streaming uploads
- Chunked processing
- Background jobs (Bull, BeeQueue)

#### 4. **Caching**
- Redis for file storage
- Cached previews
- CDN for frontend assets

---

## Monitoring & Observability

### Key Metrics to Track

1. **API Performance**
   - Request latency (p50, p95, p99)
   - Request rate
   - Error rate

2. **Database**
   - Connection pool usage
   - Query execution time
   - Active connections

3. **Business Metrics**
   - Files uploaded per hour
   - Average rows imported
   - Success/failure rate

### Recommended Tools
- **APM**: New Relic, Datadog
- **Logging**: ELK Stack, Loki
- **Errors**: Sentry
- **Uptime**: Pingdom, UptimeRobot

---

## Deployment Architecture

### Development
```
localhost:3000 (Frontend) → localhost:3001 (Backend) → localhost:5432 (PostgreSQL)
```

### Production
```
┌─────────────┐
│   Vercel    │ ← Frontend (Next.js)
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐
│   AWS EC2   │ ← Backend (Fastify)
└──────┬──────┘
       │ SSL/TLS
       ▼
┌─────────────┐
│   AWS RDS   │ ← PostgreSQL
└─────────────┘
```

### Environment Variables by Stage

**Development:**
- Local database
- CORS: localhost:3000
- Debug logging

**Staging:**
- Test database
- CORS: staging domain
- Info logging

**Production:**
- Production database
- CORS: production domain
- Error logging only
- SSL/TLS required

---

## Code Quality Standards

### TypeScript
- Strict mode enabled
- No `any` types
- Explicit return types for functions

### Code Style
- ESLint for linting
- Prettier for formatting
- Consistent naming conventions

### Documentation
- JSDoc comments for public APIs
- README for each major component
- Architecture decision records (ADRs)

---

## Future Enhancements

### Potential Features
1. **Authentication & Authorization**
   - User accounts
   - Role-based access
   - API keys

2. **Advanced Type Detection**
   - Custom type mappings
   - Type hints from user
   - ML-based detection

3. **Incremental Updates**
   - UPDATE instead of DROP/CREATE
   - Upsert operations
   - Change detection

4. **Data Validation**
   - Schema validation
   - Custom rules
   - Data quality checks

5. **Scheduling**
   - Recurring imports
   - Cron jobs
   - Email notifications

6. **Export Functionality**
   - Export tables to Excel
   - Custom queries
   - Scheduled reports

---

## Conclusion

This architecture provides:
- ✅ Clean separation of concerns
- ✅ Type safety throughout
- ✅ Performance optimization
- ✅ Security best practices
- ✅ Scalability foundation
- ✅ Maintainability
- ✅ Testability

The system is production-ready for small-to-medium workloads and can be extended for enterprise use cases.
