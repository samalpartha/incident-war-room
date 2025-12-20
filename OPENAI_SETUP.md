# OpenAI + Jira Integration Setup

## What This Does

This integration lets you use **OpenAI's ChatGPT** to interact with your Jira instance using natural language - **no Docker or MCP needed!**

## Quick Setup

### 1. Get OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-...`)

### 2. Set Environment Variable

```bash
export OPENAI_API_KEY="sk-your-key-here"
```

Or add to your `~/.zshrc`:
```bash
echo 'export OPENAI_API_KEY="sk-your-key-here"' >> ~/.zshrc
source ~/.zshrc
```

### 3. Make Script Executable

```bash
chmod +x /Users/psama0214/Hackathon-New/incident-war-room/openai-jira-integration.js
```

### 4. Test It!

```bash
cd /Users/psama0214/Hackathon-New/incident-war-room
node openai-jira-integration.js "list all my projects"
```

## Usage Examples

### List Projects
```bash
node openai-jira-integration.js "show me all my Jira projects"
```

### Search Issues
```bash
node openai-jira-integration.js "find all open bugs in the KAN project"
node openai-jira-integration.js "show me issues assigned to me"
node openai-jira-integration.js "what incidents are high priority?"
```

### Create Issues
```bash
node openai-jira-integration.js "create a bug: Login page shows 404 error"
node openai-jira-integration.js "create incident: Database connection timeout in production"
```

### Get Issue Details
```bash
node openai-jira-integration.js "what's the status of KAN-123?"
node openai-jira-integration.js "show me details for issue KAN-45"
```

## How It Works

1. **You ask a question** in natural language
2. **OpenAI understands** your intent using GPT-4
3. **Calls Jira API** using function calling
4. **Returns results** in natural language

## Available Functions

- ✅ List all projects
- ✅ Search issues with JQL
- ✅ Create new issues
- ✅ Get issue details
- ✅ More functions can be easily added!

## Advantages Over MCP

- ✅ **No Docker required**
- ✅ **No special client needed** (Claude Desktop, Cursor)
- ✅ **Works from command line**
- ✅ **Can be integrated into any app**
- ✅ **Easy to extend**

## Web Interface (Optional)

Want a web UI? Create `openai-jira-web.js`:

```javascript
const express = require('express');
const { chat } = require('./openai-jira-integration');

const app = express();
app.use(express.json());

app.post('/chat', async (req, res) => {
  const response = await chat(req.body.message);
  res.json({ response });
});

app.listen(3000, () => {
  console.log('Jira AI Assistant running on http://localhost:3000');
});
```

Then:
```bash
npm install express
node openai-jira-web.js
```

## Cost

OpenAI charges per token:
- GPT-4: ~$0.03 per 1K tokens (input), ~$0.06 per 1K tokens (output)
- GPT-3.5-Turbo: Much cheaper alternative

Typical query: ~1,000 tokens = $0.09

## Next Steps

1. ✅ Set up OpenAI API key
2. ✅ Test basic queries
3. ⏳ Add more Jira functions (update issues, transitions, etc.)
4. ⏳ Build a web interface
5. ⏳ Integrate with Slack/Teams

## Troubleshooting

**"OPENAI_API_KEY not set"**
- Run: `export OPENAI_API_KEY="sk-..."`

**"Jira authentication failed"**
- Check credentials in the script are correct
- Verify API token is valid

**"Function not found"**
- Check function name in `jiraFunctions` array
- Ensure implementation exists in `executeFunction`

## Comparison: OpenAI vs MCP

| Feature | OpenAI Integration | MCP Server |
|---------|-------------------|------------|
| Setup | Simple | Complex (Docker) |
| AI Client | Any | Claude/Cursor only |
| Customization | Easy | Limited |
| Cost | Pay per use | Free (after setup) |
| Performance | Slower (API calls) | Faster (local) |
