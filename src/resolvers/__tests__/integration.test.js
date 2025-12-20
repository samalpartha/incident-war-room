
// 1. Mock Dependencies
const mockRequestJira = jest.fn();
// Create a consistent mock object we can spy on/configure
const mockApiFunctionality = {
    requestJira: mockRequestJira
};

const mockAsUser = jest.fn().mockReturnValue(mockApiFunctionality);
const mockAsApp = jest.fn().mockReturnValue(mockApiFunctionality);

// Global definitions store
let resolverDefinitions = {};

jest.mock('@forge/api', () => ({
    asUser: mockAsUser,
    asApp: mockAsApp,
    route: jest.fn((parts, ...args) => {
        // Basic route tagging reconstruction
        let str = '';
        parts.forEach((part, i) => {
            str += part + (args[i] || '');
        });
        return str;
    }),
    storage: { get: jest.fn(), set: jest.fn() }
}));

jest.mock('@forge/resolver', () => {
    return jest.fn().mockImplementation(() => ({
        define: jest.fn((key, fn) => {
            resolverDefinitions[key] = fn;
        }),
        getDefinitions: jest.fn().mockReturnValue({})
    }));
});

jest.mock('@forge/events', () => ({
    Queue: jest.fn().mockImplementation(() => ({ push: jest.fn() }))
}));

jest.mock('../../utils/permissions.js', () => ({
    getUserGroups: jest.fn().mockResolvedValue(['administrators']),
    getUserPermissions: jest.fn().mockResolvedValue(['create', 'read', 'update', 'delete', 'comment']),
    hasPermission: jest.fn().mockReturnValue(true),
    getUserPrimaryRole: jest.fn().mockReturnValue('admin'),
    ROLE_LABELS: { admin: 'Administrator' }
}));

// 2. Import System Under Test
jest.mock('../../resolvers/index.js', () => jest.requireActual('../../resolvers/index.js'));
require('../index');

