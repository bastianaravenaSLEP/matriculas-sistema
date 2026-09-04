# services/establecimiento_service.py
from fastapi import HTTPException
from database import get_db_connection

def obtener_establecimientos_db():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id_establecimiento, rbd, nombre FROM establecimiento ORDER BY nombre ASC")
        filas = cur.fetchall()
        
        colegios = [{"id_establecimiento": f[0], "rbd": f[1], "nombre": f[2]} for f in filas]
        return colegios
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno de la base de datos")
    finally:
        cur.close()
        conn.close()