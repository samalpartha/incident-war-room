import React, { useEffect, useState } from 'react';
import { api } from './services/api';
import Header from './components/Header';
import IncidentList from './components/IncidentList';
import PitCrew from './components/PitCrew';
import QuickActions from './components/QuickActions';
import ApiConsole from './components/ApiConsole';

import Notification from './components/Notification';
import CreateTicketModal from './components/CreateTicketModal';

function App() {
  const [incidents, setIncidents] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'console'
  const [notification, setNotification] = useState(null); // { message, type }
  const [filterMine, setFilterMine] = useState(false);
  const [filterProjectKey, setFilterProjectKey] = useState('');
  const [userContext, setUserContext] = useState({ permissions: ['view'], roleLabel: 'Loading...' }); // RBAC

  const handleNotify = (message, type = 'info') => {
    setNotification({ message, type });
  };

  // RBAC: Fetch user context on mount
  useEffect(() => {
    const fetchUserContext = async () => {
      try {
        const result = await api.getUserContext();
        if (result.success) {
          setUserContext(result);
        }
      } catch (error) {
        console.error('Failed to fetch user context:', error);
      }
    };
    fetchUserContext();
  }, []);

  const loadIncidents = async () => {
    try {
      const res = await api.getIncidents(filterProjectKey, filterMine);
      let loadedIssues = [];
      if (res && res.success && res.issues) {
        loadedIssues = res.issues;
      }

      // PERSISTENCE: Fetch recently created tickets that Jira hasn't indexed yet
      try {
        const pendingJson = localStorage.getItem('forg_pending_incidents');
        console.log('[PERSISTENCE] Pending tickets in localStorage:', pendingJson);
        console.log('[PERSISTENCE] Loaded from Jira:', loadedIssues.map(i => i.key));

        if (pendingJson) {
          const pendingData = JSON.parse(pendingJson);
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;

          // Filter out tickets older than 5 minutes
          const validPending = pendingData.filter(item => (now - item.timestamp) < fiveMinutes);
          const pendingKeys = validPending.map(item => item.key);
          const missingKeys = pendingKeys.filter(key => !loadedIssues.find(i => i.key === key));
          console.log('[PERSISTENCE] Valid pending keys:', pendingKeys);
          console.log('[PERSISTENCE] Missing keys to fetch:', missingKeys);

          if (missingKeys.length > 0) {
            console.log("[PERSISTENCE] Fetching pending tickets:", missingKeys);
            for (const key of missingKeys) {
              try {
                console.log(`[PERSISTENCE] Fetching ${key}...`);
                const result = await api.getIssue(key);
                console.log(`[PERSISTENCE] Result for ${key}:`, result);
                if (result && result.success && result.issue) {
                  loadedIssues.unshift(result.issue);
                  console.log(`[PERSISTENCE] ✅ Recovered pending ticket: ${key}`);
                } else {
                  console.warn(`[PERSISTENCE] ❌ Failed to recover ${key}, result:`, result);
                }
              } catch (e) {
                console.error(`[PERSISTENCE] ❌ Error fetching ${key}:`, e);
              }
            }
          }

          // Only save back if we cleaned up old ones
          if (validPending.length !== pendingData.length) {
            localStorage.setItem('forg_pending_incidents', JSON.stringify(validPending));
            console.log('[PERSISTENCE] Cleaned up old tickets, keeping:', validPending.length);
          }
        }
      } catch (persistErr) {
        console.error("[PERSISTENCE] Fatal error:", persistErr);
        // Continue loading normally
      }

      // Filter out any malformed issues before mapping
      const validIssues = loadedIssues.filter(issue => {
        if (!issue || !issue.key || !issue.fields) {
          console.warn('Skipping malformed issue:', issue);
          return false;
        }
        return true;
      });

      const mapped = validIssues.map(issue => ({
        id: issue.key,
        summary: issue.fields.summary || 'No summary',
        status: (issue.fields.status && issue.fields.status.name) ? issue.fields.status.name.toUpperCase() : 'UNKNOWN',
        time: issue.fields.created ? new Date(issue.fields.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        assignee: (issue.fields.assignee && issue.fields.assignee.displayName) ? issue.fields.assignee.displayName : 'Unassigned'
      }));

      // Remove duplicates just in case
      const uniqueMapped = mapped.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);

      // SAFETY: Only update if we have data OR if we had no data before
      if (uniqueMapped.length > 0 || incidents.length === 0) {
        console.log('[LOAD] Setting incidents:', uniqueMapped.length);
        setIncidents(uniqueMapped);
      } else {
        console.warn('[LOAD] Refusing to clear existing tickets - got empty result but have', incidents.length, 'existing tickets');
        // Don't show notification - just log it
      }
    } catch (err) {
      console.error('Load incidents error:', err);
      // Don't show error if we have some incidents already loaded
      if (incidents.length === 0) {
        handleNotify('Failed to load incidents', 'error');
      }
    }
  };

  // Load real data
  useEffect(() => {
    if (view === 'dashboard') {
      loadIncidents();
    }
  }, [view, filterMine, filterProjectKey]); // Reload when filters change

  const handleDeclareIncident = async (summary, description, issueType, projectKey, assigneeName, issueTypeId, assigneeId) => {
    setIsDeploying(true);
    try {
      const result = await api.createIncident(
        summary,
        description,
        issueType,
        projectKey,
        issueTypeId,
        assigneeId
      );

      if (result && result.success) {
        const newIncident = {
          id: result.key, // Fixed: key comes from Jira API
          summary: summary,
          status: 'OPEN', // Usually starts as Open/To Do
          time: 'Just now',
          assignee: assigneeName || 'Unassigned' // Fixed: Use selected mock user
        };
        // Optimistic update
        setIncidents([newIncident, ...incidents]);

        // PERSISTENCE: Save to localStorage with timestamp
        const pendingJson = localStorage.getItem('forg_pending_incidents');
        const pendingData = pendingJson ? JSON.parse(pendingJson) : [];
        const exists = pendingData.find(item => item.key === result.key);
        if (!exists) {
          pendingData.push({ key: result.key, timestamp: Date.now() });
          // Limit to last 20 to avoid bloat
          if (pendingData.length > 20) pendingData.shift();
          localStorage.setItem('forg_pending_incidents', JSON.stringify(pendingData));
          console.log('[PERSISTENCE] Saved', result.key, 'to localStorage');
        }

        handleNotify(`${issueType || 'Ticket'} ${result.key} Created Successfully - Click Refresh to sync`, 'success');
        setIsModalOpen(false);
        // Keep optimistic update visible - user must click Refresh button to sync with Jira
        // This prevents disappearing tickets due to Jira indexing delays
      } else {
        // Handle explicit error from backend (success: false)
        const errorMsg = result.error || "Unknown error";
        handleNotify(`Failed: ${errorMsg}`, 'error');
      }
    } catch (error) {
      // Handle network/throw errors
      console.error("Failed to create ticket", error);
      handleNotify(`Failed: ${error.message || "Check console"}`, 'error');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteIncident(id);
      setIncidents(incidents.filter(inc => inc.id !== id));
      handleNotify('Incident deleted from Jira', 'info');
    } catch (err) {
      handleNotify('Failed to delete incident', 'error');
    }
  };

  const handleUpdate = async (id, newSummary) => {
    try {
      await api.updateIncident(id, newSummary);
      setIncidents(incidents.map(inc => inc.id === id ? { ...inc, summary: newSummary } : inc));
      handleNotify('Incident summary updated in Jira', 'success');
    } catch (err) {
      handleNotify('Failed to update incident', 'error');
    }
  };

  return (
    <div className="container">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <Header
        isDeploying={isDeploying}
        onDeclare={() => setIsModalOpen(true)}
        onRefresh={() => {
          handleNotify('Refreshing data...', 'info');
          loadIncidents();
        }}
        userContext={userContext}
      />

      <CreateTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleDeclareIncident}
      />

      {/* View Switcher & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setView('dashboard')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: view === 'dashboard' ? '2px solid var(--brand-primary)' : '2px solid transparent',
              color: view === 'dashboard' ? 'var(--text-primary)' : 'var(--text-muted)',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setView('console')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: view === 'console' ? '2px solid var(--brand-primary)' : '2px solid transparent',
              color: view === 'console' ? 'var(--brand-primary)' : 'var(--text-muted)',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'monospace'
            }}
          >
            ⚙️ API Console
          </button>
        </div>

        {view === 'dashboard' && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={filterMine}
                onChange={(e) => setFilterMine(e.target.checked)}
              />
              My Incidents
            </label>
            <input
              placeholder="Project Key (e.g. KEY)"
              value={filterProjectKey}
              onChange={(e) => setFilterProjectKey(e.target.value.toUpperCase())}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                width: '150px'
              }}
            />
          </div>
        )}
      </div>

      {view === 'dashboard' ? (
        <main className="grid">
          <IncidentList incidents={incidents} onDelete={handleDelete} onUpdate={handleUpdate} userContext={userContext} />

          <section className="grid cols-2">
            <PitCrew />
            <QuickActions onNotify={handleNotify} />
          </section>
        </main>
      ) : (
        <ApiConsole onGoToDashboard={() => setView('dashboard')} />
      )}
    </div>
  );
}

export default App;
