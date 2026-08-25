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
        cur.execute("""
            SELECT m.numero_correlativo, m.anio_escolar, m.nivel_ensenanza, m.curso, m.fecha_matricula, 
                   e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno, e.sexo, 
                   a.rut_pasaporte, a.nombres, a.apellido_paterno, a.apellido_materno, a.telefono, 
                   a.correo_electronico, m.estado, m.fecha_retiro, m.motivo_cambio_curso
            FROM matricula m 
            INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante 
            LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado 
            WHERE m.id_matricula = %s
        """, (id_matricula,))
        datos = cur.fetchone()
        
        if not datos: raise HTTPException(status_code=404, detail="Matrícula no encontrada")

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        if tipo == 'RETIRO':
            titulo_pdf = "CERTIFICADO DE RETIRO ESCOLAR"
            texto_accion = "certifica el RETIRO OFICIAL del siguiente estudiante:"
        elif tipo == 'CAMBIO_CURSO':
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
        c.drawString(100, 595, f"Nombre: {datos[6]} {datos[7]} {datos[8]}")
        c.drawString(100, 575, f"RUT: {datos[5]}")
        c.drawString(100, 555, f"Sexo : {datos[9] or 'No registrado'}")
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, 520, "II. ANTECEDENTES ACADÉMICOS Y ESTADO")
        c.setFont("Helvetica", 11)
        c.drawString(100, 500, f"Año Escolar: {datos[1]}")
        c.drawString(100, 480, f"Nivel: {datos[2]}")
        c.drawString(100, 460, f"Curso: {datos[3]}")
        
        # Estado dinámico con color
        c.setFont("Helvetica-Bold", 11)
        if tipo == 'RETIRO':
            c.setFillColorRGB(0.8, 0.1, 0.1)
            estado_texto = f"Estado: RETIRADO (Fecha: {datos[17] or 'No registrada'})"
        elif tipo == 'CAMBIO_CURSO':
            c.setFillColorRGB(0.1, 0.3, 0.8)
            estado_texto = "Estado: TRASLADADO DE CURSO"
        else:
            c.setFillColorRGB(0.1, 0.6, 0.1)
            estado_texto = f"Estado: {datos[16]}"
            
        c.drawString(100, 430, estado_texto)
        c.setFillColorRGB(0, 0, 0) # Volver a negro
        
        # Dibujar motivo si es cambio de curso
        if tipo == 'CAMBIO_CURSO':
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
        return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename={tipo}_{datos[5]}.pdf"})
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@router.post("/carga-masiva")
async def carga_masiva_sige(archivo: UploadFile = File(...), usuario_actual: dict = Depends(verificar_escritura)):
    # Aquí puedes pegar la lógica de pandas pd.read_html exacta que ya tienes funcionando
    return {"mensaje": "Endpoint de carga masiva modularizado correctamente."}