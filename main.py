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
from pydantic import BaseModel

# ============================================================================
# CONFIGURACIÓN DE SEGURIDAD (JWT Y BCRYPT)
# ============================================================================
# En un entorno real, esta clave secreta debe ir en un archivo .env
SECRET_KEY = "slep_valparaiso_clave_secreta_super_segura"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120 # El token durará 2 horas

# Configuramos bcrypt como nuestro algoritmo de hashing
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

# Modelo de Pydantic para recibir los datos del frontend
class LoginRequest(BaseModel):
    email: str
    password: str

# =====================================================================
# 1. CONFIGURACIÓN INICIAL Y BASE DE DATOS
# =====================================================================

# Inicializamos la aplicación FastAPI
app = FastAPI(title="API Sistema de Matrículas SLEP Valparaíso")

# Configuramos CORS para que el frontend (React) pueda comunicarse sin bloqueos
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En desarrollo permitimos todas las conexiones
    allow_credentials=True,
    allow_methods=["*"], # Permite GET, POST, PUT, DELETE
    allow_headers=["*"],
)

# Credenciales de conexión a PostgreSQL
DB_CONFIG = {
    "dbname": "sistema_matriculas_sleep",
    "user": "postgres",       
    "password": "admin", 
    "host": "localhost",
    "port": "5432",
    "client_encoding": "utf8"
}

def get_db_connection():
    """
    Función auxiliar para conectarse a la base de datos en cada petición.
    Es importante cerrarla después de usarla para no saturar el servidor.
    """
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
# Estos modelos definen la estructura exacta que el Backend espera recibir 
# desde el Frontend al momento de hacer POST o PUT en Matrículas.

class MatriculaCreate(BaseModel):
    numero_correlativo: int
    anio_escolar: int
    id_estudiante: int
    id_establecimiento: int
    fecha_matricula: date
    nivel_ensenanza: str
    curso: str
    id_usuario_ejecutor: int # Obligatorio para nuestra auditoría

class MatriculaUpdate(BaseModel):
    estado: str
    fecha_retiro: Optional[date] = None
    motivo_retiro: Optional[str] = None
    observaciones: Optional[str] = None
    id_usuario_ejecutor: int # Obligatorio para nuestra auditoría

class CuestionarioRetiro(BaseModel):
    rut_estudiante: str # Lo usaremos como llave de seguridad
    motivo_real: str    # La respuesta confidencial del apoderado



# ============================================================================
# MÓDULO DE AUTENTICACIÓN
# ============================================================================
@app.post("/login", summary="Iniciar sesión y obtener token JWT")
def login(credenciales: LoginRequest):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Buscamos al usuario por su email
        cur.execute("""
            SELECT id_usuario, email_institucional, nombre, rol, id_establecimiento, activo, password_hash 
            FROM usuario 
            WHERE email_institucional = %s
        """, (credenciales.email,))
        
        usuario_db = cur.fetchone()
        
        # 2. Validaciones de seguridad
        if not usuario_db:
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
            
        (id_usuario, email, nombre, rol, id_establecimiento, activo, password_hash) = usuario_db
        
        if not activo:
            raise HTTPException(status_code=403, detail="Usuario inactivo. Contacte al administrador.")
            
        if not password_hash or not verificar_password(credenciales.password, password_hash):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
            
        # 3. Si todo está correcto, generamos el Token JWT
        # Inyectamos el rol y el colegio en el token para el particionamiento de datos
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
def obtener_todos_los_estudiantes():
    """
    Lista el directorio completo de estudiantes.
    Solo trae lo básico (ID, RUT, Nombre) para llenar el buscador rápido.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT id_estudiante, run_ipe, nombres, apellido_paterno, apellido_materno 
            FROM estudiante
            ORDER BY nombres ASC
        """)
        filas = cur.fetchall()
        estudiante = []
        for fila in filas:
            estudiante.append({
                "id": fila[0],
                "run": fila[1],
                "nombre_completo": f"{fila[2]} {fila[3]} {fila[4]}".strip()
            })
        cur.close()
        conn.close()
        return estudiante
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Error al cargar el directorio de estudiantes")

