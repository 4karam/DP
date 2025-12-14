# 🚀 START HERE - Quick Run Guide

## 3-Step Quick Start (10 minutes)

### Terminal 1: Start Backend
```bash
cd backend
npm install
npm run dev
```
✅ Wait for: "Server running at http://localhost:3001"

### Terminal 2: Start Document Processor
```bash
cd document-processor
npm install
npm run build
npm run dev
```
✅ Wait for: "Document Processor API running at http://0.0.0.0:3002"

### Terminal 3: Test It!
```bash
# Create test file
echo "Hello world test document" > test.txt

# Upload
curl -F "file=@test.txt" http://localhost:3002/api/v1/upload

# Check health
curl http://localhost:3002/health
```

✅ Done! System is running.

---

## Next: Test Complete Workflow

```bash
# 1. Upload document
RESPONSE=$(curl -s -F "file=@test.txt" http://localhost:3002/api/v1/upload)
FILE_ID=$(echo $RESPONSE | grep -o '"fileId":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Uploaded: $FILE_ID"

# 2. Chunk it
curl -s -X POST http://localhost:3002/api/v1/chunk \
  -H "Content-Type: application/json" \
  -d "{
    \"fileId\": \"$FILE_ID\",
    \"splittingMethod\": \"character\",
    \"chunkSize\": 100,
    \"chunkOverlap\": 20
  }" | head -c 500

# 3. Save to new table
# (See QUICK_RUN_GUIDE.md for full example)
```

---

## Services & URLs

| Service | URL | Status |
|---------|-----|--------|
| Backend | http://localhost:3001 | Check: `curl http://localhost:3001/api/health` |
| Document Processor | http://localhost:3002 | Check: `curl http://localhost:3002/health` |
| Frontend | http://localhost:3000 | Optional |
| PostgreSQL | localhost:5432 | Should be running |

---

## Troubleshooting

### Port already in use?
```bash
# Find process
lsof -i :3002

# Kill it
kill -9 <PID>
```

### npm install fails?
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

### PostgreSQL not running?
```bash
# Check if running
pg_isready

# Start PostgreSQL (macOS)
brew services start postgresql

# Start PostgreSQL (Linux)
sudo service postgresql start
```

### Node version issue?
```bash
# Check version
node --version  # Should be 18+

# Update if needed
brew install node@18  # macOS
```

---

## Key Endpoints

```bash
# Health check
curl http://localhost:3002/health

# Upload file
curl -F "file=@document.pdf" http://localhost:3002/api/v1/upload

# Chunk document
curl -X POST http://localhost:3002/api/v1/chunk \
  -H "Content-Type: application/json" \
  -d '{"fileId":"...","splittingMethod":"recursive","chunkSize":1000,"chunkOverlap":200}'

# Save chunks
curl -X POST http://localhost:3002/api/v1/save-chunks \
  -H "Content-Type: application/json" \
  -d '{"fileId":"...","fileName":"...","chunks":[...],"storageMode":"new_table"}'

# List tables
curl http://localhost:3002/api/v1/tables

# Query chunks
curl "http://localhost:3001/api/chunks?tableId=my_project"
```

---

## Documentation Files

Start with these in order:

1. **QUICK_RUN_GUIDE.md** ← Full setup guide (you are here)
2. **CHUNK_STORAGE_GUIDE.md** ← Complete feature guide
3. **README.md** ← API overview
4. **EXAMPLES.md** ← Code examples
5. **API_SPEC.md** ← Full API spec

---

## Features Available

✅ Text extraction from PDF, Text, Images (OCR)
✅ 5 chunking strategies (character, recursive, sentence, paragraph, markdown)
✅ Rich metadata (15+ fields per chunk)
✅ Create new table OR add to existing table
✅ Language detection (Arabic + English)
✅ Quality metrics (readability, confidence)
✅ Complete statistics
✅ Database queries with filtering

---

## Typical Workflow

```
User uploads document
         ↓
System extracts text
         ↓
User selects chunking method
         ↓
System chunks with metadata
         ↓
User chooses storage:
  [ ] Create new table
  [ ] Add to existing table
         ↓
System saves to PostgreSQL
         ↓
User queries and analyzes
```

---

## Quick Test Checklist

- [ ] Backend running on 3001
- [ ] Document Processor running on 3002
- [ ] PostgreSQL accessible
- [ ] Can upload file
- [ ] Can chunk file
- [ ] Can list tables
- [ ] Can save chunks
- [ ] Can query chunks

---

## Need Help?

1. **Setup Issues** → See QUICK_RUN_GUIDE.md Troubleshooting
2. **API Questions** → See API_SPEC.md
3. **Code Examples** → See EXAMPLES.md
4. **Features** → See CHUNK_STORAGE_GUIDE.md
5. **Architecture** → See ARCHITECTURE.md

---

**Everything is set up and ready to go!** 🎉

Run the 3 commands above and you're good to start testing.

Questions? Check the documentation files listed above.
