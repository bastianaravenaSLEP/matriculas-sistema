# routers/establecimientos.py
from fastapi import APIRouter, Depends
from security import obtener_usuario_actual

# Importamos la capa de servicio
from services import establecimientos_service

router = APIRouter(prefix="/establecimientos", tags=["Establecimientos Educacionales"])

@router.get("")
def obtener_establecimientos(usuario_actual: dict = Depends(obtener_usuario_actual)):
    # Delegamos la consulta a la base de datos al servicio
    return establecimientos_service.obtener_establecimientos_db()