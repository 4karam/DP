const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Create test-data directory if it doesn't exist
const testDataDir = path.join(__dirname, 'test-data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
  console.log('✓ Created test-data directory');
}

// Helper function to create workbook and save
function saveExcel(filename, sheets) {
  const wb = XLSX.utils.book_new();
  for (const [sheetName, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  const filePath = path.join(testDataDir, filename);
  XLSX.writeFile(wb, filePath);
  console.log(`✓ Created ${filename}`);
}

// Test 1: Clean data with no empty rows/columns
console.log('\n📊 Generating test files...\n');

const cleanData = [
  ['ID', 'Name', 'Email', 'Status', 'Salary'],
  ...Array.from({ length: 100 }, (_, i) => [
    i + 1,
    `User ${i + 1}`,
    `user${i + 1}@example.com`,
    i % 2 === 0 ? 'Active' : 'Inactive',
    Math.floor(Math.random() * 100000) + 30000
  ])
];

saveExcel('clean-data.xlsx', {
  'Data': cleanData
});

// Test 2: Data with trailing empty rows
const trailingEmptyData = [
  ['ID', 'Name', 'Email', 'Status', 'Salary'],
  ...Array.from({ length: 50 }, (_, i) => [
    i + 1,
    `User ${i + 1}`,
    `user${i + 1}@example.com`,
    i % 2 === 0 ? 'Active' : 'Inactive',
    Math.floor(Math.random() * 100000) + 30000
  ]),
  // 20 empty rows
  ...Array.from({ length: 20 }, () => [null, null, null, null, null])
];

saveExcel('trailing-empty-rows.xlsx', {
  'Data': trailingEmptyData
});

// Test 3: Sparse columns (many empty columns)
const sparseData = [
  [
    'Col1', null, null, null, 'Col5',
    null, null, null, null, 'Col10',
    null, null, null, null, 'Col15',
    null, null, null, null, 'Col20'
  ],
  ...Array.from({ length: 50 }, (_, i) => [
    `Data1-${i}`, null, null, null, `Data5-${i}`,
    null, null, null, null, `Data10-${i}`,
    null, null, null, null, `Data15-${i}`,
    null, null, null, null, `Data20-${i}`
  ])
];

saveExcel('sparse-columns.xlsx', {
  'Data': sparseData
});

// Test 4: Real-world mixed data with various issues
const mixedData = [
  ['ID', 'First Name', null, 'Last Name', null, 'Email', 'Phone', null, 'Department', 'Salary', null, 'Start Date'],
  ...Array.from({ length: 80 }, (_, i) => [
    i + 1,
    `John${i}`,
    null,
    `Doe${i}`,
    null,
    `user${i}@company.com`,
    `555-000${(i % 1000).toString().padStart(4, '0')}`,
    null,
    ['Sales', 'Engineering', 'HR', 'Marketing'][i % 4],
    Math.floor(Math.random() * 100000) + 40000,
    null,
    new Date(2020 + Math.floor(i / 20), i % 12, (i % 28) + 1)
  ]),
  // Mix in some empty rows
  ...Array.from({ length: 10 }, () => [null, null, null, null, null, null, null, null, null, null, null, null]),
  ...Array.from({ length: 10 }, (_, i) => [
    80 + i,
    `Jane${i}`,
    null,
    `Smith${i}`,
    null,
    `jane${i}@company.com`,
    `555-111${(i % 1000).toString().padStart(4, '0')}`,
    null,
    ['Finance', 'Operations', 'IT'][i % 3],
    Math.floor(Math.random() * 80000) + 50000,
    null,
    new Date(2018 + Math.floor(i / 5), i % 12, (i % 28) + 1)
  ])
];

saveExcel('mixed-data.xlsx', {
  'Data': mixedData
});

// Test 5: All nulls with some data rows
const allNullsData = [
  ['Column A', 'Column B', 'Column C', 'Column D', 'Column E'],
  ...Array.from({ length: 20 }, (_, i) => [
    `A${i}`,
    `B${i}`,
    `C${i}`,
    `D${i}`,
    `E${i}`
  ]),
  ...Array.from({ length: 15 }, () => [null, null, null, null, null]),
  ...Array.from({ length: 30 }, (_, i) => [
    `A${i + 20}`,
    `B${i + 20}`,
    `C${i + 20}`,
    `D${i + 20}`,
    `E${i + 20}`
  ]),
  ...Array.from({ length: 20 }, () => [null, null, null, null, null]),
  ...Array.from({ length: 15 }, (_, i) => [
    `A${i + 50}`,
    `B${i + 50}`,
    `C${i + 50}`,
    `D${i + 50}`,
    `E${i + 50}`
  ])
];

saveExcel('all-nulls.xlsx', {
  'Data': allNullsData
});

// Test 6: Multiple sheets
const sheet1 = [
  ['ID', 'Name', 'Value'],
  [1, 'Alice', 100],
  [2, 'Bob', 200],
  [3, 'Charlie', 300]
];

const sheet2 = [
  ['Product', 'Price', 'Quantity'],
  ['Laptop', 1000, 5],
  ['Mouse', 25, 20],
  ['Keyboard', 75, 10]
];

saveExcel('multi-sheet.xlsx', {
  'Users': sheet1,
  'Products': sheet2
});

console.log('\n✅ All test files generated successfully!\n');
console.log('📁 Test files are in: backend/test-data/\n');
console.log('📋 Test files created:');
console.log('  1. clean-data.xlsx - 100 rows, 5 columns (no issues)');
console.log('  2. trailing-empty-rows.xlsx - 50 data rows + 20 empty rows');
console.log('  3. sparse-columns.xlsx - 50 rows, 20 columns (only 5 with data)');
console.log('  4. mixed-data.xlsx - Real-world scenario with various issues');
console.log('  5. all-nulls.xlsx - Data with empty rows interspersed');
console.log('  6. multi-sheet.xlsx - Multiple sheets for testing\n');
console.log('🧪 Next steps:');
console.log('  1. Start backend: npm run dev');
console.log('  2. Start frontend: npm run dev (in frontend directory)');
console.log('  3. Upload test files at http://localhost:3000');
console.log('  4. Check results in PostgreSQL\n');
