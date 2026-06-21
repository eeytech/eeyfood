import { authConfig } from "./config";

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { headers = {}, ...rest } = options;
  const response = await fetch(`${authConfig.eeycore.baseUrl}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      (body as { message?: string } | null)?.message ??
      `Erro HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const eeycore = {
  withApiKey<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return request<T>(path, {
      ...options,
      headers: {
        ...options.headers,
        "x-api-key": authConfig.eeycore.apiKey,
      },
    });
  },

  withUserToken<T>(
    path: string,
    token: string,
    options: RequestOptions = {},
  ): Promise<T> {
    return request<T>(path, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
