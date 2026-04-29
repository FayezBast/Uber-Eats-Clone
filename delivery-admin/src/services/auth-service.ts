import { httpClient } from "@/services/http-client";
import type { AdminAuthSession } from "@/lib/auth-storage";

interface BackendUserResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface BackendAuthResponse {
  token: string;
  expires_at?: string;
  user: BackendUserResponse;
}

function mapAuthSession(response: BackendAuthResponse): AdminAuthSession {
  return {
    token: response.token,
    expiresAt: response.expires_at,
    user: {
      id: response.user.id,
      name: response.user.name,
      email: response.user.email,
      role: response.user.role,
      createdAt: response.user.created_at,
      updatedAt: response.user.updated_at
    }
  };
}

export const authService = {
  async login(email: string, password: string) {
    const response = await httpClient.post<BackendAuthResponse>("/auth/login", { email, password });
    return mapAuthSession(response);
  },

  async me() {
    return httpClient.get<{ user: BackendUserResponse }>("/auth/me");
  }
};
