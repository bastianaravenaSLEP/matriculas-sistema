import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.message import EmailMessage # 🌟 Agregado para las nuevas funciones
import io

# 🔒 RECOMENDACIÓN: Mover estas credenciales a un archivo .env en el futuro
EMAIL_REMITENTE = "basti.aravena2001@gmail.com"
PASSWORD_APP = "kaea ccqf qyjd nedu"

# --- 1. FUNCIÓN ORIGINAL (Emisión general de certificados) ---
def enviar_certificado_por_correo(destinatarios: list[str], pdf_buffer: io.BytesIO, titulo_pdf: str, nombre_completo: str, rut_estudiante: str):
    msg = MIMEMultipart()
    msg['From'] = EMAIL_REMITENTE
    msg['To'] = ", ".join(destinatarios)
    msg['Subject'] = f"{titulo_pdf} - {nombre_completo}"
    
    cuerpo = f"Estimado/a,\n\nAdjunto enviamos el {titulo_pdf} correspondiente al estudiante {nombre_completo}.\n\nSaludos cordiales,\nSistema RGM SLEP."
    msg.attach(MIMEText(cuerpo, 'plain'))
    
    # Preparamos el PDF adjunto
    adjunto = MIMEApplication(pdf_buffer.read(), _subtype="pdf")
    adjunto.add_header('Content-Disposition', 'attachment', filename=f"Certificado_{rut_estudiante}.pdf")
    msg.attach(adjunto)
    
    # Enviamos a través de Google
    server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
    server.login(EMAIL_REMITENTE, PASSWORD_APP)
    server.send_message(msg)
    server.quit()

# --- 2. NUEVA FUNCIÓN: Envío de Retiro con Cuestionario ---
def enviar_correo_retiro(correo_destino: str, id_matricula: int, nombre_alumno: str, pdf_buffer: io.BytesIO = None) -> tuple[bool, str]:
    msg = EmailMessage()
    msg['Subject'] = 'Importante: Certificado y Cuestionario de Retiro Escolar SLEP'
    msg['From'] = EMAIL_REMITENTE
    msg['To'] = correo_destino
    
    link_cuestionario = f"http://localhost:5173/encuesta-retiro/{id_matricula}"
    
    cuerpo_correo = (
        f"Estimado Apoderado,\n\n"
        f"Se ha registrado oficialmente el retiro del estudiante {nombre_alumno} de nuestro establecimiento.\n\n"
        f"📄 Adjunto a este correo encontrará el Certificado de Retiro validado por el sistema.\n\n"
        f"Para finalizar el proceso, es obligatorio que ingrese al siguiente enlace para completar el cuestionario de retiro:\n"
        f"{link_cuestionario}\n\n"
        f"Atentamente,\nSistema RGM - SLEP Valparaíso"
    )
    msg.set_content(cuerpo_correo)
    
    # Adjuntamos el PDF generado
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


# --- 3. NUEVA FUNCIÓN: Envío de Traslado de Curso con Justificación ---
def enviar_correo_cambio_curso(correo_destino: str, id_matricula: int, nombre_alumno: str, nuevo_curso: str, pdf_buffer: io.BytesIO = None) -> tuple[bool, str]:
    msg = EmailMessage()
    msg['Subject'] = 'Importante: Comprobante y Formulario de Traslado de Curso'
    msg['From'] = EMAIL_REMITENTE
    msg['To'] = correo_destino
    
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
    
    # Adjuntamos el PDF generado
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