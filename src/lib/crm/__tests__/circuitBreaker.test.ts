import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerOpenException } from '../circuitBreaker';

describe('Circuit Breaker Pattern', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('TestService', {
      failureThreshold: 3,
      cooldownPeriodMs: 100, // 100ms para testes rápidos
    });
  });

  it('should execute successfully when CLOSED', async () => {
    const result = await breaker.execute(async () => 'OK');
    expect(result).toBe('OK');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should trip to OPEN after consecutive failures', async () => {
    const failingAction = async () => {
      throw new Error('Connection refused');
    };

    // 3 falhas consecutivas
    await expect(breaker.execute(failingAction)).rejects.toThrow('Connection refused');
    await expect(breaker.execute(failingAction)).rejects.toThrow('Connection refused');
    await expect(breaker.execute(failingAction)).rejects.toThrow('Connection refused');

    expect(breaker.getState()).toBe('OPEN');

    // A 4ª execução falha imediatamente com CircuitBreakerOpenException em 0ms
    await expect(breaker.execute(async () => 'OK')).rejects.toThrow(CircuitBreakerOpenException);
  });

  it('should transition to HALF_OPEN after cooldown and recover to CLOSED on success', async () => {
    const failingAction = async () => { throw new Error('CRM Down'); };

    // Trip to OPEN
    await expect(breaker.execute(failingAction)).rejects.toThrow();
    await expect(breaker.execute(failingAction)).rejects.toThrow();
    await expect(breaker.execute(failingAction)).rejects.toThrow();
    expect(breaker.getState()).toBe('OPEN');

    // Aguardar cooldown de 110ms
    await new Promise(r => setTimeout(r, 110));

    expect(breaker.getState()).toBe('HALF_OPEN');

    // Sucessos de teste em HALF_OPEN fecham o circuito
    await breaker.execute(async () => 'Canary 1');
    await breaker.execute(async () => 'Canary 2');

    expect(breaker.getState()).toBe('CLOSED');
  });
});
