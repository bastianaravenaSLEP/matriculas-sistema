/**
 * Configuración centralizada de endpoints y URLs de la API.
 * Lee desde la variable de entorno Vite (VITE_API_URL) o recurre al valor por defecto local.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
