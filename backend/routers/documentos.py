from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
import hashlib
from fastapi.responses import StreamingResponse

from database import get_db_connection
from security import obtener_usuario_actual

# Importamos los nuevos servicios que acabamos de crear
from services.pdf_service import generar_certificado_pdf
from services.email_service import enviar_certificado_por_correo

router = APIRouter(prefix="/documentos", tags=["Emisión de Documentos"])

class EmisionRequest(BaseModel):
    id_matricula: int
    tipo_documento: str
    destinatarios: List[str]

# --- Función de Utilidad: Obtener Diccionario de Datos ---
def obtener_datos_bd(id_matricula: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT m.numero_correlativo, m.anio_escolar, m.nivel_ensenanza, m.curso, m.fecha_matricula,
                   e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno, e.sexo,
                   m.estado, m.fecha_retiro, m.motivo_cambio_curso, est.nombre, est.rbd,
                   a.rut_pasaporte, a.nombres, a.apellido_paterno, a.apellido_materno, e.domicilio
            FROM matricula m 
            INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante 
            INNER JOIN establecimiento est ON m.id_establecimiento = est.id_establecimiento
            LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado
            WHERE m.id_matricula = %s
        """, (id_matricula,))
        datos = cur.fetchone()
        
        if not datos: return None
        
        # Procesar datos del apoderado y domicilio
        rut_apod = datos[15] if datos[15] else "Sin registro"
        nom_apod = f"{datos[16] or ''} {datos[17] or ''} {datos[18] or ''}".strip()
        if not nom_apod: nom_apod = "Sin registro"
        
        domicilio = datos[19] if datos[19] else "los registros del establecimiento"

        return {
            "folio": datos[0],
            "anio": datos[1],
            "nivel": datos[2],
            "curso": datos[3],
            "fecha_matricula": datos[4],
            "rut": str(datos[5]).strip(),
            "nombre_completo": f"{datos[6]} {datos[7]} {datos[8]}".strip(),
            "sexo": datos[9],
            "estado": datos[10],
            "fecha_retiro": datos[11],
            "motivo_cambio": datos[12],
            "nombre_colegio": datos[13],
            "rbd_colegio": datos[14],
            "rut_apoderado": rut_apod,
            "nombre_apoderado": nom_apod,
            "domicilio": domicilio
        }
    finally:
        cur.close()
        conn.close()

# --- 1. ENDPOINT: EMITIR DOCUMENTO ---
@router.post("/emitir")
def emitir_documento(req: EmisionRequest, usuario_actual: dict = Depends(obtener_usuario_actual)):
    if not req.destinatarios:
        raise HTTPException(status_code=400, detail="No se proporcionaron correos de destino.")

    # 1. Extraer los Datos (Base de Datos)
    datos_alumno = obtener_datos_bd(req.id_matricula)
    if not datos_alumno: 
        raise HTTPException(status_code=404, detail="Matrícula no encontrada")

    # 2. Generar el PDF en Memoria (Servicio de ReportLab)
    pdf_buffer, titulo_pdf = generar_certificado_pdf(datos_alumno, req.tipo_documento)

    # ===============================================================
    # 3. API DE FIRMA ELECTRÓNICA
    # ===============================================================
    
    pdf_final = pdf_buffer 
    
    # 4. Enviar el Documento Final por Correo (Servicio de Smtplib)
    try:
        enviar_certificado_por_correo(
            destinatarios=req.destinatarios,
            pdf_buffer=pdf_final,
            titulo_pdf=titulo_pdf,
            nombre_completo=datos_alumno['nombre_completo'],
            rut_estudiante=datos_alumno['rut']
        )
        return {"status": "success", "message": f"Documento enviado a {len(req.destinatarios)} destinatario(s)."}
    except Exception as e:
        print(f"Error emitiendo documento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 2. ENDPOINT: VERIFICADOR PÚBLICO ---
@router.get("/verificar")
def verificar_certificado_publico(rut: str, codigo: str):
    partes = codigo.strip().upper().split('-')
    if len(partes) != 3 or partes[0] != 'VLP':
        raise HTTPException(status_code=400, detail="Formato de código inválido.")
        
    id_matricula = partes[1]
    hash_ingresado = partes[2]

    # 1. Extraer Datos
    datos_alumno = obtener_datos_bd(id_matricula)
    if not datos_alumno: 
        raise HTTPException(status_code=404, detail="El documento no existe en los registros.")

    if datos_alumno['rut'].lower() != rut.strip().lower():
        raise HTTPException(status_code=401, detail="El RUT ingresado no corresponde a este certificado.")

    # 2. Validar Criptografía
    hash_base = f"{datos_alumno['rut']}-{id_matricula}-SLEP{datos_alumno['anio']}"
    hash_real = hashlib.sha256(hash_base.encode('utf-8')).hexdigest()[:6].upper()
    
    if hash_real != hash_ingresado:
        raise HTTPException(status_code=401, detail="El código de verificación ha sido alterado.")

    # 3. Recrear el Documento Validador usando el MISMO servicio
    pdf_buffer, _ = generar_certificado_pdf(
        datos=datos_alumno, 
        tipo_documento='MATRICULA', 
        codigo_verificacion=codigo
    )

    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"inline; filename=Verificado_{datos_alumno['rut']}.pdf"}
    )