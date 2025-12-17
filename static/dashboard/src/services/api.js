import { invoke } from '@forge/bridge';

const api = {
    /**
     * Create a new incident (Jira Issue)
     */
    createIncident: async (summary, description, issueType, projectKey, issueTypeId, assigneeId) => {
        return await invoke('createIncident', { summary, description, issueType, projectKey, issueTypeId, assigneeId });
    },

    /**
     * Get all available projects
     */
    getProjects: async () => {
        return await invoke('getProjects');
    },

    /**
     * Get real Jira users
     */
    getUsers: async () => {
        return await invoke('getUsers');
    },

    /**
     * Get project details (issue types)
     */
    getProjectDetails: async (projectKey) => {
        return await invoke('getProjectDetails', { projectKey });
    },

    /**
     * Get incidents from Jira
     */
    getIncidents: async (projectKey, mine) => {
        return await invoke('getIncidents', { projectKey, mine });
    },

    /**
     * Get single issue (bypass search index)
     */
    getIssue: async (issueKey) => {
        return await invoke('getIssue', { issueKey });
    },

    /**
     * Update an incident summary
     */
    updateIncident: async (issueIdOrKey, summary) => {
        return await invoke('updateIncident', { issueIdOrKey, summary });
    },

    /**
     * Delete an incident
     */
    deleteIncident: async (issueIdOrKey) => {
        return await invoke('deleteIncident', { issueIdOrKey });
    },

    /**
     * Generic invoker for the API Console
     */
    invokeRaw: async (functionKey, payload) => {
        return await invoke(functionKey, payload);
    }
};

export { api };
export default api;
