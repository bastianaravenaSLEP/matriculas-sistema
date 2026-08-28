from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
import io
import pandas as pd
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import smtplib
from email.message import EmailMessage
from pydantic import BaseModel
import textwrap
import hashlib
from datetime import datetime
from database import get_db_connection
from security import obtener_usuario_actual
from schemas import MatriculaCreate, MatriculaUpdate, CuestionarioRetiro
from security import obtener_usuario_actual, verificar_escritura
from typing import List
from fastapi import File, UploadFile

router = APIRouter(prefix="/matriculas", tags=["Matrículas"])

# Función auxiliar (Uso Interno)
def determinar_nivel_backend(curso_str: str, cod_tipo: int) -> str:
    texto = str(curso_str).lower() if curso_str else ""
    if 'básico' in texto or 'basico' in texto: return 'Educación Básica'
    if 'medio' in texto or 'media' in texto: return 'Educación Media'
    if 'kinder' in texto or 'kínder' in texto or 'parvularia' in texto or 'medio mayor' in texto or 'medio menor' in texto: return 'Educación Parvularia'
    
    if cod_tipo == 10: return 'Educación Parvularia'
    if cod_tipo and 110 <= cod_tipo <= 119: return 'Educación Básica'
    if cod_tipo and cod_tipo >= 300: return 'Educación Media'
    return 'Educación Básica'

# 1. Función de envío mejorada (ahora devuelve si tuvo éxito o no)
def enviar_correo_retiro(correo_destino: str, id_matricula: int, nombre_alumno: str, pdf_buffer: io.BytesIO = None) -> tuple[bool, str]:
    EMAIL_REMITENTE = "basti.aravena2001@gmail.com"
    PASSWORD_APP = "kaea ccqf qyjd nedu"
    msg = EmailMessage()
    msg['Subject'] = 'Importante: Certificado y Cuestionario de Retiro Escolar SLEP'
    msg['From'] = EMAIL_REMITENTE
    msg['To'] = correo_destino
    link_cuestionario = f"http://localhost:5173/encuesta-retiro/{id_matricula}"
    
    # Nuevo cuerpo del correo mencionando el adjunto
    cuerpo_correo = (
        f"Estimado Apoderado,\n\n"
        f"Se ha registrado oficialmente el retiro del estudiante {nombre_alumno} de nuestro establecimiento.\n\n"
        f"📄 Adjunto a este correo encontrará el Certificado de Retiro validado por el sistema.\n\n"
        f"Para finalizar el proceso, es obligatorio que ingrese al siguiente enlace para completar el cuestionario de retiro:\n"
        f"{link_cuestionario}\n\n"
        f"Atentamente,\nSistema RGM - SLEP Valparaíso"
    )
    msg.set_content(cuerpo_correo)
    
    # 🌟 Magia para adjuntar el PDF generado
    if pdf_buffer:
        pdf_buffer.seek(0)
        msg.add_attachment(
            pdf_buffer.read(), 
            maintype='application', 
            subtype='pdf', 
            filename=f"Certificado_Retiro_{nombre_alumno.replace(' ', '_')}.pdf"
        )

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_REMITENTE, PASSWORD_APP)
            smtp.send_message(msg)
        return True, "Correo con certificado enviado correctamente."
    except Exception as e:
        error_msg = str(e)
        print(f"No se pudo enviar el correo: {error_msg}")
        return False, error_msg
def enviar_correo_cambio_curso(correo_destino: str, id_matricula: int, nombre_alumno: str, nuevo_curso: str, pdf_buffer: io.BytesIO = None) -> tuple[bool, str]:
    EMAIL_REMITENTE = "basti.aravena2001@gmail.com"
    PASSWORD_APP = "kaea ccqf qyjd nedu"
    msg = EmailMessage()
    msg['Subject'] = 'Importante: Comprobante y Formulario de Traslado de Curso'
    msg['From'] = EMAIL_REMITENTE
    msg['To'] = correo_destino
    
    # Enlace hacia la futura pantalla que crearás en React
    link_cuestionario = f"http://localhost:5173/encuesta-cambio-curso/{id_matricula}"
    
    cuerpo_correo = (
        f"Estimado Apoderado,\n\n"
        f"Se ha registrado exitosamente el traslado interno del estudiante {nombre_alumno} hacia el curso {nuevo_curso}.\n\n"
        f"📄 Adjunto a este correo encontrará el Comprobante de Traslado validado por el sistema.\n\n"
        f"Para finalizar el proceso normativo, es obligatorio que ingrese al siguiente enlace para indicar el motivo por el cual solicitó este cambio de curso:\n"
        f"{link_cuestionario}\n\n"
        f"Atentamente,\nSistema RGM - SLEP Valparaíso"
    )
    msg.set_content(cuerpo_correo)
    
    if pdf_buffer:
        pdf_buffer.seek(0)
        msg.add_attachment(
            pdf_buffer.read(), 
            maintype='application', 
            subtype='pdf', 
            filename=f"Traslado_Curso_{nombre_alumno.replace(' ', '_')}.pdf"
        )

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_REMITENTE, PASSWORD_APP)
            smtp.send_message(msg)
        return True, "Correo de traslado enviado correctamente."
    except Exception as e:
        return False, str(e)
    
