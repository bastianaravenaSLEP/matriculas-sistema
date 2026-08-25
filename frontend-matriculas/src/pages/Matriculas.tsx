import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import ModalEmisionDocumento from '../components/ModalEmisionDocumento';

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

  // --- LÓGICA DE ROLES ---
  const usuarioString = localStorage.getItem('usuario');
  const usuario = usuarioString ? JSON.parse(usuarioString) : null;
  const puedeEditar = !['Visualizador_SLEP', 'Visualizador_Colegio'].includes(usuario?.rol);

  const [motivoCambio, setMotivoCambio] = useState('');
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  
  const [busqueda, setBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState(''); 
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [ordenEstado, setOrdenEstado] = useState<'asc' | 'desc' | null>(null);

  const [modalCursoAbierto, setModalCursoAbierto] = useState(false);
  const [procesandoCurso, setProcesandoCurso] = useState(false);
  const [planDestino, setPlanDestino] = useState<string>('');
  const [cursoDestino, setCursoDestino] = useState<string>('');
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [idSeleccionado, setIdSeleccionado] = useState<number | null>(null);
  const [fechaRetiro, setFechaRetiro] = useState('');
  const [procesandoRetiro, setProcesandoRetiro] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  const [enviarDirectorRetiro, setEnviarDirectorRetiro] = useState(false);
  const [correoDirectorRetiro, setCorreoDirectorRetiro] = useState('');
  const [enviarApoderadoRetiro, setEnviarApoderadoRetiro] = useState(true); 
  const [correoApoderadoRetiro, setCorreoApoderadoRetiro] = useState('');
  const [descargarLocalRetiro, setDescargarLocalRetiro] = useState(false);

  const [enviarDirectorCurso, setEnviarDirectorCurso] = useState(false);
  const [correoDirectorCurso, setCorreoDirectorCurso] = useState('');
  const [enviarApoderadoCurso, setEnviarApoderadoCurso] = useState(true);
  const [correoApoderadoCurso, setCorreoApoderadoCurso] = useState('');
  const [descargarLocalCurso, setDescargarLocalCurso] = useState(false);

  const [modalEmisionAbierto, setModalEmisionAbierto] = useState(false);
  const [datosEmision, setDatosEmision] = useState<{
    id: number;
    nombre: string;
    tipo: 'MATRICULA' | 'RETIRO' | 'CAMBIO_CURSO';
  } | null>(null);

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

  const estructuraColegio = useMemo(() => {
    const estructura: Record<string, { nombrePlan: string, cursos: Set<string> }> = {};
    
    matriculas.forEach(mat => {
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

  const abrirModalEmision = (idMatricula: number, tipo: 'MATRICULA' | 'RETIRO' | 'CAMBIO_CURSO') => {
    const matricula = matriculas.find(m => m.id_matricula === idMatricula);
    if (matricula) {
      setDatosEmision({
        id: matricula.id_matricula,
        nombre: matricula.estudiante_nombre,
        tipo: tipo
      });
      setModalEmisionAbierto(true);
    }
  };

  const iniciarRetiro = (id: number) => {
    setIdSeleccionado(id);
    setFechaRetiro('');
    setModalAbierto(true);
  };

const confirmarRetiro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSeleccionado) return;

    const destinatarios: string[] = [];
    if (enviarDirectorRetiro && correoDirectorRetiro.trim()) destinatarios.push(correoDirectorRetiro.trim());
    if (enviarApoderadoRetiro && correoApoderadoRetiro.trim()) destinatarios.push(correoApoderadoRetiro.trim());

    if (destinatarios.length === 0) {
      alert('Por cumplimiento normativo, debe indicar al menos un correo de destino (Director o Apoderado) para enviar el comprobante de retiro.');
      return;
    }

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

      if (!respuesta.ok) throw new Error('Error al procesar la baja en el sistema');

      await fetch('http://127.0.0.1:8000/documentos/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          id_matricula: idSeleccionado,
          tipo_documento: 'RETIRO',
          destinatarios: destinatarios
        })
      });

      if (descargarLocalRetiro) {
        window.open(`http://127.0.0.1:8000/matriculas/${idSeleccionado}/certificado?tipo=RETIRO`, '_blank');
      }

      setModalAbierto(false);
      cargarMatriculas(); 
      alert('Retiro procesado y comprobante enviado con éxito.');

    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setProcesandoRetiro(false);
    }
  };

  const iniciarCambioCurso = (id: number) => {
    setIdSeleccionado(id);
    setPlanDestino('');
    setCursoDestino('');
    setMotivoCambio('');
    setModalCursoAbierto(true);
  };

const confirmarCambioCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSeleccionado || !planDestino || !cursoDestino) return;
    
    const destinatarios: string[] = [];
    if (enviarDirectorCurso && correoDirectorCurso.trim()) destinatarios.push(correoDirectorCurso.trim());
    if (enviarApoderadoCurso && correoApoderadoCurso.trim()) destinatarios.push(correoApoderadoCurso.trim());

    if (destinatarios.length === 0) {
      alert('Por cumplimiento normativo, debe indicar al menos un correo de destino para enviar el certificado de traslado.');
      return;
    }

    setProcesandoCurso(true);
    const token = localStorage.getItem('token'); 

    try {
      const respuesta = await fetch(`http://127.0.0.1:8000/matriculas/${idSeleccionado}/curso`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          cod_tipo_ensenanza: parseInt(planDestino), 
          nuevo_curso: cursoDestino,
          motivo_cambio_curso: motivoCambio 
        }),
      });

      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.detail || 'Error al cambiar de curso');

      await fetch('http://127.0.0.1:8000/documentos/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          id_matricula: idSeleccionado,
          tipo_documento: 'CAMBIO_CURSO',
          destinatarios: destinatarios
        })
      });

      if (descargarLocalCurso) {
        window.open(`http://127.0.0.1:8000/matriculas/${idSeleccionado}/certificado?tipo=CAMBIO_CURSO`, '_blank');
      }

      setModalCursoAbierto(false);
      cargarMatriculas();
      alert('Traslado registrado y certificado enviado con éxito.');

    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setProcesandoCurso(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Registro de Matrículas</h1>
        
        <div className="flex flex-wrap gap-3">
          {/* OCULTAMIENTO CONDICIONAL DE BOTONES SUPERIORES */}
          {puedeEditar && (
            <>
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
            </>
          )}
        </div>
      </div>

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
                          <button onClick={() => abrirModalEmision(mat.id_matricula, 'MATRICULA')} className="text-emerald-600 hover:text-emerald-800 font-medium transition-colors">
                            Emitir Doc.
                          </button>
                          
                          {/* OCULTAMIENTO CONDICIONAL DE BOTONES DE ACCIÓN */}
                          {puedeEditar && mat.anio_escolar === anioActual && (
                            <button onClick={() => iniciarCambioCurso(mat.id_matricula)} className="text-blue-600 hover:text-blue-800 font-medium transition-colors">Mover</button>
                          )}
                          
                          {puedeEditar && (
                            <button onClick={() => iniciarRetiro(mat.id_matricula)} className="text-red-600 hover:text-red-800 font-medium transition-colors">Retirar</button>
                          )}
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

      {modalCursoAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Cambio de Curso y Emisión de Constancia</h3>
            
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4 text-xs text-blue-800">
              <p><strong>Normativa SLEP:</strong> El traslado exige el envío obligatorio del certificado digital al director o apoderado.</p>
            </div>

            <form onSubmit={confirmarCambioCurso} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">1. Plan de Destino</label>
                <select 
                  value={planDestino} 
                  onChange={(e) => { setPlanDestino(e.target.value); setCursoDestino(''); }}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none" required
                >
                  <option value="">Seleccione un plan...</option>
                  {Object.keys(estructuraColegio).map(cod => (
                    <option key={cod} value={cod}>Cod. {cod} - {estructuraColegio[cod].nombrePlan}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">2. Curso Específico</label>
                <select 
                  value={cursoDestino} onChange={(e) => setCursoDestino(e.target.value)} 
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white disabled:bg-gray-100"
                  disabled={!planDestino} required
                >
                  <option value="">Seleccione la sala...</option>
                  {planDestino && Array.from(estructuraColegio[planDestino].cursos).sort().map(curso => (
                    <option key={curso} value={curso}>{curso}</option>
                  ))}
                </select>
              </div>

                            <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">3. Motivo o Justificación del Traslado</label>
                <textarea 
                  rows={2}
                  value={motivoCambio} 
                  onChange={(e) => setMotivoCambio(e.target.value)} 
                  placeholder="Ej: Solicitud escrita del apoderado por cercanía de domicilio..." 
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              <div className="border-t pt-3 space-y-3">
                <p className="text-xs font-bold text-gray-700 uppercase">4. Envío Obligatorio de Comprobante</p>
                
                <div className="p-2.5 border rounded-lg bg-gray-50 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input type="checkbox" checked={enviarDirectorCurso} onChange={(e) => setEnviarDirectorCurso(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                    Enviar al Director
                  </label>
                  {enviarDirectorCurso && (
                    <input type="email" placeholder="correo.director@establecimiento.cl" value={correoDirectorCurso} onChange={(e) => setCorreoDirectorCurso(e.target.value)} className="w-full border p-2 rounded text-xs bg-white" required />
                  )}
                </div>

                <div className="p-2.5 border rounded-lg bg-gray-50 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input type="checkbox" checked={enviarApoderadoCurso} onChange={(e) => setEnviarApoderadoCurso(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                    Enviar al Apoderado
                  </label>
                  {enviarApoderadoCurso && (
                    <input type="email" placeholder="correo.apoderado@gmail.com" value={correoApoderadoCurso} onChange={(e) => setCorreoApoderadoCurso(e.target.value)} className="w-full border p-2 rounded text-xs bg-white" required />
                  )}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                  <input type="checkbox" checked={descargarLocalCurso} onChange={(e) => setDescargarLocalCurso(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
                  Descargar también una copia local en mi equipo (Opcional)
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setModalCursoAbierto(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={procesandoCurso || !cursoDestino} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {procesandoCurso ? 'Procesando...' : 'Confirmar Traslado y Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Registrar Retiro y Constancia</h3>
            <p className="text-xs text-gray-500 mb-4">La baja del estudiante requiere el despacho obligatorio del comprobante oficial.</p>

            <form onSubmit={confirmarRetiro} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fecha Efectiva de Retiro</label>
                <input type="date" required value={fechaRetiro} onChange={(e) => setFechaRetiro(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
              </div>

              <div className="border-t pt-3 space-y-3">
                <p className="text-xs font-bold text-gray-700 uppercase">Envío Obligatorio de Comprobante de Retiro</p>
                
                <div className="p-2.5 border rounded-lg bg-gray-50 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input type="checkbox" checked={enviarDirectorRetiro} onChange={(e) => setEnviarDirectorRetiro(e.target.checked)} className="w-4 h-4 text-red-600 rounded" />
                    Enviar al Director
                  </label>
                  {enviarDirectorRetiro && (
                    <input type="email" placeholder="correo.director@establecimiento.cl" value={correoDirectorRetiro} onChange={(e) => setCorreoDirectorRetiro(e.target.value)} className="w-full border p-2 rounded text-xs bg-white" required />
                  )}
                </div>

                <div className="p-2.5 border rounded-lg bg-gray-50 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input type="checkbox" checked={enviarApoderadoRetiro} onChange={(e) => setEnviarApoderadoRetiro(e.target.checked)} className="w-4 h-4 text-red-600 rounded" />
                    Enviar al Apoderado
                  </label>
                  {enviarApoderadoRetiro && (
                    <input type="email" placeholder="correo.apoderado@gmail.com" value={correoApoderadoRetiro} onChange={(e) => setCorreoApoderadoRetiro(e.target.value)} className="w-full border p-2 rounded text-xs bg-white" required />
                  )}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                  <input type="checkbox" checked={descargarLocalRetiro} onChange={(e) => setDescargarLocalRetiro(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
                  Descargar también una copia local en mi equipo (Opcional)
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setModalAbierto(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={procesandoRetiro} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {procesandoRetiro ? 'Procesando...' : 'Confirmar Retiro y Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalEmisionAbierto && datosEmision && (
        <ModalEmisionDocumento
          isOpen={modalEmisionAbierto}
          onClose={() => setModalEmisionAbierto(false)}
          idMatricula={datosEmision.id}
          nombreAlumno={datosEmision.nombre}
          tipoDocumento={datosEmision.tipo}
        />
      )}
    </div>
  );
}