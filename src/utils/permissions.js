import api, { route } from '@forge/api';

export const ROLES = {
    'incident-commanders': ['create', 'close', 'escalate', 'assign', 'delete'],
    'oncall-engineers': ['create', 'update', 'comment'],
    'developers': ['view', 'comment'],
    'observers': ['view']
};

export const ROLE_LABELS = {
    'incident-commanders': 'Incident Commander',
    'oncall-engineers': 'On-Call Engineer',
    'developers': 'Developer',
    'observers': 'Observer'
};

export async function getUserGroups(accountId) {
    try {
        const response = await api.asUser()
            .requestJira(route`/rest/api/3/user/groups?accountId=${accountId}`);
        const data = await response.json();
        return data.map(g => g.name);
    } catch (error) {
        console.error('Error fetching user groups:', error);
        return [];
    }
}

export function getUserPermissions(userGroups) {
    const permissions = new Set();

    // Check if user is in any RBAC groups
    const hasRBACGroups = userGroups.some(group => ROLES[group]);

    if (hasRBACGroups) {
        // User is in RBAC groups - calculate specific permissions
        userGroups.forEach(group => {
            const groupPerms = ROLES[group];
            if (groupPerms) {
                groupPerms.forEach(p => permissions.add(p));
            }
        });
    } else {
        // User has NO RBAC groups - grant full access (backward compatibility)
        // This preserves existing behavior where everyone could create/update/delete
        permissions.add('view');
        permissions.add('create');
        permissions.add('update');
        permissions.add('delete');
        permissions.add('comment');
    }

    // Ensure everyone can at least view
    permissions.add('view');

    return Array.from(permissions);
}

export function hasPermission(permissions, action) {
    return permissions.includes(action);
}

export function getUserPrimaryRole(userGroups) {
    // Priority order: commanders > oncall > developers > observers
    if (userGroups.includes('incident-commanders')) return 'incident-commanders';
    if (userGroups.includes('oncall-engineers')) return 'oncall-engineers';
    if (userGroups.includes('developers')) return 'developers';
    if (userGroups.includes('observers')) return 'observers';

    // No RBAC groups = Full Access (default)
    return null;
}
