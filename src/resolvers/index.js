import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { getUserGroups, getUserPermissions, hasPermission, getUserPrimaryRole, ROLE_LABELS } from '../utils/permissions.js';
import { searchWeb } from '../utils/search.js';

const resolver = new Resolver();

const getProjectKey = async () => {
  const projectsRes = await api.asUser().requestJira(route`/rest/api/3/project/search?maxResults=1`);
  const projectsData = await projectsRes.json();
  if (projectsData.values.length === 0) throw new Error("No projects found.");
  return projectsData.values[0].key;
};

// Helper: Add timeline comment to Jira issue
const addComment = async (issueKey, commentText) => {
  try {
    const response = await api.asUser().requestJira(
      route`/rest/api/3/issue/${issueKey}/comment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: commentText }]
              }
            ]
          }
        })
      }
    );

    if (response.status === 201) {
      console.log(`[TIMELINE] Comment added to ${issueKey}: ${commentText}`);
      return true;
    }
    console.warn(`[TIMELINE] Failed to add comment to ${issueKey}, status: ${response.status}`);
    return false;
  } catch (error) {
    console.error(`[TIMELINE] Error adding comment to ${issueKey}:`, error);
    return false; // Don't fail the main operation if comment fails
  }
};

resolver.define('getProjects', async (req) => {
  try {
    const response = await api.asUser().requestJira(route`/rest/api/3/project/search?maxResults=50`);
    const data = await response.json();
    return { success: true, projects: data.values.map(p => ({ id: p.id, key: p.key, name: p.name })) };
  } catch (error) { console.error(error); throw error; }
});

resolver.define('getProjectDetails', async (req) => {
  const { projectKey } = req.payload;
  try {
    const response = await api.asUser().requestJira(route`/rest/api/3/project/${projectKey}`);
    const data = await response.json();
    // Return just the issue types
    return {
      success: true,
      issueTypes: data.issueTypes ? data.issueTypes.map(it => ({ id: it.id, name: it.name, subtask: it.subtask })) : []
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
});

// RBAC: Get current user's context (groups, permissions, role)
resolver.define('getUserContext', async (req) => {
  try {
    const accountId = req.context.accountId;
    const groups = await getUserGroups(accountId);
    const permissions = getUserPermissions(groups);
    const primaryRole = getUserPrimaryRole(groups);

    return {
      success: true,
      accountId,
      groups,
      permissions,
      role: primaryRole,
      roleLabel: primaryRole ? (ROLE_LABELS[primaryRole] || 'Observer') : 'Full Access'
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    // Fallback to full access (preserve backward compatibility)
    return {
      success: true,
      accountId: req.context.accountId,
      groups: [],
      permissions: ['view', 'create', 'update', 'delete', 'comment'],
      role: null,
      roleLabel: 'Full Access'
    };
  }
});

resolver.define('createIncident', async (req) => {
  const { summary, description, issueType, issueTypeId, projectKey, assigneeId } = req.payload;

  // RBAC: Check if user has create permission
  const accountId = req.context.accountId;
  const groups = await getUserGroups(accountId);
  const permissions = await getUserPermissions(groups); // Await this call

  if (!hasPermission(permissions, 'create')) {
    return { success: false, error: 'Permission denied: You do not have permission to create incidents' };
  }

  try {
    const finalProjectKey = projectKey || await getProjectKey();

    // Construct Issue Type object: Prefer ID, fallback to Name
    const issueTypeObj = issueTypeId ? { id: issueTypeId } : { name: issueType || "Task" };

    const fields = {
      project: { key: finalProjectKey },
      summary: summary || "Incident",
      description: {
        type: "doc",
        version: 1,
        content: [{ type: "paragraph", content: [{ type: "text", text: description || "No description provided" }] }]
      },
      issuetype: issueTypeObj
    };

    if (assigneeId) {
      fields.assignee = { id: assigneeId };
    }

    const response = await api.asUser().requestJira(route`/rest/api/3/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    const data = await response.json();
    if (response.status === 201) {
      // Add timeline comment
      const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        dateStyle: 'short',
        timeStyle: 'medium'
      });

      await addComment(
        data.key,
        `🚨 Incident created via War Room at ${timestamp}`
      );

      return { success: true, key: data.key, id: data.id };
    }
    // Return explicit error so frontend can show it
    return { success: false, error: JSON.stringify(data.errors || data) };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

resolver.define('getIncidents', async (req) => {
  const { projectKey, mine } = req.payload || {};
  try {
    let jql = 'ORDER BY created DESC';
    const conditions = [];

    if (projectKey) {
      conditions.push(`project = "${projectKey}"`);
    }

    if (mine) {
      conditions.push('creator = currentUser()');
    }

    if (conditions.length > 0) {
      jql = `${conditions.join(' AND ')} ${jql}`;
    }

    const response = await api.asUser().requestJira(route`/rest/api/3/search?jql=${jql}&maxResults=100`);
    const data = await response.json();
    return { success: true, issues: data.issues };
  } catch (error) { console.error(error); throw error; }
});

resolver.define('getIssue', async (req) => {
  const { issueKey } = req.payload;
  try {
    const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}`);
    const data = await response.json();
    return { success: true, issue: data };
  } catch (error) { console.error(error); throw error; }
});

resolver.define('getUsers', async (req) => {
  try {
    // Fetch all users, then filter for real humans only
    const response = await api.asUser().requestJira(route`/rest/api/3/users/search?maxResults=100`);
    const data = await response.json();

    // Filter to only real human users (not bots/apps)
    const realUsers = data
      .filter(u => u.accountType === 'atlassian') // Only human users
      .slice(0, 10) // Limit to 10 users
      .map(u => ({
        accountId: u.accountId,
        displayName: u.displayName,
        avatarUrl: u.avatarUrls['48x48']
      }));

    return { success: true, users: realUsers };
  } catch (error) { console.error(error); throw error; }
});

resolver.define('updateIncident', async (req) => {
  const { issueIdOrKey, summary } = req.payload;

  // RBAC: Check if user has update permission
  const accountId = req.context.accountId;
  const groups = await getUserGroups(accountId);
  const permissions = getUserPermissions(groups);

  if (!hasPermission(permissions, 'update')) {
    return { success: false, error: 'Permission denied: You do not have permission to update incidents' };
  }

  try {
    const body = { fields: { summary: summary } };
    const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueIdOrKey}`, {
      method: 'PUT',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (response.status === 204) {
      // Add timeline comment
      const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        dateStyle: 'short',
        timeStyle: 'medium'
      });

      await addComment(
        issueIdOrKey,
        `✏️ Summary updated via War Room at ${timestamp}\nNew summary: ${summary}`
      );

      return { success: true, message: "Updated successfully" };
    }
    const data = await response.json();
    throw new Error(JSON.stringify(data.errors || data));
  } catch (error) { console.error(error); throw error; }
});

