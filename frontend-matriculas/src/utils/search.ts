/**
 * Utilidades para búsqueda flexible y normalización de texto y RUTs.
 */

export const normalizarTexto = (str: any): string => {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes y diacríticos (ej: á -> a, ñ -> n)
    .toLowerCase()
    .trim();
};

export const limpiarRUT = (str: any): string => {
  if (!str) return '';
  return String(str).replace(/[^0-9kK]/g, '').toLowerCase();
};

/**
 * Realiza una búsqueda multitoken / inteligente:
 * - Divide el término buscado en palabras individuales (tokens).
 * - Cada palabra debe estar presente en el conjunto de campos analizados (ej: nombre + apellidos).
 * - Permite buscar "Nombre Apellido", "Apellido Nombre", u omitir segundos nombres.
 * - Soporta búsqueda por RUT con o sin puntos y guión.
 */
export const coincideBusqueda = (
  textoBusqueda: string,
  camposTexto: (string | number | null | undefined)[],
  ruts: (string | null | undefined)[] = []
): boolean => {
  const query = (textoBusqueda || '').trim();
  if (!query) return true;

  // 1. Coincidencia por RUT (si el usuario ingresó algo que parece RUT)
  const queryRutLimpio = limpiarRUT(query);
  if (queryRutLimpio.length >= 2) {
    for (const rut of ruts) {
      if (rut && limpiarRUT(rut).includes(queryRutLimpio)) {
        return true;
      }
    }
  }

  // 2. Coincidencia por palabras (tokens)
  const tokens = normalizarTexto(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  // Unificar todo el texto relevante del registro en una sola cadena normalizada
  const textoConsolidado = [
    ...camposTexto.map(c => normalizarTexto(c)),
    ...ruts.map(r => normalizarTexto(r)),
    ...ruts.map(r => limpiarRUT(r))
  ]
    .filter(Boolean)
    .join(' ');

  // Para considerar coincidencia, TODOS los tokens escritos deben aparecer en el texto consolidado
  return tokens.every(token => textoConsolidado.includes(token));
};
