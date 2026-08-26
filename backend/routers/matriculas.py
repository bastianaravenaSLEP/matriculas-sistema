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

def enviar_correo_retiro(correo_destino: str, id_matricula: int, nombre_alumno: str):
    EMAIL_REMITENTE = "basti.aravena2001@gmail.com"
    PASSWORD_APP = "kaea ccqf qyjd nedu"
    msg = EmailMessage()
    msg['Subject'] = 'Importante: Cuestionario de Retiro Escolar SLEP'
    msg['From'] = EMAIL_REMITENTE
    msg['To'] = correo_destino
    link_cuestionario = f"http://localhost:5173/encuesta-retiro/{id_matricula}"
    
    msg.set_content(f"Estimado Apoderado,\n\nSe ha registrado el inicio del proceso de baja para el estudiante {nombre_alumno}.\nPor favor ingrese al siguiente enlace para completar el proceso: {link_cuestionario}\n\nAtentamente,\nSistema RGM")
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_REMITENTE, PASSWORD_APP)
            smtp.send_message(msg)
    except Exception as e:
        print(f"No se pudo enviar el correo: {e}")

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

        # 2. CREACIÓN: Insertar la nueva matrícula
        query = """
            INSERT INTO matricula (numero_correlativo, anio_escolar, id_estudiante, id_establecimiento, fecha_matricula, nivel_ensenanza, curso, estado, cod_tipo_ensenanza, cod_grado, letra_curso, id_usuario_ejecutor) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id_matricula;
        """
        valores = (
            matricula.numero_correlativo, 
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
        return {"mensaje": "Matrícula creada exitosamente. Registro anterior anulado (si existía).", "id_matricula": nuevo_id}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.put("/{id_matricula}")
def actualizar_matricula(id_matricula: int, matricula: MatriculaUpdate, usuario_actual: dict = Depends(verificar_escritura)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if matricula.estado == "Retirado":
            matricula.observaciones = "Pendiente de respuesta mediante cuestionario autoaplicado."
            matricula.motivo_retiro = "Pendiente"
            cursor.execute("SELECT e.nombres, a.correo_electronico FROM matricula m INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado WHERE m.id_matricula = %s", (id_matricula,))
            datos_correo = cursor.fetchone()
            if datos_correo and datos_correo[1]:
                enviar_correo_retiro(datos_correo[1], id_matricula, datos_correo[0])

        cursor.execute("""
            UPDATE matricula SET estado = %s, fecha_retiro = %s, motivo_retiro = %s, observaciones = %s, id_usuario_ejecutor = %s WHERE id_matricula = %s RETURNING id_matricula;
        """, (matricula.estado, matricula.fecha_retiro, matricula.motivo_retiro, matricula.observaciones, matricula.id_usuario_ejecutor, id_matricula))
        
        if not cursor.fetchone(): raise HTTPException(status_code=404, detail="Matrícula no encontrada")
        conn.commit()
        return {"mensaje": "Matrícula actualizada."}
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

class CambioCursoRequest(BaseModel):
    cod_tipo_ensenanza: int
    nuevo_curso: str
    motivo_cambio_curso: Optional[str] = None 

@router.put("/{id_matricula}/curso")
def cambiar_curso(id_matricula: int, req: CambioCursoRequest, usuario_actual: dict = Depends(verificar_escritura)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT anio_escolar, estado, curso, observaciones FROM matricula WHERE id_matricula = %s", (id_matricula,))
        mat_actual = cur.fetchone()
        if not mat_actual: raise HTTPException(status_code=404, detail="Matrícula no encontrada")
            
        if mat_actual[0] != datetime.now().year: raise HTTPException(status_code=400, detail="Solo se puede cambiar curso en año vigente.")
        if mat_actual[1] != 'Activa': raise HTTPException(status_code=400, detail="El alumno debe estar activo.")
            
        nueva_observacion = f"{mat_actual[3] or ''}\n[{datetime.now().strftime('%Y-%m-%d')}] Trasladado de '{mat_actual[2]}' a '{req.nuevo_curso}'."
        
        cur.execute("""
            UPDATE matricula 
            SET cod_tipo_ensenanza = %s, curso = %s, observaciones = %s, motivo_cambio_curso = %s 
            WHERE id_matricula = %s
        """, (req.cod_tipo_ensenanza, req.nuevo_curso, nueva_observacion.strip(), req.motivo_cambio_curso, id_matricula))
        conn.commit()
        return {"status": "success", "mensaje": "Curso y motivo actualizados correctamente."}
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
        # Modificamos la query para traer también el nombre y RBD del colegio
        cur.execute("""
            SELECT m.numero_correlativo, m.anio_escolar, m.nivel_ensenanza, m.curso, m.fecha_matricula, 
                   e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno, e.sexo, 
                   a.rut_pasaporte, a.nombres, a.apellido_paterno, a.apellido_materno, a.telefono, 
                   a.correo_electronico, m.estado, m.fecha_retiro, m.motivo_cambio_curso,
                   est.nombre, est.rbd
            FROM matricula m 
            INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante 
            LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado 
            INNER JOIN establecimiento est ON m.id_establecimiento = est.id_establecimiento
            WHERE m.id_matricula = %s
        """, (id_matricula,))
        datos = cur.fetchone()
        
        if not datos: raise HTTPException(status_code=404, detail="Matrícula no encontrada")

        # Variables extraídas
        folio = datos[0]
        anio = datos[1]
        curso = datos[3]
        rut_estudiante = datos[5]
        nombre_completo = f"{datos[6]} {datos[7]} {datos[8]}"
        nombre_colegio = datos[19]
        rbd_colegio = datos[20]

        # 1. GENERACIÓN DEL CÓDIGO DE VERIFICACIÓN ÚNICO
        # Mezclamos el RUT y el ID, creando un hash SHA-256 corto.
        hash_base = f"{rut_estudiante}-{id_matricula}-SLEP{anio}"
        hash_corto = hashlib.sha256(hash_base.encode('utf-8')).hexdigest()[:6].upper()
        codigo_verificacion = f"VLP-{id_matricula}-{hash_corto}"

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # 2. CONFIGURACIÓN DEL TEXTO SEGÚN TIPO
        if tipo == 'RETIRO':
            titulo_pdf = "CERTIFICADO DE RETIRO ESCOLAR"
            texto_accion = "certifica el RETIRO OFICIAL del siguiente estudiante:"
            estado_texto = f"Estado: RETIRADO (Fecha: {datos[17] or 'No registrada'})"
        elif tipo == 'CAMBIO_CURSO':
            titulo_pdf = "COMPROBANTE DE TRASLADO DE CURSO"
            texto_accion = "certifica el TRASLADO DE CURSO del siguiente estudiante:"
            estado_texto = "Estado: TRASLADADO DE CURSO"
        else:
            titulo_pdf = "CERTIFICADO DE MATRÍCULA"
            texto_accion = "certifica que el siguiente estudiante se encuentra MATRICULADO:"
            estado_texto = f"Estado: {datos[16]}"

        # --- DIBUJO DEL PDF ESTILO OFICIAL ---

        # --- SECCIÓN DE FIRMAS ---
        # Aquí puedes cargar imágenes si las tienes guardadas en el servidor

        import os
        directorio_actual = os.path.dirname(os.path.abspath(__file__))

        ruta_mineduc = "static/mineduc.jpg"
        ruta_slep = "static/logo-slep.negro.png"
        ruta_timbre = "static/logo-slep.negro.png"
        ruta_firma = "static/firma_director.png"

# 1. Logo SLEP Valparaíso (Esquina Superior Izquierda - Ampliado)
        ancho_logo_slep = 110
        alto_logo_slep = 55
        if os.path.exists(ruta_slep):
            c.drawImage(ruta_slep, 50, height - 85, width=ancho_logo_slep, height=alto_logo_slep, mask='auto')
        else:
            c.setFont("Times-Bold", 8)
            c.drawString(50, height - 60, "SLEP VALPARAÍSO")

        # 2. Logo Ministerio de Educación (Esquina Superior Derecha - Ampliado)
        ancho_logo_mineduc = 60
        alto_logo_mineduc = 55
        if os.path.exists(ruta_mineduc):
            c.drawImage(ruta_mineduc, width - 50 - ancho_logo_mineduc, height - 85, width=ancho_logo_mineduc, height=alto_logo_mineduc, mask='auto')
        else:
            c.setFont("Times-Bold", 8)
            c.drawRightString(width - 50, height - 60, "MINEDUC")

        # 3. Textos Institucionales Centrados
        c.setFont("Times-Bold", 9)
        c.drawCentredString(width / 2.0, height - 55, "SERVICIO LOCAL DE EDUCACIÓN PÚBLICA VALPARAÍSO")
        c.setFont("Times-Roman", 9)
        c.drawCentredString(width / 2.0, height - 70, f"Establecimiento: {nombre_colegio} (RBD: {rbd_colegio})")

        # 4. Línea divisoria ajustada para dar espacio a los logos grandes
        c.setStrokeColorRGB(0.7, 0.7, 0.7)
        c.setLineWidth(0.75)
        c.line(50, height - 95, width - 50, height - 95)

        # Título Central del Certificado
        c.setFont("Times-Bold", 20)
        c.drawCentredString(width / 2.0, height - 135, titulo_pdf)

        # Fecha actual
        meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
        hoy = datetime.now()
        fecha_texto = f"En Valparaíso, a {hoy.day} de {meses[hoy.month - 1]} de {hoy.year}"
        c.setFont("Times-Roman", 12)
        c.drawString(50, height - 190, fecha_texto)

        # Cuerpo del documento
        c.drawString(50, height - 220, "La Dirección del Establecimiento que suscribe,")
        c.drawString(50, height - 240, texto_accion)

        # Caja de datos del estudiante
        c.setFont("Times-Bold", 12)
        c.drawString(100, height - 280, f"Nombre Completo  : {nombre_completo}")
        c.drawString(100, height - 300, f"RUT                            : {rut_estudiante}")
        c.drawString(100, height - 320, f"Curso                         : {curso}")
        c.drawString(100, height - 340, f"Número de Folio     : {folio}")
        c.drawString(100, height - 360, f"Año Lectivo             : {anio}")

        c.setFont("Times-Roman", 12)
        c.drawString(50, height - 410, f"Es alumno/a del establecimiento {nombre_colegio} y su registro")
        c.drawString(50, height - 430, f"actual se encuentra en condición: {estado_texto}.")
        c.drawString(50, height - 460, "Se extiende el presente documento a petición de la interesada(o) para los fines")
        c.drawString(50, height - 480, "que estime conveniente.")

        # Intenta cargar el timbre si existe
        if os.path.exists(ruta_timbre):
            c.drawImage(ruta_timbre, width / 2.0 - 50, height - 600, width=100, height=100, mask='auto')
        else:
            print(f"⚠️ ADVERTENCIA: No se encontró la imagen en la ruta: {ruta_timbre}")
        
        c.setFont("Times-Bold", 11)
        c.drawCentredString(width / 2.0, height - 620, "DIRECTOR(A) DEL ESTABLECIMIENTO")
        c.setFont("Times-Roman", 9)
        c.drawCentredString(width / 2.0, height - 635, "Firma Electrónica Autorizada - SLEP Valparaíso")

        # --- PIE DE PÁGINA: VERIFICACIÓN ---
        c.setStrokeColorRGB(0.6, 0.6, 0.6)
        c.line(50, 110, width - 50, 110)
        
        c.setFont("Times-Bold", 9)
        c.drawString(50, 90, "VERIFICACIÓN DE AUTENTICIDAD DOCUMENTAL")
        c.setFont("Times-Roman", 9)
        c.drawString(50, 75, f"Código de Verificación Único: {codigo_verificacion}")
        c.drawString(50, 60, "Verifique la validez de este certificado ingresando a: http://localhost:5173/verificar")
        c.drawString(50, 45, "e ingresando el código proporcionado junto al RUT del estudiante.")

        c.save()
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename={tipo}_{rut_estudiante}.pdf"})
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