resolver.define('deleteIncident', async (req) => {
  const { issueIdOrKey } = req.payload;

  // RBAC: Check if user has delete permission
  const accountId = req.context.accountId;
  const groups = await getUserGroups(accountId);
  const permissions = getUserPermissions(groups);

  if (!hasPermission(permissions, 'delete')) {
    return { success: false, error: 'Permission denied: You do not have permission to delete incidents' };
  }

  try {
    // Add final timeline comment before deletion
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'short',
      timeStyle: 'medium'
    });

    await addComment(
      issueIdOrKey,
      `🗑️ Incident closed via War Room at ${timestamp}`
    );

    // Now delete the issue
    const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueIdOrKey}`, {
      method: 'DELETE'
    });
    if (response.status === 204) return { success: true, message: "Deleted successfully" };
    const data = await response.json();
    throw new Error(JSON.stringify(data.errors || data));
  } catch (error) { console.error(error); throw error; }
});

// ===== ROVO AGENT ACTIONS =====

// Action: Create Incident (for Rovo Agent)
resolver.define('create-incident-handler', async (req) => {
  const { summary, description, projectKey, issueType, assigneeId } = req.payload || {};

  try {
    const fields = {
      project: { key: projectKey || 'KAN' },
      summary: summary || 'Incident created via Rovo',
      description: description || 'No description provided',
      issuetype: { name: issueType || 'Task' }
    };

    if (assigneeId) {
      fields.assignee = { id: assigneeId };
    }

    const response = await api.asUser().requestJira(route`/rest/api/3/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    const result = await response.json();

    return {
      success: true,
      message: `Incident ${result.key} created successfully`,
      incidentKey: result.key,
      url: `https://samalparthas.atlassian.net/browse/${result.key}`
    };
  } catch (error) {
    console.error('Rovo create incident error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create incident'
    };
  }
});

// Action: List Incidents (for Rovo Agent)
resolver.define('list-incidents-handler', async (req) => {
  const { projectKey } = req.payload || {};

  try {
    let jql = 'ORDER BY created DESC';
    if (projectKey) {
      jql = `project = "${projectKey}" ${jql}`;
    }

    const response = await api.asUser().requestJira(route`/rest/api/3/search?jql=${jql}&maxResults=10`);
    const data = await response.json();

    return {
      success: true,
      incidents: data.issues.map(i => ({
        key: i.key,
        summary: i.fields.summary,
        status: i.fields.status?.name || 'Unknown',
        assignee: i.fields.assignee?.displayName || 'Unassigned',
        created: i.fields.created
      }))
    };
  } catch (error) {
    console.error('Rovo list incidents error:', error);
    return {
      success: false,
      error: error.message || 'Failed to list incidents'
    };
  }
});

// Action: Get Incident Status (for Rovo Agent)
resolver.define('get-incident-handler', async (req) => {
  const { issueKey } = req.payload || {};

  if (!issueKey) {
    return { success: false, error: 'Issue key is required' };
  }

  try {
    const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}`);
    const issue = await response.json();

    return {
      success: true,
      incident: {
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description,
        status: issue.fields.status?.name || 'Unknown',
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        created: issue.fields.created,
        updated: issue.fields.updated
      }
    };
  } catch (error) {
    console.error('Rovo get incident error:', error);
    return {
      success: false,
      error: `Could not fetch ${issueKey}: ${error.message}`
    };
  }
});

// Action: Search Solutions (for Rovo Agent)
resolver.define('search-solutions-handler', async (req) => {
  const { query } = req.payload || {};

  if (!query) {
    return { success: false, error: 'Search query is required' };
  }

  try {
    const searchResults = await searchWeb(query);

    if (!searchResults.success) {
      return {
        success: false,
        error: 'Search failed: ' + searchResults.error
      };
    }

    return {
      success: true,
      query,
      results: searchResults.results,
      totalFound: searchResults.totalFound,
      message: `Found ${searchResults.totalFound} results for: "${query}"`
    };
  } catch (error) {
    console.error('Rovo search error:', error);
    return {
      success: false,
      error: error.message || 'Failed to search for solutions'
    };
  }
});

export const handler = resolver.getDefinitions();
