from fastapi import APIRouter, HTTPException
from database import get_db_connection
from schemas import LoginRequest
from security import verificar_password, crear_token_acceso, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta

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
            
        if usuario_db[3] != credenciales.rol:
            raise HTTPException(status_code=403, detail="No tienes permisos para este rol.")

        token = crear_token_acceso({"sub": usuario_db[1], "id_usuario": usuario_db[0], "rol": usuario_db[3], "id_establecimiento": usuario_db[4]}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        
        return {"access_token": token, "token_type": "bearer", "usuario": {"nombre": usuario_db[2], "rol": usuario_db[3], "id_establecimiento": usuario_db[4]}}
    finally:
        cur.close()
        conn.close()