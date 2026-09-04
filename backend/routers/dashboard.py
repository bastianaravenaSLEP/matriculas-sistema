# routers/dashboard.py
from fastapi import APIRouter, Depends
from typing import Optional
from security import obtener_usuario_actual

# Importamos la capa de servicio
from services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard y Reportes"])

@router.get("/estadisticas")
def obtener_estadisticas_dashboard(
    establecimiento_id: Optional[int] = None, 
    anio: Optional[int] = None, 
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    # Pasamos los filtros recibidos directamente al servicio
    return dashboard_service.obtener_estadisticas_dashboard_db(establecimiento_id, anio)