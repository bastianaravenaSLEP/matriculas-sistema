/**
 * Utilidades para validación de archivos en el cliente (tamaño máximo de 5 MB).
 */
export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export interface ResultadoValidacionArchivo {
  valido: boolean;
  mensaje?: string;
}

/**
 * Valida si un archivo individual cumple con el límite de tamaño permitido.
 */
export function validarTamanoArchivo(
  file: File | null | undefined,
  maxMb: number = MAX_FILE_SIZE_MB
): ResultadoValidacionArchivo {
  if (!file) return { valido: true };

  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    const pesoMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valido: false,
      mensaje: `El archivo "${file.name}" pesa ${pesoMb} MB y supera el tamaño máximo permitido de ${maxMb} MB. Por favor seleccione un archivo más liviano.`
    };
  }

  return { valido: true };
}

/**
 * Valida una lista de archivos (ej: carga masiva).
 * Si alguno supera el límite, retorna el primer error encontrado.
 */
export function validarListaArchivos(
  archivos: FileList | File[],
  maxMb: number = MAX_FILE_SIZE_MB
): ResultadoValidacionArchivo {
  const lista = Array.from(archivos);
  for (const archivo of lista) {
    const res = validarTamanoArchivo(archivo, maxMb);
    if (!res.valido) {
      return res;
    }
  }
  return { valido: true };
}
