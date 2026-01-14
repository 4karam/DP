import * as XLSX from 'xlsx';

/**
 * Create a simple Excel file buffer for testing
 */
export function createTestExcelBuffer(data: any[][], sheetName: string = 'Sheet1'): Buffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

/**
 * Sample Excel data: Simple user list
 */
export function createSimpleUserExcel(): Buffer {
  const data = [
    ['Name', 'Age', 'Email', 'Active'],
    ['John Doe', 30, 'john@example.com', true],
    ['Jane Smith', 25, 'jane@example.com', true],
    ['Bob Johnson', 35, 'bob@example.com', false],
  ];
  return createTestExcelBuffer(data);
}

/**
 * Sample Excel data: Mixed data types
 */
export function createMixedTypesExcel(): Buffer {
  const data = [
    ['Product', 'Price', 'Quantity', 'In Stock', 'Added Date'],
    ['Widget A', 19.99, 100, 'yes', '2024-01-15'],
    ['Widget B', 29.50, 50, 'no', '2024-01-16'],
    ['Widget C', 15.00, 200, 'yes', '2024-01-17'],
  ];
  return createTestExcelBuffer(data);
}

/**
 * Sample Excel data: Large dataset
 */
export function createLargeExcel(rows: number = 1000): Buffer {
  const data = [['ID', 'Name', 'Value', 'Timestamp']];
  for (let i = 1; i <= rows; i++) {
    data.push([
      i.toString(),
      `Item ${i}`,
      (Math.random() * 1000).toFixed(2),
      new Date(2024, 0, i % 28 + 1).toISOString(),
    ]);
  }
  return createTestExcelBuffer(data);
}

/**
 * Sample Excel data: Multiple sheets
 */
export function createMultiSheetExcel(): Buffer {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Users
  const usersData = [
    ['Name', 'Age'],
    ['Alice', 28],
    ['Bob', 32],
  ];
  const usersSheet = XLSX.utils.aoa_to_sheet(usersData);
  XLSX.utils.book_append_sheet(workbook, usersSheet, 'Users');

  // Sheet 2: Products
  const productsData = [
    ['Product', 'Price'],
    ['Item A', 10.50],
    ['Item B', 20.00],
  ];
  const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
  XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');

  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

/**
 * Sample PDF text for testing
 */
export const SAMPLE_PDF_TEXT = `
This is a sample PDF document for testing.

It contains multiple paragraphs and some formatting.
The document processor should be able to extract this text
and chunk it appropriately.

Here is a second paragraph with more content.
This helps test the chunking strategies.
`;

/**
 * Sample text document
 */
export const SAMPLE_TEXT_DOCUMENT = `
# Sample Document

This is a sample markdown document for testing the document processing features.

## Section 1

This section contains some text that should be chunked.
The chunking strategy should respect the paragraph boundaries.

## Section 2

Another section with different content.
This helps test multiple chunks and navigation.

### Subsection 2.1

More detailed content in a subsection.
The metadata should include proper structure information.
`;

/**
 * Sample chunks for testing
 */
export const SAMPLE_CHUNKS = [
  {
    chunk_index: 0,
    content: 'This is the first chunk of text.',
    char_count: 33,
    word_count: 7,
    language: 'english',
    readability_score: 85,
    has_urls: false,
    has_numbers: false,
    url_count: 0,
    number_count: 0,
    source_file: 'test.txt',
    page_number: 1,
  },
  {
    chunk_index: 1,
    content: 'This is the second chunk with more content.',
    char_count: 44,
    word_count: 8,
    language: 'english',
    readability_score: 80,
    has_urls: false,
    has_numbers: false,
    url_count: 0,
    number_count: 0,
    source_file: 'test.txt',
    page_number: 1,
  },
];
