
import { getUserPermissions, getUserPrimaryRole, hasPermission, ROLES } from '../permissions';
import api from '@forge/api';

// Unit Tests for Permissions Logic
// No external dependencies mocked here except API if we test getUserGroups (which is async)

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
            // Developer doesn't have create/delete
            expect(perms).not.toContain('delete');
        });
    });

    describe('getUserPrimaryRole', () => {
        it('should prioritize commanders', () => {
            expect(getUserPrimaryRole(['developers', 'incident-commanders'])).toBe('incident-commanders');
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
});
