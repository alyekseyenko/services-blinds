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
  action: 'UPDATE_STATUS' | 'SAVE_MEASUREMENTS' | 'ADD_NOTE';
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
  }
}

export const db = new FieldOpsDB();
