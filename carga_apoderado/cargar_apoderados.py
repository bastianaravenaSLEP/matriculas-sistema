import pandas as pd
import psycopg2

# --- CONFIGURACIÓN DE BASE DE DATOS ---
DB_HOST = "localhost"
DB_NAME = "sistema_matriculas_sleep"
DB_USER = "postgres"
DB_PASS = "admin" # PON TU CONTRASEÑA AQUÍ
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

def limpiar_texto(val):
    if pd.isna(val):
        return None
    txt = str(val).strip()
    return None if txt.lower() in ['nan', 'none', '-', ''] else txt

def separar_nombre_apellidos(nombre_completo):
    if not nombre_completo:
        return None, None, None
    
    partes = nombre_completo.split()
    if len(partes) >= 3:
        nombres = " ".join(partes[:-2])
        ap_paterno = partes[-2]
        ap_materno = partes[-1]
    elif len(partes) == 2:
        nombres = partes[0]
        ap_paterno = partes[1]
        ap_materno = ""
    else:
        nombres = nombre_completo
        ap_paterno = ""
        ap_materno = ""
        
    # Prevenir que excedan los 100 caracteres de tu base de datos
    return nombres[:100], ap_paterno[:100], ap_materno[:100]

def procesar_apoderado(conn, cur, rut_completo, nombre_completo, telefono, correo):
    if not rut_completo or not nombre_completo:
        return None
        
    nombres, ap_paterno, ap_materno = separar_nombre_apellidos(nombre_completo)
    
    # 🌟 SOLUCIÓN: Limpiar y cortar el teléfono a 20 caracteres máximo
    tel = str(telefono).split('.')[0].strip() if not pd.isna(telefono) else None
    if tel and tel.lower() not in ['nan', 'none']:
        tel = tel[:20] 
    else:
        tel = None

    # Cortar correo a 100 caracteres por precaución
    correo = correo[:100] if correo else None
    
    query = """
        INSERT INTO apoderado (rut_pasaporte, nombres, apellido_paterno, apellido_materno, telefono, correo_electronico, domicilio)
        VALUES (%s, %s, %s, %s, %s, %s, 'DOMICILIO PENDIENTE')
        ON CONFLICT (rut_pasaporte) 
        DO UPDATE SET 
            nombres = EXCLUDED.nombres,
            apellido_paterno = EXCLUDED.apellido_paterno,
            apellido_materno = EXCLUDED.apellido_materno,
            telefono = COALESCE(EXCLUDED.telefono, apoderado.telefono),
            correo_electronico = COALESCE(EXCLUDED.correo_electronico, apoderado.correo_electronico)
        RETURNING id_apoderado;
    """
    
    try:
        cur.execute(query, (rut_completo, nombres, ap_paterno, ap_materno, tel, correo))
        resultado = cur.fetchone()
        if resultado:
            return resultado[0]
    except Exception as e:
        # 🌟 SOLUCIÓN: Limpiar la transacción abortada de PostgreSQL para poder seguir trabajando
        conn.rollback()
        
        # Recuperamos el ID si ya existía y el ON CONFLICT falló por otra razón
        try:
            cur.execute("SELECT id_apoderado FROM apoderado WHERE rut_pasaporte = %s", (rut_completo,))
            resultado = cur.fetchone()
            if resultado:
                return resultado[0]
        except Exception:
            conn.rollback()
            return None
            
    return None

def importar_apoderados(excel_path='registro_general_matricula_2026.xlsx'):
    print("Iniciando lectura de Excel...")
    df = pd.read_excel(excel_path)
    print(f"Total registros en Excel: {len(df)}")

    df = df.dropna(subset=['rut_est'])

    titulares_procesados = 0
    suplentes_procesados = 0
    estudiantes_actualizados = 0

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        for idx, row in df.iterrows():
            if idx > 0 and idx % 500 == 0:
                print(f"Procesando fila {idx}...")
                conn.commit()

            rut_est = limpiar_rut(row.get('rut_est'), row.get('dv_est'))
            if not rut_est:
                continue

            cur.execute("SELECT id_estudiante FROM estudiante WHERE run_ipe = %s", (rut_est,))
            estudiante = cur.fetchone()
            if not estudiante:
                continue
                
            id_estudiante = estudiante[0]
            id_titular = None
            id_suplente = None

            # Procesar Apoderado Titular
            rut_tit = limpiar_rut(row.get('rut_apoderado_titular'), row.get('dv_apoderado_titular'))
            nom_tit = limpiar_texto(row.get('nombre_completo_apoderado_titular'))
            tel_tit = row.get('telefono_apoderado_titular')
            mail_tit = limpiar_texto(row.get('correo_electronico_apoderado_titular'))

            if rut_tit and nom_tit:
                id_titular = procesar_apoderado(conn, cur, rut_tit, nom_tit, tel_tit, mail_tit)
                if id_titular:
                    titulares_procesados += 1

            # Procesar Apoderado Suplente
            rut_sup = limpiar_rut(row.get('rut_apoderado_suplente'), row.get('dv_apoderado_suplente'))
            nom_sup = limpiar_texto(row.get('nombre_completo_apoderado_suplente'))
            tel_sup = row.get('telefono_apoderado_suplente')
            mail_sup = limpiar_texto(row.get('correo_electronico_apoderado_suplente'))

            if rut_sup and nom_sup:
                id_suplente = procesar_apoderado(conn, cur, rut_sup, nom_sup, tel_sup, mail_sup)
                if id_suplente:
                    suplentes_procesados += 1

            # Vincular a estudiante
            if id_titular or id_suplente:
                update_query = "UPDATE estudiante SET "
                params = []
                
                if id_titular:
                    update_query += "id_apoderado_principal = %s "
                    params.append(id_titular)
                    
                if id_suplente:
                    if id_titular:
                        update_query += ", "
                    update_query += "id_apoderado_suplente = %s "
                    params.append(id_suplente)
                    
                update_query += "WHERE id_estudiante = %s"
                params.append(id_estudiante)
                
                try:
                    cur.execute(update_query, tuple(params))
                    estudiantes_actualizados += 1
                except Exception:
                    conn.rollback()

        conn.commit()
        print("\n=== RESUMEN DE CARGA EXITOSA ===")
        print(f"Apoderados Titulares creados/actualizados: {titulares_procesados}")
        print(f"Apoderados Suplentes creados/actualizados: {suplentes_procesados}")
        print(f"Estudiantes vinculados a sus apoderados: {estudiantes_actualizados}")

    except Exception as e:
        print(f"Error grave durante la ejecución: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    importar_apoderados()