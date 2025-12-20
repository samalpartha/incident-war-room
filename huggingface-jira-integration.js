#!/usr/bin/env node

/**
 * Jira Integration using Hugging Face Inference API
 * Uses free HF Inference API (or Pro) with your HF Token
 */

const https = require('https');
require('dotenv').config();
const { execSync } = require('child_process');

// Configuration
const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL = process.env.HF_MODEL || 'mistralai/Mixtral-8x7B-Instruct-v0.1'; // Good default for logic

// Jira Configuration (Same as before)
const JIRA_CONFIG = {
    siteName: 'hackathondemoforge',
    userEmail: process.env.JIRA_USER_EMAIL || 'samalpartha@gmail.com',
    apiToken: process.env.JIRA_API_TOKEN,
    baseUrl: 'https://hackathondemoforge.atlassian.net'
};

if (!HF_TOKEN) {
    console.error('❌ Error: HF_TOKEN environment variable is required.');
    console.error('Usage: export HF_TOKEN="hf_..." && node huggingface-jira-integration.js "query"');
    process.exit(1);
}

// Jira API Helper
async function callJiraAPI(method, path, body = null) {
    const auth = Buffer.from(`${JIRA_CONFIG.userEmail}:${JIRA_CONFIG.apiToken}`).toString('base64');

    return new Promise((resolve, reject) => {
        const options = {
            hostname: `${JIRA_CONFIG.siteName}.atlassian.net`,
            path: path,
            method: method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// Tool Definitions
const TOOLS = [
    {
        name: 'list_projects',
        description: 'List all visible Jira projects. Use this when user asks to see/list projects.',
        arguments: {}
    },
    {
        name: 'search_issues',
        description: 'Search for issues using JQL. Use when user asks to find, search, or list issues/bugs/tasks.',
        arguments: {
            jql: 'JQL query string (e.g. "project = KAN AND status = Open")'
        }
    },
    {
        name: 'create_issue',
        description: 'Create a new issue. Use when user wants to create/make/add a ticket/bug/task.',
        arguments: {
            projectKey: 'Project key (e.g. KAN)',
            summary: 'Title of the issue',
            description: 'Description of the issue',
            issueType: 'Task or Bug'
        }
    },
    {
        name: 'get_issue',
        description: 'Get details of a specific issue. Use when user asks about a specific ticket ID (e.g. KAN-123).',
        arguments: {
            issueKey: 'The issue key (e.g. KAN-123)'
        }
    }
];

// Call Hugging Face API
async function callHuggingFace(prompt) {
    const systemPrompt = `You are an AI assistant that helps manage Jira.
You have access to the following tools:
${JSON.stringify(TOOLS, null, 2)}

Your goal is to understand the user's request and output a JSON object to call the right tool.
Do NOT output markdown. Output ONLY valid JSON.

Format:
{
  "tool": "tool_name",
  "arguments": { ... }
}

If no tool matches, output:
{
  "error": "I cannot help with that."
}

User Request: "${prompt}"`;

    const body = JSON.stringify({
        inputs: systemPrompt,
        parameters: {
            max_new_tokens: 500,
            return_full_text: false,
            temperature: 0.1 // Low temperature for consistent JSON
        }
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api-inference.huggingface.co',
            path: `/models/${HF_MODEL}`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    // HF returns array of generated text
                    if (Array.isArray(result) && result[0] && result[0].generated_text) {
                        resolve(result[0].generated_text.trim());
                    } else if (result.error) {
                        reject(new Error(result.error));
                    } else {
                        resolve(JSON.stringify(result));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// Function Implementations (Reused)
async function executeTool(toolName, args) {
    switch (toolName) {
        case 'list_projects':
            return await callJiraAPI('GET', '/rest/api/3/project/search');

        case 'search_issues':
            return await callJiraAPI('GET', `/rest/api/3/search/jql?jql=${encodeURIComponent(args.jql)}&maxResults=10`);

        case 'create_issue':
            const body = {
                fields: {
                    project: { key: args.projectKey || 'KAN' },
                    summary: args.summary,
                    description: {
                        type: 'doc',
                        version: 1,
                        content: [{
                            type: 'paragraph',
                            content: [{ type: 'text', text: args.description || '' }]
                        }]
                    },
                    issuetype: { name: args.issueType || 'Task' }
                }
            };
            return await callJiraAPI('POST', '/rest/api/3/issue', body);

        case 'get_issue':
            return await callJiraAPI('GET', `/rest/api/3/issue/${args.issueKey}`);

        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
}

// Main Logic
async function main() {
    const args = process.argv.slice(2);
    const userQuery = args.join(' ');

    if (!userQuery) {
        console.log('Usage: node huggingface-jira-integration.js "list my projects"');
        console.log('Requires HF_TOKEN environment variable.');
        return;
    }

    console.log(`🤖 User: "${userQuery}"`);
    console.log(`🧠 Thinking with ${HF_MODEL}...`);

    try {
        // 1. Get structured command from LLM
        const llmResponse = await callHuggingFace(userQuery);
        // Attempt to parse JSON (sometimes models add extra text)
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('❌ Failed to extract JSON from model response:', llmResponse);
            return;
        }

        const command = JSON.parse(jsonMatch[0]);

        if (command.error) {
            console.log('❌ AI:', command.error);
            return;
        }

        console.log(`🔧 Tool: ${command.tool}`);
        console.log(`📋 Args:`, command.arguments);

        // 2. Execute Tool
        const result = await executeTool(command.tool, command.arguments);

        // 3. Output result (Raw or Summarized)
        // For simplicity, we just dump the crucial parts of the result
        if (command.tool === 'list_projects') {
            console.log('\n✅ Projects:');
            result.values.forEach(p => console.log(`- [${p.key}] ${p.name}`));
        } else if (command.tool === 'search_issues') {
            console.log('\n✅ Issues:');
            result.issues.forEach(i => console.log(`- [${i.key}] ${i.fields.summary} (${i.fields.status.name})`));
        } else if (command.tool === 'create_issue') {
            console.log(`\n✅ Created: ${result.key} (ID: ${result.id})`);
            console.log(`🔗 Link: ${JIRA_CONFIG.baseUrl}/browse/${result.key}`);
        } else {
            console.log('\n✅ Result:', JSON.stringify(result, null, 2).substring(0, 500) + '...');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();
