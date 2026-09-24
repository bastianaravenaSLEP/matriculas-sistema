# routers/estudiantes.py
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional
from pydantic import BaseModel
from security import obtener_usuario_actual, verificar_escritura

from services import estudiante_service

router = APIRouter(prefix="/estudiante", tags=["Estudiantes"])

class CrearEstudianteRequest(BaseModel):
    # 1. Datos Personales
    run: str
    nombres: str
    apellido_paterno: str
    apellido_materno: str
    fecha_nacimiento: str
    sexo: str
    domicilio: str
    latitud: Optional[str] = ""
    longitud: Optional[str] = ""
    pais_origen_estudiante: Optional[str] = "Chile"
    doc_extranjero_estudiante: Optional[str] = None
    
    # 2. Apoderado Titular
    run_apoderado: str
    nombres_apoderado: str
    apellido_paterno_apoderado: str
    apellido_materno_apoderado: str
    domicilio_apoderado: str
    telefono_apoderado: str
    correo_apoderado: str
    relacion_estudiante: str
    ruta_documento_tutor: Optional[str] = None
    pais_origen_apoderado: Optional[str] = "Chile"
    doc_extranjero_apoderado: Optional[str] = None

    # 3. Apoderado Suplente (Opcional)
    tiene_suplente: Optional[bool] = False
    run_suplente: Optional[str] = None
    nombres_suplente: Optional[str] = None
    apellido_paterno_suplente: Optional[str] = None
    apellido_materno_suplente: Optional[str] = None
    domicilio_suplente: Optional[str] = None
    telefono_suplente: Optional[str] = None
    correo_suplente: Optional[str] = None
    relacion_suplente: Optional[str] = None

    # 4. Ficha Médica y Salud
    sistema_salud: Optional[str] = "FONASA"
    letra_fonasa: Optional[str] = "A"
    cesfam: Optional[str] = "No informado"
    centro_emergencia: Optional[str] = "No informado"
    alergias: Optional[str] = ""
    diagnostico_medico: Optional[str] = "No"
    medico_tratante: Optional[str] = "No informado"
    medicamento: Optional[str] = ""
    nee: Optional[str] = "No"
    nee_tipo: Optional[str] = "No aplica"


class ActualizarEstudianteRequest(BaseModel):
    # 1. Domicilio Estudiante
    domicilio_estudiante: Optional[str] = None
    
    # 2. Apoderado Titular
    rut_apoderado: Optional[str] = None
    nombres_apoderado: Optional[str] = None
    apellido_paterno_apoderado: Optional[str] = None
    apellido_materno_apoderado: Optional[str] = None
    domicilio_apoderado: Optional[str] = None
    telefono_apoderado: Optional[str] = None
    correo_apoderado: Optional[str] = None
    relacion_apoderado: Optional[str] = None

    # 3. Apoderado Suplente
    tiene_suplente: Optional[bool] = False
    rut_suplente: Optional[str] = None
    nombres_suplente: Optional[str] = None
    apellido_paterno_suplente: Optional[str] = None
    apellido_materno_suplente: Optional[str] = None
    domicilio_suplente: Optional[str] = None
    telefono_suplente: Optional[str] = None
    correo_suplente: Optional[str] = None
    relacion_suplente: Optional[str] = None

    # 4. Ficha Médica
    actualizar_salud: Optional[bool] = False
    sistema_salud: Optional[str] = None
    letra_fonasa: Optional[str] = None
    cesfam: Optional[str] = None
    centro_emergencia: Optional[str] = None
    alergias: Optional[str] = None
    diagnostico_medico: Optional[str] = None
    medico_tratante: Optional[str] = None
    medicamento: Optional[str] = None
    nee: Optional[str] = None
    nee_tipo: Optional[str] = None

@router.get("")
def obtener_estudiantes(establecimiento_id: Optional[int] = None, usuario_actual: dict = Depends(obtener_usuario_actual)):
    rol = usuario_actual.get("rol")
    if rol in ["Colegio", "Visualizador_Colegio"]:
        establecimiento_id = usuario_actual.get("id_establecimiento")       
    return estudiante_service.obtener_estudiantes_db(establecimiento_id, rol)

@router.get("/{rut}")
def obtener_ficha_estudiante(rut: str, usuario_actual: dict = Depends(obtener_usuario_actual)):
    return estudiante_service.obtener_ficha_estudiante_db(rut)

@router.post("")
def crear_estudiante(payload: CrearEstudianteRequest, usuario_actual: dict = Depends(verificar_escritura)):
    return estudiante_service.crear_estudiante_db(payload.model_dump())

@router.put("/{rut}")
def actualizar_datos_estudiante(rut: str, req: ActualizarEstudianteRequest, usuario_actual: dict = Depends(verificar_escritura)):
    id_usuario = usuario_actual.get("id_usuario")
    return estudiante_service.actualizar_datos_estudiante_db(rut, req, id_usuario)

@router.post("/{rut}/documento-tutor")
async def subir_documento_tutor(
    rut: str,
    archivo: UploadFile = File(...),
    usuario_actual: dict = Depends(verificar_escritura)
):
    """
    Sube el archivo PDF de la resolución/acreditación de tutor legal al almacenamiento de objetos o local.
    """
    contenido = await archivo.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo enviado está vacío.")
    return estudiante_service.guardar_documento_tutor_db(
        rut, contenido, archivo.filename, usuario_actual
    )
