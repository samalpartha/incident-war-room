
import { asyncSearchHandler } from '../async-search';
import { storage } from '@forge/api';
import { searchWeb } from '../../utils/search';

// Mock Dependencies
jest.mock('@forge/api', () => ({
    storage: { set: jest.fn() }
}));

jest.mock('../../utils/search', () => ({
    searchWeb: jest.fn()
}));

describe('Async Search Handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should handle missing payload', async () => {
        await asyncSearchHandler({ payload: {} });
        expect(storage.set).not.toHaveBeenCalled();
    });

    test('should handle search success', async () => {
        searchWeb.mockResolvedValue({
            success: true,
            results: ['res1'],
            totalFound: 1
        });

        await asyncSearchHandler({ payload: { jobId: 'job1', query: 'test' } });

        expect(searchWeb).toHaveBeenCalledWith('test');
        expect(storage.set).toHaveBeenCalledWith('job1', expect.objectContaining({
            status: 'completed',
            success: true,
            totalFound: 1
        }));
    });

    test('should handle search failure', async () => {
        // Simulate error
        searchWeb.mockRejectedValue(new Error('Search API Down'));

        await asyncSearchHandler({ payload: { jobId: 'job1', query: 'fail' } });

        expect(storage.set).toHaveBeenCalledWith('job1', expect.objectContaining({
            status: 'failed',
            success: false,
            error: 'Search API Down'
        }));
    });
});
