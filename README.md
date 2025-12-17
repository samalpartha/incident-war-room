# Incident War Room

A comprehensive incident management platform for Atlassian products, built with Forge.

## 🚀 Features

### 📊 Multi-Platform Support
- **Jira** (Global & Project pages)
- **Confluence** (Global page at `/war-room`)

### 🎯 Core Capabilities
- **Real-time Dashboard**: Live feed of incidents with status, assignee, and timestamps
- **Smart Ticket Creation**: Modal with project selection, dynamic issue types, and real Jira users
- **Timestamp Persistence**: Tickets survive page refreshes for 5 minutes (handles Jira indexing lag)
- **API Console**: Test API endpoints with visual payload builder
- **Rovo Agent Integration**: AI-powered incident management via chat (requires Rovo activation)

### 🤖 Rovo Agent
Access "Incident Commander" in Rovo Chat to:
- Create incidents via natural language
- Query active incidents
- Check ticket status
- Get incident management guidance

## 🛠️ Tech Stack

- **Platform**: Atlassian Forge (Node.js 22.x)
- **Frontend**: React with Forge Bridge
- **Backend**: Serverless resolvers calling Jira REST API v3
- **AI**: Rovo Agent with custom actions

## 📦 Installation

```bash
# Install dependencies
cd static/dashboard && npm install && cd ../..

# Deploy to development
forge deploy

# Install to your Atlassian site
forge install

# For updates with new scopes
forge install --upgrade
```

## 🔧 Development

```bash
# Build frontend
cd static/dashboard && npm run build

# Deploy changes
forge deploy

# View logs
forge logs
```

## 📝 Key Files

- `manifest.yml` - App configuration, modules, permissions
- `src/resolvers/index.js` - Backend API handlers (14 resolvers including Rovo actions)
- `static/dashboard/src/App.js` - Main React app with persistence logic
- `prompts/agent-prompt.md` - Rovo Agent behavior definition

## 🔑 Permissions

- `read:jira-work` - Read Jira issues
- `write:jira-work` - Create/update issues
- `read:project:jira` - Fetch project details
- `read:jira-user` - Get real user list for assignment
- `read:chat:rovo` - Enable Rovo Agent actions
- `read:confluence-content.all` - Access Confluence (for multi-platform support)

## 🎨 Features Breakdown

### Dashboard
- Create incidents with full project/type/assignee selection
- Auto-refresh with Refresh button (↻)
- Filter by "My Incidents" or Project Key
- Native Jira links (router.open)
- Persistent optimistic updates

### API Console
- **Payload Builder**: Dropdowns auto-update JSON
- **Templates**: Pre-filled examples
- **Direct execution**: Test without leaving the UI
- **View on Dashboard**: One-click navigation after creation

### Persistence System
- Timestamp-based localStorage caching (5-minute window)
- Direct issue fetch bypasses Jira indexing lag
- Automatic cleanup prevents bloat
- Handles page refreshes gracefully

## 🧪 Testing

1. **Dashboard**: Create ticket → refresh → verify persistence
2. **API Console**: Execute → click "View on Dashboard"
3. **Rovo**: Chat → "Incident Commander" → conversation starters

## 📚 Documentation

- See `walkthrough.md` for complete feature documentation
- See `rovo_implementation_plan.md` for Rovo Agent architecture

## 🚧 Known Limitations

- **Rovo Chat**: Requires Rovo activation at org level
- **Bitbucket/Compass**: No Forge globalPage support
- **JSM**: Uses standard Jira modules

## 📄 License

Built for Atlassian Hackathon

## 🔗 Links

- Deployed at: `samalparthas.atlassian.net`
- Current version: **v6.0.0**
