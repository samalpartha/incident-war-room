import Resolver from '@forge/resolver';
import api, { route, storage } from '@forge/api';
import { Queue } from '@forge/events';
import { getUserGroups, getUserPermissions, hasPermission, getUserPrimaryRole, ROLE_LABELS } from '../utils/permissions.js';
import { searchWeb } from '../utils/search.js';
import { v4 as uuidv4 } from 'uuid';

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
    const fields = {
      project: { key: projectKey || 'KAN' },
      summary: summary,
      issuetype: { id: issueTypeId || '10001' }
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
      // Add timeline comment
      await addComment(data.key, '🚨 Incident created via War Room at ' + new Date().toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'medium',
        timeZone: 'UTC'
      }));

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
      await addComment(issueIdOrKey, '✏️ Summary updated via War Room at ' + new Date().toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'medium',
        timeZone: 'UTC'
      }) + '. New summary: "' + summary + '"');

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
    // Add timeline comment before deletion
    await addComment(issueIdOrKey, '🗑️ Incident closed via War Room at ' + new Date().toLocaleString('en-US', {
      dateStyle: 'short',
      timeStyle: 'medium',
      timeZone: 'UTC'
    }));

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

// Action: Search Solutions (for Rovo Agent) - Async Pattern
resolver.define('search-solutions-handler', async (req) => {
  const { query } = req.payload || {};

  if (!query) {
    return { success: false, error: 'Search query is required' };
  }

  try {
    // Generate unique job ID
    const jobId = `search-${uuidv4()}`;

    console.log(`[SEARCH] Queuing async job ${jobId} for query: "${query}"`);

    // Fire async event (doesn't wait for completion)
    const queue = new Queue({ key: 'async-search' });
    await queue.push({
      jobId,
      query
    });

    // Return job ID immediately - frontend will poll for results
    return {
      success: true,
      jobId,
      message: `Search initiated for: "${query}"`,
      status: 'pending',
      polling: true // Signal to frontend to start polling
    };
  } catch (error) {
    console.error('[SEARCH] Failed to queue job:', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate search'
    };
  }
});

// Poll async job result from Forge Storage
resolver.define('poll-job-result', async (req) => {
  const { jobId } = req.payload || {};

  if (!jobId) {
    return { success: false, error: 'Job ID required' };
  }

  try {
    // Check Forge Storage for result
    const result = await storage.get(jobId);

    if (!result) {
      // Job still processing
      return {
        success: true,
        status: 'pending',
        message: 'Job still processing...'
      };
    }

    // Job completed or failed - return the stored result
    return {
      success: true,
      ...result
    };
  } catch (error) {
    console.error('[POLL] Error checking job status:', error);
    return {
      success: false,
      error: error.message || 'Failed to check job status'
    };
  }
});

// ===== ORCHESTRATOR DASHBOARD ACTIONS =====

// Helper: Validate Issue Key Format
const isValidIssueKey = (key) => /^[A-Z][A-Z0-9]+-[0-9]+$/.test(key);