@app.get("/estudiante/{rut}")
def obtener_ficha_estudiante(rut: str):
    """
    Obtiene la "Ficha Completa" de un solo estudiante.
    Cruza datos con la tabla 'apoderado' y trae el historial de matrículas.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # 1. Datos personales y de su apoderado
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

        # 2. Historial académico (matrículas previas y actuales)
        cur.execute("""
            SELECT id_matricula, anio_escolar, nivel_ensenanza, curso, estado, fecha_matricula
            FROM matricula
            WHERE id_estudiante = %s
            ORDER BY anio_escolar DESC
        """, (estudiante_db[0],))
        historial_db = cur.fetchall()

        # 3. Ensamblamos el JSON
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
                "tipo_movimiento": "Matrícula"
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
    """
    Crea un nuevo estudiante y su apoderado al mismo tiempo.
    Es una transacción doble: Primero busca/crea al apoderado, luego inserta al alumno.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Lógica del apoderado
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

        # 2. Lógica del estudiante (usando el ID del apoderado)(ahora con latitud y longitud)
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
            payload.get("latitud"),  # <--- NUEVO
            payload.get("longitud"), # <--- NUEVO
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
    """
    Edita los datos de contacto (Domicilio alumno, Teléfono/Correo apoderado).
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Actualiza estudiante y rescata el ID del apoderado
        cur.execute("""
            UPDATE estudiante SET domicilio = %s WHERE run_ipe = %s RETURNING id_apoderado_principal
        """, (payload.get("domicilio"), rut))
        
        resultado = cur.fetchone()
        if not resultado:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
            
        id_apoderado = resultado[0]
        
        # 2. Actualiza apoderado
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

@app.post("/estudiante/carga-masiva")
def carga_masiva_estudiantes(archivo: UploadFile = File(...)):
    """
    Recibe un archivo CSV y carga múltiples estudiantes y apoderados a la vez.
    El CSV debe tener encabezados en la primera fila.
    """
    if not archivo.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser formato .csv")

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Leemos el archivo directamente desde la memoria
        csvReader = csv.DictReader(codecs.iterdecode(archivo.file, 'utf-8'))
        
        registros_exitosos = 0
        
        for fila in csvReader:
            # 1. MANEJO DEL APODERADO
            run_apod = fila.get('run_apoderado')
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
                    run_apod, fila.get('nombres_apoderado'), fila.get('ap_paterno_apoderado'), 
                    fila.get('ap_materno_apoderado'), fila.get('domicilio'), # Asumimos mismo domicilio
                    fila.get('telefono'), fila.get('correo')
                ))
                id_apoderado = cur.fetchone()[0]

            # 2. MANEJO DEL ESTUDIANTE
            # Evitamos duplicados verificando si el estudiante ya existe
            cur.execute("SELECT id_estudiante FROM estudiante WHERE run_ipe = %s", (fila.get('run_estudiante'),))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO estudiante (run_ipe, nombres, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, domicilio, id_apoderado_principal)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    fila.get('run_estudiante'), fila.get('nombres'), fila.get('ap_paterno'), 
                    fila.get('ap_materno'), fila.get('fecha_nacimiento'), fila.get('sexo'),
                    fila.get('domicilio'), id_apoderado
                ))
                registros_exitosos += 1
        
        conn.commit()
        return {"mensaje": f"Carga masiva completada. Se registraron {registros_exitosos} estudiantes nuevos."}
        
    except Exception as e:
        conn.rollback()
        print(f"Error en carga masiva: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar el archivo CSV. Revisa el formato de las columnas.")
    finally:
        cur.close()
        conn.close()
        archivo.file.close()


# =====================================================================
# 4. MÓDULO DE MATRÍCULAS Y CERTIFICADOS
# =====================================================================

@app.get("/matriculas")
def obtener_matriculas():
    """
    Obtiene la lista global de matrículas activas/inactivas.
    Cruza datos con estudiante y apoderado para mostrar la tabla principal.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT m.id_matricula, m.numero_correlativo, m.nivel_ensenanza, 
                   m.curso, m.fecha_matricula, m.estado,
                   e.run_ipe, e.nombres, e.apellido_paterno,
                   a.rut_pasaporte, a.nombres, a.apellido_paterno
            FROM matricula m
            INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante
            LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado
            ORDER BY m.id_matricula DESC
        """)
        
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
                "estudiante_nombre": f"{fila[7]} {fila[8]}",
                "apoderado_rut": fila[9] if fila[9] else "Sin registro",
                "apoderado_nombre": f"{fila[10]} {fila[11]}" if fila[10] else "Pendiente"
            })
            
        cur.close()
        conn.close()
        return matriculas
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Error de base de datos")

@app.post("/matriculas", summary="Crear una nueva matrícula (Alta)")
def crear_matricula(matricula: MatriculaCreate):
    """
    Registra una matrícula completamente nueva para un estudiante existente.
    """
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
    """
    Motor de correos transaccionales. Se conecta a Gmail vía SMTP.
    """
    # IMPORTANTE: Reemplaza esto con credenciales reales para probarlo
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
        # Si usas otro proveedor que no sea Gmail, el host 'smtp.gmail.com' cambiará
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_REMITENTE, PASSWORD_APP)
            smtp.send_message(msg)
            print(f"ÉXITO: Correo de retiro enviado a {correo_destino}")
    except Exception as e:
        print(f"ADVERTENCIA: No se pudo enviar el correo (Revisa tus credenciales). Error: {e}")

@app.put("/matriculas/{id_matricula}", summary="Actualizar o Retirar estudiante (Baja)")
def actualizar_matricula(id_matricula: int, matricula: MatriculaUpdate):
    """
    Permite dar de baja (Retirar) a un estudiante cambiando su estado.
    Si se retira, dispara un correo automático al apoderado.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # --- NUEVA REGLA: FLUJO ASÍNCRONO DE RETIRO ---
        if matricula.estado == "Retirado":
            matricula.observaciones = "Pendiente de respuesta mediante cuestionario autoaplicado."
            matricula.motivo_retiro = "Pendiente"
            
            # Buscamos el correo del apoderado y el nombre del estudiante para el email
            cursor.execute("""
                SELECT e.nombres, a.correo_electronico
                FROM matricula m
                INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante
                LEFT JOIN apoderado a ON e.id_apoderado_principal = a.id_apoderado
                WHERE m.id_matricula = %s
            """, (id_matricula,))
            
            datos_correo = cursor.fetchone()
            # Si el estudiante existe y el apoderado tiene correo registrado, disparamos la función
            if datos_correo and datos_correo[1]:
                nombre_est = datos_correo[0]
                correo_apod = datos_correo[1]
                enviar_correo_retiro(correo_apod, id_matricula, nombre_est)
        # ----------------------------------------------

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
    """
    Recibe la respuesta del apoderado validando el RUT del estudiante por seguridad.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Validación de Seguridad
        cur.execute("""
            SELECT e.run_ipe 
            FROM matricula m
            INNER JOIN estudiante e ON m.id_estudiante = e.id_estudiante
            WHERE m.id_matricula = %s
        """, (id_matricula,))
        
        resultado = cur.fetchone()
        
        if not resultado or resultado[0] != payload.rut_estudiante:
            raise HTTPException(status_code=401, detail="El RUT ingresado no coincide con nuestros registros de seguridad.")
            
        # Actualizamos la matrícula con la respuesta real
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
    """
    Específico para actualizar solamente el curso y nivel de un estudiante.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE matricula SET nivel_ensenanza = %s, curso = %s WHERE id_matricula = %s
        """, (payload.get("nuevo_nivel"), payload.get("nuevo_curso"), id_matricula))
        conn.commit()
        cur.close()
        conn.close()
        return {"mensaje": "Curso actualizado exitosamente"}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar el curso en la base de datos")    

@app.post("/matriculas/carga-masiva", summary="Carga masiva de historial de matrículas")
def carga_masiva_matriculas(archivo: UploadFile = File(...)):
    """
    Recibe un CSV con el historial de matrículas. 
    Cruza el RUN del estudiante con la base de datos para obtener su ID interno antes de insertar.
    """
    if not archivo.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser formato .csv")

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        csvReader = csv.DictReader(codecs.iterdecode(archivo.file, 'utf-8'))
        
        registros_exitosos = 0
        estudiantes_no_encontrados = 0
        
        for fila in csvReader:
            run_estudiante = fila.get('run_estudiante')
            
            # 1. Buscamos al estudiante en la base de datos
            cur.execute("SELECT id_estudiante FROM estudiante WHERE run_ipe = %s", (run_estudiante,))
            estudiante_db = cur.fetchone()
            
            # 2. Solo insertamos si el estudiante ya existe en el sistema
            if estudiante_db:
                id_estudiante = estudiante_db[0]
                
                cur.execute("""
                    INSERT INTO matricula (
                        numero_correlativo, anio_escolar, id_estudiante, id_establecimiento, 
                        fecha_matricula, nivel_ensenanza, curso, estado, id_usuario_ejecutor
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    fila.get('numero_correlativo'), 
                    fila.get('anio_escolar'), 
                    id_estudiante,
                    fila.get('id_establecimiento', 1), # Si no viene en el CSV, asignamos 1 por defecto
                    fila.get('fecha_matricula'), 
                    fila.get('nivel_ensenanza'),
                    fila.get('curso'), 
                    fila.get('estado', 'Activa'), 
                    1 # id_usuario_ejecutor por defecto
                ))
                registros_exitosos += 1
            else:
                estudiantes_no_encontrados += 1
        
        conn.commit()
        
        # Preparamos un mensaje de respuesta detallado
        mensaje = f"Carga masiva completada: {registros_exitosos} matrículas registradas."
        if estudiantes_no_encontrados > 0:
            mensaje += f" (Se omitieron {estudiantes_no_encontrados} filas porque el RUT no existe en el Directorio)."
            
        return {"mensaje": mensaje}
        
    except Exception as e:
        conn.rollback()
        print(f"Error en carga masiva de matrículas: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar el archivo CSV. Revisa el formato de las columnas.")
    finally:
        cur.close()
        conn.close()
        archivo.file.close()

