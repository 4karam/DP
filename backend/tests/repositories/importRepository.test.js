"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const importRepository_1 = require("../../src/repositories/importRepository");
// Mock pg client
const mockQuery = jest.fn();
const mockClient = {
    query: mockQuery,
};
describe('ImportRepository', () => {
    let repository;
    beforeEach(() => {
        repository = new importRepository_1.ImportRepository();
        mockQuery.mockReset();
    });
    describe('tableExists', () => {
        it('should return true if table exists', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
            const exists = await repository.tableExists(mockClient, 'test_table');
            expect(exists).toBe(true);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT EXISTS'), ['test_table']);
        });
        it('should return false if table does not exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
            const exists = await repository.tableExists(mockClient, 'non_existent_table');
            expect(exists).toBe(false);
        });
    });
    describe('createTable', () => {
        it('should create table with correct columns', async () => {
            const columns = [
                { name: 'name', originalName: 'Name', type: 'TEXT' },
                { name: 'age', originalName: 'Age', type: 'INTEGER' }
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
