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

def crear_visor_colegio(email, nombre, rbd_establecimiento, password_plana="visor123"):
    password_encriptada = pwd_context.hash(password_plana)
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    try:
        # 1. Buscamos el id_establecimiento usando el RBD del colegio
        cur.execute("SELECT id_establecimiento, nombre FROM establecimiento WHERE rbd = %s", (rbd_establecimiento,))
        colegio = cur.fetchone()
        
        if not colegio:
            print(f"❌ Error: No se encontró ningún establecimiento con el RBD '{rbd_establecimiento}' en la BD.")
            return
            
        id_establecimiento_real = colegio[0]
        nombre_colegio = colegio[1]
        
        # 2. Insertamos el usuario vinculado al ID real de ese colegio
        cur.execute("""
            INSERT INTO usuario (email_institucional, nombre, rol, id_establecimiento, activo, password_hash)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (email_institucional) DO UPDATE 
            SET password_hash = EXCLUDED.password_hash, 
                nombre = EXCLUDED.nombre,
                id_establecimiento = EXCLUDED.id_establecimiento;
        """, (email, nombre, "Visualizador_Colegio", id_establecimiento_real, True, password_encriptada))
        
        conn.commit()
        print(f"✅ Usuario Visualizador Colegio creado/actualizado con éxito.")
        print(f"🏫 Colegio: {nombre_colegio} (ID BD: {id_establecimiento_real})")
        print(f"👤 Email: {email}")
        print(f"🔑 Password: {password_plana}")
        print(f"🛡️ Rol: Visualizador_Colegio")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error al crear usuario Visualizador Colegio: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    # --- MODIFICA LOS DATOS AQUÍ ---
    # Asegúrate de colocar un RBD que exista en tu base de datos
    RBD_COLEGIO_EXISTENTE = "1506" 
    
    crear_visor_colegio(
        email="visor.valparaiso@colegioslep.cl",
        nombre="Funcionario Visor Valparaíso",
        rbd_establecimiento=RBD_COLEGIO_EXISTENTE,
        password_plana="visor123"
    )