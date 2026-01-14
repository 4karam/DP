// Mock for tesseract.js to avoid complex dependencies in tests

const recognize = jest.fn().mockResolvedValue({
  data: {
    text: 'Mock OCR text content',
    confidence: 95,
  },
});

const Tesseract = {
  recognize,
  createWorker: jest.fn().mockResolvedValue({
    load: jest.fn().mockResolvedValue(undefined),
    loadLanguage: jest.fn().mockResolvedValue(undefined),
    initialize: jest.fn().mockResolvedValue(undefined),
    recognize: jest.fn().mockResolvedValue({
      data: {
        text: 'Mock OCR text',
        confidence: 95,
      },
    }),
    terminate: jest.fn().mockResolvedValue(undefined),
  }),
};

export default Tesseract;
