import { describe, it, expect, beforeEach } from 'vitest';
import { locationStore, TechnicianLocation } from '../locationStore';

describe('LocationStore Module', () => {
  beforeEach(async () => {
    await locationStore.clear();
  });

  it('should save and retrieve active technician location', async () => {
    const loc: TechnicianLocation = {
      technicianId: 'tech-001',
      technicianName: 'David Silva',
      lat: 39.4055,
      lng: -9.1333,
      lastUpdate: new Date().toISOString(),
      accuracy: 10
    };

    await locationStore.save(loc);
    const active = await locationStore.getActive(60 * 60 * 1000);

    expect(active.length).toBe(1);
    expect(active[0].technicianId).toBe('tech-001');
    expect(active[0].technicianName).toBe('David Silva');
    expect(active[0].lat).toBe(39.4055);
  });

  it('should filter out stale locations', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const staleLoc: TechnicianLocation = {
      technicianId: 'tech-stale',
      technicianName: 'Técnico Antigo',
      lat: 39.0,
      lng: -9.0,
      lastUpdate: twoHoursAgo,
    };

    await locationStore.save(staleLoc);
    const active = await locationStore.getActive(60 * 60 * 1000); // 1 hour threshold

    expect(active.length).toBe(0);
  });
});
