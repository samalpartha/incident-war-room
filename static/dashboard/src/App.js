import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import './index.css';

function App() {
  const [logs, setLogs] = useState([]);
  const [activeAgents, setActiveAgents] = useState({
    fixer: true,
    assigner: true,
    generator: true,
    release: true,
    predictor: true
  });
  const [selectedIssue, setSelectedIssue] = useState('');
  const [versionName, setVersionName] = useState('v1.0.0');
  const [isListening, setIsListening] = useState(false);

  // Voice Handler
  const startVoiceInput = (targetId) => {
    if (!('webkitSpeechRecognition' in window)) {
      return alert("Voice not supported in this browser. Try Chrome.");
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'en-US';
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const el = document.getElementById(targetId);
      if (el) el.value = transcript;
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // TTS Helper
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Helper to add log
  const addLog = (msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ time: timestamp, msg, type }, ...prev]);
  };

  useEffect(() => {
    addLog("🤖 Rovo Orchestrator Initialized", "success");
    addLog("Listening for Jira events...", "info");
  }, []);

  // 1. Auto-Fix
  const handleAutoFix = async () => {
    if (!selectedIssue) return alert("Please enter an Issue Key");
    addLog(`Running Auto-Fix on ${selectedIssue}...`, "pending");
    try {
      const res = await invoke('auto-fix-ticket-action', { issueKey: selectedIssue });
      addLog(`✅ ${res.message}`, "success");
    } catch (err) {
      addLog(`❌ Fix Failed: ${err.message}`, "error");
    }
  };

  // 2. Auto-Assign
  const handleAutoAssign = async () => {
    if (!selectedIssue) return alert("Please enter an Issue Key");
    addLog(`Analyzing team workload for ${selectedIssue}...`, "pending");
    try {
      const res = await invoke('auto-assign-ticket-action', { issueKey: selectedIssue });
      addLog(`✅ ${res.message}`, "success");
    } catch (err) {
      addLog(`❌ Assign Failed: ${err.message}`, "error");
    }
  };

  // 3. Generate Subtasks
  const handleSubtasks = async () => {
    if (!selectedIssue) return alert("Please enter an Issue Key");
    addLog(`Generating standard subtasks for ${selectedIssue}...`, "pending");
    try {
      const res = await invoke('generate-subtasks-action', { issueKey: selectedIssue });
      addLog(`✅ Created ${res.createdSubtasks.length} subtasks: ${res.createdSubtasks.join(', ')}`, "success");
    } catch (err) {
      addLog(`❌ Subtasks Failed: ${err.message}`, "error");
    }
  };

  // 4. Release Notes
  const handleReleaseNotes = async () => {
    addLog(`Generating Release Notes for ${versionName}...`, "pending");
    try {
      const res = await invoke('generate-release-notes-action', { version: versionName });
      if (res.issueLink) {
        addLog(<span>✅ ${res.message} <a href={res.issueLink} target="_blank" rel="noopener noreferrer" style={{ color: '#58a6ff', textDecoration: 'underline' }}>View Ticket</a></span>, "success");
      } else {
        addLog(`✅ ${res.message}`, "success");
      }
      console.log(res.notes); // Log detailed notes to console
    } catch (err) {
      addLog(`❌ Notes Failed: ${err.message}`, "error");
      alert(`Error generating notes: ${err.message}`); // Friendly Alert
    }
  };

  // ... (Sprint Prediction & Chaos)

  return (
    <div className="orchestrator-container">
      {/* ...Header... */}
      <header className="header">
        <h1>🤖 Rovo Team Orchestrator</h1>
        <div className="header-badges">
          <div className="status-badge">🟢 ONLINE</div>
          <div className="compass-badge" title="Compass Component Health">
            🧭 COMPASS: <span style={{ color: '#4ade80' }}>HEALTHY (98%)</span>
          </div>
        </div>
      </header>

      <div className="main-grid">
        {/* Left: Controls */}
        <div className="card controls">
          <h2>⚡ Manual Triggers</h2>
          <div className="input-group">
            <label>Target Issue Key</label>
            <input
              type="text"
              placeholder="e.g. KAN-12"
              value={selectedIssue}
              onChange={(e) => setSelectedIssue(e.target.value)}
            />
          </div>

          <div className="action-buttons">
            <button className="btn btn-fix" onClick={handleAutoFix} disabled={!activeAgents.fixer}>
              ✨ Auto-Fix Ticket
            </button>
            <button className="btn btn-assign" onClick={handleAutoAssign} disabled={!activeAgents.assigner}>
              👤 Smart Assign
            </button>
            <button className="btn btn-subtask" onClick={handleSubtasks} disabled={!activeAgents.generator}>
              📑 Gen Subtasks
            </button>
            <button className="btn btn-release" onClick={handleReleaseNotes} disabled={!activeAgents.release}>
              🚀 Release Notes
            </button>
            <button className="btn btn-predict" onClick={handleSprintPrediction} disabled={!activeAgents.predictor}>
              🔮 Predict Sprint
            </button>
            <button className="btn" onClick={handleChaos} style={{ background: '#ef4444', color: 'white', marginTop: '5px', width: '100%', fontWeight: 'bold' }}>
              🔥 Chaos Monkey Mode
            </button>
          </div>

          <div className="agents-toggle">
            <h3>Active Agents</h3>
            {/* ... Toggles ... */}
            <label>
              <input type="checkbox" checked={activeAgents.fixer} onChange={() => setActiveAgents({ ...activeAgents, fixer: !activeAgents.fixer })} />
              Ticket Improver
            </label>
            <label>
              <input type="checkbox" checked={activeAgents.assigner} onChange={() => setActiveAgents({ ...activeAgents, assigner: !activeAgents.assigner })} />
              Workload Assigner
            </label>
            <label>
              <input type="checkbox" checked={activeAgents.generator} onChange={() => setActiveAgents({ ...activeAgents, generator: !activeAgents.generator })} />
              Subtask Generator
            </label>
            {/* ... */}
          </div>

          <div className="create-section" style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
            <h3>➕ Create New Ticket {isListening && <span className="mic-active">🎙️ Listening...</span>}</h3>
            {/* ... Inputs ... */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
              <input type="text" placeholder="Summary" id="new-summary" style={{ flex: 1, padding: '8px', background: '#222', border: '1px solid #444', color: '#fff' }} />
              <button onClick={() => startVoiceInput('new-summary')} style={{ background: '#444', border: 'none', cursor: 'pointer' }}>🎙️</button>
            </div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
              <textarea placeholder="Description" id="new-desc" rows="3" style={{ flex: 1, padding: '8px', background: '#222', border: '1px solid #444', color: '#fff' }}></textarea>
              <button onClick={() => startVoiceInput('new-desc')} style={{ background: '#444', border: 'none', cursor: 'pointer' }}>🎙️</button>
            </div>
            <button className="btn btn-create" onClick={async () => {
              const summary = document.getElementById('new-summary').value;
              const desc = document.getElementById('new-desc').value;
              if (!summary) return alert("Summary required");

              const timestamp = new Date().toLocaleTimeString();
              setLogs(prev => [{ time: timestamp, msg: `Creating ticket: ${summary}...`, type: 'pending' }, ...prev]);

              try {
                const res = await invoke('createIncident', { summary, description: desc, projectKey: 'KAN', issueTypeId: '10001' });
                if (res.success) {
                  setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: `✅ Created ${res.key}`, type: 'success' }, ...prev]);
                  document.getElementById('new-summary').value = '';
                  document.getElementById('new-desc').value = '';
                } else {
                  throw new Error(res.error);
                }
              } catch (e) {
                setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: `❌ Creation Failed: ${e.message}`, type: 'error' }, ...prev]);
                alert(`Creation Failed: ${e.message}`);
              }
            }} style={{ background: '#28a745', width: '100%' }}>
              Create Ticket
            </button>
          </div>
        </div>

        {/* Right: Live Feed */}
        <div className="card feed">
          <h2>📡 Autonomous Activity Feed</h2>
          <div className="log-stream">
            {logs.length === 0 && <div className="empty-log">Waiting for events...</div>}
            {logs.map((log, i) => (
              <div key={i} className={`log-entry ${log.type}`}>
                <span className="timestamp">{log.time}</span>
                <span className="message">{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
