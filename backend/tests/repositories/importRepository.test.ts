import { ImportRepository } from '../../src/repositories/importRepository';
import { PoolClient, QueryResult } from 'pg';


// Mock pg client
const mockQuery = jest.fn();
const mockClient = {
    query: mockQuery,
} as unknown as PoolClient;

describe('ImportRepository', () => {
    let repository: ImportRepository;

    beforeEach(() => {
        repository = new ImportRepository();
        mockQuery.mockReset();
    });

    describe('tableExists', () => {
        it('should return true if table exists', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] } as QueryResult<any>);
            const exists = await repository.tableExists(mockClient, 'test_table');
            expect(exists).toBe(true);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT EXISTS'), ['test_table']);
        });

        it('should return false if table does not exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] } as QueryResult<any>);
            const exists = await repository.tableExists(mockClient, 'non_existent_table');
            expect(exists).toBe(false);
        });
    });

    describe('createTable', () => {
        it('should create table with correct columns', async () => {
            const columns = [
                { name: 'name', originalName: 'Name', type: 'TEXT' as const },
                { name: 'age', originalName: 'Age', type: 'INTEGER' as const }
            ];

            await repository.createTable(mockClient, 'users', columns);

            // Verify DROP TABLE called
            expect(mockQuery).toHaveBeenCalledWith(expect.stringMatching(/DROP TABLE IF EXISTS "users" CASCADE/));

            // Verify CREATE TABLE called
            expect(mockQuery).toHaveBeenCalledWith(expect.stringMatching(/CREATE TABLE "users"/));
            expect(mockQuery).toHaveBeenCalledWith(expect.stringMatching(/"name" TEXT/));
            expect(mockQuery).toHaveBeenCalledWith(expect.stringMatching(/"age" INTEGER/));
        });
    });
});
