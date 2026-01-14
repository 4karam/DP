# Integration Tests

Comprehensive integration tests for all API endpoints in the Excel to PostgreSQL application.

## Overview

These integration tests verify the complete functionality of the API endpoints by:
- Starting a real Fastify server
- Connecting to a test PostgreSQL database
- Testing actual HTTP requests and responses
- Verifying database operations

## Test Coverage

### Excel Import Tests (`import.test.ts`)
- File upload validation
- Excel file preview with type detection
- Data import to PostgreSQL
- Transaction rollback on errors
- Database connection testing

### Excel Export Tests (`export.test.ts`)
- Table listing
- Schema retrieval
- Column mapping approval
- Export to XLSX and JSONL formats
- File download
- Session management and cleanup

### Document Processing Tests (`document-processing.test.ts`)
- Document upload (text, PDF, images)
- Text extraction
- Chunking strategies (character, recursive, sentence, paragraph, markdown)
- Metadata enrichment (15+ fields)
- Chunk navigation (prev/next links)
- Saving chunks to database

### Chunk Management Tests (`chunk-management.test.ts`)
- Chunk table creation and listing
- Chunk insertion
- Querying with filters (source file, language, readability)
- Pagination (limit, offset)
- Statistics calculation
- Language distribution

### Health Tests (`health.test.ts`)
- Health check endpoint
- Database connection validation
- Custom database connection testing
- Connection error handling

## Setup

### Prerequisites

1. PostgreSQL server running
2. Test database created
3. Node.js dependencies installed

### Environment Setup

1. Create a test database:
```bash
createdb excel_import_test
```

2. Configure test environment:
The `.env.test` file is already configured with test database settings:
```env
DATABASE_URL=postgresql://excel_user:excel_password@localhost:5432/excel_import_test
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=*
MAX_FILE_SIZE=52428800
NODE_ENV=test
```

3. Install dependencies:
```bash
cd backend
npm install
```

## Running Tests

### Run all tests (unit + integration)
```bash
npm test
```

### Run only integration tests
```bash
npm run test:integration
```

### Run only unit tests
```bash
npm run test:unit
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- tests/integration/import.test.ts
```

## Test Structure

```
tests/
├── integration/
│   ├── setup.ts                      # Test app setup and teardown
│   ├── fixtures.ts                   # Test data and sample files
│   ├── import.test.ts                # Excel import endpoint tests
│   ├── export.test.ts                # Excel export endpoint tests
│   ├── document-processing.test.ts   # Document processing tests
│   ├── chunk-management.test.ts      # Chunk management tests
│   ├── health.test.ts                # Health and connection tests
│   └── README.md                     # This file
├── controllers/                      # Controller unit tests
├── repositories/                     # Repository unit tests
└── services/                         # Service unit tests
```

## Key Features

### Automatic Setup/Teardown
- Tests automatically initialize and close the Fastify app
- Database connections are properly managed
- Cleanup runs after each test to ensure isolation

### Test Fixtures
- Pre-built Excel files with various data types
- Sample text documents for processing
- Reusable chunk data

### Database Cleanup
- Each test starts with a clean database
- All created tables are dropped after tests
- Metadata tables are cleared

### Error Handling
- Tests verify both success and error cases
- Transaction rollback verification
- Connection error handling

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data after tests complete
3. **Realistic Data**: Use realistic test data that matches production scenarios
4. **Error Cases**: Test both success and failure paths
5. **Performance**: Keep tests fast by minimizing unnecessary operations

## Troubleshooting

### Tests fail with "database does not exist"
Create the test database:
```bash
createdb excel_import_test
```

### Tests fail with "connection refused"
Ensure PostgreSQL is running:
```bash
pg_isready
```

### Port already in use
Make sure no other instance of the backend is running on port 3001:
```bash
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows
```

### Tests hang or timeout
Check that:
- Database is accessible
- No connection leaks
- All async operations have proper cleanup

### Permission errors
Ensure the test database user has necessary permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE excel_import_test TO excel_user;
```

## CI/CD Integration

These tests are designed to run in CI/CD pipelines. Example GitHub Actions workflow:

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: excel_user
          POSTGRES_PASSWORD: excel_password
          POSTGRES_DB: excel_import_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm install
      - run: cd backend && npm run test:integration
```

## Contributing

When adding new API endpoints:

1. Create integration tests for all endpoints
2. Test both success and error cases
3. Verify database operations
4. Add cleanup for any created resources
5. Update this README with new test descriptions
