import React, { useState, useEffect } from 'react';
import { router, view } from '@forge/bridge';
import api from '../services/api';

const CreateTicketModal = ({ isOpen, onClose, onCreate }) => {
    const [summary, setSummary] = useState('');
    const [description, setDescription] = useState('');
    const [issueType, setIssueType] = useState('Task');
    const [issueTypeId, setIssueTypeId] = useState('');
    const [availableIssueTypes, setAvailableIssueTypes] = useState([]);
    const [isManualType, setIsManualType] = useState(false);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [users, setUsers] = useState([]);
    const [assigneeId, setAssigneeId] = useState(''); // Real Jira Account ID
    const [loading, setLoading] = useState(false);

    // Voice State
    const [listeningField, setListeningField] = useState(null); // 'summary' | 'description' | null

    useEffect(() => {
        if (isOpen) {
            const fetchProjects = async () => {
                try {
                    const res = await api.getProjects();
                    let projectList = [];
                    if (res && res.success && res.projects) {
                        projectList = res.projects;
                        if (!projectList.find(p => p.key === 'KAN')) {
                            projectList.push({ id: 'kan-forced', key: 'KAN', name: 'Kanban Project (Forced)' });
                        }
                        setProjects(projectList);
                    }
                    const context = await view.getContext();
                    let defaultProj = null;
                    if (context && context.extension && context.extension.project && context.extension.project.key) {
                        const currentKey = context.extension.project.key;
                        defaultProj = projectList.find(p => p.key === currentKey);
                    }
                    if (defaultProj) setSelectedProject(defaultProj);
                    else if (projectList.length > 0) setSelectedProject(projectList[0]);
                } catch (e) { console.error("Failed to fetch projects", e); }
            };
            const fetchUsers = async () => {
                try {
                    const res = await api.getUsers();
                    if (res && res.success && res.users) {
                        setUsers(res.users);
                        if (res.users.length > 0) setAssigneeId(res.users[0].accountId);
                    }
                } catch (e) { console.error("Failed users", e); }
            };
            fetchProjects();
            fetchUsers();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedProject) {
            const fetchTypes = async () => {
                try {
                    const res = await api.getProjectDetails(selectedProject.key);
                    if (res && res.success && res.issueTypes) {
                        setAvailableIssueTypes(res.issueTypes);
                        const hasTask = res.issueTypes.find(t => t.name === 'Task');
                        if (hasTask) { setIssueType('Task'); setIssueTypeId(hasTask.id); }
                        else if (res.issueTypes.length > 0) { setIssueType(res.issueTypes[0].name); setIssueTypeId(res.issueTypes[0].id); }
                    }
                } catch (e) {
                    console.error("Failed to fetch issue types", e);
                    setAvailableIssueTypes([]); setIsManualType(true); setIssueTypeId('');
                }
            };
            fetchTypes();
        }
    }, [selectedProject]);

    // Voice Logic (Internal)
    const handleVoice = (field) => {
        if (!('webkitSpeechRecognition' in window)) return alert("Voice input not supported in this browser.");

        if (listeningField === field) {
            setListeningField(null); // Stop if already listening
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = 'en-US'; // Could be dynamic based on App lang but let's default safe
        recognition.continuous = false;
        recognition.interimResults = false;

        setListeningField(field);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (field === 'summary') setSummary(prev => prev ? prev + ' ' + transcript : transcript);
            if (field === 'description') setDescription(prev => prev ? prev + ' ' + transcript : transcript);
            setListeningField(null);
        };

        recognition.onerror = (e) => {
            console.error("Speech Error", e);
            setListeningField(null);
        };

        recognition.onend = () => setListeningField(null);

        recognition.start();
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const finalSummary = `[${issueType.toUpperCase()}] ${summary}`;
        const userObj = users.find(u => u.accountId === assigneeId);
        const assigneeName = userObj ? userObj.displayName : 'Unassigned';
        await onCreate(finalSummary, description, issueType, selectedProject ? selectedProject.key : null, assigneeName, issueTypeId, assigneeId);
        setLoading(false); setSummary(''); setDescription('');
    };

    const handleOpenNative = () => {
        if (selectedProject) router.open(issueTypeId ? `/secure/CreateIssueDetails!init.jspa?pid=${selectedProject.id}&issuetype=${issueTypeId}` : `/secure/CreateIssue!default.jspa?pid=${selectedProject.id}`);
        else router.open('/secure/CreateIssue!default.jspa');
    };

    // Icon Component
    const MicIcon = ({ active }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
    );

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ width: '500px', padding: '2rem', animation: 'slideIn 0.3s ease-out', position: 'relative' }}>
                <h2 style={{ marginTop: 0 }}>Create New Ticket</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Project & Type (Simplified view for brevity in diff, keeping logic) */}
                    <div>
                        <label className="text-label">Target Project</label>
                        <select value={selectedProject ? selectedProject.id : ''} onChange={(e) => setSelectedProject(projects.find(p => p.id === e.target.value))} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-hover)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.key})</option>)}
                        </select>
                    </div>

                    <div className="grid cols-2" style={{ gap: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                        <div>
                            <label className="text-label">Issue Type</label>
                            {isManualType ?
                                <input value={issueType} onChange={(e) => setIssueType(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-hover)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }} />
                                : <select value={issueTypeId} onChange={(e) => { setIssueTypeId(e.target.value); const t = availableIssueTypes.find(x => x.id === e.target.value); if (t) setIssueType(t.name); }} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-hover)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                                    {availableIssueTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            }
                        </div>
                        <div>
                            <label className="text-label">Assignee</label>
                            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-hover)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                                <option value="">Unassigned</option>
                                {users.map(u => <option key={u.accountId} value={u.accountId}>{u.displayName}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Summary with Voice */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="text-label">Summary</label>
                            <button type="button" onClick={() => handleVoice('summary')} style={{
                                background: listeningField === 'summary' ? 'var(--accent-red)' : 'transparent',
                                color: listeningField === 'summary' ? 'white' : 'var(--brand-primary)',
                                border: 'none', cursor: 'pointer', borderRadius: '50%', padding: '4px', display: 'flex'
                            }} title="Dictate Summary">
                                <MicIcon active={listeningField === 'summary'} />
                            </button>
                        </div>
                        <input
                            required
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder={listeningField === 'summary' ? "Listening..." : "Brief summary..."}
                            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-hover)', color: 'white', border: `1px solid ${listeningField === 'summary' ? 'var(--accent-red)' : 'var(--border-subtle)'}`, borderRadius: '4px' }}
                        />
                    </div>

                    {/* Description with Voice */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="text-label">Description</label>
                            <button type="button" onClick={() => handleVoice('description')} style={{
                                background: listeningField === 'description' ? 'var(--accent-red)' : 'transparent',
                                color: listeningField === 'description' ? 'white' : 'var(--brand-primary)',
                                border: 'none', cursor: 'pointer', borderRadius: '50%', padding: '4px', display: 'flex'
                            }} title="Dictate Description">
                                <MicIcon active={listeningField === 'description'} />
                            </button>
                        </div>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={listeningField === 'description' ? "Listening..." : "Detailed description..."}
                            rows={4}
                            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-hover)', color: 'white', border: `1px solid ${listeningField === 'description' ? 'var(--accent-red)' : 'var(--border-subtle)'}`, borderRadius: '4px', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                        <button type="button" onClick={handleOpenNative} style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', textDecoration: 'underline' }}>
                            ↗ Open Native
                        </button>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="button" onClick={onClose} style={{ background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.5rem 1.5rem' }}>{loading ? 'Creating...' : 'Create Ticket'}</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTicketModal;
