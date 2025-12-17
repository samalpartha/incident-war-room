import React from 'react';

const Header = ({ isDeploying, onDeclare, onRefresh }) => {
    return (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
                <h1 style={{ marginBottom: '0.25rem' }}>Incident War Room</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="text-label" style={{ fontSize: '0.9rem' }}>Central Command</span>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={onRefresh}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '1.2rem', lineHeight: 1 }}
                    title="Refresh Data"
                >
                    ↻
                </button>
                <button
                    onClick={onDeclare}
                    disabled={isDeploying}
                    className={`btn ${isDeploying ? 'btn-secondary' : 'btn-primary'} pulse`}
                >
                    {isDeploying ? '🚨 Deploying...' : '🚨 DECLARE'}
                </button>
            </div>
        </header>
    );
};

export default Header;
