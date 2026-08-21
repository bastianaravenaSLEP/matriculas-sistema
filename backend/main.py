from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importamos los enrutadores que acabamos de crear
from routers import auth, dashboard, estudiantes, matriculas,reportes,documentos
from routers import establecimientos

app = FastAPI(title="API Sistema RGM - SLEP Valparaíso")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# Conectamos las rutas
app.include_router(auth.router)
app.include_router(estudiantes.router)
app.include_router(matriculas.router)
app.include_router(dashboard.router)
app.include_router(establecimientos.router)
app.include_router(reportes.router)
app.include_router(documentos.router)

@app.get("/")
def estado_servidor():
    return {"status": "En línea", "mensaje": "API RGM funcionando de forma modular"}