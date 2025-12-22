import Resolver from '@forge/resolver';
import api, { route, storage } from '@forge/api';
import { Queue } from '@forge/events';
import { getUserGroups, getUserPermissions, hasPermission, getUserPrimaryRole, ROLE_LABELS } from '../utils/permissions.js';
import { v4 as uuidv4 } from 'uuid';

// Services
import { addComment } from '../services/jira.js';

// Agents
import { autoFixTicket } from '../agents/auto-fix.js';
import { autoAssignTicket } from '../agents/auto-assign.js';
import { generateSubtasks } from '../agents/subtask-generator.js';
import { generateReleaseNotes } from '../agents/release-notes.js';
import { predictSprintSlippage } from '../agents/sprint-predictor.js';
import { predictSlaRisk } from '../agents/sla-predictor.js';
import { chaosMonkey } from '../agents/chaos-monkey.js';

const resolver = new Resolver();

// Data Fetchers (Dashboard)

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
    return {
      success: true,
      issueTypes: data.issueTypes ? data.issueTypes.map(it => ({ id: it.id, name: it.name, subtask: it.subtask })) : []
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
});

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

  const accountId = req.context.accountId;
  const groups = await getUserGroups(accountId);
  const permissions = await getUserPermissions(groups);

  if (!hasPermission(permissions, 'create')) {
    return { success: false, error: 'Permission denied: You do not have permission to create incidents' };
  }

  try {
    const fields = {
      project: { key: projectKey || 'KAN' },
      summary: summary,
      issuetype: issueTypeId ? { id: issueTypeId } : { name: issueType || 'Task' }
    };

    if (description) {
      fields.description = {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: description }]
        }]
      };
    }

    if (assigneeId) fields.assignee = { id: assigneeId };

    const response = await api.asUser().requestJira(route`/rest/api/3/issue`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    const data = await response.json();
    if (response.status === 201) {
      await addComment(data.key, '🚨 Incident created via War Room at ' + new Date().toLocaleString());
      return { success: true, key: data.key, id: data.id };
    }
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

    if (projectKey) conditions.push(`project = "${projectKey}"`);
    if (mine) conditions.push('creator = currentUser()');

    if (conditions.length > 0) jql = `${conditions.join(' AND ')} ${jql}`;

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
    const response = await api.asUser().requestJira(route`/rest/api/3/users/search?maxResults=100`);
    const data = await response.json();
    const realUsers = data
      .filter(u => u.accountType === 'atlassian')
      .slice(0, 10)
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
      await addComment(issueIdOrKey, '✏️ Summary updated via War Room. New summary: "' + summary + '"');
      return { success: true, message: "Updated successfully" };
    }
    const data = await response.json();
    throw new Error(JSON.stringify(data.errors || data));
  } catch (error) { console.error(error); throw error; }
});

resolver.define('deleteIncident', async (req) => {
  const { issueIdOrKey } = req.payload;

  const accountId = req.context.accountId;
  const groups = await getUserGroups(accountId);
  const permissions = getUserPermissions(groups);

  if (!hasPermission(permissions, 'delete')) {
    return { success: false, error: 'Permission denied: You do not have permission to delete incidents' };
  }

  try {
    await addComment(issueIdOrKey, '🗑️ Incident closed via War Room at ' + new Date().toLocaleString());
    const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueIdOrKey}`, {
      method: 'DELETE'
    });

    if (response.status === 204) {
      return { success: true, message: "Deleted successfully" };
    }
    const data = await response.json();
    throw new Error(JSON.stringify(data.errors || data));
  } catch (error) { console.error(error); throw error; }
});

// ===== AGENT DELEGATION =====

// Note: Handlers like 'create-incident-handler' are kept minimal or could also be moved to agents.
// For now, I'll keep the purely transactional ones here and move the "Smart" ones.

resolver.define('create-incident-handler', async (req) => {
  const { summary, description, projectKey, issueType, assigneeId } = req.payload || {};
  try {
    const fields = {
      project: { key: projectKey || 'KAN' },
      summary: summary || 'Incident created via Rovo',
      description: description || 'No description provided',
      issuetype: { name: issueType || 'Task' }
    };
    if (assigneeId) fields.assignee = { id: assigneeId };

    const response = await api.asUser().requestJira(route`/rest/api/3/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    const result = await response.json();
    return { success: true, message: `Incident ${result.key} created successfully`, incidentKey: result.key, url: `https://samalparthas.atlassian.net/browse/${result.key}` };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to create incident' };
  }
});

