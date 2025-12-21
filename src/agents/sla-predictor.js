import api, { route } from '@forge/api';

export const predictSlaRisk = async (issueKey) => {
    console.log(`[SLA Prediction] Analyzing ${issueKey}`);

    const res = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`);
    if (!res.ok) throw new Error("Ticket not found");
    const issue = await res.json();
    const created = new Date(issue.fields.created);
    const now = new Date();
    const ageHours = (now - created) / (1000 * 60 * 60);

    const priority = issue.fields.priority?.name || "Medium";
    let slaLimit = 48; // Default Medium

    if (priority === "Highest") slaLimit = 4;
    else if (priority === "High") slaLimit = 24;
    else if (priority === "Low") slaLimit = 72;
    else if (priority === "Lowest") slaLimit = 120;

    const elapsedPercent = (ageHours / slaLimit) * 100;
    let riskLevel = "LOW";
    let breachProb = "Low";

    if (elapsedPercent > 100) {
        riskLevel = "BREACHED";
        breachProb = "100%";
    } else if (elapsedPercent > 75) {
        riskLevel = "HIGH";
        breachProb = "80-99%";
    } else if (elapsedPercent > 50) {
        riskLevel = "MEDIUM";
        breachProb = "40-60%";
    }

    return {
        issueKey,
        priority,
        ageHours: ageHours.toFixed(1),
        slaLimitHours: slaLimit,
        riskLevel,
        breachProbability: breachProb
    };
};
