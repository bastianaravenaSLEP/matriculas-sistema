import { cerrarSesionPorExpiracion } from '../utils/auth';

/**
 * Intercepta todas las llamadas `fetch` de la aplicación de manera global.
 * Si el servidor responde con 401 Unauthorized (token inválido o expirado)
 * y la petición no es un intento de login fallido, cierra la sesión
 * y redirige automáticamente al login con el mensaje de expiración.
 */
export function configurarInterceptorFetch() {
  const fetchOriginal = window.fetch;

  window.fetch = async (...args) => {
    const respuesta = await fetchOriginal(...args);

    if (respuesta.status === 401) {
      // Obtener la URL de la petición
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';

      // Si el 401 provino de un intento de login o de rutas públicas (como el verificador o encuestas), no redirigir
      const esRutaPublica = 
        url.includes('/login') || 
        url.includes('/login/google') ||
        url.includes('/documentos/verificar') ||
        url.includes('/encuesta') ||
        window.location.pathname.startsWith('/verificar');

      if (!esRutaPublica) {
        cerrarSesionPorExpiracion();
      }
    }

    return respuesta;
  };
}
