/**
 * Utilidades para manejo de tokens JWT y expiración de sesión.
 */

export interface TokenPayload {
  sub?: string;
  id_usuario?: number;
  rol?: string;
  id_establecimiento?: number;
  exp?: number;
  [key: string]: any;
}

/**
 * Descodifica el payload de un token JWT sin bibliotecas externas.
 */
export function descodificarToken(token: string | null): TokenPayload | null {
  if (!token) return null;
  try {
    const partes = token.split('.');
    if (partes.length !== 3) return null;
    const base64Url = partes[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Verifica si el token existe y si ya expiró (con margen de 3 segundos de tolerancia).
 */
export function esTokenExpirado(token: string | null): boolean {
  if (!token) return true;
  const payload = descodificarToken(token);
  if (!payload || !payload.exp) return true;
  // exp viene en segundos UNIX; Date.now() en milisegundos
  const tiempoExpiracionMs = payload.exp * 1000;
  return Date.now() >= tiempoExpiracionMs - 3000;
}

/**
 * Retorna los milisegundos restantes antes de que expire el token.
 * Si ya expiró o no es válido, retorna 0.
 */
export function obtenerTiempoRestanteMs(token: string | null): number {
  if (!token) return 0;
  const payload = descodificarToken(token);
  if (!payload || !payload.exp) return 0;
  const tiempoRestante = payload.exp * 1000 - Date.now();
  return Math.max(0, tiempoRestante);
}

/**
 * Cierra la sesión en el almacenamiento local y redirige al login con motivo de expiración.
 */
export function cerrarSesionPorExpiracion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login?motivo=expirado';
  }
}
