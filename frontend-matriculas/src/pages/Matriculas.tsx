import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// ============================================================================
// 1. INTERFACES Y MODELOS DE DATOS
// ============================================================================
interface Matricula {
  id_matricula: number;
  numero_correlativo: number;
  nivel_ensenanza: string;
  curso: string;
  fecha_matricula: string;
  estado: string;
  estudiante_rut: string;
  estudiante_nombre: string;
  apoderado_rut: string;
  apoderado_nombre: string;
}



export default function Matriculas() {
  // ============================================================================
  // 2. ESTADOS GLOBAL DE LA PANTALLA (Datos principales de la tabla)
  // ============================================================================
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  
  // ============================================================================
  // 3. ESTADOS DE LOS MODALES Y SUS FORMULARIOS
  // ============================================================================
  
  // Módulo A: Visor de PDF
  const [idCertificadoPreview, setIdCertificadoPreview] = useState<number | null>(null);
  
  // Módulo B: Modal de Retiro (Baja asíncrona)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [idSeleccionado, setIdSeleccionado] = useState<number | null>(null);
  const [fechaRetiro, setFechaRetiro] = useState('');
  const [procesandoRetiro, setProcesandoRetiro] = useState(false);
  // Nota: Ya no tenemos estado para "motivoRetiro" porque lo llenará el apoderado.

  // Módulo C: Modal de Cambio de Curso
  const [modalCursoAbierto, setModalCursoAbierto] = useState(false);
  const [nuevoNivel, setNuevoNivel] = useState('Educación Básica');
  const [nuevoCurso, setNuevoCurso] = useState('');
  const [procesandoCurso, setProcesandoCurso] = useState(false);

  // ============================================================================
  // ESTADOS Y FUNCIONES PARA CARGA MASIVA DE MATRÍCULAS
  // ============================================================================
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  const manejarSubidaCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    if (!archivo.name.endsWith('.csv')) {
      alert("Por favor, selecciona un archivo en formato .csv");
      return;
    }

    setSubiendoArchivo(true);
    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/matriculas/carga-masiva", {
        method: "POST",
        body: formData,
      });

      const datos = await respuesta.json();
      
      if (!respuesta.ok) throw new Error(datos.detail || "Error al subir el archivo");
      
      alert(datos.mensaje); 
      cargarMatriculas(); // Refrescamos la tabla instantáneamente
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSubiendoArchivo(false);
      e.target.value = ''; 
    }
  };

  // ============================================================================
  // 4. FUNCIONES DE CONEXIÓN A LA API (Fetch)
  // ============================================================================

  const cargarMatriculas = () => {
    setCargando(true);
    fetch('http://127.0.0.1:8000/matriculas')
      .then((res) => {
        if (!res.ok) throw new Error('Error al conectar con la API');
        return res.json();
      })
      .then((datos) => {
        setMatriculas(datos);
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
  };

  // Se ejecuta automáticamente al abrir la página
  useEffect(() => {
    cargarMatriculas();
  }, []);

  // ============================================================================
  // 5. MANEJADORES DE EVENTOS (Handlers de los Botones)
  // ============================================================================

  // --- HANDLERS DE RETIRO ---
  const iniciarRetiro = (id: number) => {
    setIdSeleccionado(id);
    setFechaRetiro('');
    setModalAbierto(true);
  };

  const confirmarRetiro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSeleccionado) return;
    
    setProcesandoRetiro(true);

    // Payload actualizado: Enviamos el estado 'Retirado'.
    // Python detectará esto, generará el texto "Pendiente" y enviará el correo.
    const payload = {
      estado: 'Retirado',
      fecha_retiro: fechaRetiro,
      motivo_retiro: '', // Vacío: el backend fuerza "Pendiente"
      observaciones: '', // Vacío: el backend fuerza el texto asíncrono
      id_usuario_ejecutor: 1 
    };

    try {
      const respuesta = await fetch(`http://127.0.0.1:8000/matriculas/${idSeleccionado}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!respuesta.ok) throw new Error('Error al procesar la baja');

      setModalAbierto(false);
      cargarMatriculas(); 
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcesandoRetiro(false);
    }
  };

  // --- HANDLERS DE CAMBIO DE CURSO ---
  const iniciarCambioCurso = (id: number, nivelActual: string, cursoActual: string) => {
    setIdSeleccionado(id);
    setNuevoNivel(nivelActual);
    setNuevoCurso(cursoActual);
    setModalCursoAbierto(true);
  };

  const confirmarCambioCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSeleccionado) return;
    setProcesandoCurso(true);

    try {
      const respuesta = await fetch(`http://127.0.0.1:8000/matriculas/${idSeleccionado}/curso`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevo_nivel: nuevoNivel, nuevo_curso: nuevoCurso }),
      });

      if (!respuesta.ok) throw new Error('Error al cambiar de curso');

      setModalCursoAbierto(false);
      cargarMatriculas();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcesandoCurso(false);
    }
  };

  // ============================================================================
  // 6. RENDERIZADO DE LA INTERFAZ (UI)
  // ============================================================================
  return (
    <div className="space-y-6 relative">
      
{/* CABECERA Y BOTONES DE ACCIÓN */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Registro de Matrículas</h1>
        
        <div className="flex gap-3">
          {/* BOTÓN OCULTO DE INPUT FILE */}
          <input 
            type="file" 
            accept=".csv" 
            id="csv-upload-matriculas" 
            className="hidden" 
            onChange={manejarSubidaCSV} 
            disabled={subiendoArchivo}
          />
          
          {/* BOTÓN VISUAL PARA EL CSV */}
          <label 
            htmlFor="csv-upload-matriculas" 
            className={`flex items-center justify-center cursor-pointer px-4 py-2 rounded-lg font-medium transition-colors border ${
              subiendoArchivo 
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                : 'bg-white text-emerald-600 border-emerald-600 hover:bg-emerald-50'
            }`}
          >
            {subiendoArchivo ? 'Procesando...' : '📄 Cargar Historial CSV'}
          </label>

          {/* BOTÓN ORIGINAL DE NUEVA MATRÍCULA */}
          <Link 
            to="/matriculas/nueva" 
            className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Nueva Matrícula
          </Link>
        </div>
      </div>

      {/* ESTADOS DE CARGA Y ERROR */}
      {cargando && <p className="text-gray-500">Cargando base de datos...</p>}
      {error && <p className="text-red-500 font-medium">Error: {error}</p>}

      {/* TABLA PRINCIPAL DE DATOS */}
      {!cargando && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-medium">Correlativo</th>
                <th className="p-4 font-medium">Estudiante</th>
                <th className="p-4 font-medium">Apoderado Titular</th>
                <th className="p-4 font-medium">Nivel</th>
                <th className="p-4 font-medium">Curso</th>
                <th className="p-4 font-medium">Fecha</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {matriculas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">No hay registros.</td>
                </tr>
              ) : (
                matriculas.map((mat) => (
                  <tr key={mat.id_matricula} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-900 font-medium">#{mat.numero_correlativo}</td>
                    <td className="p-4">
                        <p className="font-semibold text-gray-800">{mat.estudiante_nombre}</p>
                        <p className="text-xs text-gray-500">{mat.estudiante_rut}</p>
                    </td>
                    <td className="p-4">
                        <p className="font-medium text-emerald-700">{mat.apoderado_nombre}</p>
                        <p className="text-xs text-gray-500">{mat.apoderado_rut}</p>
                    </td>
                    <td className="p-4 text-gray-600">{mat.nivel_ensenanza}</td>
                    <td className="p-4 text-gray-600">{mat.curso}</td>
                    <td className="p-4 text-gray-600">{mat.fecha_matricula}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        mat.estado === 'Activa' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {mat.estado}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {mat.estado === 'Activa' && (
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => setIdCertificadoPreview(mat.id_matricula)}
                            className="text-sm text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                          >
                            Ver Certificado
                          </button>
                          <button 
                            onClick={() => iniciarCambioCurso(mat.id_matricula, mat.nivel_ensenanza, mat.curso)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                          >
                            Cambiar Curso
                          </button>
                          <button 
                            onClick={() => iniciarRetiro(mat.id_matricula)}
                            className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                          >
                            Dar de Baja
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 7. SECCIÓN DE MODALES (Ventanas emergentes) */}
      {/* ============================================================================ */}

      {/* A. MODAL DE RETIRO ASÍNCRONO */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Registrar Retiro de Alumno</h3>
            <form onSubmit={confirmarRetiro} className="space-y-4">
              
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Flujo Confidencial:</strong> Al dar de baja al estudiante, el sistema le enviará un correo automático al apoderado con un enlace seguro para que indique los motivos del retiro.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Baja Efectiva</label>
                <input 
                  type="date" required
                  value={fechaRetiro} onChange={(e) => setFechaRetiro(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button 
                  type="button" onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={procesandoRetiro}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {procesandoRetiro ? 'Procesando...' : 'Dar de Baja y Enviar Correo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. MODAL DE CAMBIO DE CURSO */}
      {modalCursoAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Cambio de Curso</h3>
            <form onSubmit={confirmarCambioCurso} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Nivel</label>
                <select 
                  value={nuevoNivel} onChange={(e) => setNuevoNivel(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Educación Parvularia">Educación Parvularia</option>
                  <option value="Educación Básica">Educación Básica</option>
                  <option value="Educación Media">Educación Media</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Curso</label>
                <input 
                  type="text" required placeholder="Ej: 2do Medio B"
                  value={nuevoCurso} onChange={(e) => setNuevoCurso(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" onClick={() => setModalCursoAbierto(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={procesandoCurso}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {procesandoCurso ? 'Guardando...' : 'Confirmar Cambio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. MODAL VISUALIZADOR DE PDF */}
      {idCertificadoPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Vista Previa del Certificado</h3>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIdCertificadoPreview(null)}
                  className="px-6 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-sm transition-colors"
                >
                  Cerrar Visor
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-gray-300 p-2 md:p-4">
              <iframe 
                src={`http://127.0.0.1:8000/matriculas/${idCertificadoPreview}/certificado`} 
                className="w-full h-full rounded shadow-sm bg-white"
                title="Visor de PDF"
              />
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}