# crear_admin.py
import psycopg2
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# REEMPLAZA CON TUS CREDENCIALES DE BASE DE DATOS LOCAL
DB_CONFIG = {
    "dbname": "sistema_matriculas_sleep", # Ajusta el nombre de tu BD
    "user": "postgres",
    "password": "admin",
    "host": "localhost",
    "port": "5432"
}

def crear_usuario_prueba():
    password_plana = "admin123"
    password_encriptada = pwd_context.hash(password_plana)
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO usuario (email_institucional, nombre, rol, id_establecimiento, activo, password_hash)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, ("director@colegioprueba.cl", "Director Juan Pérez", "COLEGIO", 1, True, password_encriptada))
        
        conn.commit()
        print("✅ Usuario de prueba creado con éxito.")
        print("Email: director@colegioprueba.cl")
        print("Password: admin123")
    except Exception as e:
        print(f"❌ Error al crear usuario: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    crear_usuario_prueba()