@router.get("")
def obtener_matriculas(establecimiento_id: Optional[int] = None, usuario_actual: dict = Depends(obtener_usuario_actual)):
    rol = usuario_actual.get("rol")
    
    # REGLA DE SEGURIDAD: Si es perfil de colegio, forzamos la consulta a su propio colegio
    if rol in ["Colegio", "Visualizador_Colegio"]:
        establecimiento_id = usuario_actual.get("id_establecimiento")
        
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        query = """
            SELECT m.id_matricula, m.numero_correlativo, m.nivel_ensenanza, m.curso, m.fecha_matricula, m.estado,
                   e.run_ipe, e.nombres, e.apellido_paterno, a.rut_pasaporte, a.nombres, a.apellido_paterno,
                   m.anio_escolar, cte.descripcion, est.rbd, m.cod_tipo_ensenanza, m.id_establecimiento
            FROM matricula m
            INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante
            LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado
            LEFT JOIN catalogo_tipo_ensenanza cte ON m.cod_tipo_ensenanza = cte.codigo
            INNER JOIN establecimiento est ON m.id_establecimiento = est.id_establecimiento
            WHERE 1=1
        """
        parametros = []
        if establecimiento_id is not None:
            query += " AND m.id_establecimiento = %s"
            parametros.append(establecimiento_id)
            
        query += " ORDER BY m.id_matricula DESC"
        cur.execute(query, tuple(parametros))
        
        matriculas = [{
            "id_matricula": f[0], "numero_correlativo": f[1], "nivel_ensenanza": f[2], "curso": f[3],
            "fecha_matricula": str(f[4]), "estado": f[5], "estudiante_rut": f[6], "estudiante_nombre": f"{f[7]} {f[8]}".strip(),
            "apoderado_rut": f[9] or "Sin registro", "apoderado_nombre": f"{f[10]} {f[11]}".strip() if f[10] else "Pendiente",
            "anio_escolar": f[12], "tipo_ensenanza": f[13] or "Plan General", "rbd": f[14] or "Sin RBD",
            "cod_tipo_ensenanza": f[15], "id_establecimiento": f[16]
        } for f in cur.fetchall()]
        return matriculas
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@router.post("")
def crear_matricula(matricula: MatriculaCreate, usuario_actual: dict = Depends(verificar_escritura)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 0. CALCULAR CORRELATIVO AUTOMÁTICO
        # Buscamos el folio más alto registrado para este colegio, año y curso específico.
        cursor.execute("""
            SELECT COALESCE(MAX(numero_correlativo), 0) 
            FROM matricula 
            WHERE id_establecimiento = %s 
              AND anio_escolar = %s 
              AND curso = %s
        """, (matricula.id_establecimiento, matricula.anio_escolar, matricula.curso))
        
        max_correlativo = cursor.fetchone()[0]
        nuevo_correlativo = max_correlativo + 1 # Asignamos el siguiente número disponible

        # 1. REGLA DE NEGOCIO: Anular matrícula activa anterior del mismo alumno en el mismo año
        cursor.execute("""
            UPDATE matricula 
            SET estado = 'Anulada', 
                observaciones = CASE 
                    WHEN observaciones IS NULL OR observaciones = '' THEN 'Anulada automáticamente por registro de nueva matrícula.'
                    ELSE CONCAT(observaciones, ' | Anulada automáticamente por registro de nueva matrícula.')
                END
            WHERE id_estudiante = %s AND anio_escolar = %s AND estado = 'Activa'
        """, (matricula.id_estudiante, matricula.anio_escolar))

        # 2. CREACIÓN: Insertar la nueva matrícula usando el nuevo_correlativo calculado
        query = """
            INSERT INTO matricula (numero_correlativo, anio_escolar, id_estudiante, id_establecimiento, fecha_matricula, nivel_ensenanza, curso, estado, cod_tipo_ensenanza, cod_grado, letra_curso, id_usuario_ejecutor) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id_matricula;
        """
        valores = (
            nuevo_correlativo, # <--- Usamos la variable calculada automáticamente
            matricula.anio_escolar, 
            matricula.id_estudiante, 
            matricula.id_establecimiento, 
            matricula.fecha_matricula, 
            matricula.nivel_ensenanza, 
            matricula.curso, 
            getattr(matricula, 'estado', 'Activa'), 
            getattr(matricula, 'cod_tipo_ensenanza', None), 
            getattr(matricula, 'cod_grado', None), 
            getattr(matricula, 'letra_curso', None), 
            matricula.id_usuario_ejecutor
        )
        cursor.execute(query, valores)
        nuevo_id = cursor.fetchone()[0]
        
        # Confirmar los cambios
        conn.commit()
        return {
            "mensaje": f"Matrícula creada. Se asignó automáticamente el folio #{nuevo_correlativo}.", 
            "id_matricula": nuevo_id,
            "correlativo_asignado": nuevo_correlativo
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# 2. Endpoint de actualización con alertas de estado
@router.put("/{id_matricula}")
def actualizar_matricula(id_matricula: int, matricula: MatriculaUpdate, usuario_actual: dict = Depends(verificar_escritura)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        mensaje_alerta = ""

        # 1. Ajustes previos si es retiro
        if matricula.estado == "Retirado":
            matricula.observaciones = "Pendiente de respuesta mediante cuestionario autoaplicado."
            matricula.motivo_retiro = "Pendiente"

        # 2. ACTUALIZAMOS LA BASE DE DATOS PRIMERO
        cursor.execute("""
            UPDATE matricula SET estado = %s, fecha_retiro = %s, motivo_retiro = %s, observaciones = %s, id_usuario_ejecutor = %s WHERE id_matricula = %s RETURNING id_matricula;
        """, (matricula.estado, matricula.fecha_retiro, matricula.motivo_retiro, matricula.observaciones, matricula.id_usuario_ejecutor, id_matricula))
        
        if not cursor.fetchone(): 
            raise HTTPException(status_code=404, detail="Matrícula no encontrada")

        # 3. GENERAR PDF Y ENVIAR CORREO (Solo si es retiro)
        if matricula.estado == "Retirado":
            # Extraemos TODOS los datos necesarios para armar el PDF de Retiro y buscar el correo
            cursor.execute("""
                SELECT m.numero_correlativo, m.anio_escolar, m.nivel_ensenanza, m.curso, m.fecha_matricula,
                       e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno, e.sexo,
                       m.estado, m.fecha_retiro, m.motivo_cambio_curso, est.nombre, est.rbd,
                       a.rut_pasaporte, a.nombres, a.apellido_paterno, a.apellido_materno, e.domicilio,
                       a.correo_electronico
                FROM matricula m 
                INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante 
                INNER JOIN establecimiento est ON m.id_establecimiento = est.id_establecimiento
                LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado
                WHERE m.id_matricula = %s
            """, (id_matricula,))
            datos = cursor.fetchone()
            
            correo_apoderado = datos[20]
            
            if datos and correo_apoderado:
                # Armamos el diccionario exacto que pide tu generador de PDF
                rut_apod = datos[15] if datos[15] else "Sin registro"
                nom_apod = f"{datos[16] or ''} {datos[17] or ''} {datos[18] or ''}".strip()
                if not nom_apod: nom_apod = "Sin registro"
                domicilio = datos[19] if datos[19] else "los registros del establecimiento"

                datos_alumno = {
                    "folio": datos[0], "anio": datos[1], "nivel": datos[2], "curso": datos[3],
                    "fecha_matricula": datos[4], "rut": str(datos[5]).strip(),
                    "nombre_completo": f"{datos[6]} {datos[7]} {datos[8]}".strip(),
                    "sexo": datos[9], "estado": datos[10], "fecha_retiro": datos[11],
                    "motivo_cambio": datos[12], "nombre_colegio": datos[13], "rbd_colegio": datos[14],
                    "rut_apoderado": rut_apod, "nombre_apoderado": nom_apod, "domicilio": domicilio
                }
                
                # Creamos el código de verificación
                import hashlib
                hash_base = f"{datos_alumno['rut']}-{id_matricula}-SLEP{datos_alumno['anio']}"
                hash_corto = hashlib.sha256(hash_base.encode('utf-8')).hexdigest()[:6].upper()
                codigo_verificacion = f"VLP-{id_matricula}-{hash_corto}"
                
                # 🌟 Generamos el PDF usando tu servicio
                from services.pdf_service import generar_certificado_pdf
                pdf_buffer, _ = generar_certificado_pdf(datos_alumno, "RETIRO", codigo_verificacion)
                
                # Enviamos el correo con el PDF adjunto
                exito, msg_error = enviar_correo_retiro(correo_apoderado, id_matricula, datos[6], pdf_buffer)
                
                if not exito:
                    mensaje_alerta = f"⚠️ Retiro guardado, pero falló el envío de Gmail: {msg_error}"
            else:
                mensaje_alerta = "⚠️ Retiro guardado, pero el estudiante NO TIENE apoderado con correo electrónico registrado."

        conn.commit()
        mensaje_final = mensaje_alerta if mensaje_alerta else "Matrícula actualizada y correo enviado exitosamente."
        return {"mensaje": mensaje_final}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.put("/{id_matricula}/cuestionario")
def responder_cuestionario(id_matricula: int, payload: CuestionarioRetiro):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT e.run_ipe FROM matricula m INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante WHERE m.id_matricula = %s", (id_matricula,))
        resultado = cur.fetchone()
        
        if not resultado or resultado[0] != payload.rut_estudiante:
            raise HTTPException(status_code=401, detail="El RUT ingresado no coincide.")
            
        cur.execute("UPDATE matricula SET observaciones = %s, motivo_retiro = 'Respuesta Apoderado (Confidencial)' WHERE id_matricula = %s", (payload.motivo_real, id_matricula))
        conn.commit()
        return {"mensaje": "Cuestionario guardado con éxito."}
    finally:
        cur.close()
        conn.close()

@router.put("/{id_matricula}/cuestionario-curso")
def responder_cuestionario_curso(id_matricula: int, payload: CuestionarioRetiro):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT e.run_ipe FROM matricula m INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante WHERE m.id_matricula = %s", (id_matricula,))
        resultado = cur.fetchone()
        
        if not resultado or resultado[0] != payload.rut_estudiante:
            raise HTTPException(status_code=401, detail="El RUT ingresado no coincide.")
            
        # Reemplazamos la etiqueta "Pendiente..." por la razón real que escribió el apoderado
        cur.execute("UPDATE matricula SET motivo_cambio_curso = %s WHERE id_matricula = %s", (payload.motivo_real, id_matricula))
        conn.commit()
        return {"mensaje": "Motivo de traslado guardado con éxito."}
    finally:
        cur.close()
        conn.close()

class CambioCursoRequest(BaseModel):
    cod_tipo_ensenanza: int
    nuevo_curso: str
    motivo_cambio_curso: Optional[str] = None 

@router.put("/{id_matricula}/curso")
def cambiar_curso(id_matricula: int, req: CambioCursoRequest, usuario_actual: dict = Depends(verificar_escritura)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Agregamos m.id_establecimiento al final de la consulta para poder calcular el folio
        cur.execute("""
            SELECT m.anio_escolar, m.estado, m.curso, m.observaciones, e.nombres, a.correo_electronico,
                   m.numero_correlativo, m.nivel_ensenanza, m.fecha_matricula, e.run_ipe, e.apellido_paterno,
                   e.apellido_materno, e.sexo, m.fecha_retiro, est.nombre, est.rbd, a.rut_pasaporte,
                   a.nombres, a.apellido_paterno, a.apellido_materno, e.domicilio, m.id_establecimiento
            FROM matricula m
            INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante
            INNER JOIN establecimiento est ON m.id_establecimiento = est.id_establecimiento
            LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado
            WHERE m.id_matricula = %s
        """, (id_matricula,))
        datos = cur.fetchone()
        
        if not datos: raise HTTPException(status_code=404, detail="Matrícula no encontrada")
        if datos[0] != datetime.now().year: raise HTTPException(status_code=400, detail="Solo se puede cambiar curso en año vigente.")
        if datos[1] != 'Activa': raise HTTPException(status_code=400, detail="El alumno debe estar activo.")
            
        anio_escolar = datos[0]
        id_establecimiento = datos[21]
        folio_antiguo = datos[6]

        # 🌟 NUEVO: Calculamos el siguiente Folio Único para el curso de DESTINO
        cur.execute("""
            SELECT COALESCE(MAX(numero_correlativo), 0) 
            FROM matricula 
            WHERE id_establecimiento = %s 
              AND anio_escolar = %s 
              AND curso = %s
        """, (id_establecimiento, anio_escolar, req.nuevo_curso))
        
        nuevo_correlativo = cur.fetchone()[0] + 1

        nueva_observacion = f"{datos[3] or ''}\n[{datetime.now().strftime('%Y-%m-%d')}] Trasladado de '{datos[2]}' a '{req.nuevo_curso}'. Folio anterior: {folio_antiguo}. Motivo pendiente."
        motivo_provisional = "Pendiente de respuesta mediante cuestionario autoaplicado."

        # 2. ACTUALIZAR BASE DE DATOS (Asignando el nuevo correlativo)
        cur.execute("""
            UPDATE matricula 
            SET cod_tipo_ensenanza = %s, curso = %s, observaciones = %s, motivo_cambio_curso = %s, numero_correlativo = %s 
            WHERE id_matricula = %s
        """, (req.cod_tipo_ensenanza, req.nuevo_curso, nueva_observacion.strip(), motivo_provisional, nuevo_correlativo, id_matricula))
        
        mensaje_alerta = ""
        correo_apoderado = datos[5]
        nombre_alumno = datos[4]
        
        # 3. GENERAR PDF Y ENVIAR CORREO
        if correo_apoderado:
            rut_apod = datos[16] if datos[16] else "Sin registro"
            nom_apod = f"{datos[17] or ''} {datos[18] or ''} {datos[19] or ''}".strip()
            if not nom_apod: nom_apod = "Sin registro"
            domicilio = datos[20] if datos[20] else "los registros del establecimiento"

            datos_alumno = {
                "folio": nuevo_correlativo, # 🌟 Actualizado para que el PDF muestre el nuevo folio
                "anio": datos[0], "nivel": datos[7], "curso": req.nuevo_curso,
                "fecha_matricula": datos[8], "rut": str(datos[9]).strip(),
                "nombre_completo": f"{datos[4]} {datos[10]} {datos[11]}".strip(),
                "sexo": datos[12], "estado": datos[1], "fecha_retiro": datos[13],
                "motivo_cambio": motivo_provisional, "nombre_colegio": datos[14], "rbd_colegio": datos[15],
                "rut_apoderado": rut_apod, "nombre_apoderado": nom_apod, "domicilio": domicilio
            }
            
            import hashlib
            hash_base = f"{datos_alumno['rut']}-{id_matricula}-SLEP{datos_alumno['anio']}"
            hash_corto = hashlib.sha256(hash_base.encode('utf-8')).hexdigest()[:6].upper()
            codigo_verificacion = f"VLP-{id_matricula}-{hash_corto}"
            
            from services.pdf_service import generar_certificado_pdf
            pdf_buffer, _ = generar_certificado_pdf(datos_alumno, "CAMBIO_CURSO", codigo_verificacion)
            
            exito, msg_error = enviar_correo_cambio_curso(correo_apoderado, id_matricula, nombre_alumno, req.nuevo_curso, pdf_buffer)
            if not exito:
                mensaje_alerta = f"⚠️ Traslado guardado, pero falló el envío a Gmail: {msg_error}"
        else:
            mensaje_alerta = "⚠️ Traslado guardado, pero el estudiante NO TIENE apoderado con correo registrado."

        conn.commit()
        return {"status": "success", "mensaje": mensaje_alerta if mensaje_alerta else "Traslado registrado y correo enviado al apoderado."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@router.get("/{id_matricula}/certificado")
def descargar_certificado(id_matricula: int, tipo: str = "MATRICULA"):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Obtenemos los mismos datos completos (incluyendo apoderado y domicilio)
        cur.execute("""
            SELECT m.numero_correlativo, m.anio_escolar, m.nivel_ensenanza, m.curso, m.fecha_matricula,
                   e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno, e.sexo,
                   m.estado, m.fecha_retiro, m.motivo_cambio_curso, est.nombre, est.rbd,
                   a.rut_pasaporte, a.nombres, a.apellido_paterno, a.apellido_materno, e.domicilio
            FROM matricula m 
            INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante 
            INNER JOIN establecimiento est ON m.id_establecimiento = est.id_establecimiento
            LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado
            WHERE m.id_matricula = %s
        """, (id_matricula,))
        datos = cur.fetchone()
        
        if not datos: raise HTTPException(status_code=404, detail="Matrícula no encontrada")
        
        rut_apod = datos[15] if datos[15] else "Sin registro"
        nom_apod = f"{datos[16] or ''} {datos[17] or ''} {datos[18] or ''}".strip()
        if not nom_apod: nom_apod = "Sin registro"
        domicilio = datos[19] if datos[19] else "los registros del establecimiento"

        datos_alumno = {
            "folio": datos[0],
            "anio": datos[1],
            "nivel": datos[2],
            "curso": datos[3],
            "fecha_matricula": datos[4],
            "rut": str(datos[5]).strip(),
            "nombre_completo": f"{datos[6]} {datos[7]} {datos[8]}".strip(),
            "sexo": datos[9],
            "estado": datos[10],
            "fecha_retiro": datos[11],
            "motivo_cambio": datos[12],
            "nombre_colegio": datos[13],
            "rbd_colegio": datos[14],
            "rut_apoderado": rut_apod,
            "nombre_apoderado": nom_apod,
            "domicilio": domicilio
        }
        
        # 2. Generar Código de Verificación Único
        import hashlib
        hash_base = f"{datos_alumno['rut']}-{id_matricula}-SLEP{datos_alumno['anio']}"
        hash_corto = hashlib.sha256(hash_base.encode('utf-8')).hexdigest()[:6].upper()
        codigo_verificacion = f"VLP-{id_matricula}-{hash_corto}"
        
        # 3. 🌟 AQUÍ LLAMAMOS A TU NUEVO SERVICIO DESACOPLADO 🌟
        from services.pdf_service import generar_certificado_pdf
        pdf_buffer, _ = generar_certificado_pdf(datos_alumno, tipo, codigo_verificacion)
        
        return StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"inline; filename={tipo}_{datos_alumno['rut']}.pdf"}
        )
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@router.post("/carga-masiva")
async def carga_masiva_sige(
    # CAMBIO AQUI: Recibimos una lista de archivos en lugar de uno solo
    archivos: List[UploadFile] = File(...), 
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        total_alumnos_nuevos = 0
        total_alumnos_actualizados = 0
        
        id_ejecutor = usuario_actual.get('id_usuario')
        if not id_ejecutor: id_ejecutor = 1
        
        correlativos_actuales = {}

        # NUEVO BUCLE: Procesar cada archivo recibido
        for archivo in archivos:
            contenido = await archivo.read()
            
            try:
                # Utilizamos la lectura robusta que determinamos para los archivos SIGE
                tablas = pd.read_html(io.BytesIO(contenido), encoding='latin1')
            except Exception:
                try:
                    tablas = pd.read_html(io.BytesIO(contenido), encoding='utf-8')
                except Exception:
                    continue # Si el archivo no es legible, saltamos al siguiente
            
            if not tablas:
                continue
                
            df = tablas[0]
            # Limpiamos los NaN por None
            df = df.where(pd.notnull(df), None)
            
            for index, row in df.iterrows():
                # --- CRUCE DE RBD MINEDUC A ID INTERNO ---
                rbd_excel = str(row.get('RBD', '')).strip()
                id_colegio = usuario_actual.get('id_establecimiento', 1)
                
                if rbd_excel and rbd_excel != 'None':
                    cur.execute("SELECT id_establecimiento FROM establecimiento WHERE rbd = %s", (rbd_excel,))
                    resultado_colegio = cur.fetchone()
                    
                    if resultado_colegio:
                        id_colegio = resultado_colegio[0]
                    else:
                        cur.execute("""
                            INSERT INTO establecimiento (rbd, nombre, tipo_local) 
                            VALUES (%s, %s, 'Generado por SIGE') RETURNING id_establecimiento;
                        """, (rbd_excel, f"Colegio RBD {rbd_excel}"))
                        id_colegio = cur.fetchone()[0]

                # 1. Extracción de RUT 
                rut_alumno = str(row.get('Run', '')).strip()
                dv_alumno = str(row.get('Dígito Ver.', '')).strip()
                if rut_alumno == 'None' or not rut_alumno:
                    continue
                run_completo = f"{rut_alumno}-{dv_alumno}"
                
                # 2. Protección Nombres 
                nombres = str(row.get('Nombres', '')).strip()
                if not nombres or nombres == 'None': nombres = "Sin Nombre"
                
                ap_paterno = str(row.get('Apellido Paterno', '')).strip()
                if not ap_paterno or ap_paterno == 'None': ap_paterno = "Sin Apellido"
                
                ap_materno = str(row.get('Apellido Materno', '')).strip()
                if ap_materno == 'None': ap_materno = ''

                # 3. Protección Sexo 
                genero_excel = str(row.get('Genero', '')).strip().upper()
                if genero_excel == 'F': sexo_db = "Femenino"
                elif genero_excel == 'M': sexo_db = "Masculino"
                else: sexo_db = "No Informado"
                
                # 4. Protección Fecha de Nacimiento 
                fecha_nac = str(row.get('Fecha Nacimiento', '')).strip()
                if not fecha_nac or fecha_nac == 'None':
                    fecha_nac_str = "2000-01-01"
                else:
                    fecha_nac_str = fecha_nac.split(' ')[0]
                    
                # 5. Protección Domicilio 
                direccion_excel = str(row.get('Dirección', '')).strip()
                comuna_excel = str(row.get('Comuna Residencia', '')).strip()
                dir_limpia = "" if direccion_excel == 'None' else direccion_excel
                comuna_limpia = "" if comuna_excel == 'None' else comuna_excel
                domicilio_final = f"{dir_limpia} {comuna_limpia}".strip()
                if not domicilio_final: domicilio_final = "Sin registro"

                # 6. Protección Año Escolar 
                try:
                    anio_escolar = int(float(row.get('Año', 2026)))
                except:
                    anio_escolar = 2026

                # 7. Protección Fecha de Matrícula 
                fecha_incorp = str(row.get('Fecha Incorporación Curso', '')).strip()
                if not fecha_incorp or fecha_incorp == 'None':
                    fecha_matricula_str = pd.Timestamp.now().strftime('%Y-%m-%d')
                else:
                    fecha_matricula_str = fecha_incorp.split(' ')[0]

                # --- LÓGICA DE FECHA DE RETIRO SIGE ---
                fecha_retiro_excel = str(row.get('Fecha Retiro', row.get('Fec. Retiro', ''))).strip()
                estado_matricula = 'Activa'
                fecha_retiro_db = None
                
                if fecha_retiro_excel and fecha_retiro_excel != 'None':
                    fecha_retiro_limpia = fecha_retiro_excel.split(' ')[0]
                    if not fecha_retiro_limpia.startswith('1900'):
                        estado_matricula = 'Inactiva'
                        fecha_retiro_db = fecha_retiro_limpia

                # 8. Mapeo de Catálogos
                try:
                    cod_ensenanza = int(float(row.get('Cod Tipo Enseñanza')))
                except:
                    cod_ensenanza = None
                    
                try:
                    cod_grado = int(float(row.get('Cod Grado')))
                except:
                    cod_grado = None

                desc_grado = str(row.get('Desc Grado', '')).strip()
                if desc_grado == 'None': desc_grado = ''
                
                letra_curso = str(row.get('Letra Curso', '')).strip()
                if letra_curso == 'None': letra_curso = ''

                if cod_ensenanza is not None:
                    cur.execute("""
                        INSERT INTO catalogo_tipo_ensenanza (codigo, descripcion) 
                        VALUES (%s, 'Importado desde SIGE')
                        ON CONFLICT (codigo) DO NOTHING;
                    """, (cod_ensenanza,))
                    
                if cod_grado is not None:
                    cur.execute("""
                        INSERT INTO catalogo_grado (codigo, descripcion) 
                        VALUES (%s, %s)
                        ON CONFLICT (codigo) DO NOTHING;
                    """, (cod_grado, desc_grado))

                # --- INSERCIÓN SEGURA DEL ESTUDIANTE ---
                cur.execute("""
                    INSERT INTO estudiante (run_ipe, nombres, apellido_paterno, apellido_materno, sexo, fecha_nacimiento, domicilio)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (run_ipe) 
                    DO UPDATE SET nombres = EXCLUDED.nombres, 
                                  apellido_paterno = EXCLUDED.apellido_paterno,
                                  apellido_materno = EXCLUDED.apellido_materno,
                                  sexo = EXCLUDED.sexo,
                                  fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, estudiante.fecha_nacimiento),
                                  domicilio = COALESCE(EXCLUDED.domicilio, estudiante.domicilio)
                    RETURNING id_estudiante;
                """, (run_completo, nombres, ap_paterno, ap_materno, sexo_db, fecha_nac_str, domicilio_final))
                
                resultado_estudiante = cur.fetchone()
                if resultado_estudiante:
                    id_estudiante = resultado_estudiante[0]
                else:
                    cur.execute("SELECT id_estudiante FROM estudiante WHERE run_ipe = %s", (run_completo,))
                    id_estudiante = cur.fetchone()[0]

                # --- INSERCIÓN / ACTUALIZACIÓN DE LA MATRÍCULA ---
                curso_texto = f"{desc_grado} {letra_curso}".strip() if desc_grado else "Sin Asignar"
                
                cur.execute("""
                    SELECT id_matricula FROM matricula 
                    WHERE id_estudiante = %s AND id_establecimiento = %s AND anio_escolar = %s
                """, (id_estudiante, id_colegio, anio_escolar))
                
                matricula_existente = cur.fetchone()
                
                if matricula_existente:
                    id_mat = matricula_existente[0]
                    cur.execute("""
                        UPDATE matricula 
                        SET cod_tipo_ensenanza = %s, cod_grado = %s, letra_curso = %s, 
                            curso = %s, fecha_retiro = %s, estado = %s
                        WHERE id_matricula = %s
                    """, (cod_ensenanza, cod_grado, letra_curso, curso_texto, fecha_retiro_db, estado_matricula, id_mat))
                    total_alumnos_actualizados += 1
                else:
                    # B) SI NO EXISTE: Calculamos el siguiente Folio Único por CURSO
                    # Ahora la llave incluye curso_texto para que el contador sea independiente por sala
                    llave_correlativo = (id_colegio, anio_escolar, cod_ensenanza, curso_texto)
                    
                    if llave_correlativo not in correlativos_actuales:
                        cur.execute("""
                            SELECT COALESCE(MAX(numero_correlativo), 0) 
                            FROM matricula 
                            WHERE id_establecimiento = %s 
                              AND anio_escolar = %s 
                              AND cod_tipo_ensenanza IS NOT DISTINCT FROM %s
                              AND curso IS NOT DISTINCT FROM %s
                        """, (id_colegio, anio_escolar, cod_ensenanza, curso_texto))
                        correlativos_actuales[llave_correlativo] = cur.fetchone()[0]

                    # Le sumamos 1 al contador específico de ese curso
                    correlativos_actuales[llave_correlativo] += 1
                    nuevo_correlativo = correlativos_actuales[llave_correlativo]
                    
                    cur.execute("""
                        INSERT INTO matricula (
                            id_estudiante, id_establecimiento, numero_correlativo, 
                            estado, cod_tipo_ensenanza, cod_grado, letra_curso, curso, nivel_ensenanza,
                            anio_escolar, fecha_matricula, id_usuario_ejecutor, fecha_retiro
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Educación Básica', %s, %s, %s, %s)
                    """, (
                        id_estudiante, id_colegio, nuevo_correlativo, estado_matricula,
                        cod_ensenanza, cod_grado, letra_curso, curso_texto, anio_escolar,
                        fecha_matricula_str, id_ejecutor, fecha_retiro_db
                    ))
                    total_alumnos_nuevos += 1
            
        conn.commit()
        return {
            "mensaje": f"✅ Éxito: {len(archivos)} archivo(s) procesado(s). {total_alumnos_nuevos} alumnos nuevos matriculados y {total_alumnos_actualizados} actualizados."
        }
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        print(f"Error procesando archivo SIGE: {e}")
        raise HTTPException(status_code=500, detail=f"Error en la carga masiva: {str(e)}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@router.get("/procedencia/{rut_estudiante}")
def obtener_colegio_procedencia(rut_estudiante: str):
    """
    Busca el último registro de matrícula de un estudiante por su RUT
    para determinar su colegio de procedencia.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT est.nombre, est.rbd, m.estado, m.anio_escolar, m.curso, m.id_establecimiento
            FROM matricula m
            INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante
            INNER JOIN establecimiento est ON m.id_establecimiento = est.id_establecimiento
            WHERE e.run_ipe = %s
            ORDER BY m.anio_escolar DESC, m.fecha_matricula DESC, m.id_matricula DESC
            LIMIT 1
        """, (rut_estudiante.strip(),))
        
        resultado = cursor.fetchone()
        
        if not resultado:
            return {
                "encontrado": False,
                "colegio_procedencia": "Estudiante Nuevo (Sin registros previos en el sistema)",
                "id_establecimiento_previo": None
            }
            
        return {
            "encontrado": True,
            "colegio_procedencia": resultado[0],
            "rbd_procedencia": resultado[1],
            "estado_previo": resultado[2],
            "anio_previo": resultado[3],
            "curso_previo": resultado[4],
            "id_establecimiento_previo": resultado[5]
        }
    finally:
        cursor.close()
        conn.close()