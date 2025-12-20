
import { searchWeb } from '../search';

// Mock global fetch
global.fetch = jest.fn();

describe('Search Utils Unit Tests', () => {

    beforeEach(() => {
        fetch.mockClear();
    });

    it('should return results from RelatedTopics', async () => {
        const mockData = {
            RelatedTopics: [
                { Text: 'Result 1', FirstURL: 'http://example.com/1' },
                { Text: 'Result 2', FirstURL: 'http://example.com/2' }
            ]
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockData
        });

        const result = await searchWeb('test query');

        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(2);
        expect(result.results[0].title).toBe('Result 1');
        expect(result.results[0].url).toBe('http://example.com/1');
    });

    it('should handle nested topics', async () => {
        const mockData = {
            RelatedTopics: [
                {
                    Topics: [
                        { Text: 'Nested 1', FirstURL: 'http://example.com/nested' }
                    ]
                }
            ]
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockData
        });

        const result = await searchWeb('nested query');
        expect(result.success).toBe(true);
        expect(result.results[0].title).toBe('Nested 1');
    });

    it('should fallback to AbstractText if no topics', async () => {
        const mockData = {
            RelatedTopics: [],
            Heading: 'Abstract Heading',
            AbstractText: 'Abstract Content',
            AbstractURL: 'http://example.com/abstract'
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockData
        });

        const result = await searchWeb('abstract query');
        expect(result.success).toBe(true);
        expect(result.results[0].title).toBe('Abstract Heading');
        expect(result.results[0].snippet).toBe('Abstract Content');
    });

    it('should handle API errors gracefully', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 500
        });

        const result = await searchWeb('error query');
        expect(result.success).toBe(false);
        expect(result.error).toContain('500');
    });

    it('should handle network exceptions', async () => {
        fetch.mockRejectedValueOnce(new Error('Network Error'));

        const result = await searchWeb('network error');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Network Error');
    });

    it('should return empty results if no topics and no abstract', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ RelatedTopics: [] })
        });

        const result = await searchWeb('empty query');
        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(0);
    });
});
