export const env = {
  appName: import.meta.env.VITE_APP_NAME ?? "Eats",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1",
  frontendUrl: import.meta.env.VITE_FRONTEND_URL ?? "http://localhost:3000"
};