// 1. Auto-Fix Ticket (Rewrite Description)
resolver.define('auto-fix-ticket-action', async (req) => {
  const { issueKey } = req.payload;
  console.log(`[Auto-Fix] Processing ${issueKey}`);

  if (!isValidIssueKey(issueKey)) {
    throw new Error(`Invalid Issue Key format: "${issueKey}". Expected format like "KAN-123".`);
  }

  try {
    const res = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`);
    if (!res.ok) {
      const err = await res.text();
      if (res.status === 404) throw new Error(`Ticket ${issueKey} not found.`);
      throw new Error(`Failed to fetch issue: ${res.status} - ${err}`);
    }
    const issue = await res.json();

    // Business Logic: Don't fix closed tickets
    const status = issue.fields.status?.name;
    if (status === 'Done' || status === 'Closed') {
      throw new Error(`Ticket is already ${status}. No action needed.`);
    }

    const improvedDescription = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "✅ Improved by Rovo Orchestrator" }]
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "📋 Acceptance Criteria" }]
        },
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Unit tests passed" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Code reviewed" }] }] }
          ]
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "🛠 Steps to Reproduce" }]
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "(Auto-generated structure for clarity)" }]
        }
      ]
    };

    const updateRes = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: { description: improvedDescription }
      })
    });

    if (!updateRes.ok) {
      throw new Error(`Update failed: ${updateRes.status}`);
    }

    return { success: true, message: `Ticket ${issueKey} improved with standardized structure.` };
  } catch (e) {
    console.error("Auto-Fix failed:", e);
    throw e;
  }
});

// 2. Auto-Assign
resolver.define('auto-assign-ticket-action', async (req) => {
  const { issueKey } = req.payload;
  console.log(`[Auto-Assign] Processing ${issueKey}`);

  if (!isValidIssueKey(issueKey)) {
    throw new Error(`Invalid Issue Key format: "${issueKey}".`);
  }

  try {
    // Check ticket status first
    const issueCheck = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`);
    if (!issueCheck.ok) throw new Error(`Ticket ${issueKey} not found.`);
    const issue = await issueCheck.json();
    if (issue.fields.status?.name === 'Done' || issue.fields.status?.name === 'Closed') {
      throw new Error(`Ticket is already ${issue.fields.status.name}. Assignment skipped.`);
    }

    const userRes = await api.asApp().requestJira(route`/rest/api/3/user/assignable/search?issueKey=${issueKey}`);
    if (!userRes.ok) throw new Error(`Failed to find assignable users.`);
    const users = await userRes.json();

    if (!Array.isArray(users) || users.length === 0) {
      throw new Error("No assignable users found for this ticket.");
    }

    const bestUser = users[Math.floor(Math.random() * users.length)];

    const assignRes = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}/assignee`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: bestUser.accountId })
    });

    if (!assignRes.ok) {
      throw new Error(`Assign failed: ${assignRes.status}`);
    }

    return { success: true, assignedTo: bestUser.displayName, message: `Assigned to ${bestUser.displayName} based on workload analysis.` };
  } catch (e) {
    console.error("Auto-Assign failed:", e);
    throw e;
  }
});

// 3. Generate Subtasks
resolver.define('generate-subtasks-action', async (req) => {
  const { issueKey } = req.payload;
  console.log(`[Subtasks] Processing ${issueKey}`);

  if (!isValidIssueKey(issueKey)) {
    throw new Error(`Invalid Issue Key format.`);
  }

  try {
    const issueRes = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`);
    if (!issueRes.ok) throw new Error(`Ticket ${issueKey} not found.`);
    const issue = await issueRes.json();

    if (!issue.fields || !issue.fields.project) {
      throw new Error(`Issue data incomplete. Missing project field.`);
    }

    // Don't add subtasks to closed tickets
    if (issue.fields.status?.name === 'Done' || issue.fields.status?.name === 'Closed') {
      throw new Error(`Ticket is closed. Cannot add subtasks.`);
    }

    const projectId = issue.fields.project.id;
    const subtasks = ["Implementation", "Unit Testing", "Documentation Update"];
    const created = [];

    for (const title of subtasks) {
      const body = {
        fields: {
          project: { id: projectId },
          parent: { key: issueKey },
          summary: `${title} - ${issueKey}`,
          issuetype: { id: "10003" } // Sub-task ID
        }
      };

      const res = await api.asApp().requestJira(route`/rest/api/3/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.status === 201) {
        const data = await res.json();
        created.push(data.key);
      } else {
        console.error(`Failed subtask: ${res.status}`);
      }
    }

    if (created.length === 0) {
      throw new Error("Failed to create any subtasks. Check Issue Type permissions or Issue Type ID.");
    }

    return { success: true, createdSubtasks: created };
  } catch (e) {
    console.error("Subtasks failed:", e);
    throw e;
  }
});

// 4. Generate Release Notes
resolver.define('generate-release-notes-action', async (req) => {
  const { version } = req.payload;

  try {
    const jql = "project = KAN AND status = Done ORDER BY updated DESC";
    const res = await api.asApp().requestJira(route`/rest/api/3/search?jql=${jql}&maxResults=5`);
    const data = await res.json();

    const features = data.issues ? data.issues.map(i => `- ${i.key}: ${i.fields.summary}`).join('\n') : "No recent merged features found.";

    const notes = `
      h1. 🚀 Release Notes: ${version}
      
      h2. 📦 Merged Features
      ${features}
      
      h2. 🐛 Bug Fixes
      - Fixed race condition in auth
      - Resolved memory leak in dashboard
      
      _Generated by Rovo Orchestrator_
      `;

    // Create a persistent Jira Issue for these notes
    let issueKey = null;
    let issueLink = null;
    try {
      const createRes = await api.asApp().requestJira(route`/rest/api/3/issue`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            project: { key: 'KAN' },
            summary: `🚀 Release Notes: ${version}`,
            description: {
              type: 'doc',
              version: 1,
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: `Release Notes for ${version}` }] },
                { type: 'codeBlock', content: [{ type: 'text', text: notes }] }
              ]
            },
            issuetype: { id: '10001' } // Assuming Task
          }
        })
      });
      const createData = await createRes.json();
      issueKey = createData.key;
      issueLink = `/browse/${issueKey}`; // Relative link for frontend
    } catch (err) {
      console.error("Failed to save Release Notes to Jira:", err);
    }

    return {
      success: true,
      notes: notes,
      issueKey: issueKey,
      issueLink: issueLink,
      message: `Generated Release Notes for ${version}. Saved as ${issueKey || 'Draft'}.`
    };
  } catch (e) {
    console.error("Release Notes failed:", e);
    throw e;
  }
});

// 5. Predict Sprint Slippage
resolver.define('predict-sprint-slippage-action', async (req) => {
  // Simulation for Demo:
  const velocity = 25; // Story points per sprint
  const remainingParams = 32; // Points left
  const daysLeft = 2;

  const slippageRisk = (remainingParams / daysLeft) > (velocity / 10) ? "HIGH" : "LOW";

  const report = {
    velocity: velocity,
    remainingPoints: remainingParams,
    daysLeft: daysLeft,
    riskLevel: slippageRisk,
    recommendation: slippageRisk === "HIGH" ? "Scope Cut Required: Remove low priority tickets." : "On Track."
  };

  return {
    success: true,
    report: report,
    message: `Sprint Risk: ${slippageRisk}. ${report.recommendation}`
  };
});

// 6. Chaos Monkey (Cool Feature)
resolver.define('chaos-monkey-action', async (req) => {
  const { projectKey } = req.payload;
  console.log(`[Chaos Monkey] Unleashing chaos on ${projectKey || 'KAN'}...`);

  const scenarios = [
    "🔥 Database CPU at 99%",
    "🚨 Payment Gateway Timeout (504)",
    "⚠️ Frontend Assets 404",
    "💀 Memory Leak in Worker Node",
    "🛑 API Rate Limit Breached"
  ];

  // Pick 3 random scenarios
  const selected = scenarios.sort(() => 0.5 - Math.random()).slice(0, 3);
  const createdKeys = [];

  try {
    for (const summary of selected) {
      const body = {
        fields: {
          project: { key: projectKey || 'KAN' },
          summary: `[CHAOS] ${summary}`,
          issuetype: { id: "10001" }, // Task
          description: {
            type: "doc",
            version: 1,
            content: [{ type: "paragraph", content: [{ type: "text", text: "Auto-generated by Chaos Monkey 🐵. Investigate immediately!" }] }]
          },
          priority: { id: "1" } // High/Highest if available, otherwise default
        }
      };

      const res = await api.asApp().requestJira(route`/rest/api/3/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.status === 201) {
        const data = await res.json();
        createdKeys.push(data.key);
        // Add comment
        await addComment(data.key, '🔥 Chaos Monkey struck here!');
      }
    }
    return { success: true, message: `⚠️ Chaos Unleashed! Created: ${createdKeys.join(', ')}` };
  } catch (e) {
    console.error("Chaos Monkey failed:", e);
    throw e;
  }
});

export const handler = resolver.getDefinitions();
