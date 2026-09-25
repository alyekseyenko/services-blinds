import { logger } from '../logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Número de falhas consecutivas para abrir o circuito
  cooldownPeriodMs?: number; // Tempo em que o circuito fica OPEN antes de tentar HALF_OPEN
  timeoutMs?: number; // Timeout da operação
}

export class CircuitBreakerOpenException extends Error {
  constructor(message = 'Circuit Breaker está OPEN. Operação bloqueada para proteger o sistema.') {
    super(message);
    this.name = 'CircuitBreakerOpenException';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private halfOpenInFlight = 0;
  private lastStateChange: number = Date.now();
  private readonly failureThreshold: number;
  private readonly cooldownPeriodMs: number;
  private readonly maxHalfOpenConcurrent: number;
  private readonly name: string;

  constructor(name = 'TwentyCRM', options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.cooldownPeriodMs = options.cooldownPeriodMs || 30000; // 30 segundos
    this.maxHalfOpenConcurrent = 2;
  }

  public getState(): CircuitState {
    // Se estiver OPEN e tiver passado o tempo de cooldown, transita para HALF_OPEN
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastStateChange >= this.cooldownPeriodMs) {
        this.transitionTo('HALF_OPEN');
      }
    }
    return this.state;
  }

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      logger.warn(`[CircuitBreaker:${this.name}] Execução rejeitada imediatamente (Circuito OPEN).`, {
        state: this.state,
        cooldownRemainingMs: Math.max(0, this.cooldownPeriodMs - (Date.now() - this.lastStateChange))
      });
      throw new CircuitBreakerOpenException(`O serviço ${this.name} está temporariamente indisponível. A proteger o sistema.`);
    }

    if (currentState === 'HALF_OPEN' && this.halfOpenInFlight >= this.maxHalfOpenConcurrent) {
      throw new CircuitBreakerOpenException(`O serviço ${this.name} está em recuperação. Tente novamente em instantes.`);
    }

    if (currentState === 'HALF_OPEN') {
      this.halfOpenInFlight++;
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error: unknown) {
      this.onFailure(error);
      throw error;
    } finally {
      if (currentState === 'HALF_OPEN') {
        this.halfOpenInFlight = Math.max(0, this.halfOpenInFlight - 1);
      }
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      // Se recuperar com sucesso em HALF_OPEN, fecha o circuito
      if (this.successCount >= 2) {
        this.transitionTo('CLOSED');
      }
    }
  }

  private onFailure(error: any) {
    this.failureCount++;
    this.successCount = 0;

    logger.error(`[CircuitBreaker:${this.name}] Falha na operação (${this.failureCount}/${this.failureThreshold})`, {
      state: this.state,
      error: error?.message
    });

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  private transitionTo(newState: CircuitState) {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.successCount = 0;
      this.halfOpenInFlight = 0;
    } else if (newState === 'HALF_OPEN') {
      this.successCount = 0;
      this.halfOpenInFlight = 0;
    }

    logger.warn(`[CircuitBreaker:${this.name}] Transição de estado: ${oldState} -> ${newState}`, {
      timestamp: new Date().toISOString()
    });
  }

  public reset() {
    this.transitionTo('CLOSED');
  }
}

// Instância singleton para o Twenty CRM
export const crmCircuitBreaker = new CircuitBreaker('TwentyCRM', {
  failureThreshold: 5,
  cooldownPeriodMs: 30000,
});
