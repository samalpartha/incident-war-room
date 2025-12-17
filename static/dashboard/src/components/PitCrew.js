import React from 'react';

const PitCrew = () => (
    <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Pit Crew Status</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="flex-row" style={{ justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-hover)', borderRadius: '6px' }}>
                <span style={{ fontWeight: 500 }}>DevOps Lead</span>
                <span className="status-badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', fontSize: '0.7rem' }}>ONLINE</span>
            </div>
            <div className="flex-row" style={{ justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-hover)', borderRadius: '6px' }}>
                <span style={{ fontWeight: 500 }}>Backend On-Call</span>
                <span className="status-badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', fontSize: '0.7rem' }}>ONLINE</span>
            </div>
            <div className="flex-row" style={{ justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-hover)', borderRadius: '6px' }}>
                <span style={{ fontWeight: 500 }}>Frontend On-Call</span>
                <span className="status-badge" style={{ background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', fontSize: '0.7rem' }}>OFFLINE</span>
            </div>
        </div>
    </div>
);

export default PitCrew;
