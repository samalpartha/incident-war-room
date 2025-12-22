import api, { route } from '@forge/api';
import { isValidIssueKey } from '../utils/validators.js';

export const generateSubtasks = async (issueKey) => {
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

        // Don't add subtasks to subtasks or Epics
        if (issue.fields.issuetype?.subtask) {
            throw new Error(`Cannot create subtasks for an issue that is already a subtask (${issue.key}).`);
        }
        if (issue.fields.issuetype?.name === 'Epic') {
            throw new Error(`Cannot create subtasks for an Epic (${issue.key}). Use 'Child Issues' instead.`);
        }

        const projectId = issue.fields.project.id;
        const projectKey = issue.fields.project.key;

        // Fetch project issue types to find the correct Subtask ID
        const projectRes = await api.asApp().requestJira(route`/rest/api/3/project/${projectId}`);
        if (!projectRes.ok) throw new Error(`Project ${projectKey} not found.`);
        const projectData = await projectRes.json();

        const subtaskType = projectData.issueTypes.find(it => it.name === 'Subtask' && it.subtask);

        if (!subtaskType) {
            console.error(`Available issue types for ${projectKey}:`, projectData.issueTypes.map(it => it.name));
            throw new Error(`Could not find issue type 'Subtask' in project ${projectKey}.`);
        }

        const subtaskIssueTypeId = subtaskType.id;
        console.log(`[Subtasks] Found Subtask ID: ${subtaskIssueTypeId} for project ${projectKey}`);

        const subtasks = ["Implementation", "Unit Testing", "Documentation Update"];
        const created = [];

        for (const title of subtasks) {
            const body = {
                fields: {
                    project: { id: projectId },
                    parent: { key: issueKey },
                    summary: `${title} - ${issueKey}`,
                    issuetype: { id: subtaskIssueTypeId }
                }
            };

            // Use asUser() to ensure permissions
            const res = await api.asUser().requestJira(route`/rest/api/3/issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.status === 201) {
                const data = await res.json();
                created.push(data.key);
            } else {
                const errorData = await res.json();
                const errorMsg = errorData.errors ? JSON.stringify(errorData.errors) :
                    errorData.errorMessages ? errorData.errorMessages.join(', ') :
                        JSON.stringify(errorData);
                console.error(`Failed subtask: ${res.status}`, errorMsg);
                throw new Error(`Jira API ${res.status}: ${errorMsg}`);
            }
        }

        if (created.length === 0) {
            throw new Error("Failed to create any subtasks. Check logs execution.");
        }

        return { success: true, createdSubtasks: created };
    } catch (e) {
        console.error("Subtasks failed:", e);
        throw e;
    }
};
