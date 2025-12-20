
module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.jsx?$': 'babel-jest',
    },
    reporters: [
        "default",
        ["jest-html-reporter", {
            "pageTitle": "Rovo Orchestrator Test Report",
            "outputPath": "test-report.html",
            "includeFailureMsg": true,
            "includeConsoleLog": true
        }]
    ]
};
