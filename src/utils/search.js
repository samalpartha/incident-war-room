// Web search utility using DuckDuckGo Instant Answer API
// No API key required, free forever

/**
 * Search the web for technical solutions and documentation
 * @param {string} query - Search query (e.g., "Redis connection timeout fix")
 * @returns {Promise<{success: boolean, results?: Array, error?: string}>}
 */
export async function searchWeb(query) {
    try {
        // DuckDuckGo Instant Answer API
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Search API returned ${response.status}`);
        }

        const data = await response.json();

        // Extract results from RelatedTopics
        const results = [];

        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            for (const topic of data.RelatedTopics) {
                if (topic.Text && topic.FirstURL) {
                    results.push({
                        title: topic.Text.substring(0, 150), // Limit title length
                        url: topic.FirstURL,
                        snippet: topic.Text
                    });
                }

                // Also check nested topics (Topics array)
                if (topic.Topics && Array.isArray(topic.Topics)) {
                    for (const nested of topic.Topics) {
                        if (nested.Text && nested.FirstURL) {
                            results.push({
                                title: nested.Text.substring(0, 150),
                                url: nested.FirstURL,
                                snippet: nested.Text
                            });
                        }
                    }
                }

                if (results.length >= 5) break; // Limit to top 5
            }
        }

        // If no RelatedTopics, try AbstractText
        if (results.length === 0 && data.AbstractText) {
            results.push({
                title: data.Heading || query,
                url: data.AbstractURL || 'https://duckduckgo.com',
                snippet: data.AbstractText.substring(0, 200)
            });
        }

        return {
            success: true,
            results: results.slice(0, 5), // Return max 5 results
            totalFound: results.length
        };
    } catch (error) {
        console.error('Search error:', error);
        return {
            success: false,
            error: error.message || 'Search failed',
            results: []
        };
    }
}
