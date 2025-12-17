import React, { useState, useEffect } from 'react';
import { router, view } from '@forge/bridge';
import api from '../services/api';

// MOCK_USERS Removed - Fetching Real Users Now

const CreateTicketModal = ({ isOpen, onClose, onCreate }) => {
    const [summary, setSummary] = useState('');
    const [description, setDescription] = useState('');
    const [issueType, setIssueType] = useState('Task');
    const [issueTypeId, setIssueTypeId] = useState(''); // Store immutable ID
    const [availableIssueTypes, setAvailableIssueTypes] = useState([]); // Dynamic types
    const [isManualType, setIsManualType] = useState(false); // Manual override toggle
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [users, setUsers] = useState([]);
    const [assigneeId, setAssigneeId] = useState(''); // Real Jira Account ID
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchProjects = async () => {
                try {
                    // 1. Fetch available projects
                    const res = await api.getProjects();
                    let projectList = [];
                    if (res && res.success && res.projects.length > 0) {
                        projectList = res.projects;
                        projectList = res.projects;
                        // HACK: Force KAN availability as requested by user
                        if (!projectList.find(p => p.key === 'KAN')) {
                            projectList.push({ id: 'kan-forced', key: 'KAN', name: 'Kanban Project (Forced)' });
                        }
                        setProjects(projectList);
                    }

                    // 2. Check for Context (Are we in a Project Page?)
                    const context = await view.getContext();
                    let defaultProj = null;

                    if (context && context.extension && context.extension.project && context.extension.project.key) {
                        // We are in a project context! Match by key.
                        const currentKey = context.extension.project.key;
                        defaultProj = projectList.find(p => p.key === currentKey);
                    }

                    // 3. Set Default
                    if (defaultProj) {
                        setSelectedProject(defaultProj);
                    } else if (projectList.length > 0) {
                        setSelectedProject(projectList[0]);
                    }

                } catch (e) { console.error("Failed to fetch projects", e); }

            };

            const fetchUsers = async () => {
                try {
                    const res = await api.getUsers();
                    if (res && res.success && res.users) {
                        setUsers(res.users);
                        // Default to current user? Or first one.
                        if (res.users.length > 0) setAssigneeId(res.users[0].accountId);
                    }
                } catch (e) { console.error("Failed users", e); }
            };

            fetchProjects();
            fetchUsers();
        }
    }, [isOpen]);

    // Fetch Issue Types when Project Changes
    useEffect(() => {
        if (selectedProject) {
            const fetchTypes = async () => {
                try {
                    const res = await api.getProjectDetails(selectedProject.key);
                    if (res && res.success && res.issueTypes) {
                        setAvailableIssueTypes(res.issueTypes);
                        // Default to Task if available, else first type
                        const hasTask = res.issueTypes.find(t => t.name === 'Task');
                        if (hasTask) {
                            setIssueType('Task');
                            setIssueTypeId(hasTask.id);
                        } else if (res.issueTypes.length > 0) {
                            setIssueType(res.issueTypes[0].name);
                            setIssueTypeId(res.issueTypes[0].id);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch issue types", e);
                    // Fallback: Enable manual mode automatically if fetch fails
                    setAvailableIssueTypes([]);
                    setIsManualType(true);
                    setIssueTypeId('');
                }
            };
            fetchTypes();
        }
    }, [selectedProject]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Prefix logic: [Type] Summary
        const finalSummary = `[${issueType.toUpperCase()}] ${summary}`;
        // Description
        const finalDescription = description;

        // Find assignee name for optimistic update
        const userObj = users.find(u => u.accountId === assigneeId);
        const assigneeName = userObj ? userObj.displayName : 'Unassigned';

        await onCreate(finalSummary, finalDescription, issueType, selectedProject ? selectedProject.key : null, assigneeName, issueTypeId, assigneeId);
        setLoading(false);
        setSummary('');
        setDescription('');
    };

    const handleOpenNative = () => {
        // Smart Deep Link to Native Create Screen
        if (selectedProject) {
            if (issueTypeId) {
                // If we have both Project and Issue Type, go directly to the form
                router.open(`/secure/CreateIssueDetails!init.jspa?pid=${selectedProject.id}&issuetype=${issueTypeId}`);
            } else {
                // If we miss the Issue Type (e.g. API failed), go to the Wizard so user can pick
                router.open(`/secure/CreateIssue!default.jspa?pid=${selectedProject.id}`);
            }
        } else {
            router.open('/secure/CreateIssue!default.jspa');
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ width: '500px', padding: '2rem', animation: 'slideIn 0.3s ease-out', position: 'relative' }}>
                <h2 style={{ marginTop: 0 }}>Create New Ticket</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div>
                        <label className="text-label">Target Project / App</label>
                        <select
                            value={selectedProject ? selectedProject.id : ''}
                            onChange={(e) => {
                                const proj = projects.find(p => p.id === e.target.value);
                                setSelectedProject(proj);
                            }}
                            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-hover)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid cols-2" style={{ gap: '1rem' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label className="text-label">Issue Type</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsManualType(!isManualType);
                                        setIssueTypeId(''); // Clear ID when switching
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    {isManualType ? 'Select from list' : 'Enter manually'}
                                </button>
                            </div>
                            {isManualType ? (
                                <input
                                    value={issueType}
                                    onChange={(e) => {
                                        setIssueType(e.target.value);
                                        setIssueTypeId(''); // Ensure no ID is sent
                                    }}
                                    placeholder="e.g. Story, Bug, Incident"
                                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-hover)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}
                                />
                            ) : (
                                <select
                                    value={issueTypeId}
                                    onChange={(e) => {
                                        setIssueTypeId(e.target.value);
                                        const typeObj = availableIssueTypes.find(t => t.id === e.target.value);
                                        if (typeObj) setIssueType(typeObj.name);
                                    }}
                                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-hover)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}
                                >
                                    {availableIssueTypes.length > 0 ? (
                                        availableIssueTypes.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))
                                    ) : (
                                        <option disabled>Loading types...</option>
                                    )}
                                </select>
                            )}
                        </div>
                        <div>
                            <label className="text-label">Assignee (Real Users)</label>
                            <select
                                value={assigneeId}
                                onChange={(e) => setAssigneeId(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-hover)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}
                            >
                                <option value="">Unassigned</option>
                                {users.map(u => (
                                    <option key={u.accountId} value={u.accountId}>{u.displayName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-label">Summary (Auto-prefixed)</label>
                        <input
                            required
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="Brief summary..."
                            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-hover)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}
                        />
                    </div>

                    <div>
                        <label className="text-label">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detailed description..."
                            rows={4}
                            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-hover)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                        <button type="button" onClick={handleOpenNative} style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', textDecoration: 'underline' }}>
                            ↗ Open Native Jira Create
                        </button>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="button" onClick={onClose} style={{ background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.5rem 1.5rem' }}>
                                {loading ? 'Creating...' : 'Create Ticket'}
                            </button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default CreateTicketModal;
