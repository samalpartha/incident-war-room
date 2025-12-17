import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { router } from '@forge/bridge';

const ApiConsole = ({ onGoToDashboard }) => {
    const [endpoint, setEndpoint] = useState('createIncident');
    const [payload, setPayload] = useState('');
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [method, setMethod] = useState('POST');

    // Builder State
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedType, setSelectedType] = useState('Task');
    const [users, setUsers] = useState([]);
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [buildSummary, setBuildSummary] = useState('Test from API');

    useEffect(() => {
        const fetchRefs = async () => {
            try {
                const res = await api.getProjects();
                if (res && res.success && res.projects) {
                    setProjects(res.projects);
                    if (res.projects.length > 0) setSelectedProject(res.projects[0].key);
                }
                const userRes = await api.getUsers();
                if (userRes && userRes.success && userRes.users) {
                    setUsers(userRes.users);
                    // Default to first user
                    if (userRes.users.length > 0) setSelectedAssignee(userRes.users[0].accountId);
                }
            } catch (e) { console.error(e); }
        };
        fetchRefs();
    }, []);

    // Auto-update payload for createIncident when builder inputs change
    useEffect(() => {
        if (endpoint === 'createIncident') {
            const newPayload = {
                summary: buildSummary,
                description: `Created via API Console Builder`,
                issueType: selectedType,
                projectKey: selectedProject,
                assigneeId: selectedAssignee
            };
            setPayload(JSON.stringify(newPayload, null, 2));
        }
    }, [endpoint, selectedProject, selectedType, buildSummary, selectedAssignee]);

    // Default Payloads
    const payloads = {
        createIncident: '{\n  "summary": "Test Incident from Console",\n  "description": "Generated via API Console"\n}',
        getIncidents: '{}',
        updateIncident: '{\n  "issueIdOrKey": "INC-101",\n  "summary": "Updated Summary"\n}',
        deleteIncident: '{\n  "issueIdOrKey": "INC-101"\n}'
    };

    const methods = {
        createIncident: 'POST',
        getIncidents: 'GET',
        updateIncident: 'PUT',
        deleteIncident: 'DELETE'
    };

    useEffect(() => {
        if (endpoint !== 'createIncident') {
            setPayload(payloads[endpoint]);
        }
        setMethod(methods[endpoint]);
        setResponse(null);
    }, [endpoint]);

    const handleExecute = async () => {
        setLoading(true);
        setResponse(null);
        try {
            const parsedPayload = payload ? JSON.parse(payload) : {};
            const res = await api.invokeRaw(endpoint, parsedPayload);
            setResponse(res);

            // PERSISTENCE: Save to localStorage with timestamp
            if (endpoint === 'createIncident' && res && (res.key || res.id)) {
                const key = res.key || res.id;
                const pendingJson = localStorage.getItem('forg_pending_incidents');
                const pendingData = pendingJson ? JSON.parse(pendingJson) : [];
                const exists = pendingData.find(item => item.key === key);
                if (!exists) {
                    pendingData.push({ key: key, timestamp: Date.now() });
                    if (pendingData.length > 20) pendingData.shift();
                    localStorage.setItem('forg_pending_incidents', JSON.stringify(pendingData));
                    console.log("[PERSISTENCE] API Console: Saved", key, "to localStorage");
                }
            }
        } catch (error) {
            setResponse({ error: error.message || error });
        } finally {
            setLoading(false);
        }
    };

    const getCurlCommand = () => {
        const baseUrl = 'https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3';
        let cmd = `curl --request ${method} \\\n  --url '${baseUrl}/${endpoint === 'createIncident' ? 'issue' : '...'}' \\\n  --header 'Authorization: Basic <email:token>' \\\n  --header 'Accept: application/json'`;

        if (method !== 'GET' && payload) {
            cmd += ` \\\n  --header 'Content-Type: application/json' \\\n  --data '${payload.replace(/\n/g, '').replace(/\s+/g, ' ')}'`;
        }
        return cmd;
    };

    return (
        <div className="card" style={{ marginTop: '2rem', border: '1px solid var(--brand-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--brand-primary)' }}>🛠 API Command Center</h3>
                    <button
                        onClick={onGoToDashboard}
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                        ← View on Dashboard
                    </button>
                </div>
                <span className="text-label">Administrator Access</span>
            </div>

            <div className="grid cols-2" style={{ gridTemplateColumns: '1fr 2fr' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Operation</label>
                        <select
                            value={endpoint}
                            onChange={(e) => setEndpoint(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-app)', color: 'white', border: '1px solid var(--border-subtle)' }}
                        >
                            <option value="createIncident">POST /createIncident</option>
                            <option value="getIncidents">GET /getIncidents</option>
                            <option value="updateIncident">PUT /updateIncident</option>
                            <option value="deleteIncident">DELETE /deleteIncident</option>
                        </select>
                    </div>

                    {/* Builder UI - Only for Create */}
                    {endpoint === 'createIncident' && (
                        <div style={{ padding: '0.5rem', border: '1px dashed var(--border-subtle)', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                            <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--brand-primary)' }}>🏗️ Payload Builder</label>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <select
                                    value={selectedProject}
                                    onChange={(e) => setSelectedProject(e.target.value)}
                                    style={{ flex: 1, padding: '0.3rem', borderRadius: '4px', background: 'var(--bg-hover)', color: 'white' }}
                                >
                                    {projects.map(p => <option key={p.id} value={p.key}>{p.key}</option>)}
                                </select>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    style={{ flex: 1, padding: '0.3rem', borderRadius: '4px', background: 'var(--bg-hover)', color: 'white' }}
                                >
                                    {['Task', 'Story', 'Bug', 'Epic'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <select
                                    value={selectedAssignee}
                                    onChange={(e) => setSelectedAssignee(e.target.value)}
                                    style={{ flex: 1, padding: '0.3rem', borderRadius: '4px', background: 'var(--bg-hover)', color: 'white' }}
                                >
                                    <option value="">Unassigned</option>
                                    {users.map(u => <option key={u.accountId} value={u.accountId}>{u.displayName}</option>)}
                                </select>
                            </div>
                            <input
                                value={buildSummary}
                                onChange={(e) => setBuildSummary(e.target.value)}
                                placeholder="Summary..."
                                style={{ width: '100%', padding: '0.3rem', borderRadius: '4px', background: 'var(--bg-hover)', color: 'white', border: 'none' }}
                            />
                        </div>
                    )}

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label className="text-label">Payload (JSON)</label>
                            <button
                                onClick={() => router.open('https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/')}
                                style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.8rem', color: 'var(--brand-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                📘 REST API Docs (Swagger)
                            </button>
                        </div>
                        <textarea
                            value={payload}
                            onChange={(e) => setPayload(e.target.value)}
                            style={{ width: '100%', height: '150px', padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-app)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'monospace' }}
                        />
                    </div>
                    <button className="btn btn-secondary" onClick={handleExecute} disabled={loading}>
                        {loading ? 'Executing...' : '▶ Execute Request'}
                    </button>

                    <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                        <label className="text-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Generated cURL</label>
                        <code style={{ fontFamily: 'monospace', fontSize: '0.7em', color: 'var(--text-muted)', display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {getCurlCommand()}
                        </code>
                    </div>
                </div>

                <div style={{ background: '#000', padding: '1rem', borderRadius: '4px', overflow: 'auto', maxHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label className="text-label" style={{ display: 'block' }}>Response Output</label>
                        {response && (response.key || response.id) && endpoint === 'createIncident' && (
                            <button
                                onClick={() => router.open(`/browse/${response.key || response.id}`)}
                                style={{ background: 'var(--success)', border: 'none', color: '#000', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                                ↗ OPEN {response.key}
                            </button>
                        )}
                    </div>
                    <pre style={{ margin: 0, fontSize: '0.85rem', color: '#4ade80', fontFamily: 'monospace', whiteSpace: 'pre-wrap', flex: 1 }}>
                        {response ? JSON.stringify(response, null, 2) : '// Select an endpoint and click Execute...'}
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default ApiConsole;
