# services/estudiante_service.py
from fastapi import HTTPException
from database import get_db_connection
import json

def obtener_estudiantes_db(establecimiento_id: int = None, rol: str = None):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        query = """
            SELECT e.id_estudiante, e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno,
                   m.estado, m.anio_escolar, m.cod_tipo_ensenanza, m.curso
            FROM estudiante e
            LEFT JOIN matricula m ON e.id_estudiante = m.id_estudiante
            WHERE 1=1
        """
        parametros = []
        if establecimiento_id is not None:
            query += " AND m.id_establecimiento = %s"
            parametros.append(establecimiento_id)
            
        query += " ORDER BY e.apellido_paterno ASC, m.anio_escolar DESC"

        cur.execute(query, tuple(parametros))
        filas = cur.fetchall()
        
        estudiantes = [{
            "id": f[0], 
            "run": f[1], 
            "nombre_completo": f"{f[2]} {f[3]} {f[4] or ''}".strip(),
            "estado": f[5] or "Sin Matrícula",
            "anio_escolar": f[6],
            "cod_tipo_ensenanza": f[7],
            "curso": f[8] or "Sin Curso"
        } for f in filas]
        
        return estudiantes
    except Exception as e:
        print(f"Error BD: {e}")
        raise HTTPException(status_code=500, detail="Error interno de la base de datos")
    finally:
        cur.close()
        conn.close()