describe('Rovo Orchestrator Integration Flow', () => {

    beforeEach(() => {
        mockRequestJira.mockReset();
        mockAsUser.mockClear();
        mockAsApp.mockClear();

        // Default Fallback
        mockRequestJira.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({})
        });
    });

    test('Definitions exist', () => {
        expect(resolverDefinitions['createIncident']).toBeDefined();
        expect(resolverDefinitions['auto-assign-ticket-action']).toBeDefined();
    });

    // Validation Helpers
    const validateCreatePayload = (body) => {
        const data = JSON.parse(body);
        if (!data.fields) throw new Error("Schema Error: Missing 'fields'");
        if (!data.fields.summary) throw new Error("Schema Error: Missing 'summary'");
        if (!data.fields.project || !data.fields.project.key) throw new Error("Schema Error: Missing 'project.key'");
        if (!data.fields.issuetype) throw new Error("Schema Error: Missing 'issuetype'");
        // Strict Type Checks
        if (typeof data.fields.summary !== 'string') throw new Error("Schema Error: 'summary' must be string");
        return true;
    };

    const validateCommentPayload = (body) => {
        const data = JSON.parse(body);
        // Jira Comment Schema: { body: { type: 'doc', content: [...] } }
        if (!data.body) throw new Error("Schema Error: Missing 'body'");
        if (data.body.type !== 'doc') throw new Error("Schema Error: 'body.type' must be 'doc'");
        if (!Array.isArray(data.body.content)) throw new Error("Schema Error: 'body.content' must be array");
        return true;
    }

    test('Step 1: Create Incident (Schema Validation)', async () => {
        mockRequestJira.mockImplementation(async (url, options) => {
            // 1. Create Issue Check
            if (options?.method === 'POST' && url.includes('/issue') && !url.includes('/comment')) {
                validateCreatePayload(options.body);
                return { status: 201, json: async () => ({ key: 'KAN-99', id: '10099' }) };
            }
            // 2. Add Comment Check
            if (options?.method === 'POST' && url.includes('/comment')) {
                validateCommentPayload(options.body);
                return { status: 201 };
            }
            return { status: 200 };
        });

        const response = await resolverDefinitions['createIncident']({
            payload: { summary: 'Test', projectKey: 'KAN' },
            context: { accountId: 'u1' }
        });
        expect(response.success).toBe(true);
        expect(response.key).toBe('KAN-99');
    });

    test('Step 2: Chaos Monkey (Schema Validation)', async () => {
        let callCount = 0;
        mockRequestJira.mockImplementation(async (url, options) => {
            if (options?.method === 'POST' && url.includes('/issue') && !url.includes('/comment')) {
                validateCreatePayload(options.body);
                callCount++;
                return { status: 201, json: async () => ({ key: `CHAOS-${callCount}` }) };
            }
            if (options?.method === 'POST' && url.includes('/comment')) {
                validateCommentPayload(options.body);
                return { status: 201 };
            }
            return { status: 201 };
        });

        const response = await resolverDefinitions['chaos-monkey-action']({ payload: { projectKey: 'KAN' } });
        expect(response.success).toBe(true);
        expect(response.message).toContain('Chaos Unleashed');
    });

    test('Step 3: Auto-Fix Agent', async () => {
        mockRequestJira.mockImplementation(async (url, options) => {
            if (options?.method === 'PUT') return { ok: true, status: 204 };
            if (url.includes('/issue/KAN-1')) {
                return {
                    ok: true,
                    json: async () => ({ key: 'KAN-1', fields: { description: 'bad', status: { name: 'To Do' } } })
                };
            }
            return { status: 201 };
        });

        const response = await resolverDefinitions['auto-fix-ticket-action']({ payload: { issueKey: 'KAN-1' } });
        expect(response.success).toBe(true);
    });

    test('Step 4: Auto-Assign Agent', async () => {
        mockRequestJira.mockImplementation(async (url) => {
            if (url.includes('/issue/KAN-1/assignee')) return { ok: true, status: 204 };
            if (url.includes('assignable/search')) {
                return { ok: true, json: async () => ([{ accountId: 'u1', displayName: 'Dev 1' }]) };
            }
            if (url.includes('/issue/KAN-1')) {
                return { ok: true, json: async () => ({ fields: { status: { name: 'To Do' } } }) };
            }
            return { ok: false, status: 404 };
        });

        const response = await resolverDefinitions['auto-assign-ticket-action']({ payload: { issueKey: 'KAN-1' } });
        expect(response.success).toBe(true);
        expect(response.assignedTo).toBe('Dev 1');
    });

    test('Step 5: Generate Subtasks', async () => {
        mockRequestJira.mockImplementation(async (url, options) => {
            if (options?.method === 'POST') return { status: 201, json: async () => ({ key: 'KAN-1-1' }) };
            if (url.includes('/issue/KAN-1')) {
                return {
                    ok: true,
                    json: async () => ({ fields: { status: { name: 'To Do' }, project: { id: '101' } } })
                };
            }
            return { ok: false };
        });

        const response = await resolverDefinitions['generate-subtasks-action']({ payload: { issueKey: 'KAN-1' } });
        expect(response.success).toBe(true);
        expect(response.createdSubtasks.length).toBe(3);
    });

    test('Step 6: Release Notes', async () => {
        mockRequestJira.mockImplementation(async (url, options) => {
            // 1. Search for Done Issues
            if (url.includes('/search')) {
                return { json: async () => ({ issues: [{ key: 'KAN-5', fields: { summary: 'Fix login' } }] }) };
            }
            // 2. Create Release Notes Issue (POST /issue)
            // Use strict options checks (body validation is implicit via validateCreaePayload helper which is called inside mock if I copied previous implementation correctly, 
            // wait, the mock wrapper defined earlier in the file CALLS validateCreatePayload.
            if (options?.method === 'POST' && url.includes('/issue') && !url.includes('/comment')) {
                validateCreatePayload(options.body);
                return { status: 201, json: async () => ({ key: 'KAN-REL-1' }) };
            }
            return { json: async () => ({}) };
        });

        const response = await resolverDefinitions['generate-release-notes-action']({ payload: { version: 'v2.0' } });
        expect(response.success).toBe(true);
        expect(response.notes).toContain('Fix login');
        expect(response.issueKey).toBe('KAN-REL-1');
    });

    test('Step 7: Sprint Prediction', async () => {
        const response = await resolverDefinitions['predict-sprint-slippage-action']({});
        expect(response.success).toBe(true);
        expect(response.report.riskLevel).toBeDefined();
    });

    test('Step 8: Get Users', async () => {
        mockRequestJira.mockImplementation(async (url) => {
            if (url.includes('users/search')) {
                return {
                    json: async () => ([
                        { accountId: 'u1', accountType: 'atlassian', displayName: 'Human', avatarUrls: {} },
                        { accountId: 'bot1', accountType: 'app', displayName: 'Bot', avatarUrls: {} }
                    ])
                };
            }
            return { json: async () => [] };
        });

        const response = await resolverDefinitions['getUsers']({});
        expect(response.success).toBe(true);
        expect(response.users.length).toBe(1);
        expect(response.users[0].displayName).toBe('Human');
    });

    test('Step 9: Get Project Details', async () => {
        mockRequestJira.mockImplementation(async (url) => {
            if (url.includes('/project/KAN')) {
                return {
                    json: async () => ({ issueTypes: [{ id: '1', name: 'Task', subtask: false }] })
                };
            }
            return { json: async () => ({}) };
        });

        const response = await resolverDefinitions['getProjectDetails']({ payload: { projectKey: 'KAN' } });
        expect(response.success).toBe(true);
        expect(response.issueTypes[0].name).toBe('Task');
    });

});
