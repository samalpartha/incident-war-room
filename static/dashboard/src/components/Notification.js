import React, { useEffect } from 'react';

const Notification = ({ message, type = 'info', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const styles = {
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        color: '#fff',
        fontWeight: 600,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 1000,
        animation: 'slideIn 0.3s ease-out',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        minWidth: '300px'
    };

    const bgColors = {
        success: 'var(--success)', // Green
        error: 'var(--danger)',   // Red
        info: 'var(--brand-primary)', // Blue
        warning: '#f59e0b' // Orange
    };

    const icons = {
        success: '✅',
        error: '🚨',
        info: 'ℹ️',
        warning: '⚠️'
    };

    return (
        <div style={{ ...styles, backgroundColor: bgColors[type] || bgColors.info }}>
            <span style={{ fontSize: '1.2rem' }}>{icons[type]}</span>
            <span>{message}</span>
        </div>
    );
};

export default Notification;
