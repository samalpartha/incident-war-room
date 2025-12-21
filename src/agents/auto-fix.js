import api, { route } from '@forge/api';
import { isValidIssueKey } from '../utils/validators.js';

export const autoFixTicket = async (issueKey) => {
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
};
