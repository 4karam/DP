"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const importController_1 = require("../../src/controllers/importController");
const fileStorage_1 = require("../../src/utils/fileStorage");
// Mock fileStorage
jest.mock('../../src/utils/fileStorage');
const mockedStoreFile = fileStorage_1.storeFile;
describe('ImportController', () => {
    let controller;
    let mockRequest;
    let mockReply;
    let mockSend;
    let mockStatus;
    beforeEach(() => {
        controller = new importController_1.ImportController();
        mockSend = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ send: mockSend });
        mockReply = {
            send: mockSend,
            status: mockStatus,
        };
        mockRequest = {
            file: jest.fn(),
        };
        // Clear mocks
        mockedStoreFile.mockReset();
    });
    describe('uploadFile', () => {
        it('should return 400 if no file is uploaded', async () => {
            mockRequest.file.mockResolvedValue(undefined);
            await controller.uploadFile(mockRequest, mockReply);
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ error: 'No file uploaded' }));
        });
        it('should return 400 for invalid file extension', async () => {
            mockRequest.file.mockResolvedValue({
                filename: 'test.txt',
            });
            await controller.uploadFile(mockRequest, mockReply);
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Invalid file type') }));
        });
        it('should upload valid file successfully', async () => {
            const mockBuffer = Buffer.from('fake excel content');
            mockRequest.file.mockResolvedValue({
                filename: 'test.xlsx',
                toBuffer: jest.fn().mockResolvedValue(mockBuffer),
            });
            mockedStoreFile.mockResolvedValue('file-uuid-123');
            await controller.uploadFile(mockRequest, mockReply);
            expect(mockedStoreFile).toHaveBeenCalledWith(mockBuffer, 'test.xlsx');
            expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                fileId: 'file-uuid-123',
                filename: 'test.xlsx',
            }));
        });
    });
});
