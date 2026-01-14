/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  testMatch: ['**/*.test.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(pdfjs-dist)/)',
  ],
  moduleNameMapper: {
    '^pdfjs-dist$': '<rootDir>/tests/__mocks__/pdfjs-dist.ts',
    '^tesseract\\.js$': '<rootDir>/tests/__mocks__/tesseract.ts',
  },
};