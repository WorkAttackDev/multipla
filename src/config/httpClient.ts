export class HttpError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message = `HTTP ${status}`,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

type Options = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  retry?: {
    maxRetries?: number;
    baseDelay?: number;
  };
};

export function createHttpClient(
  baseURL: string,
  baseHeaders: Record<string, string>,
) {
  return async function request<T>(
    path: string,
    opts: Options = {},
  ): Promise<T> {
    const maxRetries = opts.retry?.maxRetries ?? 3;
    const baseDelay = opts.retry?.baseDelay ?? 1000;
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(new URL(path, baseURL), {
          method: opts.method ?? "GET",
          headers: { ...baseHeaders, ...opts.headers },
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        });

        const NO_BODY_STATUSES = [101, 204, 304];
        const text = NO_BODY_STATUSES.includes(res.status) ? "" : await res.text();
        const data = text ? safeJson(text) : undefined;

        if (!res.ok) {
          if (res.status >= 400 && res.status < 500) {
            throw new HttpError(res.status, data ?? text);
          }
          throw new HttpError(res.status, data ?? text);
        }

        return data as T;
      } catch (error) {
        lastError = error;

        if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
          throw error;
        }

        if (attempt >= maxRetries) {
          throw error;
        }

        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          10_000,
        );

        console.warn(
          `[httpClient] retrying ${opts.method ?? "GET"} ${path} after ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  };
}

const safeJson = (s: string) => {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};
