import pandas as pd
import psycopg2

# --- CONFIGURACIÓN DE BASE DE DATOS ---
DB_HOST = "localhost"
DB_NAME = "sistema_matriculas_sleep"
DB_USER = "postgres"
DB_PASS = "admin"  # 🌟 REEMPLAZA CON TU CONTRASEÑA
DB_PORT = "5432"

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        port=DB_PORT
    )

def limpiar_rut(rut_val, dv_val):
    if pd.isna(rut_val):
        return None
    rut_str = str(rut_val).split('.')[0].strip().replace('-', '').replace('.', '')
    if not rut_str or rut_str.lower() in ['nan', 'none', '0']:
        return None
    dv_str = str(dv_val).strip().upper() if not pd.isna(dv_val) else ''
    if dv_str in ['NAN', 'NONE']:
        dv_str = ''
    return f"{rut_str}-{dv_str}" if dv_str else rut_str

def limpiar_texto(val, max_len=None):
    if pd.isna(val):
        return None
    txt = str(val).strip()
    if txt.lower() in ['nan', 'none', '-', '.', 'sin informacion', 'sin información', 'no aplica']:
        return None
    return txt[:max_len] if max_len else txt

def cargar_ficha_salud(excel_path='registro_general_matricula_2026.xlsx'):
    print("Iniciando lectura del archivo Excel para Fichas de Salud...")
    df = pd.read_excel(excel_path)
    df = df.dropna(subset=['rut_est'])
    print(f"Total registros a evaluar: {len(df)}")

    fichas_procesadas = 0

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        for idx, row in df.iterrows():
            if idx > 0 and idx % 1000 == 0:
                print(f"Procesando registro {idx}...")
                conn.commit()

            # 1. Identificar al estudiante en la base de datos
            rut_est = limpiar_rut(row.get('rut_est'), row.get('dv_est'))
            if not rut_est:
                continue

            cur.execute("SELECT id_estudiante FROM estudiante WHERE run_ipe = %s", (rut_est,))
            estudiante = cur.fetchone()
            if not estudiante:
                continue

            id_estudiante = estudiante[0]

            # 2. Extraer y sanear información de salud
            sis_salud = limpiar_texto(row.get('sistema_salud'), 50)
            letra_fon = limpiar_texto(row.get('letra_fonasa'), 50)
            cesfam = limpiar_texto(row.get('cesfam_est'), 150)
            emergencia = limpiar_texto(row.get('centro_salud_emergencias'), 150)
            alergias = limpiar_texto(row.get('alergias_alimentarias'))
            diag_med = limpiar_texto(row.get('diagnostico_medico'), 50)
            medico = limpiar_texto(row.get('medico_tratante'), 150)
            medicamento = limpiar_texto(row.get('medicamento'))
            nee = limpiar_texto(row.get('nee'), 100)
            nee_tipo = limpiar_texto(row.get('nee_tipo'), 100)

            # Si la fila no contiene ningún antecedente médico relevante, no se inserta
            if not any([sis_salud, cesfam, emergencia, alergias, medicamento, diag_med, nee]):
                continue

            # 3. Upsert en ficha_salud
            query = """
                INSERT INTO ficha_salud (
                    id_estudiante, sistema_salud, letra_fonasa, cesfam, centro_emergencia, 
                    alergias, diagnostico_medico, medico_tratante, medicamento, nee, nee_tipo
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id_estudiante) 
                DO UPDATE SET 
                    sistema_salud = EXCLUDED.sistema_salud,
                    letra_fonasa = EXCLUDED.letra_fonasa,
                    cesfam = EXCLUDED.cesfam,
                    centro_emergencia = EXCLUDED.centro_emergencia,
                    alergias = EXCLUDED.alergias,
                    diagnostico_medico = EXCLUDED.diagnostico_medico,
                    medico_tratante = EXCLUDED.medico_tratante,
                    medicamento = EXCLUDED.medicamento,
                    nee = EXCLUDED.nee,
                    nee_tipo = EXCLUDED.nee_tipo,
                    fecha_actualizacion = CURRENT_TIMESTAMP;
            """

            try:
                cur.execute(query, (
                    id_estudiante, sis_salud, letra_fon, cesfam, emergencia, 
                    alergias, diag_med, medico, medicamento, nee, nee_tipo
                ))
                fichas_procesadas += 1
            except Exception as e:
                conn.rollback()
                print(f"Error procesando ficha médica de RUT {rut_est}: {e}")

        conn.commit()
        print("\n=== RESUMEN DE CARGA SALUD ===")
        print(f"Fichas médicas creadas/actualizadas con éxito: {fichas_procesadas}")

    except Exception as e:
        print(f"Error general de ejecución: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    cargar_ficha_salud()