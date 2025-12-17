import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

const getProjectKey = async () => {
  const projectsRes = await api.asUser().requestJira(route`/rest/api/3/project/search?maxResults=1`);
  const projectsData = await projectsRes.json();
  if (projectsData.values.length === 0) throw new Error("No projects found.");
  return projectsData.values[0].key;
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

resolver.define('createIncident', async (req) => {
  const { summary, description, issueType, issueTypeId, projectKey, assigneeId } = req.payload;
  try {
    const finalProjectKey = projectKey || await getProjectKey();

    // Construct Issue Type object: Prefer ID, fallback to Name
    const issueTypeObj = issueTypeId ? { id: issueTypeId } : { name: issueType || "Task" };

    const body = {
      fields: {
        project: { key: finalProjectKey },
        summary: summary || `Incident declared at ${new Date().toISOString()}`,
        description: {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: description || "Declared from War Room." }] }]
        },
        issuetype: issueTypeObj,
        ...(assigneeId ? { assignee: { id: assigneeId } } : {})
      }
    };

    const response = await api.asUser().requestJira(route`/rest/api/3/issue`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (response.status === 201) return { success: true, ...data };
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
  try {
    const body = { fields: { summary: summary } };
    const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueIdOrKey}`, {
      method: 'PUT',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (response.status === 204) return { success: true, message: "Updated successfully" };
    const data = await response.json();
    throw new Error(JSON.stringify(data.errors || data));
  } catch (error) { console.error(error); throw error; }
});

resolver.define('deleteIncident', async (req) => {
  const { issueIdOrKey } = req.payload;
  try {
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

export const handler = resolver.getDefinitions();
