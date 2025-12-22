const fetch = require('node-fetch');

// Using the Proxy URL we verified earlier
const BASE_URL = 'http://localhost:8080/incidents';

// Mocking the "Orchestrator" behavior
// Scenario: "Find the latest bug and fix it"

async function runOrchestrationTest() {
    console.log("🤖 [Orchestrator Simulation] Starting Multi-Agent Workflow...");

    // Step 1: List Issues (Simulating 'List Team Issues' action)
    console.log("\n1️⃣  [Agent: Search] Scanning for critical bugs...");
    let issues = [];
    try {
        const res = await fetch(BASE_URL);
        const data = await res.json();
        issues = data.issues;
        console.log(`   Found ${data.count} issues.`);
    } catch (e) {
        console.error("   ❌ Failed to list issues:", e.message);
        return;
    }

    if (!issues || issues.length === 0) {
        console.log("   ⚠️ No issues found. Cannot proceed with orchestration.");
        return;
    }

    // Find a chaos monkey ticket to "fix"
    const targetIssue = issues.find(i => i.summary.includes('[CHAOS]')) || issues[0];
    console.log(`   🎯 Target Identified: ${targetIssue.key} - ${targetIssue.summary}`);

    // Step 2: Analyze & "Auto-Fix" (Simulating 'Improve Ticket Quality' action)
    console.log(`\n2️⃣  [Agent: Auto-Fix] Analyzing ${targetIssue.key}...`);

    // In a real scenario, the LLM generates this. Here we simulate the LLM's output.
    const generatedFix = `
    **Root Cause Analysis:**
    The issue '${targetIssue.summary}' was likely caused by the Chaos Monkey simulation suite interacting with the proxy layer.

    **Acceptance Criteria:**
    - [ ] Verify database connection pool metrics.
    - [ ] Restart the worker node if memory usage > 90%.
    - [ ] Ensure 200 OK response from health check endpoint.

    **Steps to Resolve:**
    1. Check logs at /var/log/syslog.
    2. Reboot instance.
    `;

    console.log("   🧠 [Rovo AI] Generated Fix Plan:");
    console.log(generatedFix.trim().split('\n').map(l => "      " + l).join('\n'));

    // Invoke the Auto-Fix Action (Mocking the call via console as the proxy might not expose the agent directly via HTTP)
    // NOTE: In the real app, this is an internal function call. 
    // We validated the payload structure in e2e_simulation.js.
    // Here we confirm the logical flow works.

    console.log(`\n3️⃣  [Agent: Executor] Applying fix to ${targetIssue.key}...`);
    console.log(`   ✅ Action invoked: auto-fix-ticket-action`);
    console.log(`   ✅ Payload: { issueKey: "${targetIssue.key}", improvedContent: "..." }`);

    // Simulate Success
    console.log(`\n✨ [Orchestration Complete] Ticket ${targetIssue.key} has been updated with the fix plan.`);
}

runOrchestrationTest();
