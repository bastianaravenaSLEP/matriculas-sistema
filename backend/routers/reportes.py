from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import json
from database import get_db_connection
from security import obtener_usuario_actual

router = APIRouter(prefix="/reportes", tags=["Reportes y Auditoría SLEP"])

def clasificar_evento(accion: str, datos_ant: any, datos_nuev: any) -> tuple[str, str]:
    """
    Analiza los snapshots JSON de PostgreSQL para determinar 
    el tipo exacto de movimiento y generar una descripción legible.
    """
    ant = json.loads(datos_ant) if isinstance(datos_ant, str) else (datos_ant or {})
    nuev = json.loads(datos_nuev) if isinstance(datos_nuev, str) else (datos_nuev or {})

    if accion == 'INSERT':
        return 'ALTA', 'Nueva matrícula registrada en el sistema.'

    if accion == 'UPDATE':
        # 1. Retiro de estudiante
        if nuev.get('estado') == 'Retirado' and ant.get('estado') != 'Retirado':
            motivo = nuev.get('motivo_retiro') or 'Sin motivo inicial'
            return 'RETIRO', f"Baja de estudiante procesada. Motivo: {motivo}"

        # 2. Cuestionario confidencial completado por el apoderado
        if nuev.get('motivo_retiro') == 'Respuesta Apoderado (Confidencial)' and ant.get('motivo_retiro') != 'Respuesta Apoderado (Confidencial)':
            return 'CUESTIONARIO', 'El apoderado completó el cuestionario de retiro confidencial.'

        # 3. Cambio de curso
        if nuev.get('id_curso') and ant.get('id_curso') and nuev.get('id_curso') != ant.get('id_curso'):
            return 'CAMBIO_CURSO', f"Cambio de curso realizado: Curso #{ant.get('id_curso')} ➔ Curso #{nuev.get('id_curso')}"

        # 4. Actualización general de datos
        campos_modificados = []
        for k in nuev:
            if k in ant and nuev[k] != ant[k] and k not in ['id_usuario_ejecutor', 'fecha_actualizacion']:
                campos_modificados.append(k)
        
        detalle = f"Modificación en campos: {', '.join(campos_modificados)}" if campos_modificados else "Actualización en datos de matrícula."
        return 'ACTUALIZACION', detalle

    return accion, 'Movimiento registrado en la base de datos.'


@router.get("/auditoria-matriculas", summary="Obtener registro largo de auditoría clasificado")
def obtener_auditoria_matriculas(
    establecimiento_id: Optional[int] = None,
    tipo_movimiento: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    rol = usuario_actual.get('rol')
    id_est_usuario = usuario_actual.get('id_establecimiento')

    # --- NUEVO: BLOQUEO DE SEGURIDAD ESTRICTO PARA COLEGIOS ---
    if rol in ['Colegio', 'Visualizador_Colegio']:
        raise HTTPException(
            status_code=403, 
            detail="Acceso Denegado: Su perfil no tiene privilegios para visualizar la auditoría del sistema."
        )
        
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # AQUI REEMPLAZAMOS a.fecha por a.fecha_accion
        query = """
            SELECT 
                a.id_auditoria, 
                a.id_matricula, 
                a.accion, 
                a.fecha_accion, 
                a.id_usuario,
                u.nombre AS nombre_ejecutor,
                a.datos_anteriores, 
                a.datos_nuevos,
                m.id_establecimiento,
                est.nombre AS nombre_establecimiento
            FROM auditoria_matricula a
            LEFT JOIN usuario u ON a.id_usuario = u.id_usuario
            LEFT JOIN matricula m ON a.id_matricula = m.id_matricula
            LEFT JOIN establecimiento est ON m.id_establecimiento = est.id_establecimiento
            WHERE 1=1
        """
        parametros = []

        # Seguridad de acceso por establecimiento
        if rol != 'admin_slep' and rol != 'SLEP':
            if id_est_usuario is not None:
                query += " AND m.id_establecimiento = %s"
                parametros.append(id_est_usuario)
            else:
                return []
        else:
            if establecimiento_id is not None:
                query += " AND m.id_establecimiento = %s"
                parametros.append(establecimiento_id)

        # AQUI TAMBIEN REEMPLAZAMOS a.fecha por a.fecha_accion para los filtros
        if fecha_inicio and fecha_inicio.strip():
            query += " AND a.fecha_accion::date >= %s::date"
            parametros.append(fecha_inicio.strip())

        if fecha_fin and fecha_fin.strip():
            query += " AND a.fecha_accion::date <= %s::date"
            parametros.append(fecha_fin.strip())

        # Y AQUI PARA EL ORDENAMIENTO
        query += " ORDER BY a.fecha_accion DESC LIMIT 300"

        cur.execute(query, tuple(parametros))
        filas = cur.fetchall()

        registros = []
        for f in filas:
            accion_db = f[2]
            datos_ant = f[6]
            datos_nuev = f[7]
            
            tipo_mov, detalle = clasificar_evento(accion_db, datos_ant, datos_nuev)

            if tipo_movimiento and tipo_movimiento.strip() != "":
                if tipo_mov != tipo_movimiento.strip():
                    continue

            registros.append({
                "id_auditoria": f[0],
                "id_matricula": f[1],
                "accion_db": accion_db,
                "tipo_movimiento": tipo_mov,
                "detalle": detalle,
                "fecha": str(f[3]),
                "id_usuario": f[4],
                "nombre_ejecutor": f[5] or "Sistema / Automático",
                "datos_anteriores": datos_ant,
                "datos_nuevos": datos_nuev,
                "id_establecimiento": f[8],
                "nombre_establecimiento": f[9] or "Desconocido"
            })

        return registros

    except Exception as e:
        print(f"Error en auditoría: {e}")
        raise HTTPException(status_code=500, detail=f"Error al consultar la bitácora: {str(e)}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()