@app.get("/matriculas/{id_matricula}/certificado")
def descargar_certificado(id_matricula: int):
    """
    Genera un PDF en memoria con el certificado de alumno regular.
    Se retorna como un 'StreamingResponse' para que el navegador lo muestre.
    """
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
        
        # Título e Introducción
        c.setFont("Helvetica-Bold", 18)
        c.drawString(150, 700, "CERTIFICADO DE ALUMNO REGULAR (RGM)")
        c.setFont("Helvetica", 12)
        c.drawString(100, 650, "El Sistema Local de Educación Pública (SLEP) certifica que:")
        
        # === DATOS DEL ESTUDIANTE ===
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, 615, "I. ANTECEDENTES DEL ESTUDIANTE")
        c.setFont("Helvetica", 11)
        c.drawString(100, 595, f"Nombre: {datos[6]} {datos[7]} {datos[8]}")
        c.drawString(100, 575, f"RUT / IPE: {datos[5]}")
        c.drawString(100, 555, f"Sexo : {datos[9] if datos[9] else 'No registrado'}")
        
        # === DATOS ACADÉMICOS ===
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, 520, "II. ANTECEDENTES ACADÉMICOS")
        c.setFont("Helvetica", 11)
        c.drawString(100, 500, f"Año Escolar: {datos[1]}")
        c.drawString(100, 480, f"Nivel de Enseñanza: {datos[2]}")
        c.drawString(100, 460, f"Curso Asignado: {datos[3]}")
        
        # === DATOS DEL APODERADO ===
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

        # === DATOS DE LA TRANSACCIÓN ===
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


