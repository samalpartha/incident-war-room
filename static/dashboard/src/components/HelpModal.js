import React from 'react';

const HelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content help-modal">
                <div className="modal-header">
                    <h2>📘 Dashboard Guide</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <div className="guide-section">
                        <div className="guide-icon">🔥</div>
                        <div className="guide-text">
                            <h3>Active War Front (Live Feed)</h3>
                            <p>Real-time view of all critical incidents. This list updates automatically every 30 seconds via long-polling.</p>
                        </div>
                    </div>

                    <div className="guide-section">
                        <div className="guide-icon">🤖</div>
                        <div className="guide-text">
                            <h3>Rovo Control Panel</h3>
                            <p>Direct interface to your autonomous agents. Trigger actions manually or use voice commands.</p>
                            <ul>
                                <li><strong>Auto-Fix:</strong> Rewrites vague tickets with clear specs.</li>
                                <li><strong>Smart Assign:</strong> Assigns tickets based on workload.</li>
                                <li><strong>Chaos Monkey:</strong> Simulates production outages for testing.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="guide-section">
                        <div className="guide-icon">🛡️</div>
                        <div className="guide-text">
                            <h3>QA Command Center</h3>
                            <p>Verifies the health of the entire system. Access the <strong>E2E Simulation Report</strong> from the footer to see live backend tests.</p>
                        </div>
                    </div>

                    <div className="guide-section">
                        <div className="guide-icon">🎙️</div>
                        <div className="guide-text">
                            <h3>Voice Command</h3>
                            <p>Click the microphone icon to control Rovo with your voice. Try saying: <em>"Fix ticket KAN-123"</em> or <em>"Start Chaos Mode"</em>.</p>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button onClick={onClose} className="btn-primary">Got it!</button>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
