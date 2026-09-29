"""
Script de Simulación de Carga y Transición Académica (Año 2027)
Establecimiento: Colegio Insular Robinson Crusoe (ID: 56, RBD: 2009)
Todos los datos creados quedan etiquetados con [SIMULACION_2027] para permitir su eliminación instantánea.
"""
import os
import sys
from pathlib import Path
from datetime import date, datetime

# Permitir importaciones del backend
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from database import get_db_connection

TAG_SIMULACION = "[SIMULACION_2027]"
ANIO_ORIGEN = 2026
ANIO_DESTINO = 2027
ID_ESTABLECIMIENTO = 56
RBD_ESTABLECIMIENTO = 2009

MAPA_PROMOCION = {
    '1er nivel de Transición (Pre-kinder) A': {
        'nuevo_curso': '2° nivel de Transición (Kinder) A',
        'nivel': 'Educación Parvularia',
        'tipo': 10,
        'grado': 2
    },
    '2° nivel de Transición (Kinder) A': {
        'nuevo_curso': '1° básico A',
        'nivel': 'Educación Básica',
        'tipo': 110,
        'grado': 1
    },
    '1° básico A': {
        'nuevo_curso': '2° básico A',
        'nivel': 'Educación Básica',
        'tipo': 110,
        'grado': 2
    },
    '2° básico A': {
        'nuevo_curso': '3° básico A',
        'nivel': 'Educación Básica',
        'tipo': 110,
        'grado': 3
    },
    '3° básico A': {
        'nuevo_curso': '4° básico A',
        'nivel': 'Educación Básica',
        'tipo': 110,
        'grado': 4
    },
    '4° básico A': {
        'nuevo_curso': '5° básico A',
        'nivel': 'Educación Básica',
        'tipo': 110,
        'grado': 5
    },
    '5° básico A': {
        'nuevo_curso': '6° básico A',
        'nivel': 'Educación Básica',
        'tipo': 110,
        'grado': 6
    },
    '6° básico A': {
        'nuevo_curso': '7° básico A',
        'nivel': 'Educación Básica',
        'tipo': 110,
        'grado': 7
    },
    '7° básico A': {
        'nuevo_curso': '8° básico A',
        'nivel': 'Educación Básica',
        'tipo': 110,
        'grado': 8
    },
    '8° básico A': {
        'nuevo_curso': '1° medio A',
        'nivel': 'Educación Media',
        'tipo': 310,
        'grado': 1
    },
    '1° medio A': {
        'nuevo_curso': '2° medio A',
        'nivel': 'Educación Media',
        'tipo': 310,
        'grado': 2
    },
    '2° medio A': {
        'nuevo_curso': '3° medio A',
        'nivel': 'Educación Media',
        'tipo': 310,
        'grado': 3
    },
    '3° medio A': {
        'nuevo_curso': '4° medio A',
        'nivel': 'Educación Media',
        'tipo': 310,
        'grado': 4
    }
}

ALUMNOS_NUEVOS_PREKINDER = [
    ("TEST-2027-01", "Matías Alonso", "González", "Pérez", "Masculino", "2023-04-12", "Calle El Palomar 12"),
    ("TEST-2027-02", "Sofía Florencia", "Muñoz", "Rojas", "Femenino", "2023-02-18", "Av. San Juan Bautista 45"),
    ("TEST-2027-03", "Joaquín Ignacio", "Reyes", "Contreras", "Masculino", "2023-06-05", "Sector Bahía Cumberland s/n"),
    ("TEST-2027-04", "Valentina Paz", "Morales", "López", "Femenino", "2023-01-20", "Pasaje Los Pescadores 8"),
    ("TEST-2027-05", "Benjamín Andrés", "Silva", "Hernández", "Masculino", "2023-08-14", "Calle La Pólvora 22"),
    ("TEST-2027-06", "Emma Trinidad", "Castro", "Fuentes", "Femenino", "2023-03-30", "Av. El Centinela 102"),
    ("TEST-2027-07", "Lucas Gabriel", "Torres", "Salazar", "Masculino", "2023-05-19", "Subida El Mirador 4"),
    ("TEST-2027-08", "Isabella Catalina", "Díaz", "Alarcón", "Femenino", "2023-09-02", "Camino Al Faro 31"),
    ("TEST-2027-09", "Agustín Emilio", "Araya", "Villarroel", "Masculino", "2023-07-11", "Sector Plazoleta s/n"),
    ("TEST-2027-10", "Mia Amanda", "Vergara", "Bravo", "Femenino", "2023-11-25", "Av. San Juan Bautista 88")
]

