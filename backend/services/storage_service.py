import os
import io
import logging
from typing import Tuple, Optional
from pathlib import Path
import config

logger = logging.getLogger("storage_service")

# Cliente S3 en caché (singleton lazy)
_s3_client = None

def _get_s3_client():
    global _s3_client
    if _s3_client is None:
        try:
            import boto3
            from botocore.config import Config

            client_kwargs = {
                "service_name": "s3",
                "aws_access_key_id": config.S3_ACCESS_KEY_ID,
                "aws_secret_access_key": config.S3_SECRET_ACCESS_KEY,
                "region_name": config.S3_REGION_NAME or "us-east-1",
                "config": Config(signature_version="s3v4")
            }
            if config.S3_ENDPOINT_URL:
                client_kwargs["endpoint_url"] = config.S3_ENDPOINT_URL

            _s3_client = boto3.client(**client_kwargs)
            logger.info(f"Cliente S3 inicializado correctamente hacia {config.S3_ENDPOINT_URL or 'AWS S3'}")
        except Exception as e:
            logger.error(f"Error al inicializar cliente S3: {e}")
            raise
    return _s3_client

def es_almacenamiento_s3() -> bool:
    """Indica si el sistema está configurado para usar almacenamiento de objetos S3."""
    return (
        config.STORAGE_PROVIDER.lower() == "s3" 
        and bool(config.S3_ACCESS_KEY_ID) 
        and bool(config.S3_SECRET_ACCESS_KEY)
    )

def guardar_archivo(contenido: bytes, clave_objeto: str, content_type: str = "application/pdf") -> str:
    """
    Guarda un archivo binario en el almacenamiento de objetos S3 o en disco local.
    Retorna la clave única del objeto (ej: 'resoluciones/res_15_2026_ab12.pdf').
    """
    # Normalizar separadores a formato web/s3
    clave_objeto = clave_objeto.replace("\\", "/").lstrip("/")

    if es_almacenamiento_s3():
        try:
            s3 = _get_s3_client()
            s3.put_object(
                Bucket=config.S3_BUCKET_NAME,
                Key=clave_objeto,
                Body=contenido,
                ContentType=content_type
            )
            logger.info(f"Archivo subido exitosamente a S3: bucket={config.S3_BUCKET_NAME}, key={clave_objeto}")
            return clave_objeto
        except Exception as e:
            logger.error(f"Fallo al subir archivo a S3 ({e}). Guardando en fallback local...")
            # Fallback a local si S3 experimenta fallas

    # Almacenamiento Local (desarrollo o fallback)
    ruta_base = Path(config.STORAGE_LOCAL_DIR)
    ruta_archivo = ruta_base / Path(clave_objeto)
    ruta_archivo.parent.mkdir(parents=True, exist_ok=True)

    with open(ruta_archivo, "wb") as f:
        f.write(contenido)

    logger.info(f"Archivo guardado localmente en: {ruta_archivo}")
    return clave_objeto

def obtener_url_descarga(clave_objeto: str, expiracion_segundos: int = 1800) -> str:
    """
    Genera una URL para descargar o visualizar el documento.
    - Si es S3: Genera una Presigned URL segura de acceso temporal directo (ej. 30 min).
    - Si es Local: Retorna el endpoint de API local con token o ruta de visualización.
    """
    clave_objeto = clave_objeto.replace("\\", "/").lstrip("/")

    if es_almacenamiento_s3():
        try:
            s3 = _get_s3_client()
            url = s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": config.S3_BUCKET_NAME, "Key": clave_objeto},
                ExpiresIn=expiracion_segundos
            )
            return url
        except Exception as e:
            logger.error(f"Error al generar URL prefirmada S3: {e}")

    # Para almacenamiento local, se sirve a través del backend
    return f"/documentos/archivo/{clave_objeto}"

def obtener_archivo_bytes(clave_objeto: str) -> Tuple[bytes, str, str]:
    """
    Obtiene los bytes del archivo para streaming directo.
    Retorna (contenido_bytes, content_type, nombre_archivo).
    """
    clave_objeto = clave_objeto.replace("\\", "/").lstrip("/")
    nombre_archivo = os.path.basename(clave_objeto)

    if es_almacenamiento_s3():
        try:
            s3 = _get_s3_client()
            resp = s3.get_object(Bucket=config.S3_BUCKET_NAME, Key=clave_objeto)
            contenido = resp["Body"].read()
            content_type = resp.get("ContentType", "application/pdf")
            return contenido, content_type, nombre_archivo
        except Exception as e:
            logger.error(f"Error al leer de S3: {e}")

    # Local
    ruta_archivo = Path(config.STORAGE_LOCAL_DIR) / Path(clave_objeto)
    if not ruta_archivo.exists():
        raise FileNotFoundError(f"El archivo {clave_objeto} no existe en el almacenamiento local.")

    with open(ruta_archivo, "rb") as f:
        contenido = f.read()

    return contenido, "application/pdf", nombre_archivo

def eliminar_archivo(clave_objeto: str) -> bool:
    """Elimina el archivo del almacenamiento."""
    clave_objeto = clave_objeto.replace("\\", "/").lstrip("/")
    if es_almacenamiento_s3():
        try:
            s3 = _get_s3_client()
            s3.delete_object(Bucket=config.S3_BUCKET_NAME, Key=clave_objeto)
            return True
        except Exception as e:
            logger.error(f"Error al eliminar de S3: {e}")
            return False

    ruta_archivo = Path(config.STORAGE_LOCAL_DIR) / Path(clave_objeto)
    if ruta_archivo.exists():
        ruta_archivo.unlink()
        return True
    return False
