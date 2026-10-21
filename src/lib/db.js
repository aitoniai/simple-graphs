// Saves everything in IndexedDB on the device. Nothing is ever sent anywhere.
import { get, set } from 'idb-keyval';
import { isValidBackup } from './graphs.js';

export async function loadData() {
  const [graphs, settings] = await Promise.all([get('graphs'), get('settings')]);
  return { graphs: graphs ?? [], settings: { theme: 'auto', ...(settings ?? {}) } };
}

export function saveGraphs(graphs) {
  return set('graphs', graphs);
}

export function saveSettings(settings) {
  return set('settings', settings);
}

export async function askForPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Not supported; data is still saved, just with the browser's normal rules.
  }
}

export function makeBackup(graphs, settings) {
  return JSON.stringify({ app: 'simple-graphs', version: 1, savedAt: new Date().toISOString(), graphs, settings }, null, 2);
}

export function readBackup(text) {
  const data = JSON.parse(text);
  if (!isValidBackup(data)) throw new Error('This file is not a Simple Graphs backup.');
  return data;
}