def ejecutar_simulacion():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Verificar si ya existe una simulación previa
        cur.execute("""
            SELECT COUNT(*) FROM matricula 
            WHERE id_establecimiento = %s AND anio_escolar = %s AND observaciones LIKE %s
        """, (ID_ESTABLECIMIENTO, ANIO_DESTINO, f"%{TAG_SIMULACION}%"))
        existentes = cur.fetchone()[0]
        if existentes > 0:
            print(f"⚠️ Ya existen {existentes} matrículas de prueba para el año {ANIO_DESTINO}.")
            print("Ejecuta primero 'python eliminar_carga_transicion.py' si deseas reiniciar la prueba.")
            return

        print(f"🚀 Iniciando simulación de transición de año {ANIO_ORIGEN} ➔ {ANIO_DESTINO}...")
        print(f"Colegio: Robinson Crusoe (ID {ID_ESTABLECIMIENTO}, RBD {RBD_ESTABLECIMIENTO})\n")

        # 2. Replicar Capacidades en capacidad_oferta para el año 2027
        cur.execute("""
            INSERT INTO capacidad_oferta (rbd, anio_escolar, nivel_str, capacidad_sala)
            SELECT rbd, %s, nivel_str, capacidad_sala
            FROM capacidad_oferta
            WHERE rbd = %s AND anio_escolar = %s
            ON CONFLICT DO NOTHING
        """, (ANIO_DESTINO, RBD_ESTABLECIMIENTO, ANIO_ORIGEN))
        print("✅ Capacidades de sala replicadas para el año 2027 en 'capacidad_oferta'.")

        # 3. Obtener alumnos activos del 2026 para promoverlos
        cur.execute("""
            SELECT id_matricula, id_estudiante, curso
            FROM matricula
            WHERE id_establecimiento = %s AND anio_escolar = %s AND estado = 'Activa'
            ORDER BY id_matricula ASC
        """, (ID_ESTABLECIMIENTO, ANIO_ORIGEN))
        matriculas_2026 = cur.fetchall()
        print(f"📋 Alumnos activos encontrados en 2026: {len(matriculas_2026)}")

        # 4. Insertar alumnos nuevos para Pre-kinder 2027
        alumnos_nuevos_ids = []
        for run_ipe, nombres, pat, mat, sexo, f_nac, dom in ALUMNOS_NUEVOS_PREKINDER:
            cur.execute("""
                INSERT INTO estudiante (
                    run_ipe, nombres, apellido_paterno, apellido_materno, 
                    sexo, fecha_nacimiento, domicilio
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id_estudiante
            """, (run_ipe, nombres, pat, mat, sexo, f_nac, dom))
            nuevo_id = cur.fetchone()[0]
            alumnos_nuevos_ids.append(nuevo_id)
        print(f"✅ {len(alumnos_nuevos_ids)} nuevos estudiantes registrados para Pre-kinder 2027.")

        # 5. Generar matrículas de 2027
        correlativo = 1
        matriculas_creadas = 0
        desglose_cursos = {}

        # 5.1 Matricular a los nuevos de Pre-kinder
        for id_est in alumnos_nuevos_ids:
            cur.execute("""
                INSERT INTO matricula (
                    numero_correlativo, anio_escolar, id_estudiante, id_establecimiento,
                    fecha_matricula, nivel_ensenanza, curso, estado,
                    cod_tipo_ensenanza, cod_grado, letra_curso, es_excedente,
                    id_usuario_ejecutor, metodo_firma, estado_firma, observaciones
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                correlativo, ANIO_DESTINO, id_est, ID_ESTABLECIMIENTO,
                date(2027, 3, 1), 'Educación Parvularia', '1er nivel de Transición (Pre-kinder) A',
                'Activa', 10, 1, 'A', False,
                1, 'Digital', 'Firmada', f"{TAG_SIMULACION} Matrícula nueva de ingreso a Pre-kinder"
            ))
            desglose_cursos['1er nivel de Transición (Pre-kinder) A'] = desglose_cursos.get('1er nivel de Transición (Pre-kinder) A', 0) + 1
            correlativo += 1
            matriculas_creadas += 1

        # 5.2 Promover a los alumnos del 2026 al curso siguiente en 2027
        for idx, (id_mat_old, id_est, curso_old) in enumerate(matriculas_2026):
            if curso_old in MAPA_PROMOCION:
                promo = MAPA_PROMOCION[curso_old]
                
                # Variar estados realistas: algunos activos, un par de retirados y 1 excedente
                estado = 'Activa'
                f_ret = None
                mot_ret = None
                es_excedente = False
                res_num = None

                if idx == 12:
                    estado = 'Retirado'
                    f_ret = date(2027, 4, 15)
                    mot_ret = 'Cambio de domicilio / Región continental'
                elif idx == 28:
                    estado = 'Pendiente Retiro'
                elif idx == 45:
                    es_excedente = True
                    res_num = '[ADMINISTRATIVA] N° 777/2027 - Sobre cupo extraordinario'

                cur.execute("""
                    INSERT INTO matricula (
                        numero_correlativo, anio_escolar, id_estudiante, id_establecimiento,
                        fecha_matricula, nivel_ensenanza, curso, estado,
                        cod_tipo_ensenanza, cod_grado, letra_curso,
                        fecha_retiro, motivo_retiro,
                        es_excedente, numero_resolucion_excedente,
                        id_usuario_ejecutor, metodo_firma, estado_firma, observaciones
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    correlativo, ANIO_DESTINO, id_est, ID_ESTABLECIMIENTO,
                    date(2027, 3, 1), promo['nivel'], promo['nuevo_curso'], estado,
                    promo['tipo'], promo['grado'], 'A',
                    f_ret, mot_ret,
                    es_excedente, res_num,
                    1, 'Digital', 'Firmada', f"{TAG_SIMULACION} Promoción regular desde {curso_old}"
                ))
                desglose_cursos[promo['nuevo_curso']] = desglose_cursos.get(promo['nuevo_curso'], 0) + 1
                correlativo += 1
                matriculas_creadas += 1
            else:
                # Alumnos de 4° medio 2026 que egresaron (no se matriculan en 2027)
                pass

        conn.commit()
        print("\n" + "="*60)
        print("🎉 ¡SIMULACIÓN DE CARGA GENERADA EXITOSAMENTE!")
        print("="*60)
        print(f"• Total matrículas creadas para {ANIO_DESTINO}: {matriculas_creadas}")
        print("• Distribución por curso promovido:")
        for c, cant in sorted(desglose_cursos.items()):
            print(f"   - {c}: {cant} estudiantes")
        print("\n📌 ¿Qué puedes revisar en la plataforma?")
        print("1. En 'Panel de Control / Inicio': Selecciona el año 2027 en el filtro.")
        print("2. En 'Matrículas': Filtra por año 2027 y revisa la ocupación de salas y la lista.")
        print("3. En 'Estudiantes': Abre la ficha de cualquiera de estos alumnos y verás 2027 arriba en su historial.")
        print("\n🗑️ Para eliminar esta simulación cuando termines:")
        print("   Ejecuta: python scripts/eliminar_carga_transicion.py")
        print("="*60)

    except Exception as e:
        conn.rollback()
        print(f"❌ Error al ejecutar simulación: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    ejecutar_simulacion()
