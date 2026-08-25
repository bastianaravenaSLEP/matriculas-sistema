import psycopg2
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DB_CONFIG = {
    "dbname": "sistema_matriculas_sleep",
    "user": "postgres",
    "password": "admin",
    "host": "localhost",
    "port": "5432"
}

def crear_visor_slep(email, nombre, password_plana="visor123"):
    password_encriptada = pwd_context.hash(password_plana)
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    try:
        # El id_establecimiento se envía como None para tener visión global
        cur.execute("""
            INSERT INTO usuario (email_institucional, nombre, rol, id_establecimiento, activo, password_hash)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (email_institucional) DO UPDATE 
            SET password_hash = EXCLUDED.password_hash,
                nombre = EXCLUDED.nombre;
        """, (email, nombre, "Visualizador_SLEP", None, True, password_encriptada))
        
        conn.commit()
        print(f"✅ Usuario Visualizador SLEP creado/actualizado con éxito.")
        print(f"👤 Email: {email}")
        print(f"🔑 Password: {password_plana}")
        print(f"🛡️ Rol: Visualizador_SLEP")
    except Exception as e:
        conn.rollback()
        print(f"❌ Error al crear usuario Visualizador SLEP: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    # --- MODIFICA LOS DATOS AQUÍ ---
    crear_visor_slep(
        email="visor.global@slep.cl",
        nombre="Auditor Visor SLEP",
        password_plana="visor123"
    )