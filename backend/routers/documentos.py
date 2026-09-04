# routers/documentos.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from fastapi.responses import StreamingResponse

from security import obtener_usuario_actual

# Importamos la capa de servicio
from services import documento_service

router = APIRouter(prefix="/documentos", tags=["Emisión de Documentos"])

class EmisionRequest(BaseModel):
    id_matricula: int
    tipo_documento: str
    destinatarios: List[str]

@router.post("/emitir")
def emitir_documento(req: EmisionRequest, usuario_actual: dict = Depends(obtener_usuario_actual)):
    return documento_service.emitir_documento_service(req.id_matricula, req.tipo_documento, req.destinatarios)

@router.get("/verificar")
def verificar_certificado_publico(rut: str, codigo: str):
    # El servicio valida el hash y nos devuelve el archivo PDF generado en memoria
    pdf_buffer, rut_alumno = documento_service.verificar_certificado_service(rut, codigo)
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"inline; filename=Verificado_{rut_alumno}.pdf"}
    )

@router.get("/comprobante/{rut}")
def descargar_comprobante_ingreso(rut: str, usuario_actual: dict = Depends(obtener_usuario_actual)):
    # El servicio encuentra la matrícula, inyecta al usuario y nos devuelve el PDF listo
    pdf_buffer, rut_alumno = documento_service.descargar_comprobante_ingreso_service(rut, usuario_actual)
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=Comprobante_Ingreso_{rut_alumno}.pdf"}
    )