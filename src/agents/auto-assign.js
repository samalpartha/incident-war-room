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
        const userRes = await api.asApp().requestJira(route`/rest/api/3/user/assignable/search?issueKey=${issueKey}`);
        if (!userRes.ok) throw new Error(`Failed to find assignable users.`);
        const users = await userRes.json();

        if (!Array.isArray(users) || users.length === 0) {
            throw new Error("No assignable users found for this ticket.");
        }

        // 2. Get Workload for each user (Active Tickets)
        // We'll limit to checking the first 5 users to performance
        const candidates = users.slice(0, 5);
        const workloads = [];

        for (const user of candidates) {
            const jql = `assignee = "${user.accountId}" AND statusCategory = "In Progress"`;
            const loadRes = await api.asApp().requestJira(route`/rest/api/3/search?jql=${jql}&maxResults=0`);
            if (loadRes.ok) {
                const loadData = await loadRes.json();
                workloads.push({ user, count: loadData.total });
            } else {
                workloads.push({ user, count: 999 }); // Treat error as busy
            }
        }

        // 3. Find user with lowest load
        workloads.sort((a, b) => a.count - b.count);
        const bestCandidate = workloads[0];
        const bestUser = bestCandidate.user;

        const assignRes = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}/assignee`, {
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
