# routers/reportes.py
from fastapi import APIRouter, Depends
from typing import Optional
from security import obtener_usuario_actual

# Importamos la capa de servicio
from services import reporte_service

router = APIRouter(prefix="/reporte", tags=["Reportes y Auditoría SLEP"])

@router.get("/auditoria-matriculas", summary="Obtener registro largo de auditoría clasificado")
def obtener_auditoria_matriculas(
    establecimiento_id: Optional[int] = None,
    tipo_movimiento: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    # Delegamos toda la validación y ejecución SQL al servicio
    return reporte_service.obtener_auditoria_matriculas_db(
        establecimiento_id, 
        tipo_movimiento, 
        fecha_inicio, 
        fecha_fin, 
        usuario_actual
    )