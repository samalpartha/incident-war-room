import React, { useState } from 'react';
import { router } from '@forge/bridge';

const IncidentList = ({ incidents, onDelete, onUpdate }) => {
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

    const handleOpenIssue = (issueKey) => {
        router.open(`/browse/${issueKey}`);
    };

    const startEdit = (inc) => {
        setEditingId(inc.id);
        setEditValue(inc.summary);
    };

    const saveEdit = (id) => {
        onUpdate(id, editValue);
        setEditingId(null);
    };

    return (
        <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                <h2 style={{ marginBottom: 0 }}>Active War Front</h2>
                <span className="text-label">Live Feed</span>
            </div>

            <div className="incident-list">
                {incidents.map((inc) => (
                    <div key={inc.id} className="incident-item" style={{ borderLeft: `4px solid ${inc.status === 'CRITICAL' ? 'var(--danger)' : 'var(--success)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span
                                    onClick={() => handleOpenIssue(inc.id)}
                                    style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1em', color: 'var(--brand-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                                    title="Open in Jira"
                                >
                                    {inc.id}
                                </span>
                                <span className={inc.status === 'CRITICAL' ? 'status-badge status-active' : 'status-badge status-resolved'} style={{ fontSize: '0.6rem', padding: '0.1rem 0.5rem' }}>
                                    {inc.status}
                                </span>
                            </div>
                            <button
                                onClick={() => onDelete(inc.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)', padding: 0 }}
                                title="Dismiss Incident"
                            >
                                ×
                            </button>
                        </div>

                        {editingId === inc.id ? (
                            <div style={{ display: 'flex', gap: '0.5rem', margin: '0.25rem 0' }}>
                                <input
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-focus)', color: 'white', padding: '0.25rem', borderRadius: '4px', flex: 1 }}
                                    autoFocus
                                />
                                <button onClick={() => saveEdit(inc.id)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Save</button>
                            </div>
                        ) : (
                            <h3
                                style={{ fontSize: '1rem', margin: '0.25rem 0', cursor: 'pointer' }}
                                onClick={() => startEdit(inc)}
                                title="Click to edit summary"
                            >
                                {inc.summary} ✎
                            </h3>
                        )}

                        <div className="incident-meta" style={{ marginTop: '0.25rem', paddingTop: '0.5rem' }}>
                            <span className="flex-row">⏱ {inc.time}</span>
                            <span className="flex-row">
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                                    {inc.assignee.charAt(0)}
                                </div>
                                {inc.assignee}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default IncidentList;
