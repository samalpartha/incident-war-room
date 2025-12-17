const { getUserGroups, getUserPermissions, hasPermission, getUserPrimaryRole, ROLE_LABELS } = require('../permissions');

// Mock @forge/api
jest.mock('@forge/api', () => ({
    authorize: jest.fn(),
}));

describe('RBAC Permissions Module', () => {
    describe('ROLE_LABELS', () => {
        it('should have all 4 role labels defined', () => {
            expect(ROLE_LABELS).toHaveProperty('admin');
            expect(ROLE_LABELS).toHaveProperty('manager');
            expect(ROLE_LABELS).toHaveProperty('responder');
            expect(ROLE_LABELS).toHaveProperty('viewer');
        });

        it('should have correct role names', () => {
            expect(ROLE_LABELS.admin).toBe('Administrator');
            expect(ROLE_LABELS.manager).toBe('Incident Manager');
            expect(ROLE_LABELS.responder).toBe('Incident Responder');
            expect(ROLE_LABELS.viewer).toBe('Viewer');
        });
    });

    describe('getUserPrimaryRole', () => {
        it('should return admin for user in incident-admins group', () => {
            const groups = ['incident-admins', 'other-group'];
            expect(getUserPrimaryRole(groups)).toBe('admin');
        });

        it('should return manager for user in incident-managers group', () => {
            const groups = ['some-group', 'incident-managers'];
            expect(getUserPrimaryRole(groups)).toBe('manager');
        });

        it('should return responder for user in incident-responders group', () => {
            const groups = ['incident-responders'];
            expect(getUserPrimaryRole(groups)).toBe('responder');
        });

        it('should return viewer for user in incident-viewers group', () => {
            const groups = ['incident-viewers'];
            expect(getUserPrimaryRole(groups)).toBe('viewer');
        });

        it('should return highest role when user in multiple groups', () => {
            const groups = ['incident-viewers', 'incident-admins', 'incident-responders'];
            expect(getUserPrimaryRole(groups)).toBe('admin');
        });

        it('should return admin (permissive) when no incident groups', () => {
            const groups = ['other-group-1', 'other-group-2'];
            expect(getUserPrimaryRole(groups)).toBe('admin');
        });

        it('should return admin for empty groups array', () => {
            expect(getUserPrimaryRole([])).toBe('admin');
        });
    });

    describe('getUserPermissions', () => {
        it('should return all permissions for admin role', () => {
            const permissions = getUserPermissions('admin');
            expect(permissions).toContain('view');
            expect(permissions).toContain('create');
            expect(permissions).toContain('update');
            expect(permissions).toContain('delete');
            expect(permissions).toHaveLength(4);
        });

        it('should return limited permissions for manager role', () => {
            const permissions = getUserPermissions('manager');
            expect(permissions).toContain('view');
            expect(permissions).toContain('create');
            expect(permissions).toContain('update');
            expect(permissions).not.toContain('delete');
            expect(permissions).toHaveLength(3);
        });

        it('should return basic permissions for responder role', () => {
            const permissions = getUserPermissions('responder');
            expect(permissions).toContain('view');
            expect(permissions).toContain('create');
            expect(permissions).not.toContain('update');
            expect(permissions).not.toContain('delete');
            expect(permissions).toHaveLength(2);
        });

        it('should return view-only for viewer role', () => {
            const permissions = getUserPermissions('viewer');
            expect(permissions).toContain('view');
            expect(permissions).not.toContain('create');
            expect(permissions).not.toContain('update');
            expect(permissions).not.toContain('delete');
            expect(permissions).toHaveLength(1);
        });

        it('should return all permissions for unknown role (permissive)', () => {
            const permissions = getUserPermissions('unknown');
            expect(permissions).toHaveLength(4);
        });
    });

    describe('hasPermission', () => {
        it('should return true when user has required permission', () => {
            const permissions = ['view', 'create'];
            expect(hasPermission(permissions, 'view')).toBe(true);
            expect(hasPermission(permissions, 'create')).toBe(true);
        });

        it('should return false when user lacks required permission', () => {
            const permissions = ['view'];
            expect(hasPermission(permissions, 'delete')).toBe(false);
        });

        it('should handle empty permissions array', () => {
            expect(hasPermission([], 'view')).toBe(false);
        });
    });
});
