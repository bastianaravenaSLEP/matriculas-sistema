from fastapi import APIRouter, HTTPException, Depends
from database import get_db_connection
from security import obtener_usuario_actual

router = APIRouter(prefix="/establecimientos", tags=["Establecimientos Educacionales"])

@router.get("")
def obtener_establecimientos(usuario_actual: dict = Depends(obtener_usuario_actual)):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id_establecimiento, rbd, nombre FROM establecimiento ORDER BY nombre ASC")
        filas = cur.fetchall()
        
        colegios = [{"id_establecimiento": f[0], "rbd": f[1], "nombre": f[2]} for f in filas]
        return colegios
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno de la base de datos")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()