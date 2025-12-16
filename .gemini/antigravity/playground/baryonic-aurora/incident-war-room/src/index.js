import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const resolver = new Resolver();

// War Room - Checklist Logic
const getChecklistKey = (issueId) => `checklist-${issueId}`;

resolver.define('getChecklist', async (req) => {
  const { context } = req;
  // Handle Global Page where issue context is missing
  if (!context.extension || !context.extension.issue) {
    return { isGlobal: true };
  }
  const issueId = context.extension.issue.id;
  const data = await storage.get(getChecklistKey(issueId));
  return data || [];
});

resolver.define('updateChecklist', async (req) => {
  const { context, payload } = req;
  if (!context.extension || !context.extension.issue) {
    throw new Error("Cannot update checklist from Global Page");
  }
  const issueId = context.extension.issue.id;
  await storage.set(getChecklistKey(issueId), payload.items);
  return payload.items;
});

export const handler = resolver.getDefinitions();
