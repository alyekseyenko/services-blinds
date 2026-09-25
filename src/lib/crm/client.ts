import { env } from '@/lib/env';
import { crmRetryDelayMs, parseRetryAfterMs } from '@/lib/server/crmRetryDelay';
import { crmCircuitBreaker } from './circuitBreaker';

const TWENTY_API_URL = env.TWENTY_API_URL;
const TWENTY_API_KEY = env.TWENTY_API_KEY;

export class CRMError extends Error {
  constructor(
    public message: string, 
    public originalError?: any,
    public status?: number
  ) {
    super(message);
    this.name = 'CRMError';
  }
}

export interface FetchOptions {
  timeoutMs?: number;
  maxRetries?: number;
  idempotencyKey?: string;
  bypassCircuitBreaker?: boolean;
}

/**
 * Executes a GraphQL request against Twenty CRM with automatic timeout, retry, idempotency and circuit breaker logic.
 */
export async function crmFetch<T>(
  query: string, 
  variables: Record<string, any> = {},
  options: FetchOptions = {}
): Promise<T> {
  if (options.bypassCircuitBreaker) {
    return executeCrmFetch<T>(query, variables, options);
  }

  return crmCircuitBreaker.execute<T>(() => executeCrmFetch<T>(query, variables, options));
}

async function executeCrmFetch<T>(
  query: string, 
  variables: Record<string, any> = {},
  options: FetchOptions = {}
): Promise<T> {
  if (!TWENTY_API_KEY) {
    throw new CRMError('TWENTY_API_KEY is not defined in environment variables');
  }

  const { timeoutMs = 12000, maxRetries = 2, idempotencyKey } = options;
  let attempt = 0;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TWENTY_API_KEY}`,
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${TWENTY_API_URL}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Handle non-JSON or server error responses
      if (!response.ok) {
        // Retry on 5xx server errors or 429 Too Many Requests
        if ((response.status >= 500 || response.status === 429) && attempt <= maxRetries) {
          console.warn(`[CRM Fetch Retry] HTTP ${response.status} na tentativa ${attempt}/${maxRetries}. A tentar novamente...`);
          const retryAfter =
            response.status === 429 ? parseRetryAfterMs(response.headers.get('Retry-After')) : null;
          await new Promise((r) =>
            setTimeout(r, retryAfter ?? crmRetryDelayMs(400, attempt))
          );
          continue;
        }
        throw new CRMError(`HTTP Error: ${response.status} ${response.statusText}`, null, response.status);
      }

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        const errorMsg = result.errors[0]?.message || 'GraphQL Error';
        console.error('[CRM GraphQL Error]', result.errors);
        throw new CRMError(errorMsg, result.errors);
      }

      return result.data as T;
    } catch (error: any) {
      clearTimeout(timer);

      // If aborted due to timeout
      const isTimeout = error.name === 'AbortError';
      const isNetworkError = error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED') || isTimeout;

      // Retry network errors / timeouts
      if (isNetworkError && attempt <= maxRetries) {
        console.warn(`[CRM Network Retry] Falha de ligação (${isTimeout ? 'Timeout' : error.message}) na tentativa ${attempt}/${maxRetries}. A tentar novamente...`);
        await new Promise((r) => setTimeout(r, crmRetryDelayMs(500, attempt)));
        continue;
      }

      if (error instanceof CRMError) throw error;
      throw new CRMError(
        isTimeout ? `Timeout: O CRM demorou mais de ${timeoutMs / 1000}s a responder.` : (error.message || 'Failed to fetch from Twenty CRM'),
        error
      );
    }
  }

  throw new CRMError('Falha de ligação ao Twenty CRM após múltiplas tentativas.');
}

/**
 * Creates a record via Twenty REST API (supports actor metadata like createdBy).
 */
export async function crmRestCreate<T>(
  resource: string,
  body: Record<string, unknown>,
  options: FetchOptions = {}
): Promise<T> {
  if (options.bypassCircuitBreaker) {
    return executeCrmRestCreate<T>(resource, body, options);
  }

  return crmCircuitBreaker.execute<T>(() =>
    executeCrmRestCreate<T>(resource, body, options)
  );
}

async function executeCrmRestCreate<T>(
  resource: string,
  body: Record<string, unknown>,
  options: FetchOptions = {}
): Promise<T> {
  if (!TWENTY_API_KEY) {
    throw new CRMError('TWENTY_API_KEY is not defined in environment variables');
  }

  const { timeoutMs = 12000, maxRetries = 2, idempotencyKey } = options;
  let attempt = 0;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TWENTY_API_KEY}`,
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${TWENTY_API_URL}/rest/${resource}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        if ((response.status >= 500 || response.status === 429) && attempt <= maxRetries) {
          const retryAfter =
            response.status === 429 ? parseRetryAfterMs(response.headers.get('Retry-After')) : null;
          await new Promise((r) =>
            setTimeout(r, retryAfter ?? crmRetryDelayMs(400, attempt))
          );
          continue;
        }
        const errorBody = await response.json().catch(() => null);
        const message =
          errorBody?.messages?.[0] ||
          errorBody?.message ||
          `HTTP Error: ${response.status} ${response.statusText}`;
        throw new CRMError(message, errorBody, response.status);
      }

      const result = await response.json();
      const recordKey = Object.keys(result.data ?? {}).find((key) => key.startsWith('create'));
      const record = recordKey ? result.data[recordKey] : result.data;

      if (!record) {
        throw new CRMError('Resposta inválida do Twenty CRM REST API', result);
      }

      return record as T;
    } catch (error: unknown) {
      clearTimeout(timer);

      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const isNetworkError =
        error instanceof Error &&
        (error.message?.includes('fetch failed') ||
          error.message?.includes('ECONNREFUSED') ||
          isTimeout);

      if (isNetworkError && attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, crmRetryDelayMs(500, attempt)));
        continue;
      }

      if (error instanceof CRMError) throw error;
      throw new CRMError(
        error instanceof Error ? error.message : 'Failed to create record in Twenty CRM',
        error
      );
    }
  }

  throw new CRMError('Falha de ligação ao Twenty CRM após múltiplas tentativas.');
}
