# 🤖 Rovo Autonomous Team Orchestrator
### *The Next-Generation AI Command Center for DevOps*

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Platform](https://img.shields.io/badge/platform-Atlassian_Forge-0052CC.svg) ![Coverage](https://img.shields.io/badge/coverage-100%25-success) ![Status](https://img.shields.io/badge/status-Production_Ready-green.svg)

> **2025 Hackathon Edition**
> **Theme:** "Agentic AI & Autonomous Workflows"

---

## � Overview
**Rovo Autonomous Team Orchestrator** is a production-grade AI Agent suite designed to proactively manage Jira projects. Unlike passive chatbots that only answer questions, this system **takes action**. It serves as a unified "Mission Control" for engineering teams, leveraging **Atlassian Rovo** and the **Model Context Protocol (MCP)** to autonomously fix tickets, assign work, and manage incidents.

---

## ⚡️ Architecture 2025

### 1. High-Level System Design
The system bridges the gap between conversational AI (Rovo/Claude) and structured DevOps data (Jira).

\`\`\`mermaid
graph TD
    subgraph "User Interfaces"
        Chat[💬 Rovo Chat]
        Dash[🖥️ React Dashboard]
        IDE[💻 VS Code / Cursor]
    end

    subgraph "Orchestration Layer (Forge)"
        direction TB
        Resolver[⚡️ FaaS Resolvers]
        Agent[🤖 Rovo Agents]
        MCP[🔌 MCP Interface]
        
        Resolver <--> Agent
        Resolver <--> MCP
    end

    subgraph "Intelligence & Execution"
        AutoFix[✨ Auto-Fix Agent]
        Assign[👤 Smart Assigner]
        Chaos[🐵 Chaos Monkey]
    end

    subgraph "Data Persistence"
        Jira[Jira Cloud]
        Storage[Forge Storage]
    end

    Chat --> Agent
    Dash --> Resolver
    IDE -->|MCP Protocol| Resolver
    
    Resolver --> Jira
    Agent --> AutoFix
    Agent --> Assign
    Chaos --> Jira
    Resolver --> Storage
\`\`\`

### 2. Agentic Workflow: "The Life of a Ticket"
How the Auto-Fix Agent autonomously improves quality without human intervention.

\`\`\`mermaid
sequenceDiagram
    participant Dev as 👨‍💻 Developer
    participant Jira as 🎫 Jira
    participant Agent as 🤖 Auto-Fix Agent
    participant AI as 🧠 LLM Engine

    Dev->>Jira: Creates Ticket ("Fix login bug")
    Note right of Dev: Description is empty/vague
    
    Jira->>Agent: Webhook / Trigger
    Agent->>Jira: Read Ticket Details
    Agent->>AI: Analyze & Generate Spec
    AI-->>Agent: Returns Acceptance Criteria
    
    Agent->>Jira: Update Description
    Jira-->>Dev: Notification: "Ticket Updated"
    Note right of Dev: Ticket now has Steps & AC
\`\`\`

---

## 🛠️ Key Features

### 1. 🖥️ The Orchestrator Control Center
A production-grade React dashboard hosted directly within Jira.
-   **Live Incident Feed:** Real-time WebSocket-like polling for active incidents.
-   **Glassmorphism UI:** Modern, responsive design with dark mode support.
-   **Chaos Monkey:** Built-in resilience testing tool that simulates production outages.

### 2. 🤖 Rovo Agents
Autonomous agents that live in the sidebar and chat.
-   **Auto-Fix:** Instantly rewrites vague descriptions into structured requirements.
-   **Smart Assign:** Balances team workload using heuristic algorithms.
-   **Subtask Generator:** Breaks down epics into implementation plans.

### 3. 🛡️ QA Command Center
Built-in quality assurance tools to ensure reliability.
-   **100% Test Coverage:** Enforced by CI/CD pipelines.
-   **E2E Simulation:** A live "Self-Health" check available directly in the dashboard (`/qa-dashboard.html`).

---

## 👩‍💻 Developer Setup

### Prerequisites
*   Node.js 22+
*   Atlassian Forge CLI (`npm install -g @forge/cli`)
*   Docker (Optional, for local MCP server)

### 1. Installation
\`\`\`bash
# Clone the repository
git clone https://github.com/samalpartha/incident-war-room.git
cd incident-war-room

# Install dependencies (Root + Dashboard)
npm install
cd static/dashboard && npm install && cd ../..
\`\`\`

### 2. Local Development (Proxy Mode)
We utilize a custom proxy server to mock Atlassian APIs, enabling rapid local UI development.
\`\`\`bash
# Start the Proxy Server + React App
npm start
\`\`\`
*   **App URL:** `http://localhost:8080/qa-dashboard.html`
*   **API Mock:** `http://localhost:8080/rest/api/3/...`

### 3. Testing Quality Gates
\`\`\`bash
# Unit Tests (Jest)
npm test

# End-to-End Simulation
node e2e_simulation.js
\`\`\`

---

## 🏗️ Technology Stack
| Component | Technology | Description |
|-----------|------------|-------------|
| **Platform** | Atlassian Forge | Serverless FaaS infrastructure |
| **Frontend** | React 18 | Dashboard UI with `@forge/bridge` |
| **Styling** | Vanilla CSS | High-performance variables & dark mode |
| **AI Protocol** | MCP | Model Context Protocol for external agents |
| **Testing** | Jest | 100% Unit Test Coverage |

---
*Built for the Future of Work. 2025.*