# =====================================================================
# 5. MÓDULO DE DASHBOARD
# =====================================================================
@app.get("/dashboard/estadisticas", summary="Obtener métricas para el dashboard")
def obtener_estadisticas_dashboard():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # 1. Total de alumnos matriculados (Activos)
        cur.execute("SELECT COUNT(*) FROM matricula WHERE estado = 'Activa'")
        total_activos = cur.fetchone()[0]

        # 2. Total de retiros o bajas (Inactivos, Retirados, etc.)
        cur.execute("SELECT COUNT(*) FROM matricula WHERE estado != 'Activa'")
        total_inactivos = cur.fetchone()[0]

        # 3. Agrupación por Nivel de Enseñanza (Solo activos)
        cur.execute("""
            SELECT nivel_ensenanza, COUNT(*) 
            FROM matricula 
            WHERE estado = 'Activa' 
            GROUP BY nivel_ensenanza 
            ORDER BY nivel_ensenanza
        """)
        por_nivel = [{"nombre": row[0] or "Sin Nivel", "cantidad": row[1]} for row in cur.fetchall()]

        # 4. Agrupación por Curso específico (Solo activos)
        cur.execute("""
            SELECT curso, COUNT(*) 
            FROM matricula 
            WHERE estado = 'Activa' 
            GROUP BY curso 
            ORDER BY curso
        """)
        por_curso = [{"nombre": row[0] or "Sin Curso", "cantidad": row[1]} for row in cur.fetchall()]

        return {
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