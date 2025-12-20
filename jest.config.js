
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
            "includeConsoleLog": true,
            "theme": "darkTheme",  // Dark mode for the report
            "statusIgnoreFilter": "pending"
        }]
    ],
    coverageReporters: ["html", "text", "lcov", "json-summary"],
    collectCoverageFrom: [
        "src/**/*.{js,jsx}",
        "!src/**/*.test.js"
    ]
};
