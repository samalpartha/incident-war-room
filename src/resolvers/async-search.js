// Async handler for long-running search operations
// Based on pattern from forge-ai-sprint-builder

import { storage } from '@forge/api';
import { searchWeb } from '../utils/search.js';

/**
 * Async event handler for web searches
 * Runs independently with longer timeout limits
 * Stores result in Forge Storage for polling
 */
export async function asyncSearchHandler(event) {
    const { jobId, query } = event.payload;

    if (!jobId || !query) {
        console.error('[ASYNC] Missing jobId or query in event payload');
        return;
    }

    console.log(`[ASYNC] Starting search job ${jobId}: "${query}"`);

    try {
        // Perform the search (can take as long as needed - no 25s timeout!)
        const searchResults = await searchWeb(query);

        // Store successful result in Forge Storage
        const result = {
            status: 'completed',
            query,
            success: searchResults.success,
            results: searchResults.results || [],
            totalFound: searchResults.totalFound || 0,
            completedAt: new Date().toISOString()
        };

        await storage.set(jobId, result);

        console.log(`[ASYNC] ✅ Completed job ${jobId} - found ${result.totalFound} results`);
    } catch (error) {
        console.error(`[ASYNC] ❌ Job ${jobId} failed:`, error);

        // Store error result so frontend can display it
        const errorResult = {
            status: 'failed',
            query,
            success: false,
            error: error.message || 'Search failed',
            failedAt: new Date().toISOString()
        };

        await storage.set(jobId, errorResult);
    }
}

// Export for manifest
export const handler = asyncSearchHandler;
