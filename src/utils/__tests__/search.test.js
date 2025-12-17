const { searchWeb } = require('../search');

// Mock node-fetch
global.fetch = jest.fn();

describe('Web Search Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('searchWeb', () => {
        it('should return search results for valid query', async () => {
            const mockResponse = {
                AbstractText: 'Redis is an in-memory data structure store',
                AbstractURL: 'https://redis.io/',
                RelatedTopics: [
                    {
                        Text: 'Redis timeout configuration',
                        FirstURL: 'https://redis.io/docs/timeout'
                    },
                    {
                        Text: 'Redis connection pooling',
                        FirstURL: 'https://redis.io/docs/pooling'
                    }
                ]
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await searchWeb('Redis timeout');

            expect(result).toHaveProperty('query', 'Redis timeout');
            expect(result).toHaveProperty('totalFound');
            expect(result).toHaveProperty('results');
            expect(Array.isArray(result.results)).toBe(true);
        });

        it('should handle empty query gracefully', async () => {
            const result = await searchWeb('');

            expect(result).toHaveProperty('query', '');
            expect(result).toHaveProperty('totalFound', 0);
            expect(result.results).toHaveLength(0);
        });

        it('should handle API errors gracefully', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await searchWeb('test query');

            expect(result).toHaveProperty('query', 'test query');
            expect(result).toHaveProperty('totalFound', 0);
            expect(result.results).toHaveLength(0);
        });

        it('should parse related topics correctly', async () => {
            const mockResponse = {
                AbstractText: 'Test abstract',
                AbstractURL: 'https://example.com',
                RelatedTopics: [
                    {
                        Text: 'Result 1',
                        FirstURL: 'https://example.com/1'
                    },
                    {
                        Text: 'Result 2',
                        FirstURL: 'https://example.com/2'
                    },
                    {
                        Text: 'Result 3',
                        FirstURL: 'https://example.com/3'
                    }
                ]
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await searchWeb('test');

            expect(result.totalFound).toBeGreaterThan(0);
            expect(result.results.length).toBeGreaterThan(0);
            expect(result.results[0]).toHaveProperty('title');
            expect(result.results[0]).toHaveProperty('url');
            expect(result.results[0]).toHaveProperty('snippet');
        });

        it('should limit results to maximum', async () => {
            const mockResponse = {
                AbstractText: 'Abstract',
                AbstractURL: 'https://example.com',
                RelatedTopics: Array.from({ length: 20 }, (_, i) => ({
                    Text: `Result ${i}`,
                    FirstURL: `https://example.com/${i}`
                }))
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await searchWeb('test');

            // Should limit to reasonable number (e.g., 10)
            expect(result.results.length).toBeLessThanOrEqual(10);
        });
    });
});
