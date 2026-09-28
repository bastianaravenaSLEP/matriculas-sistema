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

# --- 2. FUNCIÓN: Solicitud de Retiro (Envía link de encuesta obligatorio, SIN certificado previo) ---
def enviar_correo_solicitud_retiro(correo_destino: str, id_matricula: int, nombre_alumno: str, fecha_retiro: str = "") -> tuple[bool, str]:
    if not EMAIL_REMITENTE or not PASSWORD_APP:
        print("[EMAIL] Credenciales de correo no configuradas. Correo de solicitud de retiro simulado/omitido.")
        return False, "Credenciales SMTP no configuradas."

    try:
        msg = EmailMessage()
        msg['Subject'] = '⚠️ Solicitud de Retiro Escolar - Cuestionario Obligatorio SLEP'
        msg['From'] = EMAIL_REMITENTE
        msg['To'] = correo_destino
        
        link_cuestionario = f"{FRONTEND_URL}/encuesta-retiro/{id_matricula}"
        
        cuerpo_correo = (
            f"Estimado(a) Apoderado(a),\n\n"
            f"Se ha iniciado un trámite de retiro escolar para el estudiante {nombre_alumno}" + (f" con fecha efectiva {fecha_retiro}." if fecha_retiro else ".") + "\n\n"
            f"IMPORTANTE: Para que este retiro se haga efectivo y se oficialice la baja en los registros del establecimiento y del SLEP, es un requisito legal y obligatorio que complete el siguiente cuestionario confidencial:\n\n"
            f"🔗 Enlace al Cuestionario Obligatorio:\n"
            f"{link_cuestionario}\n\n"
            f"Una vez que complete y envíe sus respuestas, el retiro quedará automáticamente confirmado en la plataforma y se le remitirá de inmediato su Certificado Oficial de Retiro.\n\n"
            f"Atentamente,\nSistema RGM - SLEP Valparaíso"
        )
        msg.set_content(cuerpo_correo)

        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.login(EMAIL_REMITENTE, PASSWORD_APP)
            smtp.send_message(msg)
        return True, "Correo de solicitud de retiro enviado correctamente."
    except Exception as e:
        error_msg = str(e)
        print(f"No se pudo enviar el correo de solicitud de retiro: {error_msg}")
        return False, error_msg

# --- 2b. FUNCIÓN: Confirmación de Retiro Formalizado (Con Certificado Oficial) ---
def enviar_correo_confirmacion_retiro(correo_destino: str, id_matricula: int, nombre_alumno: str, pdf_buffer: Union[io.BytesIO, bytes] = None) -> tuple[bool, str]:
    if not EMAIL_REMITENTE or not PASSWORD_APP:
        print("[EMAIL] Credenciales de correo no configuradas. Correo de confirmación de retiro simulado/omitido.")
        return False, "Credenciales SMTP no configuradas."

    try:
        msg = EmailMessage()
        msg['Subject'] = '✅ Retiro Confirmado y Certificado Oficial - SLEP Valparaíso'
        msg['From'] = EMAIL_REMITENTE
        msg['To'] = correo_destino
        
        cuerpo_correo = (
            f"Estimado(a) Apoderado(a),\n\n"
            f"Hemos recibido exitosamente sus respuestas al cuestionario de retiro.\n\n"
            f"El retiro del estudiante {nombre_alumno} ha sido formalizado y procesado en el sistema oficial RGM.\n\n"
            f"📄 Adjunto a este correo encontrará el Certificado Oficial de Retiro con su respectivo código de validación institucional.\n\n"
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
        return True, "Correo de confirmación de retiro con certificado enviado correctamente."
    except Exception as e:
        error_msg = str(e)
        print(f"No se pudo enviar el correo de confirmación de retiro: {error_msg}")
        return False, error_msg

# Alias de compatibilidad
enviar_correo_retiro = enviar_correo_solicitud_retiro

# --- 3. FUNCIÓN: Solicitud de Traslado de Curso (Envía link de justificación, SIN certificado previo) ---
def enviar_correo_solicitud_cambio_curso(correo_destino: str, id_matricula: int, nombre_alumno: str, nuevo_curso: str) -> tuple[bool, str]:
    if not EMAIL_REMITENTE or not PASSWORD_APP:
        print("[EMAIL] Credenciales de correo no configuradas. Correo de solicitud de traslado simulado/omitido.")
        return False, "Credenciales SMTP no configuradas."

    try:
        msg = EmailMessage()
        msg['Subject'] = '⚠️ Solicitud de Cambio de Curso - Justificación Obligatoria SLEP'
        msg['From'] = EMAIL_REMITENTE
        msg['To'] = correo_destino
        
        link_cuestionario = f"{FRONTEND_URL}/encuesta-cambio-curso/{id_matricula}"
        
        cuerpo_correo = (
            f"Estimado(a) Apoderado(a),\n\n"
            f"Se ha solicitado el cambio de curso del estudiante {nombre_alumno} hacia el curso {nuevo_curso}.\n\n"
            f"IMPORTANTE: Para que este cambio de curso se HAGA EFECTIVO y se formalice la reasignación de sala, es un requisito obligatorio que justifique los motivos completando el siguiente formulario:\n\n"
            f"🔗 Enlace a la Justificación de Traslado:\n"
            f"{link_cuestionario}\n\n"
            f"Una vez que envíe el formulario con su justificación, el traslado se aplicará inmediatamente en el sistema y se le remitirá su comprobante oficial.\n\n"
            f"Atentamente,\nSistema RGM - SLEP Valparaíso"
        )
        msg.set_content(cuerpo_correo)

        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.login(EMAIL_REMITENTE, PASSWORD_APP)
            smtp.send_message(msg)
        return True, "Correo de solicitud de traslado enviado correctamente."
    except Exception as e:
        error_msg = str(e)
        print(f"No se pudo enviar el correo de solicitud de traslado: {error_msg}")
        return False, error_msg

# --- 3b. FUNCIÓN: Confirmación de Traslado de Curso Formalizado (Con Comprobante Oficial) ---
def enviar_correo_confirmacion_cambio_curso(correo_destino: str, id_matricula: int, nombre_alumno: str, nuevo_curso: str, pdf_buffer: Union[io.BytesIO, bytes] = None) -> tuple[bool, str]:
    if not EMAIL_REMITENTE or not PASSWORD_APP:
        print("[EMAIL] Credenciales de correo no configuradas. Correo de confirmación de traslado simulado/omitido.")
        return False, "Credenciales SMTP no configuradas."

    try:
        msg = EmailMessage()
        msg['Subject'] = '✅ Traslado de Curso Confirmado y Comprobante Oficial - SLEP Valparaíso'
        msg['From'] = EMAIL_REMITENTE
        msg['To'] = correo_destino
        
        cuerpo_correo = (
            f"Estimado(a) Apoderado(a),\n\n"
            f"Hemos recibido exitosamente la justificación del traslado.\n\n"
            f"El estudiante {nombre_alumno} ha sido asignado oficialmente al curso {nuevo_curso}.\n\n"
            f"📄 Adjunto a este correo encontrará el Comprobante Oficial de Traslado de Curso.\n\n"
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
        return True, "Correo de confirmación de traslado enviado correctamente."
    except Exception as e:
        error_msg = str(e)
        print(f"No se pudo enviar el correo de confirmación de traslado: {error_msg}")
        return False, error_msg

# Alias de compatibilidad
enviar_correo_cambio_curso = enviar_correo_solicitud_cambio_curso