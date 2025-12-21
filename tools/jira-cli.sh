#!/bin/bash

# Simple Jira CLI - No Docker, No AI, Just Direct Access
# Uses NPX MCP server for instant Jira queries

SITE_NAME="hackathondemoforge"
USER_EMAIL="samalpartha@gmail.com"
# API_TOKEN is now inherited from environment
if [ -z "$JIRA_API_TOKEN" ]; then
  echo "Error: JIRA_API_TOKEN is not set."
  echo "Please export JIRA_API_TOKEN='your-token-here'"
  exit 1
fi
API_TOKEN="$JIRA_API_TOKEN"

export ATLASSIAN_SITE_NAME="$SITE_NAME"
export ATLASSIAN_USER_EMAIL="$USER_EMAIL"
export ATLASSIAN_API_TOKEN="$API_TOKEN"

echo "🚀 Jira CLI - Direct Access (No AI, No Docker)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -z "$1" ]; then
  echo "Usage:"
  echo "  ./jira-cli.sh projects              # List all projects"
  echo "  ./jira-cli.sh issues                # List recent issues"
  echo "  ./jira-cli.sh search 'JQL query'    # Search with JQL"
  echo "  ./jira-cli.sh get /rest/api/3/...   # Custom GET"
  echo ""
  echo "Examples:"
  echo "  ./jira-cli.sh projects"
  echo "  ./jira-cli.sh issues"
  echo "  ./jira-cli.sh search 'project = KAN AND status = Open'"
  echo "  ./jira-cli.sh get /rest/api/3/issue/KAN-123"
  echo ""
  exit 0
fi

case "$1" in
  projects)
    echo "📊 Listing all projects..."
    npx -y @aashari/mcp-server-atlassian-jira get \
      --path "/rest/api/3/project/search" \
      --output-format json
    ;;
  
  issues)
    echo "📋 Listing recent issues in KAN project..."
    npx -y @aashari/mcp-server-atlassian-jira get \
      --path "/rest/api/3/search/jql?jql=project+%3D+KAN+ORDER+BY+created+DESC&maxResults=10" \
      --output-format json
    ;;
  
  search)
    if [ -z "$2" ]; then
      echo "❌ Please provide JQL query"
      echo "Example: ./jira-cli.sh search 'project = KAN'"
      exit 1
    fi
    # URL encode the JQL
    JQL=$(echo "$2" | jq -sRr @uri)
    echo "🔍 Searching: $2"
    npx -y @aashari/mcp-server-atlassian-jira get \
      --path "/rest/api/3/search/jql?jql=$JQL" \
      --output-format json
    ;;
  
  create)
    if [ -z "$2" ] || [ -z "$3" ]; then
      echo "❌ Usage: ./jira-cli.sh create 'Summary' 'ProjectKey' [Type]"
      echo "Example: ./jira-cli.sh create 'New Bug' 'KAN' 'Bug'"
      exit 1
    fi
    SUMMARY="$2"
    PROJECT="$3"
    TYPE="${4:-Task}" # Default to Task if not specified
    
    echo "📝 Creating issue in $PROJECT: '$SUMMARY' ($TYPE)..."
    
    # Construct JSON body for Jira API
    BODY_JSON=$(jq -n -c \
                  --arg sum "$SUMMARY" \
                  --arg proj "$PROJECT" \
                  --arg type "$TYPE" \
                  '{fields: {project: {key: $proj}, summary: $sum, issuetype: {name: $type}}}')
                  
    npx -y @aashari/mcp-server-atlassian-jira post \
      --path "/rest/api/3/issue" \
      --body "$BODY_JSON" \
      --output-format json
    ;;

  get)
    if [ -z "$2" ]; then
      echo "❌ Please provide API path"
      echo "Example: ./jira-cli.sh get /rest/api/3/issue/KAN-123"
      exit 1
    fi
    echo "📡 GET $2"
    npx -y @aashari/mcp-server-atlassian-jira get \
      --path "$2" \
      --output-format json
    ;;
  
  *)
    echo "❌ Unknown command: $1"
    echo "Run without arguments to see usage"
    exit 1
    ;;
esac
