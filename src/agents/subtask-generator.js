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

        const projectId = issue.fields.project.id;
        const subtasks = ["Implementation", "Unit Testing", "Documentation Update"];
        const created = [];

        for (const title of subtasks) {
            const body = {
                fields: {
                    project: { id: projectId },
                    parent: { key: issueKey },
                    summary: `${title} - ${issueKey}`,
                    issuetype: { name: "Subtask" } // Use Name instead of ID 10003
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
};
