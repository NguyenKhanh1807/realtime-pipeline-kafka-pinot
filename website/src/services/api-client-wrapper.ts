/**
 * API Client Wrapper
 * Provides centralized request/response handling with interceptors, retry logic, and error handling
 */

import { log as logger } from '@/src/lib/logger';
import { apiConfig } from '@/src/config';

export interface RequestConfig extends RequestInit {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  retryable?: boolean; // Whether this request should be retried on failure
  skipAuth?: boolean; // Skip adding auth headers
  correlationId?: string; // Optional correlation ID for tracking
}

export interface ResponseInterceptor {
  onSuccess?: (response: Response, config: RequestConfig) => Response | Promise<Response>;
  onError?: (error: Error, config: RequestConfig) => Error | Promise<Error>;
}

export interface RequestInterceptor {
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
}

/**
 * API Client Wrapper Class
 * Wraps fetch with interceptors, retry logic, timeout, and error handling
 */
export class ApiClientWrapper {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private defaultTimeout: number;
  private defaultRetryAttempts: number;
  private defaultRetryDelay: number;

  constructor(
    private baseUrl: string,
    defaultTimeout: number = 10000,
    defaultRetryAttempts: number = 3,
    defaultRetryDelay: number = 1000
  ) {
    this.defaultTimeout = defaultTimeout;
    this.defaultRetryAttempts = defaultRetryAttempts;
    this.defaultRetryDelay = defaultRetryDelay;
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Execute request interceptors
   */
  private async executeRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = { ...config };

    for (const interceptor of this.requestInterceptors) {
      if (interceptor.onRequest) {
        processedConfig = await interceptor.onRequest(processedConfig);
      }
    }

    return processedConfig;
  }

  /**
   * Execute response interceptors
   */
  private async executeResponseInterceptors(
    response: Response,
    config: RequestConfig
  ): Promise<Response> {
    let processedResponse = response;

    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onSuccess) {
        processedResponse = await interceptor.onSuccess(processedResponse, config);
      }
    }

    return processedResponse;
  }

  /**
   * Execute error interceptors
   */
  private async executeErrorInterceptors(
    error: Error,
    config: RequestConfig
  ): Promise<Error> {
    let processedError = error;

    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onError) {
        processedError = await interceptor.onError(processedError, config);
      }
    }

    return processedError;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, response?: Response): boolean {
    // Don't retry on client errors (4xx) except 408, 429
    if (response) {
      if (response.status >= 400 && response.status < 500) {
        return response.status === 408 || response.status === 429;
      }
      // Retry on server errors (5xx)
      return response.status >= 500;
    }
    // Retry on network errors
    return error.name === 'TypeError' || error.name === 'NetworkError';
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T = unknown>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      timeout = this.defaultTimeout,
      retryAttempts = this.defaultRetryAttempts,
      retryDelay = this.defaultRetryDelay,
      retryable = true,
      correlationId,
      ...fetchConfig
    } = config;

    // Build full URL
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    // Execute request interceptors
    const processedConfig = await this.executeRequestInterceptors({
      ...fetchConfig,
      timeout,
      retryAttempts,
      retryDelay,
      retryable,
      correlationId,
    });

    let lastError: Error | null = null;
    let lastResponse: Response | null = null;

    // Retry loop
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Merge abort signal
        const finalConfig: RequestInit = {
          ...processedConfig,
          signal: processedConfig.signal
            ? this.mergeAbortSignals(controller.signal, processedConfig.signal)
            : controller.signal,
        };

        // Make request
        const response = await fetch(url, finalConfig);
        clearTimeout(timeoutId);

        // Execute response interceptors
        const processedResponse = await this.executeResponseInterceptors(
          response,
          processedConfig
        );

        // Check if response is ok
        if (!processedResponse.ok) {
          const errorText = await processedResponse.text().catch(() => processedResponse.statusText);
          const error = new Error(
            `HTTP ${processedResponse.status}: ${errorText || processedResponse.statusText}`
          );
          (error as any).status = processedResponse.status;
          (error as any).response = processedResponse;

          // Check if we should retry
          if (
            attempt < retryAttempts &&
            retryable &&
            this.isRetryableError(error, processedResponse)
          ) {
            lastError = error;
            lastResponse = processedResponse;
            const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
            await this.sleep(delay);
            continue;
          }

          // Execute error interceptors
          const processedError = await this.executeErrorInterceptors(error, processedConfig);
          throw processedError;
        }

        // Parse response
        const contentType = processedResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await processedResponse.json();
          return data as T;
        }

        const text = await processedResponse.text();
        return text as unknown as T;
      } catch (error) {
        const fetchError = error instanceof Error ? error : new Error(String(error));

        // Handle abort/timeout errors
        if (fetchError.name === 'AbortError') {
          const timeoutError = new Error(`Request timeout after ${timeout}ms`);
          timeoutError.name = 'TimeoutError';
          lastError = timeoutError;
        } else {
          lastError = fetchError;
        }

        // Check if we should retry
        if (attempt < retryAttempts && retryable && this.isRetryableError(fetchError)) {
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          await this.sleep(delay);
          continue;
        }

        // Execute error interceptors
        const processedError = await this.executeErrorInterceptors(fetchError, processedConfig);
        throw processedError;
      }
    }

    // If we get here, all retries failed
    if (lastError) {
      throw lastError;
    }

    throw new Error('Request failed after all retry attempts');
  }

  /**
   * Merge multiple abort signals
   */
  private mergeAbortSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    signals.forEach((signal) => {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener('abort', () => controller.abort());
      }
    });

    return controller.signal;
  }

  /**
   * GET request
   */
  async get<T = unknown>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

/**
 * Create API client wrapper with default interceptors
 */
export function createApiClient(
  baseUrl: string,
  timeout?: number,
  retryAttempts?: number,
  retryDelay?: number
): ApiClientWrapper {
  const client = new ApiClientWrapper(baseUrl, timeout, retryAttempts, retryDelay);

  // Add default request interceptor for correlation IDs
  client.addRequestInterceptor({
    onRequest: async (config) => {
      const headers = new Headers(config.headers);

      // Add correlation ID if available
      if (config.correlationId) {
        headers.set('X-Correlation-ID', config.correlationId);
      }

      return {
        ...config,
        headers,
      };
    },
  });

  // Add default response interceptor for logging
  client.addResponseInterceptor({
    onSuccess: async (response, config) => {
      if (process.env.NODE_ENV === 'development' && config.correlationId) {
        logger.info('API request successful', {
          correlationId: config.correlationId,
          metadata: {
            url: response.url,
            status: response.status,
            statusText: response.statusText,
          },
        });
      }
      return response;
    },
    onError: async (error, config) => {
      if (config.correlationId) {
        logger.error('API request failed', error, {
          correlationId: config.correlationId,
          metadata: {
            url: config.url || 'unknown',
          },
        });
      }
      return error;
    },
  });

  return client;
}

