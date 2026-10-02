import { describe, it, expect, beforeEach } from 'vitest';
import { semanticAiCache } from '../semanticCache';

describe('Semantic AI Cache', () => {
  beforeEach(() => {
    semanticAiCache.clear();
  });

  it('should normalize queries and match semantic equivalents', () => {
    const payload = { message: 'Custo aproximado 50€', timestamp: '2026-08-31' };

    semanticAiCache.set('Quanto custa ir a Lisboa?', payload);

    // Variações de pontuação, maiúsculas e acentos devem bater no mesmo cache
    expect(semanticAiCache.get('quanto custa ir a lisboa')).toEqual(payload);
    expect(semanticAiCache.get('QUANTO CUSTA IR A LISBOA?')).toEqual(payload);
    expect(semanticAiCache.get('quanto   custa  ir a lisboa???')).toEqual(payload);
  });

  it('should expire entries after TTL', async () => {
    const payload = { message: 'Análise temporária' };
    semanticAiCache.set('Consulta rápida', payload, 50); // 50ms TTL

    expect(semanticAiCache.get('Consulta rápida')).toEqual(payload);

    await new Promise(r => setTimeout(r, 60));

    expect(semanticAiCache.get('Consulta rápida')).toBeNull();
  });
});
