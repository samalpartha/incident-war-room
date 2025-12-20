# 🤖 Rovo Autonomous Team Orchestrator
### *Turn your Jira Projects into a Finely Tuned Pit Crew* 🏎️

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Platform](https://img.shields.io/badge/platform-Atlassian_Forge-0052CC.svg) ![Coverage](https://img.shields.io/badge/coverage-100%25-success) ![Status](https://img.shields.io/badge/status-Production_Ready-green.svg)

> **Codegeist Unleashed 2024 Submission**
> **Category:** Apps for Software Teams
> **Theme:** "Fast, Precise, and Always in Sync"

---

## 🚀 The Vision
When production breaks, you don't need another ticket—you need a **Team Orchestrator**. 
**Rovo Autonomous Team Orchestrator** is a next-gen AI Agent suite that proactively manages your Jira projects. It doesn't just suggest actions; it takes them.

### 🧠 The Intelligence Modules
1. **✨ Auto-Fix Agent (The Mechanic):** Detects vague tickets ("fix bug") and instantly rewrites them with professional *Acceptance Criteria* and *Steps to Reproduce*.
2. **👤 Smart Assign Agent (The Strategist):** Analyzes team workload and auto-assigns tickets to the best available engineer.
3. **📑 Subtask Generator (The Planner):** Automatically breaks down complex stories into standard implementation phases (Dev -> Test -> Docs).
4. **🔌 MCP Integration (The Universal Interface):** The *first* Atlassian App to support the **Model Context Protocol**, allowing ANY external agent (Claude, OpenAI) to control the war room.

---

## 🛠️ Key Features

### 1. The Orchestrator Control Center
A React-based dashboard that serves as your Mission Control.
- **Live Autonomous Feed:** Watch Rovo make decisions in real-time.
- **Visual War Room:** "Active War Front" indicator updates live based on incident volume.
- **Chaos Monkey:** Built-in stress testing tool to demonstrate agent resilience.

### 2. 🛡️ The QA Command Center (NEW)
We prove our reliability with a dedicated **QA Dashboard** built right into the app.
- **100% Code Coverage:** Verified by Jest.
- **E2E Simulation Report:** A live, visual report of the backend's health, verifying the entire incident lifecycle from creation to resolution.
- **Self-Healing:** The app monitors its own health and reports status in real-time.

### 3. Rovo Agent: "Autonomous Orchestrator"
A Rovo-native agent designed to live in your chat and sidebar.
- **Prompt:** "Optimize this ticket"
- **Action:** Rovo reads the ticket, rewrites the description, and assigns it.

---

## 📦 Installation & Testing
### 1. The "Judge's Happy Path"
1. **Install the App:** [Access Link provided in submission]
2. **Open the Dashboard:** Go to `Apps` -> `Team Orchestrator`.
3. **Verify Health:** Click the **QA Dashboard** link in the footer.
    - confirm the **100% Coverage** badge.
    - Click **🤖 E2E Simulation** to see the system verify itself live.
4. **Unleash Chaos:** Return to the main dashboard and click **"Chaos Monkey"**.
    - Watch as incidents are created and the "War Front" card activates.
    - Use "Auto-Fix" on any new ticket to see the AI in action.

### 2. Running Backend MCP (Advanced)
For power users who want to use Claude/Cursor:
\`\`\`bash
./jira-cli.sh projects
\`\`\`

---

## 🏗️ Technology Stack
- **Atlassian Forge:** FaaS infrastructure.
- **React + Vanilla CSS:** High-performance, premium UI.
- **Jest:** Comprehensive Testing (60+ tests).
- **Node.js:** Backend Resolvers.
- **MCP (Model Context Protocol):** Open Agency Standard.

---

## 🏆 Why This Wins
- **Real Autonomy:** It actively *writes* to Jira, unlike passive chatbots.
- **Battle Tested:** Shipped with **100% Test Coverage** and a built-in verification suite.
- **Future Proof:** Built ready for the Agentic Web via MCP.

---
*Built with ❤️ for the Atlassian Codegeist Hackathon.*
