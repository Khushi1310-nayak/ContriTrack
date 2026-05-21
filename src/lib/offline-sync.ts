// lib/offline-sync.ts
// Handles local queuing of mutations when offline.

export interface SyncTask {
  id: string;
  url: string;
  method: string;
  body: any;
  timestamp: number;
}

const SYNC_QUEUE_KEY = "contritrack_offline_sync_queue";

export class OfflineSyncEngine {
  static getQueue(): SyncTask[] {
    if (typeof window === "undefined") return [];
    try {
      const q = localStorage.getItem(SYNC_QUEUE_KEY);
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  }

  static queueAction(url: string, method: string, body: any) {
    if (typeof window === "undefined") return;
    const q = this.getQueue();
    q.push({
      id: crypto.randomUUID(),
      url,
      method,
      body,
      timestamp: Date.now()
    });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(q));
    console.log(`[OfflineSync] Queued action: ${method} ${url}`);
  }

  static async processQueue() {
    if (typeof window === "undefined" || !navigator.onLine) return;
    const q = this.getQueue();
    if (q.length === 0) return;

    console.log(`[OfflineSync] Processing ${q.length} queued actions...`);
    const remainingQueue = [];

    for (const task of q) {
      try {
        const res = await fetch(task.url, {
          method: task.method,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(task.body)
        });
        
        if (!res.ok) {
          console.warn(`[OfflineSync] Action failed, keeping in queue: ${task.id}`);
          remainingQueue.push(task);
        } else {
          console.log(`[OfflineSync] Successfully synced: ${task.id}`);
        }
      } catch (err) {
        console.error(`[OfflineSync] Network error syncing task ${task.id}`, err);
        remainingQueue.push(task);
      }
    }

    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingQueue));
    if (remainingQueue.length === 0) {
      // Trigger a visual confirmation event
      window.dispatchEvent(new CustomEvent('contritrack:sync:complete'));
    }
  }
}
