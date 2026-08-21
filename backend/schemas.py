from pydantic import BaseModel
from typing import Optional
from datetime import date

class MatriculaCreate(BaseModel):
    numero_correlativo: int
    anio_escolar: int
    id_estudiante: int
    id_establecimiento: int
    fecha_matricula: date
    nivel_ensenanza: str
    curso: str
    id_usuario_ejecutor: int 

class MatriculaUpdate(BaseModel):
    estado: str
    fecha_retiro: Optional[date] = None
    motivo_retiro: Optional[str] = None
    observaciones: Optional[str] = None
    id_usuario_ejecutor: int 

class CuestionarioRetiro(BaseModel):
    rut_estudiante: str 
    motivo_real: str    

class LoginRequest(BaseModel):
    email: str
    password: str
    rol: str