from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import date
import io
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import smtplib
from email.message import EmailMessage
from fastapi import UploadFile, File
import csv
import codecs
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, status
from fastapi.security import OAuth2PasswordBearer
import pandas as pd

# ============================================================================
# CONFIGURACIÓN DE SEGURIDAD (JWT Y BCRYPT)
# ============================================================================
SECRET_KEY = "slep_valparaiso_clave_secreta_super_segura"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120 

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verificar_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def obtener_password_hash(password):
    return pwd_context.hash(password)

def crear_token_acceso(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

class LoginRequest(BaseModel):
    email: str
    password: str
    rol: str

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def obtener_usuario_actual(token: str = Depends(oauth2_scheme)):
    credenciales_excepcion = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales. Token inválido o expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credenciales_excepcion
        return payload
    except JWTError:
        raise credenciales_excepcion

# =====================================================================
# 1. CONFIGURACIÓN INICIAL Y BASE DE DATOS
# =====================================================================
app = FastAPI(title="API Sistema de Matrículas SLEP Valparaíso")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

DB_CONFIG = {
    "dbname": "sistema_matriculas_sleep",
    "user": "postgres",       
    "password": "admin", 
    "host": "localhost",
    "port": "5432",
    "client_encoding": "utf8"
}

def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.set_client_encoding('UTF8')
        return conn
    except Exception as e:
        print("¡ALERTA!: PostgreSQL rechazó la conexión. Revisa que el usuario y la contraseña en DB_CONFIG sean correctos.")
        raise e

# =====================================================================
# 2. MODELOS DE DATOS (PYDANTIC)
# =====================================================================
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


# ============================================================================
# MÓDULO DE AUTENTICACIÓN
# ============================================================================
@app.post("/login", summary="Iniciar sesión y obtener token JWT")
def login(credenciales: LoginRequest):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id_usuario, email_institucional, nombre, rol, id_establecimiento, activo, password_hash 
            FROM usuario 
            WHERE email_institucional = %s
        """, (credenciales.email,))
        
        usuario_db = cur.fetchone()
        
        if not usuario_db:
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")

        (id_usuario, email, nombre, rol, id_establecimiento, activo, password_hash) = usuario_db

        if rol != credenciales.rol:
            raise HTTPException(
                status_code=403, 
                detail=f"Acceso denegado: Tus credenciales son correctas, pero no tienes permisos para ingresar como '{credenciales.rol}'."
            )
        
        if not activo:
            raise HTTPException(status_code=403, detail="Usuario inactivo. Contacte al administrador.")
            
        if not password_hash or not verificar_password(credenciales.password, password_hash):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
            
        tiempo_expiracion = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        token_data = {
            "sub": email,
            "id_usuario": id_usuario,
            "rol": rol,
            "id_establecimiento": id_establecimiento
        }
        
        token = crear_token_acceso(data=token_data, expires_delta=tiempo_expiracion)
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "usuario": {
                "nombre": nombre,
                "rol": rol,
                "id_establecimiento": id_establecimiento
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {e}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()


# =====================================================================
# 3. MÓDULO DE ESTUDIANTES Y APODERADOS
# =====================================================================
@app.get("/estudiante")
def obtener_estudiantes(
    establecimiento_id: Optional[int] = None, 
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        query = """
            SELECT DISTINCT e.id_estudiante, e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno
            FROM estudiante e
            LEFT JOIN matricula m ON e.id_estudiante = m.id_estudiante
            WHERE 1=1
        """
        parametros = []
        
        if establecimiento_id is not None:
            query += " AND m.id_establecimiento = %s"
            parametros.append(establecimiento_id)
            
        query += " ORDER BY e.apellido_paterno ASC"

        cur.execute(query, tuple(parametros))
        filas = cur.fetchall()
        
        estudiantes = []
        for fila in filas:
            nombre_completo = f"{fila[2]} {fila[3]} {fila[4] or ''}".strip()
            estudiantes.append({
                "id": fila[0],
                "run": fila[1],
                "nombre_completo": nombre_completo
            })
            
        return estudiantes

    except Exception as e:
        print(f"Error al obtener estudiantes: {e}")
        raise HTTPException(status_code=500, detail="Error interno de la base de datos")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()


@app.get("/estudiante/{rut}")
def obtener_ficha_estudiante(rut: str):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT 
                e.id_estudiante, e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno, e.fecha_nacimiento, e.domicilio,
                a.rut_pasaporte, a.nombres, a.apellido_paterno, a.apellido_materno, a.telefono, a.correo_electronico
            FROM estudiante e
            LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado
            WHERE e.run_ipe = %s
        """, (rut,))
        estudiante_db = cur.fetchone()

        if not estudiante_db:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado en el sistema RGM.")

        cur.execute("""
            SELECT id_matricula, anio_escolar, nivel_ensenanza, curso, estado, fecha_matricula, observaciones
            FROM matricula
            WHERE id_estudiante = %s
            ORDER BY anio_escolar DESC
        """, (estudiante_db[0],))
        historial_db = cur.fetchall()

        respuesta = {
            "personal": {
                "id": estudiante_db[0],
                "run": estudiante_db[1],
                "nombres": estudiante_db[2],
                "apellidos": f"{estudiante_db[3]} {estudiante_db[4]}",
                "fecha_nacimiento": str(estudiante_db[5]) if estudiante_db[5] else "No registrada",
                "domicilio": estudiante_db[6] if estudiante_db[6] else "Sin registrar"
            },
            "apoderado": {
                "rut": estudiante_db[7] if estudiante_db[7] else "Sin registrar",
                "nombre": f"{estudiante_db[8]} {estudiante_db[9]} {estudiante_db[10]}" if estudiante_db[8] else "Pendiente de vincular",
                "telefono": estudiante_db[11] if estudiante_db[11] else "-",
                "correo": estudiante_db[12] if estudiante_db[12] else "-"
            },
            "historial": []
        }
        for fila in historial_db:
            respuesta["historial"].append({
                "id": fila[0],
                "anio": fila[1],
                "establecimiento": "Establecimiento SLEP", 
                "curso": fila[3],
                "estado": fila[4],
                "tipo_movimiento": "Matrícula",
                "observaciones": fila[6] if fila[6] else "Sin observaciones registradas." # <--- Añadimos las observaciones
            })

        cur.close()
        conn.close()
        return respuesta
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error en BD: {e}")
        raise HTTPException(status_code=500, detail="Error interno al buscar en la base de datos.")

