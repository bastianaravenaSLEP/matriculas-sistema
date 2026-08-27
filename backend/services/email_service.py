import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import io

# 🔒 RECOMENDACIÓN: Mover estas credenciales a un archivo .env en el futuro
EMAIL_REMITENTE = "basti.aravena2001@gmail.com"
PASSWORD_APP = "kaea ccqf qyjd nedu"

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