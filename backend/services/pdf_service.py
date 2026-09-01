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

    # Rutas de Imágenes (Ajustadas para abarcar Mineduc y SLEP)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ruta_mineduc = os.path.join(base_dir, "static", "mineduc.jpg")
    ruta_slep = os.path.join(base_dir, "static", "logo-slep.negro.png")
    ruta_marca_agua = os.path.join(base_dir, "static", "logo-slep.negro.opaco.png")

    # ==========================================
    # 1. MARCA DE AGUA (Fondo Centrado)
    # ==========================================
    if os.path.exists(ruta_marca_agua):
        img_width = 450
        img_height = 225
        c.saveState()
        c.setFillColorRGB(0.95, 0.95, 0.95)
        c.drawImage(ruta_marca_agua, (width - img_width) / 2.0, (height - img_height) / 2.0 - 40, width=img_width, height=img_height, mask='auto')
        c.restoreState()
    elif os.path.exists(ruta_slep): # Respaldo por si usas el logo SLEP como marca de agua
        c.saveState()
        c.drawImage(ruta_slep, (width - 350) / 2.0, (height - 175) / 2.0 + 30, width=350, height=175, mask='auto')
        c.restoreState()

    # ==========================================
    # 2. ENCABEZADO SUPERIOR IZQUIERDO (MINEDUC)
    # ==========================================
    if os.path.exists(ruta_mineduc):
        c.drawImage(ruta_mineduc, 60, height - 100, width=70, height=70, mask='auto')

    # ==========================================
    # 3. TÍTULOS PRINCIPALES
    # ==========================================
    anio_escolar = datos.get('anio', datetime.now().year)
    nombre_colegio = str(datos.get('nombre_colegio', 'ESTABLECIMIENTO')).split('(')[0].strip().upper()
    

    if tipo_documento == 'RETIRO':
        titulo_pdf = f"CERTIFICADO DE RETIRO ESCOLAR"
    elif tipo_documento == 'CAMBIO_CURSO':
        titulo_pdf = f"COMPROBANTE DE TRASLADO DE CURSO"
    elif tipo_documento == 'COMPROBANTE_INGRESO': 
        titulo_pdf = f"COMPROBANTE DE INGRESO DE MATRÍCULA"
    else:
        titulo_pdf = f"CERTIFICADO DE MATRÍCULA"

    c.setFont("Times-Bold", 16)
    c.setFillColorRGB(0, 0, 0)
    c.drawCentredString(width / 2.0, height - 120, titulo_pdf)

    c.setFont("Times-Bold", 11)
    c.setFillColorRGB(0.3, 0.3, 0.3)
    c.drawCentredString(width / 2.0, height - 140, f"{nombre_colegio} ")
    c.setFillColorRGB(0, 0, 0)

    # ==========================================
    # 4. PÁRRAFOS CONTINUOS Y FORMALES
    # ==========================================
    c.setFont("Times-Roman", 11)
    
    nombre_alumno = datos.get('nombre_completo', '').upper()
    rut_alumno = datos.get('rut', '').upper()
    curso = datos.get('curso', '').upper()
    domicilio = str(datos.get('domicilio', '')).upper()
    nombre_apoderado = datos.get('nombre_apoderado', '').upper()
    rut_apoderado = datos.get('rut_apoderado', '').upper()

    # Párrafo 1: Certificación
    if tipo_documento == 'RETIRO':
        texto_principal = f"Certifico que el niño (a) / alumno (a): {nombre_alumno}, Rut: {rut_alumno}, domiciliado en {domicilio}, ha sido RETIRADO (A) del curso {curso} para el año {anio_escolar} del {nombre_colegio}; dependiente del Servicio Local de Educación Pública Valparaíso."
    elif tipo_documento == 'CAMBIO_CURSO':
        texto_principal = f"Certifico que el niño (a) / alumno (a): {nombre_alumno}, Rut: {rut_alumno}, domiciliado en {domicilio}, ha sido TRASLADADO (A) de curso exitosamente hacia el {curso} para el año {anio_escolar} del {nombre_colegio}; dependiente del Servicio Local de Educación Pública Valparaíso."
    elif tipo_documento == 'COMPROBANTE_INGRESO': 
        texto_principal = f"Se certifica que el estudiante: {nombre_alumno}, Rut: {rut_alumno}, domiciliado en {domicilio}, ha sido ingresado exitosamente al sistema para ser matriculado (a) en el curso {curso} para el año escolar {anio_escolar} en el {nombre_colegio}; dependiente del Servicio Local de Educación Pública Valparaíso."
    else:
        texto_principal = f"Certifico que el niño (a) / alumno (a): {nombre_alumno}, Rut: {rut_alumno}, domiciliado en {domicilio}, es Alumno (a) Regular matriculado para el año {anio_escolar} en el curso {curso} del {nombre_colegio}; dependiente del Servicio Local de Educación Pública Valparaíso."

    # Párrafo 2: Constancia y Fecha
    hoy = datetime.now()
    fecha_str = hoy.strftime('%d/%m/%Y a las %H:%M:%S hrs.')

    if tipo_documento == 'COMPROBANTE_INGRESO': # 🌟 NUEVO (Con advertencia explícita)
        texto_footer = f"Se deja constancia oficial que el trámite fue gestionado junto al Apoderado (a) titular: {nombre_apoderado}, Rut: {rut_apoderado}. El ingreso a la plataforma fue realizado con fecha {fecha_str}. IMPORTANTE: Este documento es un comprobante de uso administrativo y no constituye el Certificado de Matrícula Oficial."
    else:
        texto_footer = f"Se extiende el presente certificado a petición de la parte interesada, dejando constancia oficial de que el registro se encuentra activo y validado en el sistema del establecimiento a fecha {fecha_str}, trámite validado junto al Apoderado (a) titular: {nombre_apoderado}, Rut: {rut_apoderado}, para los fines que estime conveniente."

    # Dibujado del texto manteniendo el justificado por márgenes
    y_pos = height - 200
    for linea in textwrap.wrap(texto_principal, width=95):
        c.drawString(60, y_pos, linea)
        y_pos -= 16
        
    y_pos -= 20 # Espacio extra de separación entre párrafos
    
    for linea in textwrap.wrap(texto_footer, width=95):
        c.drawString(60, y_pos, linea)
        y_pos -= 16

    # ==========================================
    # 5. TIMBRE Y FIRMA (Centro Abajo)
    # ==========================================
    c.setFont("Times-Bold", 9)
    c.drawCentredString(width / 2.0, 200, "___________________________________")
    c.drawCentredString(width / 2.0, 185, "TIMBRE Y FIRMA DIRECCIÓN")

  # ==========================================
    # 6. SECCIÓN INFERIOR: LOGO SLEP + VERIFICACIÓN
    # ==========================================
    if codigo_verificacion:
        # Línea divisoria superior del bloque inferior
        c.setStrokeColorRGB(0.6, 0.6, 0.6)
        c.setLineWidth(1)
        c.line(50, 115, width - 50, 115)
        
        # --- COLUMNA IZQUIERDA: Logo e Información SLEP ---
        if os.path.exists(ruta_slep):
            c.drawImage(ruta_slep, 50, 72, width=60, height=30, mask='auto')
        
        c.setFont("Times-Bold", 6.5)
        c.setFillColorRGB(0, 0, 0)
        c.drawString(50, 62, "https://www.slepvalparaiso.gob.cl/")
        c.setFont("Times-Roman", 6.5)
        c.drawString(50, 52, "Blanco 937, 2° piso, Valparaíso")

        # --- COLUMNA DERECHA: Texto de Verificación ---
        c.setFont("Times-Bold", 8)
        c.drawString(320, 92, "VERIFICACIÓN DE AUTENTICIDAD DOCUMENTAL")
        
        c.setFont("Times-Roman", 8)
        c.drawString(320, 82, f"Código de Verificación Único: {codigo_verificacion}")
        c.drawString(320, 72, "Verifique la validez de este certificado ingresando a: http://localhost:5173/verificar")
        c.drawString(320, 62, "e ingresando el código proporcionado junto al RUT del estudiante.")

    c.save()
    buffer.seek(0)
    return buffer, titulo_pdf