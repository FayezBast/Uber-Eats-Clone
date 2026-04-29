import { env } from "@/lib/env";
import { readAdminAuthToken } from "@/lib/auth-storage";

class HttpClient {
  constructor(private readonly baseUrl: string) {}

  async get<T>(path: string) {
    const headers = this.buildHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers,
      cache: "no-store"
    });

    await this.assertOk(response);

    return (await response.json()) as T;
  }

  async post<T>(path: string, body?: unknown, method: "POST" | "PATCH" | "PUT" | "DELETE" = "POST") {
    const headers = this.buildHeaders();
    headers.set("Content-Type", "application/json");

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    await this.assertOk(response);

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private buildHeaders() {
    const headers = new Headers();
    const token = readAdminAuthToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  }

  private async assertOk(response: Response) {
    if (response.ok) {
      return;
    }

    let message = `Request failed with ${response.status}`;

    try {
      const payload = (await response.json()) as { error?: string; message?: string };
      message = payload.error ?? payload.message ?? message;
    } catch {
      // Keep the generic error if the backend did not return JSON.
    }

    throw new Error(message);
  }
}

export const httpClient = new HttpClient(env.apiBaseUrl);
