#!/usr/bin/env node

/**
 * OpenAI + Jira Integration (No Docker/MCP needed)
 * Uses OpenAI function calling to interact with Jira
 */

const https = require('https');

// Configuration
const JIRA_CONFIG = {
    siteName: 'hackathondemoforge',
    userEmail: 'samalpartha@gmail.com',
    apiToken: process.env.JIRA_API_TOKEN,
    baseUrl: 'https://hackathondemoforge.atlassian.net'
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-openai-api-key-here';

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

// Jira Functions for OpenAI
const jiraFunctions = [
    {
        name: 'list_jira_projects',
        description: 'List all Jira projects',
        parameters: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'search_jira_issues',
        description: 'Search Jira issues using JQL',
        parameters: {
            type: 'object',
            properties: {
                jql: {
                    type: 'string',
                    description: 'JQL query string (e.g., "project = KAN AND status = Open")'
                },
                maxResults: {
                    type: 'number',
                    description: 'Maximum number of results to return',
                    default: 10
                }
            },
            required: ['jql']
        }
    },
    {
        name: 'create_jira_issue',
        description: 'Create a new Jira issue/incident',
        parameters: {
            type: 'object',
            properties: {
                projectKey: {
                    type: 'string',
                    description: 'Project key (e.g., "KAN")'
                },
                summary: {
                    type: 'string',
                    description: 'Issue summary/title'
                },
                description: {
                    type: 'string',
                    description: 'Issue description'
                },
                issueType: {
                    type: 'string',
                    description: 'Issue type (Task, Bug, Story, etc.)',
                    default: 'Task'
                }
            },
            required: ['projectKey', 'summary']
        }
    },
    {
        name: 'get_jira_issue',
        description: 'Get details of a specific Jira issue',
        parameters: {
            type: 'object',
            properties: {
                issueKey: {
                    type: 'string',
                    description: 'Issue key (e.g., "KAN-123")'
                }
            },
            required: ['issueKey']
        }
    }
];

// Function Implementations
async function listJiraProjects() {
    return await callJiraAPI('GET', '/rest/api/3/project/search');
}

async function searchJiraIssues(jql, maxResults = 10) {
    const query = encodeURIComponent(jql);
    return await callJiraAPI('GET', `/rest/api/3/search?jql=${query}&maxResults=${maxResults}`);
}

async function createJiraIssue(projectKey, summary, description = '', issueType = 'Task') {
    const body = {
        fields: {
            project: { key: projectKey },
            summary: summary,
            description: {
                type: 'doc',
                version: 1,
                content: [{
                    type: 'paragraph',
                    content: [{ type: 'text', text: description }]
                }]
            },
            issuetype: { name: issueType }
        }
    };
    return await callJiraAPI('POST', '/rest/api/3/issue', body);
}

async function getJiraIssue(issueKey) {
    return await callJiraAPI('GET', `/rest/api/3/issue/${issueKey}`);
}

// Execute Function
async function executeFunction(functionName, args) {
    switch (functionName) {
        case 'list_jira_projects':
            return await listJiraProjects();
        case 'search_jira_issues':
            return await searchJiraIssues(args.jql, args.maxResults);
        case 'create_jira_issue':
            return await createJiraIssue(args.projectKey, args.summary, args.description, args.issueType);
        case 'get_jira_issue':
            return await getJiraIssue(args.issueKey);
        default:
            return { error: 'Unknown function' };
    }
}

// OpenAI API Call
async function callOpenAI(messages) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: messages,
            functions: jiraFunctions,
            function_call: 'auto'
        });

        const options = {
            hostname: 'api.openai.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// Main Chat Loop
async function chat(userMessage) {
    const messages = [
        {
            role: 'system',
            content: 'You are a helpful assistant that can interact with Jira. Use the available functions to help users manage their Jira issues.'
        },
        {
            role: 'user',
            content: userMessage
        }
    ];

    console.log(`\n🤖 Processing: "${userMessage}"\n`);

    let response = await callOpenAI(messages);
    let message = response.choices[0].message;

    // Handle function calls
    while (message.function_call) {
        const functionName = message.function_call.name;
        const functionArgs = JSON.parse(message.function_call.arguments);

        console.log(`📞 Calling Jira function: ${functionName}`);
        console.log(`📋 Arguments:`, functionArgs);

        const functionResult = await executeFunction(functionName, functionArgs);

        messages.push(message);
        messages.push({
            role: 'function',
            name: functionName,
            content: JSON.stringify(functionResult)
        });

        response = await callOpenAI(messages);
        message = response.choices[0].message;
    }

    console.log(`\n✅ Response:\n${message.content}\n`);
    return message.content;
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log(`
🚀 OpenAI + Jira Integration

Usage:
  node openai-jira-integration.js "your question here"

Examples:
  node openai-jira-integration.js "list all my projects"
  node openai-jira-integration.js "show me open issues in KAN project"
  node openai-jira-integration.js "create a bug: Login button not working"
  node openai-jira-integration.js "what is the status of KAN-123"

Setup:
  1. Set your OpenAI API key:
     export OPENAI_API_KEY="sk-..."
  
  2. Run queries!
`);
        process.exit(0);
    }

    chat(args.join(' ')).catch(console.error);
}

module.exports = { chat, jiraFunctions, executeFunction };