def obtener_ficha_estudiante_db(rut: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT e.id_estudiante, e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno, e.fecha_nacimiento, e.domicilio,
                   a.rut_pasaporte, a.nombres, a.apellido_paterno, a.apellido_materno, a.telefono, a.correo_electronico,
                   asup.rut_pasaporte, asup.nombres, asup.apellido_paterno, asup.apellido_materno, asup.telefono, asup.correo_electronico,
                   fs.id_ficha, fs.sistema_salud, fs.letra_fonasa, fs.cesfam, fs.centro_emergencia, 
                   fs.alergias, fs.diagnostico_medico, fs.medico_tratante, fs.medicamento, fs.nee, fs.nee_tipo
            FROM estudiante e
            LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado
            LEFT JOIN apoderado asup ON e.id_apoderado_suplente = asup.id_apoderado
            LEFT JOIN ficha_salud fs ON e.id_estudiante = fs.id_estudiante
            WHERE e.run_ipe = %s
        """, (rut,))
        estudiante_db = cur.fetchone()
        
        if not estudiante_db:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado en el sistema RGM.")
            
        cur.execute("""
            SELECT m.id_matricula, m.anio_escolar, m.nivel_ensenanza, m.curso, m.estado, m.fecha_matricula, m.observaciones,
                   est.rbd, est.nombre
            FROM matricula m
            INNER JOIN establecimiento est ON m.id_establecimiento = est.id_establecimiento
            WHERE m.id_estudiante = %s 
            ORDER BY m.anio_escolar DESC, m.fecha_matricula DESC, m.id_matricula DESC
        """, (estudiante_db[0],))
        
        historial_db = cur.fetchall()
        
        ultimo_rbd = historial_db[0][7] if historial_db else "Sin Registro"
        ultimo_colegio = historial_db[0][8] if historial_db else "Sin Registro"

        respuesta = {
            "personal": {
                "id": estudiante_db[0], 
                "run": estudiante_db[1], 
                "nombres": estudiante_db[2],
                "apellidos": f"{estudiante_db[3]} {estudiante_db[4]}",
                "fecha_nacimiento": str(estudiante_db[5]) if estudiante_db[5] else "No registrada",
                "domicilio": estudiante_db[6] if estudiante_db[6] else "Sin registrar",
                "rbd_actual": ultimo_rbd,
                "colegio_actual": ultimo_colegio
            },
            "apoderado": {
                "rut": estudiante_db[7] if estudiante_db[7] else "Sin registrar",
                "nombre": f"{estudiante_db[8] or ''} {estudiante_db[9] or ''} {estudiante_db[10] or ''}".strip() if estudiante_db[8] else "Pendiente",
                "telefono": estudiante_db[11] if estudiante_db[11] else "-",
                "correo": estudiante_db[12] if estudiante_db[12] else "-"
            },
            "apoderado_suplente": {
                "rut": estudiante_db[13],
                "nombre": f"{estudiante_db[14] or ''} {estudiante_db[15] or ''} {estudiante_db[16] or ''}".strip(),
                "telefono": estudiante_db[17] if estudiante_db[17] else "-",
                "correo": estudiante_db[18] if estudiante_db[18] else "-"
            } if estudiante_db[13] else None,
            "salud": {
                "sistema_salud": estudiante_db[20] or "No informado",
                "letra_fonasa": estudiante_db[21] or "-",
                "cesfam": estudiante_db[22] or "No informado",
                "centro_emergencia": estudiante_db[23] or "No informado",
                "alergias": estudiante_db[24] or "",
                "diagnostico_medico": estudiante_db[25] or "No",
                "medico_tratante": estudiante_db[26] or "No informado",
                "medicamento": estudiante_db[27] or "",
                "nee": estudiante_db[28] or "No",
                "nee_tipo": estudiante_db[29] or "No aplica"
            } if estudiante_db[19] is not None else None,
            "historial": [
                {
                    "id": f[0], "anio": f[1], 
                    "establecimiento": f[8], "rbd": f[7], 
                    "curso": f[3], "estado": f[4], 
                    "tipo_movimiento": "Matrícula", "observaciones": f[6] or "Sin observaciones."
                } 
                for f in historial_db
            ]
        }
        return respuesta
    finally:
        cur.close()
        conn.close()

def crear_estudiante_db(payload: dict):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Procesar Apoderado Principal
        run_apod = payload.get("run_apoderado")
        cur.execute("SELECT id_apoderado FROM apoderado WHERE rut_pasaporte = %s", (run_apod,))
        apod_db = cur.fetchone()
        
        if apod_db:
            id_apoderado = apod_db[0]
        else:
            cur.execute("""
                INSERT INTO apoderado (
                    rut_pasaporte, nombres, apellido_paterno, apellido_materno, 
                    domicilio, telefono, correo_electronico, pais_origen, 
                    documento_extranjero, relacion_estudiante, ruta_documento_tutor
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id_apoderado
            """, (run_apod, payload.get("nombres_apoderado"), payload.get("apellido_paterno_apoderado"), 
                  payload.get("apellido_materno_apoderado"), payload.get("domicilio_apoderado"), 
                  payload.get("telefono_apoderado"), payload.get("correo_apoderado"),
                  payload.get("pais_origen_apoderado", "Chile"), payload.get("doc_extranjero_apoderado", None),
                  payload.get("relacion_estudiante", "No Informado"), payload.get("ruta_documento_tutor", None)))
            id_apoderado = cur.fetchone()[0]

        # 2. Procesar Apoderado Suplente (si aplica)
        id_suplente = None
        if payload.get("tiene_suplente") and payload.get("run_suplente"):
            run_sup = payload.get("run_suplente")
            cur.execute("SELECT id_apoderado FROM apoderado WHERE rut_pasaporte = %s", (run_sup,))
            sup_db = cur.fetchone()
            if sup_db:
                id_suplente = sup_db[0]
            else:
                cur.execute("""
                    INSERT INTO apoderado (
                        rut_pasaporte, nombres, apellido_paterno, apellido_materno, 
                        domicilio, telefono, correo_electronico, relacion_estudiante
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id_apoderado
                """, (run_sup, payload.get("nombres_suplente"), payload.get("apellido_paterno_suplente"),
                      payload.get("apellido_materno_suplente"), payload.get("domicilio_suplente") or payload.get("domicilio_apoderado"),
                      payload.get("telefono_suplente"), payload.get("correo_suplente"),
                      payload.get("relacion_suplente") or "Suplente"))
                id_suplente = cur.fetchone()[0]

        # 3. Insertar Estudiante con ambas referencias
        cur.execute("""
            INSERT INTO estudiante (
                run_ipe, nombres, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, 
                domicilio, latitud, longitud, id_apoderado_principal, id_apoderado_suplente, 
                pais_origen, documento_extranjero
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id_estudiante
        """, (payload.get("run"), payload.get("nombres"), payload.get("apellido_paterno"), payload.get("apellido_materno"), 
              payload.get("fecha_nacimiento"), payload.get("sexo"), payload.get("domicilio"), 
              payload.get("latitud"), payload.get("longitud"), id_apoderado, id_suplente,
              payload.get("pais_origen_estudiante", "Chile"), payload.get("doc_extranjero_estudiante", None)))
        
        nuevo_id_est = cur.fetchone()[0]

        # 4. Insertar Ficha de Salud asociada
        cur.execute("""
            INSERT INTO ficha_salud (
                id_estudiante, sistema_salud, letra_fonasa, cesfam, centro_emergencia,
                alergias, diagnostico_medico, medico_tratante, medicamento, nee, nee_tipo
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id_estudiante) DO UPDATE SET
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
        """, (
            nuevo_id_est,
            payload.get("sistema_salud") or "No informado",
            payload.get("letra_fonasa") or "-",
            payload.get("cesfam") or "No informado",
            payload.get("centro_emergencia") or "No informado",
            payload.get("alergias") or "",
            payload.get("diagnostico_medico") or "No",
            payload.get("medico_tratante") or "No informado",
            payload.get("medicamento") or "",
            payload.get("nee") or "No",
            payload.get("nee_tipo") or "No aplica"
        ))

        conn.commit()
        return {"mensaje": "Estudiante guardado exitosamente", "id_estudiante": nuevo_id_est, "run": payload.get("run")}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar: {e}")
    finally:
        cur.close()
        conn.close()

def actualizar_datos_estudiante_db(rut: str, req, id_usuario: int): 
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE estudiante SET domicilio = %s WHERE run_ipe = %s RETURNING id_apoderado_principal", 
                    (req.domicilio_estudiante, rut))
        resultado = cur.fetchone()
        if not resultado:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
            
        id_apoderado = resultado[0]
        if id_apoderado:
            cur.execute("""
                UPDATE apoderado 
                SET rut_pasaporte = %s, nombres = %s, apellido_paterno = %s, apellido_materno = %s, 
                    domicilio = %s, telefono = %s, correo_electronico = %s 
                WHERE id_apoderado = %s
            """, (req.rut_apoderado, req.nombres_apoderado, req.apellido_paterno_apoderado, 
                  req.apellido_materno_apoderado, req.domicilio_apoderado, req.telefono_apoderado, 
                  req.correo_apoderado, id_apoderado))
        else:
            cur.execute("""
                INSERT INTO apoderado (rut_pasaporte, nombres, apellido_paterno, apellido_materno, domicilio, telefono, correo_electronico)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id_apoderado
            """, (req.rut_apoderado, req.nombres_apoderado, req.apellido_paterno_apoderado, 
                  req.apellido_materno_apoderado, req.domicilio_apoderado, req.telefono_apoderado, 
                  req.correo_apoderado))
            nuevo_id_apoderado = cur.fetchone()[0]
            cur.execute("UPDATE estudiante SET id_apoderado_principal = %s WHERE run_ipe = %s", 
                        (nuevo_id_apoderado, rut))
        
        cur.execute("""
            SELECT id_matricula FROM matricula 
            WHERE id_estudiante = (SELECT id_estudiante FROM estudiante WHERE run_ipe = %s)
            ORDER BY id_matricula DESC LIMIT 1
        """, (rut,))
        mat_result = cur.fetchone()

        if mat_result:
            id_matricula = mat_result[0]
            datos_ant = json.dumps({"Ficha_Personal": "Datos Anteriores"})
            datos_nuev = json.dumps({"Ficha_Personal": "Datos Actualizados"})
            cur.execute("""
                INSERT INTO auditoria_matricula (id_matricula, accion, id_usuario, datos_anteriores, datos_nuevos)
                VALUES (%s, 'UPDATE', %s, %s, %s)
            """, (id_matricula, id_usuario, datos_ant, datos_nuev))

        conn.commit()
        return {"mensaje": "Datos actualizados exitosamente"}
    except Exception as e:
        conn.rollback()
        print(f"Error BD: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()