@app.post("/estudiante")
def crear_estudiante(payload: dict):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        run_apod = payload.get("run_apoderado")
        cur.execute("SELECT id_apoderado FROM apoderado WHERE rut_pasaporte = %s", (run_apod,))
        apod_db = cur.fetchone()
        
        if apod_db:
            id_apoderado = apod_db[0]
        else:
            cur.execute("""
                INSERT INTO apoderado (rut_pasaporte, nombres, apellido_paterno, apellido_materno, domicilio, telefono, correo_electronico)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id_apoderado
            """, (
                run_apod, payload.get("nombres_apoderado"), payload.get("apellido_paterno_apoderado"), 
                payload.get("apellido_materno_apoderado"), payload.get("domicilio_apoderado"), 
                payload.get("telefono_apoderado"), payload.get("correo_apoderado")
            ))
            id_apoderado = cur.fetchone()[0]

        cur.execute("""
            INSERT INTO estudiante (
                run_ipe, nombres, apellido_paterno, apellido_materno, 
                fecha_nacimiento, sexo, domicilio, latitud, longitud, id_apoderado_principal
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id_estudiante
        """, (
            payload.get("run"), 
            payload.get("nombres"), 
            payload.get("apellido_paterno"), 
            payload.get("apellido_materno"), 
            payload.get("fecha_nacimiento"),
            payload.get("sexo"),
            payload.get("domicilio"),
            payload.get("latitud"), 
            payload.get("longitud"), 
            id_apoderado
        ))
        
        nuevo_id_est = cur.fetchone()[0]
        
        conn.commit()
        cur.close()
        conn.close()
        return {"mensaje": "Estudiante y Apoderado guardados exitosamente", "id_estudiante": nuevo_id_est}
    except Exception as e:
        print(f"Error BD: {e}")
        raise HTTPException(status_code=500, detail=f"Error al guardar: {e}")

