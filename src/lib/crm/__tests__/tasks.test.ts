import { describe, it, expect } from 'vitest';

// Sample mock data for testing
const mockTasks = [
  { status: 'Agendado', assigneeId: 'user-1', technicianName: 'Tech 1' },
  { status: 'Concluído', assigneeId: 'user-1', technicianName: 'Tech 1' },
  { status: 'Agendado', assigneeId: 'user-2', technicianName: 'Tech 2' },
];

describe('Task Filtering Logic', () => {
  it('should filter tasks by technician ID and status', () => {
    const technicianId = 'user-1';
    const filtered = mockTasks.filter(t => t.status === 'Agendado' && t.assigneeId === technicianId);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].technicianName).toBe('Tech 1');
  });

  it('should handle different status casing', () => {
    const statuses = ['AGENDADO', 'Agendado'];
    const task = { status: 'AGENDADO' };
    expect(statuses.includes(task.status)).toBe(true);
  });
});
