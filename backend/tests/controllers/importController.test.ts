import { ImportController } from '../../src/controllers/importController';
import { FastifyRequest, FastifyReply } from 'fastify';
import { storeFile } from '../../src/utils/fileStorage';

// Mock fileStorage
jest.mock('../../src/utils/fileStorage');
const mockedStoreFile = storeFile as jest.MockedFunction<typeof storeFile>;

describe('ImportController', () => {
    let controller: ImportController;
    let mockRequest: Partial<FastifyRequest>;
    let mockReply: Partial<FastifyReply>;
    let mockSend: jest.Mock;
    let mockStatus: jest.Mock;

    beforeEach(() => {
        controller = new ImportController();
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
            (mockRequest.file as jest.Mock).mockResolvedValue(undefined);

            await controller.uploadFile(mockRequest as FastifyRequest, mockReply as FastifyReply);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ error: 'No file uploaded' }));
        });

        it('should return 400 for invalid file extension', async () => {
            (mockRequest.file as jest.Mock).mockResolvedValue({
                filename: 'test.txt',
            });

            await controller.uploadFile(mockRequest as FastifyRequest, mockReply as FastifyReply);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Invalid file type') }));
        });

        it('should upload valid file successfully', async () => {
            const mockBuffer = Buffer.from('fake excel content');
            (mockRequest.file as jest.Mock).mockResolvedValue({
                filename: 'test.xlsx',
                toBuffer: jest.fn().mockResolvedValue(mockBuffer),
            });

            mockedStoreFile.mockResolvedValue('file-uuid-123');

            await controller.uploadFile(mockRequest as FastifyRequest, mockReply as FastifyReply);

            expect(mockedStoreFile).toHaveBeenCalledWith(mockBuffer, 'test.xlsx');
            expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                fileId: 'file-uuid-123',
                filename: 'test.xlsx',
            }));
        });
    });
});
