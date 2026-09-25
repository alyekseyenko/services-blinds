import Dexie, { type Table } from 'dexie';

export interface LocalTask {
  id?: number;
  twentyId: string;
  data: any;
  lastSync: number;
  status: 'synced' | 'pending' | 'error';
}

export interface SyncQueueItem {
  id?: number;
  taskId: string;
  action: 'UPDATE_STATUS' | 'SAVE_MEASUREMENTS' | 'ADD_NOTE' | 'CREATE_VISIT_SERVICE';
  payload: any;
  timestamp: number;
  status: 'pending' | 'failed';
  retries?: number;
  lastError?: string;
}

export class FieldOpsDB extends Dexie {
  tasks!: Table<LocalTask>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('FieldOpsDB');
    this.version(2).stores({
      tasks: '++id, twentyId, status, lastSync',
      syncQueue: '++id, taskId, status, timestamp'
    });
    this.version(3).stores({
      tasks: '++id, twentyId, status, lastSync',
      syncQueue: '++id, taskId, status, timestamp'
    });
  }
}

export const db = new FieldOpsDB();

/** Clears offline queue and cached API payloads (e.g. on logout on a shared device). */
export async function clearOfflineUserData(): Promise<void> {
  if (typeof window === "undefined") return;
  await db.syncQueue.clear();
  await db.tasks.clear();
}