@app.put("/estudiante/{rut}")
def actualizar_datos_estudiante(rut: str, payload: dict):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE estudiante SET domicilio = %s WHERE run_ipe = %s RETURNING id_apoderado_principal
        """, (payload.get("domicilio"), rut))
        
        resultado = cur.fetchone()
        if not resultado:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
            
        id_apoderado = resultado[0]
        
        cur.execute("""
            UPDATE apoderado SET telefono = %s, correo_electronico = %s WHERE id_apoderado = %s
        """, (payload.get("telefono_apoderado"), payload.get("correo_apoderado"), id_apoderado))
        
        conn.commit()
        cur.close()
        conn.close()
        return {"mensaje": "Datos actualizados exitosamente"}
    except Exception as e:
        print(f"Error BD: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar los datos")


# =====================================================================
# 4. MÓDULO DE MATRÍCULAS Y CERTIFICADOS
# =====================================================================
@app.get("/matriculas")
def obtener_matriculas(
    establecimiento_id: Optional[int] = None, 
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Agregamos m.cod_tipo_ensenanza al SELECT (es la columna 15)
        query = """
            SELECT m.id_matricula, m.numero_correlativo, m.nivel_ensenanza, 
                   m.curso, m.fecha_matricula, m.estado,
                   e.run_ipe, e.nombres, e.apellido_paterno,
                   a.rut_pasaporte, a.nombres, a.apellido_paterno,
                   m.anio_escolar, cte.descripcion,
                   est.rbd, m.cod_tipo_ensenanza
            FROM matricula m
            INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante
            LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado
            LEFT JOIN catalogo_tipo_ensenanza cte ON m.cod_tipo_ensenanza = cte.codigo
            INNER JOIN establecimiento est ON m.id_establecimiento = est.id_establecimiento
            WHERE 1=1
        """
        parametros = []
        
        if establecimiento_id is not None:
            query += " AND m.id_establecimiento = %s"
            parametros.append(establecimiento_id)
            
        query += " ORDER BY m.id_matricula DESC"

        cur.execute(query, tuple(parametros))
        
        filas = cur.fetchall()
        matriculas = []
        for fila in filas:
            matriculas.append({
                "id_matricula": fila[0],
                "numero_correlativo": fila[1],
                "nivel_ensenanza": fila[2],
                "curso": fila[3],
                "fecha_matricula": str(fila[4]),
                "estado": fila[5],
                "estudiante_rut": fila[6],
                "estudiante_nombre": f"{fila[7]} {fila[8]}".strip(),
                "apoderado_rut": fila[9] if fila[9] else "Sin registro",
                "apoderado_nombre": f"{fila[10]} {fila[11]}".strip() if fila[10] else "Pendiente",
                "anio_escolar": fila[12],
                "tipo_ensenanza": fila[13] if fila[13] else "Plan General",
                "rbd": fila[14] if fila[14] else "Sin RBD",
                "cod_tipo_ensenanza": fila[15] # <--- Capturamos el código Mineduc
            })
            
        return matriculas

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Error de base de datos")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()


@app.post("/matriculas", summary="Crear una nueva matrícula (Alta)")
def crear_matricula(matricula: MatriculaCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            INSERT INTO matricula (
                numero_correlativo, anio_escolar, id_estudiante, id_establecimiento, 
                fecha_matricula, nivel_ensenanza, curso, id_usuario_ejecutor
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id_matricula;
        """
        valores = (
            matricula.numero_correlativo, matricula.anio_escolar, matricula.id_estudiante,
            matricula.id_establecimiento, matricula.fecha_matricula, matricula.nivel_ensenanza,
            matricula.curso, matricula.id_usuario_ejecutor
        )
        cursor.execute(query, valores)
        nuevo_id = cursor.fetchone()[0]
        conn.commit()
        return {"mensaje": "Matrícula creada exitosamente", "id_matricula": nuevo_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

def enviar_correo_retiro(correo_destino: str, id_matricula: int, nombre_alumno: str):
    EMAIL_REMITENTE = "tu_correo@gmail.com"
    PASSWORD_APP = "tu_password_de_aplicacion"
    
    msg = EmailMessage()
    msg['Subject'] = 'Importante: Cuestionario de Retiro Escolar SLEP'
    msg['From'] = EMAIL_REMITENTE
    msg['To'] = correo_destino
    
    link_cuestionario = f"http://localhost:5173/encuesta-retiro/{id_matricula}"
    
    contenido = f"""
    Estimado Apoderado,
    
    Se ha registrado el inicio del proceso de baja para el estudiante {nombre_alumno}.
    Por normativa del SLEP, requerimos que nos indique los motivos de forma confidencial.
    
    Por favor, ingrese al siguiente enlace seguro para completar el proceso:
    {link_cuestionario}
    
    Atentamente,
    Sistema RGM
    """
    msg.set_content(contenido)
    
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_REMITENTE, PASSWORD_APP)
            smtp.send_message(msg)
            print(f"ÉXITO: Correo de retiro enviado a {correo_destino}")
    except Exception as e:
        print(f"ADVERTENCIA: No se pudo enviar el correo (Revisa tus credenciales). Error: {e}")

