// Frontend runtime config, read once from Vite's `import.meta.env`.
// Only VITE_-prefixed variables are exposed to client code by Vite.
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'MedAssist AI';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
export const EMERGENCY_NUMBER = import.meta.env.VITE_EMERGENCY_NUMBER || '1122';
