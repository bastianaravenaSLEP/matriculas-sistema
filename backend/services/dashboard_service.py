# services/dashboard_service.py
from fastapi import HTTPException
from database import get_db_connection

def obtener_estadisticas_dashboard_db(establecimiento_id: int = None, anio: int = None):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        filtros_sql = ""
        parametros = []
        
        if establecimiento_id is not None:
            filtros_sql += " AND id_establecimiento = %s"
            parametros.append(establecimiento_id)
            
        if anio is not None:
            filtros_sql += " AND anio_escolar = %s"
            parametros.append(anio)

        cur.execute(f"SELECT DISTINCT anio_escolar FROM matricula WHERE anio_escolar IS NOT NULL {filtros_sql}", tuple(parametros))
        anios_disponibles = [row[0] for row in cur.fetchall()]

        cur.execute(f"SELECT COUNT(*) FROM matricula WHERE estado = 'Activa' {filtros_sql}", tuple(parametros))
        total_activos = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM matricula WHERE estado != 'Activa' {filtros_sql}", tuple(parametros))
        total_inactivos = cur.fetchone()[0]

        cur.execute(f"SELECT nivel_ensenanza, COUNT(*) FROM matricula WHERE estado = 'Activa' {filtros_sql} GROUP BY nivel_ensenanza ORDER BY nivel_ensenanza", tuple(parametros))
        por_nivel = [{"nombre": row[0] or "Sin Nivel", "cantidad": row[1]} for row in cur.fetchall()]

        cur.execute(f"SELECT curso, COUNT(*) FROM matricula WHERE estado = 'Activa' {filtros_sql} GROUP BY curso ORDER BY curso", tuple(parametros))
        por_curso = [{"nombre": row[0] or "Sin Curso", "cantidad": row[1]} for row in cur.fetchall()]

        return {
            "anios_disponibles": anios_disponibles,
            "total_activos": total_activos,
            "total_inactivos": total_inactivos,
            "por_nivel": por_nivel,
            "por_curso": por_curso
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error al generar estadísticas: " + str(e))
    finally:
        cur.close()
        conn.close()