@app.put("/matriculas/{id_matricula}", summary="Actualizar o Retirar estudiante (Baja)")
def actualizar_matricula(id_matricula: int, matricula: MatriculaUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if matricula.estado == "Retirado":
            matricula.observaciones = "Pendiente de respuesta mediante cuestionario autoaplicado."
            matricula.motivo_retiro = "Pendiente"
            
            cursor.execute("""
                SELECT e.nombres, a.correo_electronico
                FROM matricula m
                INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante
                LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado
                WHERE m.id_matricula = %s
            """, (id_matricula,))
            
            datos_correo = cursor.fetchone()
            if datos_correo and datos_correo[1]:
                nombre_est = datos_correo[0]
                correo_apod = datos_correo[1]
                enviar_correo_retiro(correo_apod, id_matricula, nombre_est)

        query = """
            UPDATE matricula
            SET estado = %s, fecha_retiro = %s, motivo_retiro = %s, 
                observaciones = %s, id_usuario_ejecutor = %s
            WHERE id_matricula = %s RETURNING id_matricula;
        """
        valores = (
            matricula.estado, matricula.fecha_retiro, matricula.motivo_retiro,
            matricula.observaciones, matricula.id_usuario_ejecutor, id_matricula
        )
        cursor.execute(query, valores)
        actualizado = cursor.fetchone()
        
        if not actualizado:
            raise HTTPException(status_code=404, detail="Matrícula no encontrada")
        conn.commit()
        return {"mensaje": "Matrícula actualizada. Si fue retiro, se notificó al apoderado."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.put("/matriculas/{id_matricula}/cuestionario", summary="Endpoint público para respuesta del apoderado")
def responder_cuestionario(id_matricula: int, payload: CuestionarioRetiro):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT e.run_ipe 
            FROM matricula m
            INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante
            WHERE m.id_matricula = %s
        """, (id_matricula,))
        
        resultado = cur.fetchone()
        
        if not resultado or resultado[0] != payload.rut_estudiante:
            raise HTTPException(status_code=401, detail="El RUT ingresado no coincide con nuestros registros de seguridad.")
            
        cur.execute("""
            UPDATE matricula 
            SET observaciones = %s, motivo_retiro = 'Respuesta Apoderado (Confidencial)'
            WHERE id_matricula = %s
        """, (payload.motivo_real, id_matricula))
        
        conn.commit()
        return {"mensaje": "Cuestionario guardado con éxito. Gracias por su tiempo."}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        conn.rollback()
        print(f"Error BD: {e}")
        raise HTTPException(status_code=500, detail="Error al guardar el cuestionario")
    finally:
        cur.close()
        conn.close()

@app.put("/matriculas/{id_matricula}/curso")
def cambiar_curso_matricula(id_matricula: int, payload: dict):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Buscamos los datos actuales para validar y guardar el historial
        cur.execute("SELECT anio_escolar, estado, curso, observaciones FROM matricula WHERE id_matricula = %s", (id_matricula,))
        mat_actual = cur.fetchone()
        
        if not mat_actual:
            raise HTTPException(status_code=404, detail="Matrícula no encontrada")
            
        anio_actual = mat_actual[0]
        estado_actual = mat_actual[1]
        curso_anterior = mat_actual[2]
        obs_actual = mat_actual[3] or ""
        
        anio_corriente = datetime.now().year # Año actual del servidor
        
        # 2. Validaciones de Negocio (Reglas de Oro)
        if anio_actual != anio_corriente:
            raise HTTPException(status_code=400, detail="Solo se puede cambiar de curso a alumnos del año escolar vigente.")
            
        if estado_actual != 'Activa':
            raise HTTPException(status_code=400, detail="No se puede cambiar de curso a un alumno inactivo/retirado.")
            
        # 3. Preparamos la nota de historial
        nuevo_cod = payload.get("cod_tipo_ensenanza")
        nuevo_curso = payload.get("nuevo_curso")
        fecha_cambio = datetime.now().strftime('%Y-%m-%d')
        
        nueva_observacion = f"{obs_actual}\n[{fecha_cambio}] Movimiento RGM: Trasladado de '{curso_anterior}' a '{nuevo_curso}'."
        
        # 4. Ejecutamos el cambio y guardamos la evidencia
        cur.execute("""
            UPDATE matricula 
            SET cod_tipo_ensenanza = %s, curso = %s, observaciones = %s 
            WHERE id_matricula = %s
        """, (nuevo_cod, nuevo_curso, nueva_observacion.strip(), id_matricula))
        
        conn.commit()
        cur.close()
        conn.close()
        return {"mensaje": "Curso actualizado exitosamente y registrado en el historial de la ficha."}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar el curso en la base de datos")


# ============================================================================
# ENDPOINT DE CARGA MASIVA SIGE (CON FOLIO INTELIGENTE Y ACTUALIZACIÓN)
# ============================================================================
@app.post("/matriculas/carga-masiva")
async def carga_masiva_sige(
    archivo: UploadFile = File(...),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    try:
        contenido = await archivo.read()
        tablas = pd.read_html(io.BytesIO(contenido))
        
        if not tablas:
            raise ValueError("No se encontraron tablas legibles en el archivo.")
            
        df = tablas[0]
        conn = get_db_connection()
        cur = conn.cursor()
        
        alumnos_nuevos = 0
        alumnos_actualizados = 0
        
        id_ejecutor = usuario_actual.get('id_usuario')
        if not id_ejecutor: id_ejecutor = 1
        
        # DICCIONARIO PARA LLEVAR LA CUENTA DE LOS FOLIOS POR COLEGIO Y AÑO
        correlativos_actuales = {}
        
        for index, row in df.iterrows():
            
            # --- CRUCE DE RBD MINEDUC A ID INTERNO ---
            rbd_excel = str(row.get('RBD', '')).strip()
            id_colegio = usuario_actual.get('id_establecimiento', 1)
            
            if rbd_excel and rbd_excel != 'nan':
                cur.execute("SELECT id_establecimiento FROM establecimiento WHERE rbd = %s", (rbd_excel,))
                resultado_colegio = cur.fetchone()
                
                if resultado_colegio:
                    id_colegio = resultado_colegio[0]
                else:
                    cur.execute("""
                        INSERT INTO establecimiento (rbd, nombre, tipo_local) 
                        VALUES (%s, %s, 'Generado por SIGE') RETURNING id_establecimiento;
                    """, (rbd_excel, f"Colegio RBD {rbd_excel}"))
                    id_colegio = cur.fetchone()[0]

            # 1. Extracción de RUT 
            rut_alumno = str(row.get('Run', '')).strip()
            dv_alumno = str(row.get('Dígito Ver.', '')).strip()
            if rut_alumno == 'nan' or not rut_alumno:
                continue
            run_completo = f"{rut_alumno}-{dv_alumno}"
            
            # 2. Protección Nombres 
            nombres = str(row.get('Nombres', '')).strip()
            if not nombres or nombres == 'nan': nombres = "Sin Nombre"
            
            ap_paterno = str(row.get('Apellido Paterno', '')).strip()
            if not ap_paterno or ap_paterno == 'nan': ap_paterno = "Sin Apellido"
            
            ap_materno = str(row.get('Apellido Materno', '')).strip()
            if ap_materno == 'nan': ap_materno = ''

            # 3. Protección Sexo 
            genero_excel = str(row.get('Genero', '')).strip().upper()
            if genero_excel == 'F': sexo_db = "Femenino"
            elif genero_excel == 'M': sexo_db = "Masculino"
            else: sexo_db = "No Informado"
            
            # 4. Protección Fecha de Nacimiento 
            fecha_nac = str(row.get('Fecha Nacimiento', '')).strip()
            if not fecha_nac or fecha_nac == 'nan':
                fecha_nac_str = "2000-01-01"
            else:
                fecha_nac_str = fecha_nac.split(' ')[0]
                
            # 5. Protección Domicilio 
            direccion_excel = str(row.get('Dirección', '')).strip()
            comuna_excel = str(row.get('Comuna Residencia', '')).strip()
            dir_limpia = "" if direccion_excel == 'nan' else direccion_excel
            comuna_limpia = "" if comuna_excel == 'nan' else comuna_excel
            domicilio_final = f"{dir_limpia} {comuna_limpia}".strip()
            if not domicilio_final: domicilio_final = "Sin registro"

            # 6. Protección Año Escolar 
            try:
                anio_escolar = int(float(row.get('Año', 2026)))
            except:
                anio_escolar = 2026

            # 7. Protección Fecha de Matrícula 
            fecha_incorp = str(row.get('Fecha Incorporación Curso', '')).strip()
            if not fecha_incorp or fecha_incorp == 'nan':
                fecha_matricula_str = pd.Timestamp.now().strftime('%Y-%m-%d')
            else:
                fecha_matricula_str = fecha_incorp.split(' ')[0]

            # --- LÓGICA DE FECHA DE RETIRO SIGE ---
            fecha_retiro_excel = str(row.get('Fecha Retiro', row.get('Fec. Retiro', ''))).strip()
            estado_matricula = 'Activa'
            fecha_retiro_db = None
            
            if fecha_retiro_excel and fecha_retiro_excel != 'nan':
                fecha_retiro_limpia = fecha_retiro_excel.split(' ')[0]
                if not fecha_retiro_limpia.startswith('1900'):
                    estado_matricula = 'Inactiva'
                    fecha_retiro_db = fecha_retiro_limpia

            # 8. Mapeo de Catálogos
            try:
                cod_ensenanza = int(float(row.get('Cod Tipo Enseñanza')))
            except:
                cod_ensenanza = None
                
            try:
                cod_grado = int(float(row.get('Cod Grado')))
            except:
                cod_grado = None

            desc_grado = str(row.get('Desc Grado', '')).strip()
            if desc_grado == 'nan': desc_grado = ''
            
            letra_curso = str(row.get('Letra Curso', '')).strip()
            if letra_curso == 'nan': letra_curso = ''

            if cod_ensenanza is not None:
                cur.execute("""
                    INSERT INTO catalogo_tipo_ensenanza (codigo, descripcion) 
                    VALUES (%s, 'Importado desde SIGE')
                    ON CONFLICT (codigo) DO NOTHING;
                """, (cod_ensenanza,))
                
            if cod_grado is not None:
                cur.execute("""
                    INSERT INTO catalogo_grado (codigo, descripcion) 
                    VALUES (%s, %s)
                    ON CONFLICT (codigo) DO NOTHING;
                """, (cod_grado, desc_grado))

            # --- INSERCIÓN SEGURA DEL ESTUDIANTE ---
            cur.execute("""
                INSERT INTO estudiante (run_ipe, nombres, apellido_paterno, apellido_materno, sexo, fecha_nacimiento, domicilio)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (run_ipe) 
                DO UPDATE SET nombres = EXCLUDED.nombres, 
                              apellido_paterno = EXCLUDED.apellido_paterno,
                              apellido_materno = EXCLUDED.apellido_materno,
                              sexo = EXCLUDED.sexo,
                              fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, estudiante.fecha_nacimiento),
                              domicilio = COALESCE(EXCLUDED.domicilio, estudiante.domicilio)
                RETURNING id_estudiante;
            """, (run_completo, nombres, ap_paterno, ap_materno, sexo_db, fecha_nac_str, domicilio_final))
            
            resultado_estudiante = cur.fetchone()
            if resultado_estudiante:
                id_estudiante = resultado_estudiante[0]
            else:
                cur.execute("SELECT id_estudiante FROM estudiante WHERE run_ipe = %s", (run_completo,))
                id_estudiante = cur.fetchone()[0]

            # --- INSERCIÓN / ACTUALIZACIÓN DE LA MATRÍCULA ---
            curso_texto = f"{desc_grado} {letra_curso}".strip() if desc_grado else "Sin Asignar"
            
            # A) VERIFICAMOS SI EL ALUMNO YA ESTÁ MATRICULADO ESTE AÑO
            cur.execute("""
                SELECT id_matricula FROM matricula 
                WHERE id_estudiante = %s AND id_establecimiento = %s AND anio_escolar = %s
            """, (id_estudiante, id_colegio, anio_escolar))
            
            matricula_existente = cur.fetchone()
            
            if matricula_existente:
                # SI EXISTE: Actualizamos sus datos (Sin tocar el Folio)
                id_mat = matricula_existente[0]
                cur.execute("""
                    UPDATE matricula 
                    SET cod_tipo_ensenanza = %s, cod_grado = %s, letra_curso = %s, 
                        curso = %s, fecha_retiro = %s, estado = %s
                    WHERE id_matricula = %s
                """, (cod_ensenanza, cod_grado, letra_curso, curso_texto, fecha_retiro_db, estado_matricula, id_mat))
                alumnos_actualizados += 1
            else:
                # B) SI NO EXISTE: Calculamos el siguiente Folio Único
                llave_correlativo = (id_colegio, anio_escolar)
                
                if llave_correlativo not in correlativos_actuales:
                    # Leemos el folio más alto registrado en la Base de Datos para ese colegio
                    cur.execute("""
                        SELECT COALESCE(MAX(numero_correlativo), 0) 
                        FROM matricula 
                        WHERE id_establecimiento = %s AND anio_escolar = %s
                    """, (id_colegio, anio_escolar))
                    correlativos_actuales[llave_correlativo] = cur.fetchone()[0]

                # Le sumamos 1
                correlativos_actuales[llave_correlativo] += 1
                nuevo_correlativo = correlativos_actuales[llave_correlativo]
                
                cur.execute("""
                    INSERT INTO matricula (
                        id_estudiante, id_establecimiento, numero_correlativo, 
                        estado, cod_tipo_ensenanza, cod_grado, letra_curso, curso, nivel_ensenanza,
                        anio_escolar, fecha_matricula, id_usuario_ejecutor, fecha_retiro
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Educación Media', %s, %s, %s, %s)
                """, (
                    id_estudiante, id_colegio, nuevo_correlativo, estado_matricula,
                    cod_ensenanza, cod_grado, letra_curso, curso_texto, anio_escolar,
                    fecha_matricula_str, id_ejecutor, fecha_retiro_db
                ))
                alumnos_nuevos += 1
            
        conn.commit()
        return {
            "mensaje": f"✅ Éxito: {alumnos_nuevos} alumnos nuevos matriculados y {alumnos_actualizados} actualizados."
        }
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        print(f"Error procesando archivo SIGE: {e}")
        raise HTTPException(status_code=500, detail=f"Error en la carga: {str(e)}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

# =====================================================================
# SECCIÓN FINAL: CERTIFICADOS Y DASHBOARD
# =====================================================================
@app.get("/matriculas/{id_matricula}/certificado")
def descargar_certificado(id_matricula: int):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT m.numero_correlativo, m.anio_escolar, m.nivel_ensenanza, m.curso, m.fecha_matricula,
                   e.run_ipe, e.nombres, e.apellido_paterno, e.apellido_materno, e.sexo,
                   a.rut_pasaporte, a.nombres, a.apellido_paterno, a.apellido_materno, a.telefono, a.correo_electronico
            FROM matricula m
            INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante
            LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado
            WHERE m.id_matricula = %s
        """, (id_matricula,))
        
        datos = cur.fetchone()
        cur.close()
        conn.close()

        if not datos:
            raise HTTPException(status_code=404, detail="Matrícula no encontrada")

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        c.setFont("Helvetica-Bold", 18)
        c.drawString(150, 700, "CERTIFICADO DE ALUMNO REGULAR (RGM)")
        c.setFont("Helvetica", 12)
        c.drawString(100, 650, "El Sistema Local de Educación Pública (SLEP) certifica que:")
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, 615, "I. ANTECEDENTES DEL ESTUDIANTE")
        c.setFont("Helvetica", 11)
        c.drawString(100, 595, f"Nombre: {datos[6]} {datos[7]} {datos[8]}")
        c.drawString(100, 575, f"RUT / IPE: {datos[5]}")
        c.drawString(100, 555, f"Sexo : {datos[9] if datos[9] else 'No registrado'}")
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, 520, "II. ANTECEDENTES ACADÉMICOS")
        c.setFont("Helvetica", 11)
        c.drawString(100, 500, f"Año Escolar: {datos[1]}")
        c.drawString(100, 480, f"Nivel de Enseñanza: {datos[2]}")
        c.drawString(100, 460, f"Curso Asignado: {datos[3]}")
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, 425, "III. ANTECEDENTES DEL APODERADO TITULAR")
        c.setFont("Helvetica", 11)
        
        nombre_apod = f"{datos[11]} {datos[12]} {datos[13]}" if datos[11] else "No registrado"
        rut_apod = datos[10] if datos[10] else "No registrado"
        fono_apod = datos[14] if datos[14] else "No registrado"
        correo_apod = datos[15] if datos[15] else "No registrado"
        
        c.drawString(100, 405, f"Nombre: {nombre_apod}")
        c.drawString(100, 385, f"RUT / Pasaporte: {rut_apod}")
        c.drawString(100, 365, f"Teléfono: {fono_apod}")
        c.drawString(100, 345, f"Correo: {correo_apod}")

        c.setFont("Helvetica", 10)
        c.drawString(100, 295, f"Fecha de Matrícula: {datos[4]}  |  N° Correlativo Interno: {datos[0]}")
        
        c.line(100, 270, 500, 270)
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(100, 255, "Documento generado automáticamente por el Registro General de Matrículas (RGM).")
        
        c.save()
        buffer.seek(0)

        return StreamingResponse(
            buffer, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"inline; filename=Certificado_{datos[5]}.pdf"}
        )
    except Exception as e:
        print(f"Error generando PDF: {e}")
        raise HTTPException(status_code=500, detail="Error al generar el certificado")

