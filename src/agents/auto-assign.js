import api, { route } from '@forge/api';
import { isValidIssueKey } from '../utils/validators.js';

export const autoAssignTicket = async (issueKey) => {
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

        // 1. Get Assignable Users
        const userRes = await api.asUser().requestJira(route`/rest/api/3/user/assignable/search?issueKey=${issueKey}`);
        if (!userRes.ok) throw new Error(`Failed to find assignable users.`);
        const users = await userRes.json();

        if (!Array.isArray(users) || users.length === 0) {
            throw new Error("No assignable users found for this ticket.");
        }

        // 2. Get Workload for each user (Active Tickets)
        // We'll limit to checking the first 5 users to performance
        // Filter for human users only
        const candidates = users.filter(u => u.accountType === 'atlassian').slice(0, 5);

        if (candidates.length === 0) {
            throw new Error("No human users found to assign.");
        }
        const workloads = [];

        for (const user of candidates) {
            // Check all open work, not just "In Progress"
            const jql = `assignee = "${user.accountId}" AND statusCategory != "Done"`;

            // Use POST /search/jql to avoid 410 Deprecated error
            // Note: /search/jql does NOT return 'total' count, so we fetch up to 50
            const loadRes = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jql: jql,
                    maxResults: 50
                })
            });

            if (loadRes.ok) {
                const loadData = await loadRes.json();
                let count = loadData.issues ? loadData.issues.length : 0;
                // If there are more pages, it means they are very busy (>50)
                if (loadData.issues && loadData.issues.length >= 50 && !loadData.isLast) {
                    count = 999;
                }
                workloads.push({ user, count: count });
            } else {
                const errBody = await loadRes.text();
                console.error(`[Auto-Assign] Failed to check load for ${user.displayName}: ${loadRes.status}`, errBody);
                workloads.push({ user, count: 999 }); // Treat error as busy
            }
        }

        // 3. Find user with lowest load
        workloads.sort((a, b) => a.count - b.count);
        const bestCandidate = workloads[0];
        const bestUser = bestCandidate.user;

        const assignRes = await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}/assignee`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: bestUser.accountId })
        });

        if (!assignRes.ok) {
            throw new Error(`Assign failed: ${assignRes.status}`);
        }

        return {
            success: true,
            assignedTo: bestUser.displayName,
            message: `Assigned to ${bestUser.displayName}. They have the lowest active load (${bestCandidate.count} tickets).`
        };
    } catch (e) {
        console.error("Auto-Assign failed:", e);
        throw e;
    }
};
