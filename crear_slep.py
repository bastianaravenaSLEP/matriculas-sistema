import psycopg2
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# REEMPLAZA CON TUS CREDENCIALES DE BASE DE DATOS LOCAL
DB_CONFIG = {
    "dbname": "sistema_matriculas_sleep",
    "user": "postgres",
    "password": "admin",
    "host": "localhost",
    "port": "5432"
}

def crear_usuario_slep():
    password_plana = "slep123"
    password_encriptada = pwd_context.hash(password_plana)
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    try:
        # Fíjate que el id_establecimiento se envía como None (NULL)
        cur.execute("""
            INSERT INTO usuario (email_institucional, nombre, rol, id_establecimiento, activo, password_hash)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, ("admin@slep.cl", "Administrador SLEP", "SLEP", None, True, password_encriptada))
        
        conn.commit()
        print("✅ Usuario SLEP creado con éxito.")
        print("Email: admin@slep.cl")
        print("Password: slep123")
    except Exception as e:
        print(f"❌ Error al crear usuario: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    crear_usuario_slep()