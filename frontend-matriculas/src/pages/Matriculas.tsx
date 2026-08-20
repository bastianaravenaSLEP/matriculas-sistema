import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';

interface Matricula {
  id_matricula: number;
  numero_correlativo: number;
  estudiante_nombre: string;
  estudiante_rut: string;
  apoderado_nombre: string;
  apoderado_rut: string;
  nivel_ensenanza: string;
  curso: string;
  fecha_matricula: string;
  estado: string;
  anio_escolar: number;
  tipo_ensenanza: string;
  rbd: string;
  cod_tipo_ensenanza: number | null; 
}

export default function Matriculas() {
  const { colegioSeleccionado } = useOutletContext<{ colegioSeleccionado: string }>();

  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  
  const [busqueda, setBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState(''); 
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [ordenEstado, setOrdenEstado] = useState<'asc' | 'desc' | null>(null);

  // --- ESTADOS NUEVOS PARA EL MODAL INTELIGENTE DE CURSO ---
  const [modalCursoAbierto, setModalCursoAbierto] = useState(false);
  const [procesandoCurso, setProcesandoCurso] = useState(false);
  const [planDestino, setPlanDestino] = useState<string>('');
  const [cursoDestino, setCursoDestino] = useState<string>('');
  
  const [idCertificadoPreview, setIdCertificadoPreview] = useState<number | null>(null);
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [idSeleccionado, setIdSeleccionado] = useState<number | null>(null);
  const [fechaRetiro, setFechaRetiro] = useState('');
  const [procesandoRetiro, setProcesandoRetiro] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  // Obtenemos el año actual del sistema para las validaciones
  const anioActual = new Date().getFullYear();

  const manejarSubidaCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendoArchivo(true);
    const formData = new FormData();
    formData.append("archivo", archivo);
    const token = localStorage.getItem('token'); 

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/matriculas/carga-masiva", {
        method: "POST",
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.detail || "Error al subir el archivo");
      
      alert(datos.mensaje); 
      cargarMatriculas();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSubiendoArchivo(false);
      e.target.value = ''; 
    }
  };

  const cargarMatriculas = () => {
    setCargando(true);
    const token = localStorage.getItem('token');

    const url = colegioSeleccionado 
      ? `http://127.0.0.1:8000/matriculas?establecimiento_id=${colegioSeleccionado}`
      : `http://127.0.0.1:8000/matriculas`;

    fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
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

  useEffect(() => {
    cargarMatriculas();
  }, [colegioSeleccionado]); 

  useEffect(() => {
    setFiltroCurso('');
  }, [filtroCodigo]);

  const aniosUnicos = useMemo(() => {
    const anios = matriculas.map(m => m.anio_escolar).filter(Boolean);
    return Array.from(new Set(anios)).sort((a, b) => b - a);
  }, [matriculas]);

  const codigosUnicos = useMemo(() => {
    const codigos = matriculas.map(m => m.cod_tipo_ensenanza).filter(cod => cod !== null);
    return Array.from(new Set(codigos)).sort();
  }, [matriculas]);

  const cursosUnicos = useMemo(() => {
    const matriculasFiltradas = filtroCodigo 
      ? matriculas.filter(m => m.cod_tipo_ensenanza?.toString() === filtroCodigo)
      : matriculas;
    const cursos = matriculasFiltradas.map(m => m.curso).filter(Boolean);
    return Array.from(new Set(cursos)).sort();
  }, [matriculas, filtroCodigo]);

  // --- MAPA DE CURSOS REALES EXISTENTES ESTE AÑO ---
  // Esta función crea un diccionario agrupando qué cursos existen realmente en cada Plan este año
  const estructuraColegio = useMemo(() => {
    const estructura: Record<string, { nombrePlan: string, cursos: Set<string> }> = {};
    
    matriculas.forEach(mat => {
      // Solo tomamos en cuenta la fotografía actual (Año en curso y Alumnos Activos)
      if (mat.anio_escolar === anioActual && mat.estado === 'Activa' && mat.cod_tipo_ensenanza) {
        const codStr = mat.cod_tipo_ensenanza.toString();
        
        if (!estructura[codStr]) {
          estructura[codStr] = { nombrePlan: mat.tipo_ensenanza, cursos: new Set() };
        }
        if (mat.curso) {
          estructura[codStr].cursos.add(mat.curso);
        }
      }
    });
    return estructura;
  }, [matriculas, anioActual]);

  const matriculasProcesadas = useMemo(() => {
    let resultado = matriculas.filter(mat => {
      const textoBuscado = busqueda.toLowerCase();
      const coincideBusqueda = 
        mat.estudiante_rut.toLowerCase().includes(textoBuscado) ||
        mat.numero_correlativo.toString().includes(textoBuscado) ||
        mat.estudiante_nombre.toLowerCase().includes(textoBuscado);
      
      const coincideAnio = filtroAnio === '' || mat.anio_escolar?.toString() === filtroAnio;
      const coincideCodigo = filtroCodigo === '' || mat.cod_tipo_ensenanza?.toString() === filtroCodigo;
      const coincideCurso = filtroCurso === '' || mat.curso === filtroCurso;

      return coincideBusqueda && coincideAnio && coincideCodigo && coincideCurso;
    });

    if (ordenEstado) {
      resultado.sort((a, b) => {
        if (ordenEstado === 'asc') return a.estado.localeCompare(b.estado);
        else return b.estado.localeCompare(a.estado);
      });
    }

    return resultado;
  }, [matriculas, busqueda, filtroAnio, filtroCodigo, filtroCurso, ordenEstado]);

  const iniciarRetiro = (id: number) => {
    setIdSeleccionado(id);
    setFechaRetiro('');
    setModalAbierto(true);
  };

  const confirmarRetiro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSeleccionado) return;
    setProcesandoRetiro(true);
    const token = localStorage.getItem('token'); 

    try {
      const respuesta = await fetch(`http://127.0.0.1:8000/matriculas/${idSeleccionado}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          estado: 'Retirado',
          fecha_retiro: fechaRetiro,
          motivo_retiro: '', 
          observaciones: '', 
          id_usuario_ejecutor: 1 
        }),
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

  const iniciarCambioCurso = (id: number) => {
    setIdSeleccionado(id);
    setPlanDestino('');
    setCursoDestino('');
    setModalCursoAbierto(true);
  };

  const confirmarCambioCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSeleccionado || !planDestino || !cursoDestino) return;
    
    setProcesandoCurso(true);
    const token = localStorage.getItem('token'); 

    try {
      const respuesta = await fetch(`http://127.0.0.1:8000/matriculas/${idSeleccionado}/curso`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          cod_tipo_ensenanza: parseInt(planDestino), 
          nuevo_curso: cursoDestino 
        }),
      });

      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.detail || 'Error al cambiar de curso');

      setModalCursoAbierto(false);
      cargarMatriculas();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcesandoCurso(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Registro de Matrículas</h1>
        
        <div className="flex flex-wrap gap-3">
          <input 
            type="file" accept=".csv, .xls, .xlsx" 
            id="csv-upload-matriculas" className="hidden" 
            onChange={manejarSubidaCSV} disabled={subiendoArchivo}
          />
          <label 
            htmlFor="csv-upload-matriculas" 
            className={`flex items-center justify-center cursor-pointer px-4 py-2 rounded-lg font-medium transition-colors border ${
              subiendoArchivo ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-emerald-600 border-emerald-600 hover:bg-emerald-50'
            }`}
          >
            {subiendoArchivo ? 'Procesando...' : '📄 Cargar SIGE / CSV'}
          </label>
          <Link to="/matriculas/nueva" className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            + Nueva Matrícula
          </Link>
        </div>
      </div>

      {/* --- BARRA DE FILTROS --- */}
      {!cargando && !error && matriculas.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">🔍 Buscar</label>
            <input type="text" placeholder="RUT, Folio o Nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">📅 1. Año</label>
            <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none bg-white cursor-pointer">
              <option value="">Todos los años</option>
              {aniosUnicos.map(anio => <option key={anio} value={anio}>{anio}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">📚 2. Plan de Estudio</label>
            <select value={filtroCodigo} onChange={(e) => setFiltroCodigo(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none bg-white cursor-pointer">
              <option value="">Todos los planes</option>
              {codigosUnicos.map(cod => <option key={cod} value={cod}>Cod. {cod}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">🏫 3. Curso</label>
            <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)} disabled={cursosUnicos.length === 0} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400">
              <option value="">Todos los cursos</option>
              {cursosUnicos.map(curso => <option key={curso} value={curso}>{curso}</option>)}
            </select>
          </div>
        </div>
      )}

      {cargando && <p className="text-gray-500">Cargando base de datos...</p>}
      {error && <p className="text-red-500 font-medium">Error: {error}</p>}

      {!cargando && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-medium text-gray-500 flex flex-wrap gap-2 items-center">
            <span className="font-bold text-gray-700">Mostrando {matriculasProcesadas.length} resultados</span>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-medium">Folio</th>
                <th className="p-4 font-medium text-center">RBD</th>
                <th className="p-4 font-medium">Estudiante</th>
                <th className="p-4 font-medium">Apoderado Titular</th>
                <th className="p-4 font-medium">Curso y Plan</th>
                <th className="p-4 font-medium text-center">Año</th>
                <th className="p-4 font-medium cursor-pointer hover:bg-gray-200 transition-colors group select-none" onClick={() => setOrdenEstado(prev => prev === 'asc' ? 'desc' : 'asc')}>
                  <div className="flex items-center gap-2">ESTADO <span className="text-xs">{ordenEstado === 'asc' ? '▲' : '▼'}</span></div>
                </th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {matriculasProcesadas.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">No se encontraron matrículas con esos filtros.</td></tr>
              ) : (
                matriculasProcesadas.map((mat) => (
                  <tr key={mat.id_matricula} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-900 font-medium">#{mat.numero_correlativo}</td>
                    <td className="p-4 text-center"><span className="px-2 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-md text-xs">{mat.rbd}</span></td>
                    <td className="p-4">
                        <p className="font-bold text-gray-800">{mat.estudiante_nombre}</p>
                        <p className="text-xs text-gray-500">{mat.estudiante_rut}</p>
                    </td>
                    <td className="p-4">
                        <p className="font-medium text-emerald-700">{mat.apoderado_nombre}</p>
                        <p className="text-xs text-gray-500">{mat.apoderado_rut}</p>
                    </td>
                    <td className="p-4">
                        <p className="font-bold text-blue-800">{mat.curso}</p>
                        <p className="text-xs text-gray-600 truncate max-w-[250px]" title={mat.tipo_ensenanza}>
                          {mat.cod_tipo_ensenanza && <span className="font-semibold text-gray-700 mr-1">(Cod. {mat.cod_tipo_ensenanza})</span>}
                          {mat.tipo_ensenanza}
                        </p>
                    </td>
                    <td className="p-4 text-center font-semibold text-gray-700">{mat.anio_escolar}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${mat.estado === 'Activa' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {mat.estado}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {mat.estado === 'Activa' && (
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setIdCertificadoPreview(mat.id_matricula)} className="text-emerald-600 hover:text-emerald-800 font-medium transition-colors">Certificado</button>
                          
                          {/* PROTECCIÓN UX: El botón Mover solo aparece si el alumno es de 2026 */}
                          {mat.anio_escolar === anioActual && (
                            <button onClick={() => iniciarCambioCurso(mat.id_matricula)} className="text-blue-600 hover:text-blue-800 font-medium transition-colors">Mover</button>
                          )}
                          
                          <button onClick={() => iniciarRetiro(mat.id_matricula)} className="text-red-600 hover:text-red-800 font-medium transition-colors">Retirar</button>
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

      {/* MODAL CAMBIO DE CURSO INTELIGENTE */}
      {modalCursoAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Cambio de Curso</h3>
            
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-5 text-sm text-blue-800">
              <p><strong>Seguridad RGM:</strong> Solo puedes reubicar al estudiante en cursos <strong>existentes y activos</strong> para el año {anioActual}. El cambio quedará registrado en su ficha.</p>
            </div>

            <form onSubmit={confirmarCambioCurso} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">1. Seleccionar Plan de Estudio</label>
                <select 
                  value={planDestino} 
                  onChange={(e) => {
                    setPlanDestino(e.target.value);
                    setCursoDestino(''); // Reiniciamos el curso si cambia el plan
                  }}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none bg-white"
                  required
                >
                  <option value="">Seleccione un plan de destino...</option>
                  {Object.keys(estructuraColegio).map(cod => (
                    <option key={cod} value={cod}>Cod. {cod} - {estructuraColegio[cod].nombrePlan}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">2. Seleccionar Curso Específico</label>
                <select 
                  value={cursoDestino} 
                  onChange={(e) => setCursoDestino(e.target.value)} 
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
                  disabled={!planDestino}
                  required
                >
                  <option value="">Seleccione la sala...</option>
                  {planDestino && Array.from(estructuraColegio[planDestino].cursos).sort().map(curso => (
                    <option key={curso} value={curso}>{curso}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setModalCursoAbierto(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Cancelar</button>
                <button type="submit" disabled={procesandoCurso || !cursoDestino} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                  {procesandoCurso ? 'Guardando...' : 'Confirmar Traslado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE RETIRO */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Registrar Retiro de Alumno</h3>
            <form onSubmit={confirmarRetiro} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Efectiva</label>
                <input type="date" required value={fechaRetiro} onChange={(e) => setFechaRetiro(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2" />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setModalAbierto(false)} className="px-4 py-2 text-gray-600 bg-gray-100">Cancelar</button>
                <button type="submit" disabled={procesandoRetiro} className="px-4 py-2 bg-red-600 text-white rounded-lg">{procesandoRetiro ? 'Procesando...' : 'Retirar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISOR DE CERTIFICADOS */}
      {idCertificadoPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Vista Previa</h3>
              <button onClick={() => setIdCertificadoPreview(null)} className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg text-sm">Cerrar Visor</button>
            </div>
            <div className="flex-1 bg-gray-300 p-2 md:p-4">
              <iframe src={`http://127.0.0.1:8000/matriculas/${idCertificadoPreview}/certificado`} className="w-full h-full rounded shadow-sm bg-white" title="Visor" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}