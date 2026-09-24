import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.message import EmailMessage
import io
from typing import Union
from config import EMAIL_REMITENTE, PASSWORD_APP, SMTP_SERVER, SMTP_PORT, FRONTEND_URL

def _extract_pdf_bytes(pdf_source: Union[io.BytesIO, bytes, None]) -> bytes:
    if pdf_source is None:
        return None
    if isinstance(pdf_source, bytes):
        return pdf_source
    if hasattr(pdf_source, 'getvalue'):
        return pdf_source.getvalue()
    if hasattr(pdf_source, 'read'):
        pdf_source.seek(0)
        return pdf_source.read()
    return None

# --- 1. FUNCIÓN: Emisión general de certificados ---
def enviar_certificado_por_correo(destinatarios: list[str], pdf_buffer: Union[io.BytesIO, bytes], titulo_pdf: str, nombre_completo: str, rut_estudiante: str) -> tuple[bool, str]:
    if not EMAIL_REMITENTE or not PASSWORD_APP:
        print("[EMAIL] Credenciales de correo no configuradas. Correo simulado/omitido.")
        return False, "Credenciales SMTP no configuradas."

    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_REMITENTE
        msg['To'] = ", ".join(destinatarios)
        msg['Subject'] = f"{titulo_pdf} - {nombre_completo}"
        
        cuerpo = f"Estimado/a,\n\nAdjunto enviamos el {titulo_pdf} correspondiente al estudiante {nombre_completo}.\n\nSaludos cordiales,\nSistema RGM SLEP."
        msg.attach(MIMEText(cuerpo, 'plain'))
        
        pdf_bytes = _extract_pdf_bytes(pdf_buffer)
        if pdf_bytes:
            adjunto = MIMEApplication(pdf_bytes, _subtype="pdf")
            adjunto.add_header('Content-Disposition', 'attachment', filename=f"Certificado_{rut_estudiante}.pdf")
            msg.attach(adjunto)
        
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(EMAIL_REMITENTE, PASSWORD_APP)
            server.send_message(msg)
        return True, "Certificado enviado correctamente."
    except Exception as e:
        error_msg = str(e)
        print(f"Error al enviar certificado por correo: {error_msg}")
        return False, error_msg

# --- 2. FUNCIÓN: Envío de Retiro con Cuestionario ---
def enviar_correo_retiro(correo_destino: str, id_matricula: int, nombre_alumno: str, pdf_buffer: Union[io.BytesIO, bytes] = None) -> tuple[bool, str]:
    if not EMAIL_REMITENTE or not PASSWORD_APP:
        print("[EMAIL] Credenciales de correo no configuradas. Correo de retiro simulado/omitido.")
        return False, "Credenciales SMTP no configuradas."

    try:
        msg = EmailMessage()
        msg['Subject'] = 'Importante: Certificado y Cuestionario de Retiro Escolar SLEP'
        msg['From'] = EMAIL_REMITENTE
        msg['To'] = correo_destino
        
        link_cuestionario = f"{FRONTEND_URL}/encuesta-retiro/{id_matricula}"
        
        cuerpo_correo = (
            f"Estimado Apoderado,\n\n"
            f"Se ha registrado oficialmente el retiro del estudiante {nombre_alumno} de nuestro establecimiento.\n\n"
            f"📄 Adjunto a este correo encontrará el Certificado de Retiro validado por el sistema.\n\n"
            f"Para finalizar el proceso, es obligatorio que ingrese al siguiente enlace para completar el cuestionario de retiro:\n"
            f"{link_cuestionario}\n\n"
            f"Atentamente,\nSistema RGM - SLEP Valparaíso"
        )
        msg.set_content(cuerpo_correo)
        
        pdf_bytes = _extract_pdf_bytes(pdf_buffer)
        if pdf_bytes:
            msg.add_attachment(
                pdf_bytes, 
                maintype='application', 
                subtype='pdf', 
                filename=f"Certificado_Retiro_{nombre_alumno.replace(' ', '_')}.pdf"
            )

        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.login(EMAIL_REMITENTE, PASSWORD_APP)
            smtp.send_message(msg)
        return True, "Correo con certificado enviado correctamente."
    except Exception as e:
        error_msg = str(e)
        print(f"No se pudo enviar el correo de retiro: {error_msg}")
        return False, error_msg

# --- 3. FUNCIÓN: Envío de Traslado de Curso con Justificación ---
def enviar_correo_cambio_curso(correo_destino: str, id_matricula: int, nombre_alumno: str, nuevo_curso: str, pdf_buffer: Union[io.BytesIO, bytes] = None) -> tuple[bool, str]:
    if not EMAIL_REMITENTE or not PASSWORD_APP:
        print("[EMAIL] Credenciales de correo no configuradas. Correo de traslado simulado/omitido.")
        return False, "Credenciales SMTP no configuradas."

    try:
        msg = EmailMessage()
        msg['Subject'] = 'Importante: Comprobante y Formulario de Traslado de Curso'
        msg['From'] = EMAIL_REMITENTE
        msg['To'] = correo_destino
        
        link_cuestionario = f"{FRONTEND_URL}/encuesta-cambio-curso/{id_matricula}"
        
        cuerpo_correo = (
            f"Estimado Apoderado,\n\n"
            f"Se ha registrado exitosamente el traslado interno del estudiante {nombre_alumno} hacia el curso {nuevo_curso}.\n\n"
            f"📄 Adjunto a este correo encontrará el Comprobante de Traslado validado por el sistema.\n\n"
            f"Para finalizar el proceso normativo, es obligatorio que ingrese al siguiente enlace para indicar el motivo por el cual solicitó este cambio de curso:\n"
            f"{link_cuestionario}\n\n"
            f"Atentamente,\nSistema RGM - SLEP Valparaíso"
        )
        msg.set_content(cuerpo_correo)
        
        pdf_bytes = _extract_pdf_bytes(pdf_buffer)
        if pdf_bytes:
            msg.add_attachment(
                pdf_bytes, 
                maintype='application', 
                subtype='pdf', 
                filename=f"Traslado_Curso_{nombre_alumno.replace(' ', '_')}.pdf"
            )

        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.login(EMAIL_REMITENTE, PASSWORD_APP)
            smtp.send_message(msg)
        return True, "Correo de traslado enviado correctamente."
    except Exception as e:
        error_msg = str(e)
        print(f"No se pudo enviar el correo de traslado: {error_msg}")
        return False, error_msg