resolver.define('list-incidents-action', async (req) => {
  console.log("v2446: Executing list-incidents-action");
  const { projectKey } = req.payload || {};
  try {
    const backendVersion = 'v2600-fix';
    const safeJql = projectKey ? `project = "${projectKey}" ORDER BY created DESC` : 'ORDER BY created DESC';
    const endpoint = route`/rest/api/3/search/jql?jql=${safeJql}&maxResults=20&fields=summary,status,assignee,created`;
    const response = await api.asApp().requestJira(endpoint);
    if (!response.ok) {
      return { success: false, error: `Jira API Error: ${response.status}`, backendVersion };
    }
    const data = await response.json();
    return {
      success: true, backendVersion, incidents: data.issues.map(i => ({
        key: i.key, summary: i.fields.summary, status: i.fields.status?.name || 'Unknown', assignee: i.fields.assignee?.displayName || 'Unassigned', created: i.fields.created
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

resolver.define('get-incident-handler', async (req) => {
  const { issueKey } = req.payload || {};
  if (!issueKey) return { success: false, error: 'Issue key is required' };
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
    return { success: false, error: `Could not fetch ${issueKey}: ${error.message}` };
  }
});

// Async Search (Kept here as it's plumbing, not agent logic)
resolver.define('search-solutions-handler', async (req) => {
  const { query } = req.payload || {};
  if (!query) return { success: false, error: 'Search query is required' };
  try {
    const jobId = `search-${uuidv4()}`;
    const queue = new Queue({ key: 'async-search' });
    await queue.push({ jobId, query });
    return { success: true, jobId, message: `Search initiated for: "${query}"`, status: 'pending', polling: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

resolver.define('poll-job-result', async (req) => {
  const { jobId } = req.payload || {};
  if (!jobId) return { success: false, error: 'Job ID required' };
  try {
    const result = await storage.get(jobId);
    if (!result) return { success: true, status: 'pending', message: 'Job still processing...' };
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== DELEGATED AGENT ACTIONS (Modularized) =====

resolver.define('auto-fix-ticket-action', async (req) => {
  try {
    return await autoFixTicket(req.payload.issueKey, req.payload.improvedContent);
  } catch (e) {
    console.error(`[Auto-Fix] Failed:`, e);
    return { success: false, error: e.message || "Failed to fix ticket." };
  }
});

resolver.define('auto-assign-ticket-action', async (req) => {
  try {
    return await autoAssignTicket(req.payload.issueKey);
  } catch (e) {
    console.error(`[Auto-Assign] Failed:`, e);
    return { success: false, error: e.message || "Failed to assign ticket." };
  }
});

resolver.define('generate-subtasks-action', async (req) => {
  try {
    const res = await generateSubtasks(req.payload.issueKey);
    return res;
  } catch (e) {
    console.error(`[Subtasks] Failed:`, e);
    return { success: false, error: e.message || "Failed to generate subtasks." };
  }
});

resolver.define('generate-release-notes-action', async (req) => {
  return await generateReleaseNotes(req.payload.version);
});

resolver.define('predict-sprint-slippage-action', async () => {
  return await predictSprintSlippage();
});

resolver.define('predict-sla-risk-action', async (req) => {
  return await predictSlaRisk(req.payload.issueKey);
});

resolver.define('chaos-monkey-action', async (req) => {
  return await chaosMonkey(req.payload.projectKey);
});

export const handler = resolver.getDefinitions();
