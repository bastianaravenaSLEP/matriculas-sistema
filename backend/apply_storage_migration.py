import sys
import os

# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import get_db_connection

def migrate():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        print("Checking table 'matricula' for 'ruta_documento_resolucion'...")
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'matricula' AND column_name = 'ruta_documento_resolucion';
        """)
        exists = cur.fetchone()
        if not exists:
            print("Adding column 'ruta_documento_resolucion' to 'matricula'...")
            cur.execute("""
                ALTER TABLE matricula 
                ADD COLUMN ruta_documento_resolucion VARCHAR(500) NULL;
            """)
            conn.commit()
            print("Successfully added 'ruta_documento_resolucion' to 'matricula'.")
        else:
            print("Column 'ruta_documento_resolucion' already exists.")

        print("Checking table 'apoderado' for 'ruta_documento_tutor'...")
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'apoderado' AND column_name = 'ruta_documento_tutor';
        """)
        exists_tutor = cur.fetchone()
        if not exists_tutor:
            print("Adding column 'ruta_documento_tutor' to 'apoderado'...")
            cur.execute("""
                ALTER TABLE apoderado 
                ADD COLUMN ruta_documento_tutor VARCHAR(500) NULL;
            """)
            conn.commit()
            print("Successfully added 'ruta_documento_tutor' to 'apoderado'.")
        else:
            print("Column 'ruta_documento_tutor' already exists.")

    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
