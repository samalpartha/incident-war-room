
import { getUserPermissions, getUserPrimaryRole, hasPermission, ROLES, getUserGroups } from '../permissions';
import api from '@forge/api';

jest.mock('@forge/api', () => ({
    asUser: jest.fn().mockReturnThis(),
    requestJira: jest.fn(),
    route: jest.fn((parts) => parts.join(''))
}));

// Unit Tests for Permissions Logic

describe('Permissions Utils Unit Tests', () => {

    describe('getUserPermissions', () => {
        it('should return default full access when no groups match', () => {
            const perms = getUserPermissions(['jira-users', 'site-admins']);
            expect(perms).toContain('create');
            expect(perms).toContain('delete');
            expect(perms).toContain('view');
        });

        it('should return specific permissions for known roles', () => {
            const perms = getUserPermissions(['incident-commanders']);
            expect(perms).toContain('close');
            expect(perms).toContain('assign');
            // Should verify exact match logic if exclusive?
            // Current implements additive
        });

        it('should merge permissions for multiple roles', () => {
            const perms = getUserPermissions(['observers', 'developers']);
            expect(perms).toContain('view'); // from observers
            expect(perms).toContain('comment'); // from developers
            expect(perms).not.toContain('delete');
        });

        it('should handle mixed valid and invalid groups (Line 39 coverage)', () => {
            const perms = getUserPermissions(['incident-commanders', 'unknown-group']);
            expect(perms).toContain('close');
            // 'unknown-group' should be ignored safely
        });
    });

    describe('getUserPrimaryRole', () => {
        it('should prioritize commanders', () => {
            expect(getUserPrimaryRole(['developers', 'incident-commanders'])).toBe('incident-commanders');
        });

        it('should return on-call (Line 66 coverage)', () => {
            expect(getUserPrimaryRole(['oncall-engineers'])).toBe('oncall-engineers');
        });

        it('should fallback to null for unknown groups', () => {
            expect(getUserPrimaryRole(['jira-users'])).toBeNull();
        });
    });

    describe('hasPermission', () => {
        it('should return true if permission exists', () => {
            expect(hasPermission(['view', 'create'], 'create')).toBe(true);
        });

        it('should return false if permission missing', () => {
            expect(hasPermission(['view'], 'delete')).toBe(false);
        });
    });

    describe('getUserGroups (Async)', () => {
        it('should return group names on success', async () => {
            api.asUser().requestJira.mockResolvedValue({
                json: async () => ([{ name: 'administrators' }, { name: 'users' }])
            });

            const groups = await getUserGroups('test-id');
            expect(groups).toEqual(['administrators', 'users']);
        });

        it('should return empty array on API failure', async () => {
            api.asUser().requestJira.mockRejectedValue(new Error('API Failure'));
            const groups = await getUserGroups('test-id');
            expect(groups).toEqual([]);
        });
    });
});
