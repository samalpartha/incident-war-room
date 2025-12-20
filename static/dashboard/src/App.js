import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import './index.css';

const translations = {
  en: {
    title: "🤖 Rovo Team Orchestrator",
    status_online: "🟢 ONLINE",
    compass_healthy: "HEALTHY",
    manual_triggers: "⚡ Manual Triggers",
    target_key: "Target Issue Key",
    btn_fix: "✨ Auto-Fix Ticket",
    btn_assign: "👤 Smart Assign",
    btn_subtask: "📑 Gen Subtasks",
    btn_release: "🚀 Release Notes",
    btn_predict: "🔮 Predict Sprint",
    btn_chaos: "🔥 Chaos Monkey Mode",
    active_agents: "Active Agents",
    agent_fixer: "Ticket Improver",
    agent_assigner: "Workload Assigner",
    agent_generator: "Subtask Generator",
    create_new: "➕ Create New Ticket",
    placeholder_summary: "Summary",
    placeholder_desc: "Description",
    btn_create: "Create Ticket",
    feed_title: "📡 Autonomous Activity Feed",
    waiting_events: "Waiting for events...",
    voice_listening: "🎙️ Listening...",
    alert_summary: "Summary required",
    chaos_confirm: "⚠️ WARNING: This will create 3 random CRITICAL incidents via the Rovo Chaos Engine. Proceed?",
    chaos_warning: "Warning. Chaos Monkey protocol initiated. System integrity at risk.",
    chaos_unleashed: "Chaos unleashed. Three critical incidents detected.",
    creating_ticket: "Creating ticket",
    success_created: "Created",
    fail_create: "Creation Failed",
    view_ticket: "View Ticket"
  },
  es: {
    title: "🤖 Orquestador de Equipos Rovo",
    status_online: "🟢 EN LÍNEA",
    compass_healthy: "SALUDABLE",
    manual_triggers: "⚡ Disparadores Manuales",
    target_key: "Clave del Ticket",
    btn_fix: "✨ Auto-Corregir Ticket",
    btn_assign: "👤 Asignación Inteligente",
    btn_subtask: "📑 Generar Subtareas",
    btn_release: "🚀 Notas de Versión",
    btn_predict: "🔮 Predecir Sprint",
    btn_chaos: "🔥 Modo Chaos Monkey",
    active_agents: "Agentes Activos",
    agent_fixer: "Mejorador de Tickets",
    agent_assigner: "Asignador de Carga",
    agent_generator: "Generador de Subtareas",
    create_new: "➕ Crear Nuevo Ticket",
    placeholder_summary: "Resumen",
    placeholder_desc: "Descripción",
    btn_create: "Crear Ticket",
    feed_title: "📡 Flujo de Actividad Autónomo",
    waiting_events: "Esperando eventos...",
    voice_listening: "🎙️ Escuchando...",
    alert_summary: "Se requiere un resumen",
    chaos_confirm: "⚠️ ADVERTENCIA: Esto creará 3 incidentes CRÍTICOS aleatorios vía Rovo Chaos Engine. ¿Proceder?",
    chaos_warning: "Advertencia. Protocolo Chaos Monkey iniciado. Integridad del sistema en riesgo.",
    chaos_unleashed: "Caos desatado. Tres incidentes críticos detectados.",
    creating_ticket: "Creando ticket",
    success_created: "Creado",
    fail_create: "Fallo en creación",
    view_ticket: "Ver Ticket"
  }
};

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

  // Theme & Language State
  const [theme, setTheme] = useState('dark');
  const [lang, setLang] = useState('en');

  // Helper for translations
  const t = (key) => translations[lang][key] || key;

  // Toggle Theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Voice Handler
  const startVoiceInput = (targetId) => {
    if (!('webkitSpeechRecognition' in window)) {
      return alert("Voice not supported in this browser. Try Chrome.");
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = lang === 'es' ? 'es-ES' : 'en-US';
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
      utterance.lang = lang === 'es' ? 'es-ES' : 'en-US';
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
    addLog(t('waiting_events'), "info");
  }, [lang]);

  // 1. Auto-Fix
  const handleAutoFix = async () => {
    if (!selectedIssue) return alert(t('target_key') + " required");
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
    if (!selectedIssue) return alert(t('target_key') + " required");
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
    if (!selectedIssue) return alert(t('target_key') + " required");
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
        addLog(<span>✅ ${res.message} <a href={res.issueLink} target="_blank" rel="noopener noreferrer" style={{ color: '#58a6ff', textDecoration: 'underline' }}>{t('view_ticket')}</a></span>, "success");
      } else {
        addLog(`✅ ${res.message}`, "success");
      }
      console.log(res.notes); // Log detailed notes to console
    } catch (err) {
      addLog(`❌ Notes Failed: ${err.message}`, "error");
      alert(`Error generating notes: ${err.message}`);
    }
  };

  // 5. Sprint Prediction
  const handleSprintPrediction = async () => {
    addLog(`Analyzing Sprint Velocity & Slippage...`, "pending");
    try {
      const res = await invoke('predict-sprint-slippage-action', {});
      addLog(`✅ ${res.message}`, "success");
    } catch (err) {
      addLog(`❌ Predict Failed: ${err.message}`, "error");
    }
  };

  // 6. Chaos Monkey
  const handleChaos = async () => {
    const confirmed = window.confirm(t('chaos_confirm'));
    if (!confirmed) return;

    addLog(`🔥 Unleashing Chaos Monkey...`, "error");
    speak(t('chaos_warning'));

    try {
      const res = await invoke('chaos-monkey-action', { projectKey: 'KAN' });
      addLog(`🙈 ${res.message}`, "error");
      speak(t('chaos_unleashed'));
    } catch (err) {
      addLog(`❌ Chaos Failed: ${err.message}`, "error");
    }
  };

  return (
    <div className="orchestrator-container">
      <header className="header">
        <h1>{t('title')}</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={toggleTheme} style={{ background: 'none', border: '1px solid #444', color: 'var(--text-primary)', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button onClick={() => setLang(lang === 'en' ? 'es' : 'en')} style={{ background: 'none', border: '1px solid #444', color: 'var(--text-primary)', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
            {lang === 'en' ? '🇪🇸 Español' : '🇺🇸 English'}
          </button>

          <div className="header-badges">
            <div className="status-badge">{t('status_online')}</div>
            <div className="compass-badge" title="Compass Component Health">
              🧭 COMPASS: <span style={{ color: '#4ade80' }}>{t('compass_healthy')} (98%)</span>
            </div>
          </div>
        </div>
      </header>

      <div className="main-grid">
        {/* Left: Controls */}
        <div className="card controls">
          <h2>{t('manual_triggers')}</h2>
          <div className="input-group">
            <label>{t('target_key')}</label>
            <input
              type="text"
              placeholder="e.g. KAN-12"
              value={selectedIssue}
              onChange={(e) => setSelectedIssue(e.target.value)}
            />
          </div>

          <div className="action-buttons">
            <button className="btn btn-fix" onClick={handleAutoFix} disabled={!activeAgents.fixer}>
              {t('btn_fix')}
            </button>
            <button className="btn btn-assign" onClick={handleAutoAssign} disabled={!activeAgents.assigner}>
              {t('btn_assign')}
            </button>
            <button className="btn btn-subtask" onClick={handleSubtasks} disabled={!activeAgents.generator}>
              {t('btn_subtask')}
            </button>
            <button className="btn btn-release" onClick={handleReleaseNotes} disabled={!activeAgents.release}>
              {t('btn_release')}
            </button>
            <button className="btn btn-predict" onClick={handleSprintPrediction} disabled={!activeAgents.predictor}>
              {t('btn_predict')}
            </button>
            <button className="btn" onClick={handleChaos} style={{ background: '#ef4444', color: 'white', marginTop: '5px', width: '100%', fontWeight: 'bold' }}>
              {t('btn_chaos')}
            </button>
          </div>

          <div className="agents-toggle">
            <h3>{t('active_agents')}</h3>
            <label>
              <input type="checkbox" checked={activeAgents.fixer} onChange={() => setActiveAgents({ ...activeAgents, fixer: !activeAgents.fixer })} />
              {t('agent_fixer')}
            </label>
            <label>
              <input type="checkbox" checked={activeAgents.assigner} onChange={() => setActiveAgents({ ...activeAgents, assigner: !activeAgents.assigner })} />
              {t('agent_assigner')}
            </label>
            <label>
              <input type="checkbox" checked={activeAgents.generator} onChange={() => setActiveAgents({ ...activeAgents, generator: !activeAgents.generator })} />
              {t('agent_generator')}
            </label>
          </div>

          <div className="create-section" style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
            <h3>{t('create_new')} {isListening && <span className="mic-active">{t('voice_listening')}</span>}</h3>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
              <input type="text" placeholder={t('placeholder_summary')} id="new-summary" style={{ flex: 1, padding: '8px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <button onClick={() => startVoiceInput('new-summary')} style={{ background: '#444', border: 'none', cursor: 'pointer' }}>🎙️</button>
            </div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
              <textarea placeholder={t('placeholder_desc')} id="new-desc" rows="3" style={{ flex: 1, padding: '8px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}></textarea>
              <button onClick={() => startVoiceInput('new-desc')} style={{ background: '#444', border: 'none', cursor: 'pointer' }}>🎙️</button>
            </div>
            <button className="btn btn-create" onClick={async () => {
              const summary = document.getElementById('new-summary').value;
              const desc = document.getElementById('new-desc').value;
              if (!summary) return alert(t('alert_summary'));

              const timestamp = new Date().toLocaleTimeString();
              setLogs(prev => [{ time: timestamp, msg: `${t('creating_ticket')}: ${summary}...`, type: 'pending' }, ...prev]);

              try {
                const res = await invoke('createIncident', { summary, description: desc, projectKey: 'KAN', issueTypeId: '10001' });
                if (res.success) {
                  setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: `✅ ${t('success_created')} ${res.key}`, type: 'success' }, ...prev]);
                  document.getElementById('new-summary').value = '';
                  document.getElementById('new-desc').value = '';
                } else {
                  throw new Error(res.error);
                }
              } catch (e) {
                setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: `❌ ${t('fail_create')}: ${e.message}`, type: 'error' }, ...prev]);
                alert(`${t('fail_create')}: ${e.message}`);
              }
            }} style={{ background: '#28a745', width: '100%' }}>
              {t('btn_create')}
            </button>
          </div>
        </div>

        {/* Right: Live Feed */}
        <div className="card feed">
          <h2>{t('feed_title')}</h2>
          <div className="log-stream">
            {logs.length === 0 && <div className="empty-log">{t('waiting_events')}</div>}
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
