from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from database import get_db_connection
from security import obtener_usuario_actual

router = APIRouter(prefix="/documentos", tags=["Emisión de Documentos"])

# 1. El modelo ahora solo recibe una lista de correos de texto plano
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
        
        # 2. Consulta SQL limpia (sin la tabla establecimiento que causaba el error)
        cur.execute("""
            SELECT m.numero_correlativo, m.anio_escolar, m.nivel_ensenanza, m.curso, m.fecha_matricula, 
                   e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno, e.sexo, 
                   a.rut_pasaporte, a.nombres, a.apellido_paterno, a.apellido_materno, a.telefono, 
                   a.correo_electronico
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

        # 3. Generar el PDF
        # ... (debajo de nombre_completo = f"{datos[6]} ...") ...
        
        # --- GENERAR EL PDF DINÁMICO ---
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
        c.drawString(100, 520, "II. ANTECEDENTES ACADÉMICOS")
        c.setFont("Helvetica", 11)
        c.drawString(100, 500, f"Año Escolar: {datos[1]}")
        c.drawString(100, 480, f"Nivel: {datos[2]}")
        c.drawString(100, 460, f"Curso Registrado: {datos[3]}")
        
        c.save()
        buffer.seek(0)
        # ... (sigue con el código de enviar correo) ...

        # 4. Enviar Correo (RECUERDA PONER TUS CREDENCIALES AQUÍ)
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