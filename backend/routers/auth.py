# routers/auth.py
from fastapi import APIRouter
from pydantic import BaseModel
from schemas import LoginRequest

# Importamos la capa de servicio
from services import auth_service

router = APIRouter(tags=["Autenticación"])

# Conservamos el esquema aquí ya que es específico de la ruta
class GoogleLoginRequest(BaseModel):
    token: str
    rol: str # Recibimos el perfil que el usuario seleccionó en la pantalla

@router.post("/login")
def login(credenciales: LoginRequest):
    return auth_service.login_tradicional_service(credenciales)

@router.post("/login/google")
def login_google(credenciales: GoogleLoginRequest):
    return auth_service.login_google_service(credenciales)