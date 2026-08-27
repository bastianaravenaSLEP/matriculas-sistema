import io
import os
import textwrap
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

def generar_certificado_pdf(datos: dict, tipo_documento: str, codigo_verificacion: str = None):
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # 1. Definición de Textos según el Tipo
    if tipo_documento == 'RETIRO':
        titulo_pdf = "CERTIFICADO DE RETIRO ESCOLAR"
        texto_accion = "certifica el RETIRO OFICIAL del siguiente estudiante:"
    elif tipo_documento == 'CAMBIO_CURSO':
        titulo_pdf = "COMPROBANTE DE TRASLADO DE CURSO"
        texto_accion = "certifica el TRASLADO DE CURSO del siguiente estudiante:"
    else:
        titulo_pdf = "CERTIFICADO DE MATRÍCULA VERIFICADO" if codigo_verificacion else "CERTIFICADO DE ALUMNO REGULAR (RGM)"
        texto_accion = "certifica que el siguiente estudiante se encuentra MATRICULADO:"

    # 2. Rutas de Imágenes (Subimos un nivel para buscar en backend/static)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ruta_slep = os.path.join(base_dir, "static", "logo-slep.negro.png")
    ruta_mineduc = os.path.join(base_dir, "static", "mineduc.jpg")
    ruta_timbre = os.path.join(base_dir, "static", "mineduc.jpg") # O timbre_colegio.png

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
    c.drawCentredString(width / 2.0, height - 70, f"Establecimiento: {datos['nombre_colegio']} (RBD: {datos['rbd_colegio']})")
    
    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    c.setLineWidth(0.75)
    c.line(50, height - 95, width - 50, height - 95)

    c.setFont("Times-Bold", 15 if codigo_verificacion else 16)
    c.drawCentredString(width / 2.0, height - 135, titulo_pdf)

    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    hoy = datetime.now()
    c.setFont("Times-Roman", 12)
    c.drawString(50, height - 190, f"En Valparaíso, a {hoy.day} de {meses[hoy.month - 1]} de {hoy.year}")
    
    c.drawString(50, height - 220, "La Dirección del Establecimiento que suscribe,")
    c.drawString(50, height - 240, texto_accion)

    # Datos del Alumno
    c.setFont("Times-Bold", 12)
    c.drawString(100, height - 280, f"Nombre Completo  : {datos['nombre_completo']}")
    c.drawString(100, height - 300, f"RUT                            : {datos['rut']}")
    c.drawString(100, height - 320, f"Curso                         : {datos['curso']}")
    c.drawString(100, height - 340, f"Número de Folio     : {datos['folio']}")
    c.drawString(100, height - 360, f"Año Lectivo             : {datos['anio']}")

    c.setFont("Times-Roman", 12)
    c.drawString(50, height - 410, f"Es alumno/a del establecimiento {datos['nombre_colegio']} y su registro")
    
    # Lógica de Color para el Estado
    c.setFont("Times-Bold", 11)
    if tipo_documento == 'RETIRO':
        c.setFillColorRGB(0.8, 0.1, 0.1)
        estado_texto_final = f"Estado: RETIRADO (Fecha: {datos['fecha_retiro'] or 'No registrada'})"
    elif tipo_documento == 'CAMBIO_CURSO':
        c.setFillColorRGB(0.1, 0.3, 0.8)
        estado_texto_final = "Estado: TRASLADADO DE CURSO"
    else:
        c.setFillColorRGB(0.1, 0.6, 0.1)
        estado_texto_final = f"Estado: {datos['estado']}"
    
    c.drawString(50, height - 430, estado_texto_final)
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Times-Roman", 12)

    c.drawString(50, height - 460, "Se extiende el presente documento a petición de la interesada(o) para los fines")
    c.drawString(50, height - 480, "que estime conveniente.")

    # Justificación de Traslado
    if tipo_documento == 'CAMBIO_CURSO':
        motivo = datos['motivo_cambio'] or "No especificado por la administración"
        c.setFont("Times-Bold", 12)
        c.drawString(100, 390, "III. MOTIVO DEL TRASLADO")
        c.setFont("Times-Roman", 11)
        y_pos = 370
        for linea in textwrap.wrap(motivo, width=80):
            c.drawString(100, y_pos, linea)
            y_pos -= 15

    if os.path.exists(ruta_timbre):
        c.drawImage(ruta_timbre, width / 2.0 - 50, height - 600, width=100, height=100, mask='auto')
    
    c.setFont("Times-Bold", 11)
    c.drawCentredString(width / 2.0, height - 620, "DIRECTOR(A) DEL ESTABLECIMIENTO")
    c.setFont("Times-Roman", 9)
    c.drawCentredString(width / 2.0, height - 635, "Firma Electrónica Autorizada - SLEP Valparaíso")
    
    # Pie de página opcional para el validador público
    if codigo_verificacion:
        c.setStrokeColorRGB(0.1, 0.6, 0.1)
        c.setLineWidth(2)
        c.line(50, 110, width - 50, 110)
        c.setFont("Times-Bold", 10)
        c.setFillColorRGB(0.1, 0.6, 0.1)
        c.drawString(50, 90, "DOCUMENTO VÁLIDO Y AUTENTICADO")
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Times-Roman", 9)
        c.drawString(50, 75, f"Código de Verificación Único: {codigo_verificacion}")
        c.drawString(50, 60, "La integridad de este documento ha sido validada criptográficamente por la plataforma RGM.")

    c.save()
    buffer.seek(0)
    return buffer, titulo_pdf