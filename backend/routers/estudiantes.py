from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
from database import get_db_connection
from security import obtener_usuario_actual
from security import obtener_usuario_actual, verificar_escritura

router = APIRouter(prefix="/estudiante", tags=["Estudiantes"])

# 1. ESQUEMA ESTRICTO: Exigimos TODA la info del apoderado y el domicilio del alumno
class ActualizarEstudianteRequest(BaseModel):
    domicilio_estudiante: str
    rut_apoderado: str
    nombres_apoderado: str
    apellido_paterno_apoderado: str
    apellido_materno_apoderado: str
    domicilio_apoderado: str
    telefono_apoderado: str
    correo_apoderado: str

@router.get("")
def obtener_estudiantes(
    establecimiento_id: Optional[int] = None, 
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    rol = usuario_actual.get("rol")
    if rol in ["Colegio", "Visualizador_Colegio"]:
        establecimiento_id = usuario_actual.get("id_establecimiento")       
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        query = """
            SELECT DISTINCT e.id_estudiante, e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno
            FROM estudiante e
            LEFT JOIN matricula m ON e.id_estudiante = m.id_estudiante
            WHERE 1=1
        """
        parametros = []
        
        if establecimiento_id is not None:
            query += " AND m.id_establecimiento = %s"
            parametros.append(establecimiento_id)
            
        query += " ORDER BY e.apellido_paterno ASC"

        cur.execute(query, tuple(parametros))
        filas = cur.fetchall()
        
        estudiantes = [{"id": f[0], "run": f[1], "nombre_completo": f"{f[2]} {f[3]} {f[4] or ''}".strip()} for f in filas]
        return estudiantes

    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno de la base de datos")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@router.get("/{rut}")
def obtener_ficha_estudiante(rut: str, usuario_actual: dict = Depends(obtener_usuario_actual)):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT e.id_estudiante, e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno, e.fecha_nacimiento, e.domicilio,
                   a.rut_pasaporte, a.nombres, a.apellido_paterno, a.apellido_materno, a.telefono, a.correo_electronico
            FROM estudiante e
            LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado
            WHERE e.run_ipe = %s
        """, (rut,))
        estudiante_db = cur.fetchone()

        if not estudiante_db:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado en el sistema RGM.")

        cur.execute("""
            SELECT id_matricula, anio_escolar, nivel_ensenanza, curso, estado, fecha_matricula, observaciones
            FROM matricula WHERE id_estudiante = %s ORDER BY anio_escolar DESC
        """, (estudiante_db[0],))
        historial_db = cur.fetchall()

        respuesta = {
            "personal": {
                "id": estudiante_db[0], "run": estudiante_db[1], "nombres": estudiante_db[2],
                "apellidos": f"{estudiante_db[3]} {estudiante_db[4]}",
                "fecha_nacimiento": str(estudiante_db[5]) if estudiante_db[5] else "No registrada",
                "domicilio": estudiante_db[6] if estudiante_db[6] else "Sin registrar"
            },
            "apoderado": {
                "rut": estudiante_db[7] if estudiante_db[7] else "Sin registrar",
                "nombre": f"{estudiante_db[8]} {estudiante_db[9]} {estudiante_db[10]}" if estudiante_db[8] else "Pendiente",
                "telefono": estudiante_db[11] if estudiante_db[11] else "-",
                "correo": estudiante_db[12] if estudiante_db[12] else "-"
            },
            "historial": [
                {"id": f[0], "anio": f[1], "establecimiento": "Establecimiento SLEP", "curso": f[3], "estado": f[4], 
                 "tipo_movimiento": "Matrícula", "observaciones": f[6] or "Sin observaciones."} 
                for f in historial_db
            ]
        }
        return respuesta
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@router.post("")
def crear_estudiante(payload: dict, usuario_actual: dict = Depends(verificar_escritura)):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        run_apod = payload.get("run_apoderado")
        cur.execute("SELECT id_apoderado FROM apoderado WHERE rut_pasaporte = %s", (run_apod,))
        apod_db = cur.fetchone()
        
        if apod_db:
            id_apoderado = apod_db[0]
        else:
            cur.execute("""
                INSERT INTO apoderado (rut_pasaporte, nombres, apellido_paterno, apellido_materno, domicilio, telefono, correo_electronico)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id_apoderado
            """, (run_apod, payload.get("nombres_apoderado"), payload.get("apellido_paterno_apoderado"), payload.get("apellido_materno_apoderado"), payload.get("domicilio_apoderado"), payload.get("telefono_apoderado"), payload.get("correo_apoderado")))
            id_apoderado = cur.fetchone()[0]

        cur.execute("""
            INSERT INTO estudiante (run_ipe, nombres, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, domicilio, latitud, longitud, id_apoderado_principal)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id_estudiante
        """, (payload.get("run"), payload.get("nombres"), payload.get("apellido_paterno"), payload.get("apellido_materno"), payload.get("fecha_nacimiento"), payload.get("sexo"), payload.get("domicilio"), payload.get("latitud"), payload.get("longitud"), id_apoderado))
        
        nuevo_id_est = cur.fetchone()[0]
        conn.commit()
        return {"mensaje": "Estudiante guardado exitosamente", "id_estudiante": nuevo_id_est}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar: {e}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

# 2. RUTA DE ACTUALIZACIÓN BLINDADA
@router.put("/{rut}")
def actualizar_datos_estudiante(rut: str, req: ActualizarEstudianteRequest, usuario_actual: dict = Depends(verificar_escritura)):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Actualizar estudiante y obtener si tiene apoderado
        cur.execute("UPDATE estudiante SET domicilio = %s WHERE run_ipe = %s RETURNING id_apoderado_principal", 
                    (req.domicilio_estudiante, rut))
        resultado = cur.fetchone()
        
        if not resultado:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
            
        id_apoderado = resultado[0]
        
        if id_apoderado:
            # Si tiene apoderado, actualizamos todos sus datos
            cur.execute("""
                UPDATE apoderado 
                SET rut_pasaporte = %s, nombres = %s, apellido_paterno = %s, apellido_materno = %s, 
                    domicilio = %s, telefono = %s, correo_electronico = %s 
                WHERE id_apoderado = %s
            """, (req.rut_apoderado, req.nombres_apoderado, req.apellido_paterno_apoderado, 
                  req.apellido_materno_apoderado, req.domicilio_apoderado, req.telefono_apoderado, 
                  req.correo_apoderado, id_apoderado))
        else:
            # Si NO TIENE apoderado, insertamos un registro completo y real
            cur.execute("""
                INSERT INTO apoderado (rut_pasaporte, nombres, apellido_paterno, apellido_materno, domicilio, telefono, correo_electronico)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id_apoderado
            """, (req.rut_apoderado, req.nombres_apoderado, req.apellido_paterno_apoderado, 
                  req.apellido_materno_apoderado, req.domicilio_apoderado, req.telefono_apoderado, req.correo_apoderado))
            
            nuevo_id_apoderado = cur.fetchone()[0]
            
            # Vinculamos al estudiante
            cur.execute("UPDATE estudiante SET id_apoderado_principal = %s WHERE run_ipe = %s", 
                        (nuevo_id_apoderado, rut))
        
        conn.commit()
        return {"mensaje": "Datos actualizados exitosamente"}
    except Exception as e:
        conn.rollback()
        print(f"Error BD: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()