@app.get("/dashboard/estadisticas", summary="Obtener métricas para el dashboard")
def obtener_estadisticas_dashboard(
    establecimiento_id: Optional[int] = None, 
    anio: Optional[int] = None, # <--- NUEVO PARÁMETRO DE FILTRO
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # 1. Obtener los años disponibles para poblar el selector en React
        query_anios = "SELECT DISTINCT anio_escolar FROM matricula WHERE anio_escolar IS NOT NULL"
        param_anios = []
        if establecimiento_id is not None:
            query_anios += " AND id_establecimiento = %s"
            param_anios.append(establecimiento_id)
        query_anios += " ORDER BY anio_escolar DESC"
        
        cur.execute(query_anios, tuple(param_anios))
        anios_disponibles = [row[0] for row in cur.fetchall()]

        # 2. Armar la base de los filtros para las métricas
        filtros_sql = ""
        parametros = []
        
        if establecimiento_id is not None:
            filtros_sql += " AND id_establecimiento = %s"
            parametros.append(establecimiento_id)
            
        if anio is not None:
            filtros_sql += " AND anio_escolar = %s"
            parametros.append(anio)

        # 3. Total de alumnos matriculados (Activos)
        cur.execute(f"SELECT COUNT(*) FROM matricula WHERE estado = 'Activa' {filtros_sql}", tuple(parametros))
        total_activos = cur.fetchone()[0]

        # 4. Total de retiros o bajas (Inactivos)
        cur.execute(f"SELECT COUNT(*) FROM matricula WHERE estado != 'Activa' {filtros_sql}", tuple(parametros))
        total_inactivos = cur.fetchone()[0]

        # 5. Agrupación por Nivel de Enseñanza (Solo activos)
        cur.execute(f"SELECT nivel_ensenanza, COUNT(*) FROM matricula WHERE estado = 'Activa' {filtros_sql} GROUP BY nivel_ensenanza ORDER BY nivel_ensenanza", tuple(parametros))
        por_nivel = [{"nombre": row[0] or "Sin Nivel", "cantidad": row[1]} for row in cur.fetchall()]

        # 6. Agrupación por Curso específico (Solo activos)
        cur.execute(f"SELECT curso, COUNT(*) FROM matricula WHERE estado = 'Activa' {filtros_sql} GROUP BY curso ORDER BY curso", tuple(parametros))
        por_curso = [{"nombre": row[0] or "Sin Curso", "cantidad": row[1]} for row in cur.fetchall()]

        return {
            "anios_disponibles": anios_disponibles,
            "total_activos": total_activos,
            "total_inactivos": total_inactivos,
            "por_nivel": por_nivel,
            "por_curso": por_curso
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail="Error al generar estadísticas: " + str(e))
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

# =====================================================================
# MÓDULO DE ESTABLECIMIENTOS (COLEGIOS)
# =====================================================================
@app.get("/establecimientos", summary="Obtener lista de colegios registrados")
def obtener_establecimientos():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Traemos el ID, el RBD y el Nombre ordenados alfabéticamente
        cur.execute("""
            SELECT id_establecimiento, rbd, nombre 
            FROM establecimiento 
            ORDER BY nombre ASC
        """)
        
        filas = cur.fetchall()
        colegios = []
        
        for fila in filas:
            colegios.append({
                "id_establecimiento": fila[0],
                "rbd": fila[1],
                "nombre": fila[2]
            })
            
        return colegios

    except Exception as e:
        print(f"Error al obtener establecimientos: {e}")
        raise HTTPException(status_code=500, detail="Error interno de la base de datos")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()