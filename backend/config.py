import os
from pathlib import Path
from dotenv import load_dotenv

# Ubicar y cargar el archivo .env
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()

# ==============================================================================
# BASE DE DATOS
# ==============================================================================
DB_NAME = os.getenv("DB_NAME", "sistema_matriculas_sleep")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "admin")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_CLIENT_ENCODING = os.getenv("DB_CLIENT_ENCODING", "utf8")

DB_CONFIG = {
    "dbname": DB_NAME,
    "user": DB_USER,
    "password": DB_PASSWORD,
    "host": DB_HOST,
    "port": DB_PORT,
    "client_encoding": DB_CLIENT_ENCODING
}

DB_POOL_MIN = int(os.getenv("DB_POOL_MIN", "2"))
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", "20"))
DB_POOL_TIMEOUT = float(os.getenv("DB_POOL_TIMEOUT", "10.0"))

# ==============================================================================
# SEGURIDAD JWT
# ==============================================================================
SECRET_KEY = os.getenv("SECRET_KEY", "slep_valparaiso_clave_secreta_super_segura")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

# ==============================================================================
# CORREO ELECTRÓNICO (SMTP)
# ==============================================================================
EMAIL_REMITENTE = os.getenv("EMAIL_REMITENTE", "")
PASSWORD_APP = os.getenv("PASSWORD_APP", "")
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))

# ==============================================================================
# FRONTEND Y CORS
# ==============================================================================
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CORS_ORIGINS = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]

# ==============================================================================
# GOOGLE OAUTH
# ==============================================================================
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# ==============================================================================
# ALMACENAMIENTO DE OBJETOS (S3 / CLOUDFLARE R2 / MINIO / LOCAL)
# ==============================================================================
STORAGE_PROVIDER = os.getenv("STORAGE_PROVIDER", "local")  # "s3" o "local"
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", None)       # Ej: https://<id>.r2.cloudflarestorage.com o http://localhost:9000
S3_ACCESS_KEY_ID = os.getenv("S3_ACCESS_KEY_ID", "")
S3_SECRET_ACCESS_KEY = os.getenv("S3_SECRET_ACCESS_KEY", "")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "matriculas-documentos")
S3_REGION_NAME = os.getenv("S3_REGION_NAME", "us-east-1")
STORAGE_LOCAL_DIR = os.getenv("STORAGE_LOCAL_DIR", str(BASE_DIR / "uploads"))
