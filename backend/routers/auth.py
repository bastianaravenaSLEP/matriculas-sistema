from fastapi import APIRouter, HTTPException
from database import get_db_connection
from schemas import LoginRequest
from security import verificar_password, crear_token_acceso, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

router = APIRouter(tags=["Autenticación"])

@router.post("/login")
def login(credenciales: LoginRequest):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id_usuario, email_institucional, nombre, rol, id_establecimiento, activo, password_hash FROM usuario WHERE email_institucional = %s", (credenciales.email,))
        usuario_db = cur.fetchone()
        
        if not usuario_db or not usuario_db[5] or not verificar_password(credenciales.password, usuario_db[6]):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas o usuario inactivo")
            
        rol_db = usuario_db[3]
        rol_solicitado = credenciales.rol.upper() # Nos aseguramos de que venga en mayúsculas para comparar
        
        # LÓGICA FLEXIBLE DE ROLES: Permitimos que los visualizadores entren a sus respectivos portales
        rol_valido = False
        
        if rol_solicitado == "SLEP" and rol_db in ["SLEP", "admin_slep", "Visualizador_SLEP"]:
            rol_valido = True
        elif (rol_solicitado == "COLEGIO" or rol_solicitado == "ESTABLECIMIENTO") and rol_db in ["Colegio", "Visualizador_Colegio"]:
            rol_valido = True
        elif rol_solicitado == rol_db.upper():
            rol_valido = True

        if not rol_valido:
            raise HTTPException(status_code=403, detail="No tienes permisos para acceder a este portal con tu perfil actual.")

        token = crear_token_acceso(
            {"sub": usuario_db[1], "id_usuario": usuario_db[0], "rol": usuario_db[3], "id_establecimiento": usuario_db[4]}, 
            timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return {
            "access_token": token, 
            "token_type": "bearer", 
            "usuario": {"nombre": usuario_db[2], "rol": usuario_db[3], "id_establecimiento": usuario_db[4]}
        }
    finally:
        cur.close()
        conn.close()

# ⚠️ AQUÍ PEGARÁS EL CLIENT ID CUANDO TE LO ENTREGUEN
GOOGLE_CLIENT_ID = "AQUI_IRA_TU_CLIENT_ID_DE_GOOGLE.apps.googleusercontent.com"

class GoogleLoginRequest(BaseModel):
    token: str
    rol: str # Recibimos el perfil que el usuario seleccionó en la pantalla

@router.post("/login/google")
def login_google(credenciales: GoogleLoginRequest):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Validar matemáticamente el token con los servidores de Google
        try:
            idinfo = id_token.verify_oauth2_token(
                credenciales.token, 
                google_requests.Request(), 
                GOOGLE_CLIENT_ID
            )
            email_google = idinfo['email']
            
            # (Opcional) Validación estricta de dominio Workspace
            # if not email_google.endswith("@slepvalparaiso.cl"):
            #     raise HTTPException(status_code=403, detail="Debe usar un correo institucional del SLEP.")
                
        except ValueError:
            raise HTTPException(status_code=401, detail="Token de Google inválido o expirado.")

        # 2. Buscar el correo validado en tu base de datos RGM
        cur.execute("SELECT id_usuario, email_institucional, nombre, rol, id_establecimiento, activo FROM usuario WHERE email_institucional = %s", (email_google,))
        usuario_db = cur.fetchone()
        
        if not usuario_db or not usuario_db[5]:
            raise HTTPException(status_code=403, detail="Usuario inactivo o no registrado en el sistema RGM.")
            
        rol_db = usuario_db[3]
        rol_solicitado = credenciales.rol.upper()
        
        # 3. Lógica de validación de roles (igual que el login tradicional)
        rol_valido = False
        if rol_solicitado == "SLEP" and rol_db in ["SLEP", "admin_slep", "Visualizador_SLEP"]:
            rol_valido = True
        elif (rol_solicitado == "COLEGIO" or rol_solicitado == "ESTABLECIMIENTO") and rol_db in ["Colegio", "Visualizador_Colegio"]:
            rol_valido = True
        elif rol_solicitado == rol_db.upper():
            rol_valido = True
            
        if not rol_valido:
            raise HTTPException(status_code=403, detail="Tu correo es válido, pero no tienes permisos para acceder a este portal.")
        
        # 4. Generar el Token interno del sistema
        token_interno = crear_token_acceso(
            {"sub": usuario_db[1], "id_usuario": usuario_db[0], "rol": usuario_db[3], "id_establecimiento": usuario_db[4]}, 
            timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return {
            "access_token": token_interno, 
            "token_type": "bearer", 
            "usuario": {"nombre": usuario_db[2], "rol": usuario_db[3], "id_establecimiento": usuario_db[4]}
        }
    finally:
        cur.close()
        conn.close()