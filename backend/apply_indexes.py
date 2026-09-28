"""
apply_indexes.py
Script de optimización para la creación de índices clave en PostgreSQL.
Garantiza idempotencia (CREATE INDEX IF NOT EXISTS) y mejora el rendimiento
de las consultas más frecuentes (filtros de cursos, bitácora de auditoría, búsquedas de estudiantes y joins).
"""
import sys
import os

backend_path = os.path.dirname(os.path.abspath(__file__))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from database import get_db_connection

INDEXES = [
    # 1. Auditoría: Ordenamiento cronológico y joins con matrículas
    (
        "idx_auditoria_fecha",
        "CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_matricula (fecha_accion DESC);"
    ),
    (
        "idx_auditoria_matricula",
        "CREATE INDEX IF NOT EXISTS idx_auditoria_matricula ON auditoria_matricula (id_matricula);"
    ),
    # 2. Matrícula: Filtros por establecimiento, año y curso (utilizado en la grilla y exportación)
    (
        "idx_matricula_est_anio_curso",
        "CREATE INDEX IF NOT EXISTS idx_matricula_est_anio_curso ON matricula (id_establecimiento, anio_escolar, curso);"
    ),
    # 3. Matrícula: Filtro por estado ('Activa', 'Retirado')
    (
        "idx_matricula_estado",
        "CREATE INDEX IF NOT EXISTS idx_matricula_estado ON matricula (estado);"
    ),
    # 4. Estudiante: Foreign key a apoderado principal (agiliza todos los LEFT JOIN apoderado)
    (
        "idx_estudiante_apoderado",
        "CREATE INDEX IF NOT EXISTS idx_estudiante_apoderado ON estudiante (id_apoderado_principal);"
    )
]

def aplicar_indices():
    conn = get_db_connection()
    cur = conn.cursor()
    resultados = []
    try:
        for nombre, ddl in INDEXES:
            print(f"Aplicando índice: {nombre}...")
            cur.execute(ddl)
            resultados.append((nombre, "OK"))
        conn.commit()
        print("¡Todos los índices fueron aplicados exitosamente!")
        return resultados
    except Exception as e:
        conn.rollback()
        print(f"Error aplicando índices: {e}")
        raise e
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    aplicar_indices()
