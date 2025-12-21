import api, { route } from '@forge/api';

// Helper: Add timeline comment to Jira issue
export const addComment = async (issueKey, commentText) => {
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
