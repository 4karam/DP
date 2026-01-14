// Mock for pdfjs-dist to avoid ES module issues in Jest

export const getDocument = jest.fn().mockReturnValue({
  promise: Promise.resolve({
    numPages: 1,
    getPage: jest.fn().mockResolvedValue({
      getTextContent: jest.fn().mockResolvedValue({
        items: [
          { str: 'Mock PDF content', transform: [1, 0, 0, 1, 0, 0] },
        ],
      }),
    }),
  }),
});

export const GlobalWorkerOptions = {
  workerSrc: '',
};

export default {
  getDocument,
  GlobalWorkerOptions,
};
