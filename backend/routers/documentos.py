from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import io
import textwrap
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from database import get_db_connection
from security import obtener_usuario_actual
import hashlib
from datetime import datetime
from fastapi.responses import StreamingResponse
import os

router = APIRouter(prefix="/documentos", tags=["Emisión de Documentos"])

class EmisionRequest(BaseModel):
    id_matricula: int
    tipo_documento: str
    destinatarios: List[str]

@router.post("/emitir")
def emitir_documento(req: EmisionRequest, usuario_actual: dict = Depends(obtener_usuario_actual)):
    if not req.destinatarios:
        raise HTTPException(status_code=400, detail="No se proporcionaron correos de destino.")

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT m.numero_correlativo, m.anio_escolar, m.nivel_ensenanza, m.curso, m.fecha_matricula, 
                   e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno, e.sexo, 
                   a.rut_pasaporte, a.nombres, a.apellido_paterno, a.apellido_materno, a.telefono, 
                   a.correo_electronico, m.estado, m.fecha_retiro, m.motivo_cambio_curso
            FROM matricula m 
            INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante 
            LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado 
            WHERE m.id_matricula = %s
        """, (req.id_matricula,))
        
        datos = cur.fetchone()
        if not datos: 
            raise HTTPException(status_code=404, detail="Matrícula no encontrada")

        rut_estudiante = datos[5]
        nombre_completo = f"{datos[6]} {datos[7]} {datos[8]}"
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        if req.tipo_documento == 'RETIRO':
            titulo_pdf = "CERTIFICADO DE RETIRO ESCOLAR"
            texto_accion = "certifica el RETIRO OFICIAL del siguiente estudiante:"
        elif req.tipo_documento == 'CAMBIO_CURSO':
            titulo_pdf = "COMPROBANTE DE TRASLADO DE CURSO"
            texto_accion = "certifica el TRASLADO DE CURSO del siguiente estudiante:"
        else:
            titulo_pdf = "CERTIFICADO DE ALUMNO REGULAR (RGM)"
            texto_accion = "certifica que el siguiente estudiante se encuentra MATRICULADO:"

        c.setFont("Helvetica-Bold", 16)
        c.drawString(150, 700, titulo_pdf)
        
        c.setFont("Helvetica", 12)
        c.drawString(100, 650, f"El Sistema Local de Educación Pública (SLEP) {texto_accion}")
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, 615, "I. ANTECEDENTES DEL ESTUDIANTE")
        c.setFont("Helvetica", 11)
        c.drawString(100, 595, f"Nombre: {nombre_completo}")
        c.drawString(100, 575, f"RUT: {rut_estudiante}")
        c.drawString(100, 555, f"Sexo : {datos[9] or 'No registrado'}")
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, 520, "II. ANTECEDENTES ACADÉMICOS Y ESTADO")
        c.setFont("Helvetica", 11)
        c.drawString(100, 500, f"Año Escolar: {datos[1]}")
        c.drawString(100, 480, f"Nivel: {datos[2]}")
        c.drawString(100, 460, f"Curso Registrado: {datos[3]}")
        
        # Estado dinámico con color
        c.setFont("Helvetica-Bold", 11)
        if req.tipo_documento == 'RETIRO':
            c.setFillColorRGB(0.8, 0.1, 0.1)
            estado_texto = f"Estado: RETIRADO (Fecha: {datos[17] or 'No registrada'})"
        elif req.tipo_documento == 'CAMBIO_CURSO':
            c.setFillColorRGB(0.1, 0.3, 0.8)
            estado_texto = "Estado: TRASLADADO DE CURSO"
        else:
            c.setFillColorRGB(0.1, 0.6, 0.1)
            estado_texto = f"Estado: {datos[16]}"
            
        c.drawString(100, 430, estado_texto)
        c.setFillColorRGB(0, 0, 0) # Volver a negro
        
        # Dibujar motivo si es cambio de curso
        if req.tipo_documento == 'CAMBIO_CURSO':
            motivo_bd = datos[18] if datos[18] else "No especificado por la administración."
            c.setFont("Helvetica-Bold", 12)
            c.drawString(100, 390, "III. MOTIVO DEL TRASLADO")
            
            c.setFont("Helvetica", 11)
            lineas_motivo = textwrap.wrap(motivo_bd, width=80) 
            y_pos = 370
            for linea in lineas_motivo:
                c.drawString(100, y_pos, linea)
                y_pos -= 15
        
        c.save()
        buffer.seek(0)

        # 4. Enviar Correo
        remitente = "basti.aravena2001@gmail.com"
        password = "kaea ccqf qyjd nedu" 

        msg = MIMEMultipart()
        msg['From'] = remitente
        msg['To'] = ", ".join(req.destinatarios)
        msg['Subject'] = f"{titulo_pdf} - {nombre_completo}"
        
        cuerpo = f"Estimado/a,\n\nAdjunto enviamos el {titulo_pdf} correspondiente al estudiante {nombre_completo}.\n\nSaludos cordiales,\nSistema RGM SLEP."
        msg.attach(MIMEText(cuerpo, 'plain'))
        
        adjunto = MIMEApplication(buffer.read(), _subtype="pdf")
        adjunto.add_header('Content-Disposition', 'attachment', filename=f"Certificado_{rut_estudiante}.pdf")
        msg.attach(adjunto)

        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(remitente, password)
        server.send_message(msg)
        server.quit()

        return {"status": "success", "message": f"Documento enviado a {len(req.destinatarios)} destinatario(s)."}

    except Exception as e:
        print(f"Error emitiendo documento: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@router.get("/verificar")
def verificar_certificado_publico(rut: str, codigo: str):
    # 1. Validar el formato del código (Ej: VLP-152-A9F2B4)
    partes = codigo.strip().upper().split('-')
    if len(partes) != 3 or partes[0] != 'VLP':
        raise HTTPException(status_code=400, detail="Formato de código inválido. Debe ser similar a VLP-123-ABCDEF")
        
    id_matricula = partes[1]
    hash_ingresado = partes[2]

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT m.numero_correlativo, m.anio_escolar, m.nivel_ensenanza, m.curso, m.fecha_matricula, 
                   e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno, e.sexo, 
                   m.estado, m.fecha_retiro, m.motivo_cambio_curso, est.nombre, est.rbd
            FROM matricula m 
            INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante 
            INNER JOIN establecimiento est ON m.id_establecimiento = est.id_establecimiento
            WHERE m.id_matricula = %s
        """, (id_matricula,))
        datos = cur.fetchone()
        
        if not datos: 
            raise HTTPException(status_code=404, detail="El documento no existe en los registros del SLEP.")

        # 2. Validar que el RUT coincida
        rut_db = str(datos[5]).strip()
        if rut_db.lower() != rut.strip().lower():
            raise HTTPException(status_code=401, detail="El RUT ingresado no corresponde a este certificado.")

        # 3. Validar la integridad matemática del Hash
        anio = datos[1]
        hash_base = f"{rut_db}-{id_matricula}-SLEP{anio}"
        hash_real = hashlib.sha256(hash_base.encode('utf-8')).hexdigest()[:6].upper()
        
        if hash_real != hash_ingresado:
            raise HTTPException(status_code=401, detail="El código de verificación ha sido alterado y no es auténtico.")

        # 4. Si todo es correcto, regeneramos el PDF idéntico
        folio = datos[0]
        curso = datos[3]
        nombre_completo = f"{datos[6]} {datos[7]} {datos[8]}"
        estado_texto = f"Estado: {datos[10]}"
        nombre_colegio = datos[13]
        rbd_colegio = datos[14]

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        directorio_actual = os.path.dirname(os.path.abspath(__file__))
        ruta_mineduc = "static/mineduc.jpg"
        ruta_slep ="static/logo-slep.negro.png"
        ruta_timbre = "static/mineduc.jpg"

        # Logos
        if os.path.exists(ruta_slep):
            c.drawImage(ruta_slep, 50, height - 85, width=110, height=55, mask='auto')
        else:
            c.setFont("Times-Bold", 8)
            c.drawString(50, height - 60, "SLEP VALPARAÍSO")

        if os.path.exists(ruta_mineduc):
            c.drawImage(ruta_mineduc, width - 50 - 60, height - 85, width=60, height=55, mask='auto')
        else:
            c.setFont("Times-Bold", 8)
            c.drawRightString(width - 50, height - 60, "MINEDUC")

        # Textos Institucionales
        c.setFont("Times-Bold", 9)
        c.drawCentredString(width / 2.0, height - 55, "SERVICIO LOCAL DE EDUCACIÓN PÚBLICA VALPARAÍSO")
        c.setFont("Times-Roman", 9)
        c.drawCentredString(width / 2.0, height - 70, f"Establecimiento: {nombre_colegio} (RBD: {rbd_colegio})")

        c.setStrokeColorRGB(0.7, 0.7, 0.7)
        c.setLineWidth(0.75)
        c.line(50, height - 95, width - 50, height - 95)

        c.setFont("Times-Bold", 15)
        c.drawCentredString(width / 2.0, height - 135, "CERTIFICADO DE MATRÍCULA VERIFICADO")

        meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
        hoy = datetime.now()
        c.setFont("Times-Roman", 12)
        c.drawString(50, height - 190, f"En Valparaíso, a {hoy.day} de {meses[hoy.month - 1]} de {hoy.year}")
        c.drawString(50, height - 220, "La Dirección del Establecimiento que suscribe,")
        c.drawString(50, height - 240, "certifica que el siguiente estudiante se encuentra MATRICULADO:")

        c.setFont("Times-Bold", 12)
        c.drawString(100, height - 280, f"Nombre Completo  : {nombre_completo}")
        c.drawString(100, height - 300, f"RUT                            : {rut_db}")
        c.drawString(100, height - 320, f"Curso                         : {curso}")
        c.drawString(100, height - 340, f"Número de Folio     : {folio}")
        c.drawString(100, height - 360, f"Año Lectivo             : {anio}")

        c.setFont("Times-Roman", 12)
        c.drawString(50, height - 410, f"Es alumno/a del establecimiento {nombre_colegio} y su registro")
        c.drawString(50, height - 430, f"actual se encuentra en condición: {estado_texto}.")
        c.drawString(50, height - 460, "Se extiende el presente documento a petición de la interesada(o) para los fines")
        c.drawString(50, height - 480, "que estime conveniente.")

        if os.path.exists(ruta_timbre):
            c.drawImage(ruta_timbre, width / 2.0 - 50, height - 600, width=100, height=100, mask='auto')
        
        c.setFont("Times-Bold", 11)
        c.drawCentredString(width / 2.0, height - 620, "DIRECTOR(A) DEL ESTABLECIMIENTO")
        c.setFont("Times-Roman", 9)
        c.drawCentredString(width / 2.0, height - 635, "Firma Electrónica Autorizada - SLEP Valparaíso")
        
        c.setStrokeColorRGB(0.1, 0.6, 0.1) # Línea verde indicando documento válido
        c.setLineWidth(2)
        c.line(50, 110, width - 50, 110)
        
        c.setFont("Times-Bold", 10)
        c.setFillColorRGB(0.1, 0.6, 0.1)
        c.drawString(50, 90, "DOCUMENTO VÁLIDO Y AUTENTICADO")
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Times-Roman", 9)
        c.drawString(50, 75, f"Código de Verificación Único: {codigo}")
        c.drawString(50, 60, "La integridad de este documento ha sido validada criptográficamente por la plataforma RGM.")

        c.save()
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=Verificado_{rut_db}.pdf"})
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()