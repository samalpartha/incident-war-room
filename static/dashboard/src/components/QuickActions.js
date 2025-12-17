import React from 'react';

const QuickActions = ({ onNotify }) => {
    const handleQuickAction = (action) => {
        switch (action) {
            case 'ZOOM':
                window.open('https://zoom.us/deprecated-mock-war-room', '_blank');
                onNotify('Opening Zoom Bridge...', 'info');
                break;
            case 'LOCK':
                onNotify('🔒 Deployment Pipeline LOCKED.', 'error');
                break;
            case 'STATUS':
                onNotify("📢 Status Page Updated: 'Investigating'", 'success');
                break;
            case 'RUNBOOK':
                window.open('https://confluence.atlassian.com', '_blank');
                onNotify('Opening Playbook...', 'info');
                break;
            default:
                break;
        }
    };

    return (
        <div className="card">
            <h3 style={{ marginBottom: '1.5rem' }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => handleQuickAction('ZOOM')}>📞 Start Bridge</button>
                <button className="btn btn-secondary" onClick={() => handleQuickAction('LOCK')}>🔒 Lock Deploys</button>
                <button className="btn btn-secondary" onClick={() => handleQuickAction('STATUS')}>📢 Status Page</button>
                <button className="btn btn-secondary" onClick={() => handleQuickAction('RUNBOOK')}>📜 Runbook</button>
            </div>
        </div>
    );
};

export default QuickActions;
