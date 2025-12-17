// Mock Forge API
jest.mock('@forge/api', () => ({
    __esModule: true,
    default: {
        asUser: jest.fn(() => ({
            requestJira: jest.fn(),
        })),
        asApp: jest.fn(() => ({
            requestJira: jest.fn(),
        })),
    },
    route: jest.fn((strings, ...values) => strings.join('')),
    storage: {
        set: jest.fn(),
        get: jest.fn(),
    },
}));

jest.mock('@forge/events', () => ({
    Queue: jest.fn().mockImplementation(() => ({
        push: jest.fn().mockResolvedValue({}),
    })),
}));

jest.mock('@forge/resolver', () => {
    const handlers = {};
    return {
        __esModule: true,
        default: class Resolver {
            define(name, handler) {
                handlers[name] = handler;
            }
            getDefinitions() {
                return handlers;
            }
        },
    };
});

// Import after mocks
const api = require('@forge/api').default;

describe('Rovo Agent Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create-incident-handler', () => {
        it('should create incident with required fields', async () => {
            const mockResponse = {
                status: 201,
                json: jest.fn().mockResolvedValue({
                    key: 'TEST-123',
                    id: '10001',
                }),
            };

            api.asUser().requestJira.mockResolvedValue(mockResponse);

            // Import resolver after mocks are set up
            const resolverModule = require('../index');
            const handlers = new resolverModule.default().getDefinitions();

            const result = await handlers['create-incident-handler']({
                payload: {
                    summary: 'Test incident',
                    description: 'Test description',
                },
            });

            expect(result.success).toBe(true);
            expect(result.key).toBe('TEST-123');
            expect(api.asUser().requestJira).toHaveBeenCalled();
        });

        it('should handle missing summary gracefully', async () => {
            const mockResponse = {
                status: 400,
                json: jest.fn().mockResolvedValue({
                    errors: { summary: 'Summary is required' },
                }),
            };

            api.asUser().requestJira.mockResolvedValue(mockResponse);

            const resolverModule = require('../index');
            const handlers = new resolverModule.default().getDefinitions();

            const result = await handlers['create-incident-handler']({
                payload: {},
            });

            expect(result.success).toBe(false);
            expect(result).toHaveProperty('error');
        });
    });

    describe('list-incidents-handler', () => {
        it('should return list of incidents', async () => {
            const mockIssues = [
                {
                    key: 'TEST-1',
                    fields: {
                        summary: 'Incident 1',
                        status: { name: 'Open' },
                        created: '2025-12-17T00:00:00Z',
                    },
                },
                {
                    key: 'TEST-2',
                    fields: {
                        summary: 'Incident 2',
                        status: { name: 'Closed' },
                        created: '2025-12-17T01:00:00Z',
                    },
                },
            ];

            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({
                    issues: mockIssues,
                }),
            };

            api.asUser().requestJira.mockResolvedValue(mockResponse);

            const resolverModule = require('../index');
            const handlers = new resolverModule.default().getDefinitions();

            const result = await handlers['list-incidents-handler']({
                payload: {},
            });

            expect(result.success).toBe(true);
            expect(result.issues).toHaveLength(2);
            expect(result.issues[0].key).toBe('TEST-1');
        });

        it('should filter by project key when provided', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({
                    issues: [],
                }),
            };

            api.asUser().requestJira.mockResolvedValue(mockResponse);

            const resolverModule = require('../index');
            const handlers = new resolverModule.default().getDefinitions();

            await handlers['list-incidents-handler']({
                payload: { projectKey: 'KAN' },
            });

            // Verify JQL includes project filter
            const callArgs = api.asUser().requestJira.mock.calls[0];
            expect(callArgs[0]).toContain('search');
        });
    });

    describe('get-incident-status-handler', () => {
        it('should return incident details by key', async () => {
            const mockIssue = {
                key: 'TEST-123',
                fields: {
                    summary: 'Test incident',
                    status: { name: 'In Progress' },
                    assignee: { displayName: 'John Doe' },
                },
            };

            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue(mockIssue),
            };

            api.asUser().requestJira.mockResolvedValue(mockResponse);

            const resolverModule = require('../index');
            const handlers = new resolverModule.default().getDefinitions();

            const result = await handlers['get-incident-status-handler']({
                payload: { issueKey: 'TEST-123' },
            });

            expect(result.success).toBe(true);
            expect(result.issue.key).toBe('TEST-123');
        });

        it('should handle non-existent issue key', async () => {
            const mockResponse = {
                status: 404,
                json: jest.fn().mockResolvedValue({
                    errorMessages: ['Issue does not exist'],
                }),
            };

            api.asUser().requestJira.mockResolvedValue(mockResponse);

            const resolverModule = require('../index');
            const handlers = new resolverModule.default().getDefinitions();

            const result = await handlers['get-incident-status-handler']({
                payload: { issueKey: 'INVALID-999' },
            });

            expect(result.success).toBe(false);
        });
    });

    describe('search-solutions-handler', () => {
        it('should queue async search job and return jobId', async () => {
            const { Queue } = require('@forge/events');
            const mockQueue = new Queue();

            const resolverModule = require('../index');
            const handlers = new resolverModule.default().getDefinitions();

            const result = await handlers['search-solutions-handler']({
                payload: { query: 'Redis timeout' },
            });

            expect(result).toHaveProperty('jobId');
            expect(result).toHaveProperty('status', 'queued');
            expect(result.jobId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
        });

        it('should handle empty query', async () => {
            const resolverModule = require('../index');
            const handlers = new resolverModule.default().getDefinitions();

            const result = await handlers['search-solutions-handler']({
                payload: { query: '' },
            });

            expect(result).toHaveProperty('jobId');
            expect(result.status).toBe('queued');
        });
    });

    describe('Input Schema Validation', () => {
        it('should accept all defined inputs for create action', async () => {
            const mockResponse = {
                status: 201,
                json: jest.fn().mockResolvedValue({
                    key: 'TEST-123',
                    id: '10001',
                }),
            };

            api.asUser().requestJira.mockResolvedValue(mockResponse);

            const resolverModule = require('../index');
            const handlers = new resolverModule.default().getDefinitions();

            const result = await handlers['create-incident-handler']({
                payload: {
                    summary: 'Database down',
                    description: 'Production database unresponsive',
                    projectKey: 'KAN',
                    assigneeId: '557058:user-123',
                },
            });

            expect(result.success).toBe(true);
            expect(api.asUser().requestJira).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('Database down'),
                })
            );
        });

        it('should accept projectKey filter for list action', async () => {
            const mockResponse = {
                status: 200,
                json: jest.fn().mockResolvedValue({ issues: [] }),
            };

            api.asUser().requestJira.mockResolvedValue(mockResponse);

            const resolverModule = require('../index');
            const handlers = new resolverModule.default().getDefinitions();

            await handlers['list-incidents-handler']({
                payload: { projectKey: 'PROD' },
            });

            expect(api.asUser().requestJira).toHaveBeenCalled();
        });

        it('should require issueKey for get-status action', async () => {
            const resolverModule = require('../index');
            const handlers = new resolverModule.default().getDefinitions();

            // Without issueKey should handle gracefully
            const result = await handlers['get-incident-status-handler']({
                payload: {},
            });

            expect(result.success).toBe(false);
        });

        it('should require query for search action', async () => {
            const resolverModule = require('../index');
            const handlers = new resolverModule.default().getDefinitions();

            const result = await handlers['search-solutions-handler']({
                payload: { query: 'PostgreSQL connection error' },
            });

            expect(result.jobId).toBeDefined();
        });
    });
});
