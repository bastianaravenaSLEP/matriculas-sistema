import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, UserCheck } from 'lucide-react';

interface MatriculaBase {
  id_establecimiento: number;
  cod_tipo_ensenanza: number | null;
  tipo_ensenanza: string;
  nivel_ensenanza: string;
  curso: string;
}

export default function NuevaMatricula() {
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Estados para búsqueda de estudiantes
  const [rutBusqueda, setRutBusqueda] = useState('');
  const [estudiante, setEstudiante] = useState<any>(null);
  const [estudiantesDb, setEstudiantesDb] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // Estados para la lógica en cascada
  const [establecimientosDb, setEstablecimientosDb] = useState<any[]>([]);
  const [todasLasMatriculas, setTodasLasMatriculas] = useState<MatriculaBase[]>([]);

  // Formulario de matrícula
  const [formulario, setFormulario] = useState({
    id_establecimiento: '',
    numero_correlativo: '',
    anio_escolar: '2026',
    fecha_matricula: new Date().toISOString().split('T')[0],
    nivel_ensenanza: 'Educación Básica',
    cod_tipo_ensenanza: '',
    cursoSeleccionado: '',
    cod_grado: 1,
    letra_curso: 'A',
  });

  // Cargar datos iniciales al montar la vista
  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    // 1. Cargar Establecimientos
    fetch('http://127.0.0.1:8000/establecimientos', { headers })
      .then(res => res.json())
      .then(data => {
        setEstablecimientosDb(data);
        if (data.length > 0) {
          setFormulario(prev => ({ ...prev, id_establecimiento: String(data[0].id_establecimiento) }));
        }
      })
      .catch(err => console.error("Error cargando establecimientos:", err));

    // 2. Cargar Matrículas existentes
    fetch('http://127.0.0.1:8000/matriculas', { headers })
      .then(res => res.json())
      .then(data => setTodasLasMatriculas(data))
      .catch(err => console.error("Error cargando base de matrículas:", err));

    // 3. Cargar Estudiantes y precargar si viene desde el módulo de estudiantes
    fetch('http://127.0.0.1:8000/estudiante', { headers })
      .then(res => res.json())
      .then(datos => {
        setEstudiantesDb(datos);
        const rutPre = location.state?.rutPreseleccionado;
        if (rutPre) {
          const encontrado = datos.find((est: any) => est.run === rutPre);
          if (encontrado) seleccionarEstudiante(encontrado);
        }
      })
      .catch(err => console.error("Error cargando estudiantes:", err));
  }, [location.state]);

  // --- FUNCIÓN INTELIGENTE PARA DETERMINAR EL NIVEL REAL ---
  const determinarNivelInteligente = (cursoStr: string, codigoPlan: number) => {
    const texto = cursoStr.toLowerCase();
    
    // 1. Si el texto del curso contiene palabras clave, mandan ellas
    if (texto.includes('básico') || texto.includes('basico')) {
      return 'Educación Básica';
    }
    if (texto.includes('medio') || texto.includes('media')) {
      return 'Educación Media';
    }
    if (texto.includes('parvularia') || texto.includes('kínder') || texto.includes('kinder') || texto.includes('pre-kínder') || texto.includes('sala cuna')) {
      return 'Educación Parvularia';
    }

    // 2. Si no es claro en el texto, nos guiamos por el código oficial Mineduc
    if (codigoPlan === 10) return 'Educación Parvularia';
    if (codigoPlan >= 110 && codigoPlan <= 119) return 'Educación Básica';
    if (codigoPlan >= 300) return 'Educación Media';

    return 'Educación Básica'; // Valor por defecto seguro
  };

  // A. Códigos de enseñanza disponibles según el Establecimiento
  const codigosDisponibles = useMemo(() => {
    if (!formulario.id_establecimiento) return [];
    const idEst = Number(formulario.id_establecimiento);
    
    const filtradas = todasLasMatriculas.filter(m => Number(m.id_establecimiento) === idEst);
    const mapaCodigos = new Map();
    
    filtradas.forEach(m => {
      if (m.cod_tipo_ensenanza !== null && m.cod_tipo_ensenanza !== undefined) {
        mapaCodigos.set(Number(m.cod_tipo_ensenanza), m.tipo_ensenanza || 'Plan de Estudio');
      }
    });

    return Array.from(mapaCodigos.entries()).map(([codigo, nombre]) => ({ codigo, nombre }));
  }, [formulario.id_establecimiento, todasLasMatriculas]);

  // B. Cursos disponibles según Establecimiento y Código de Plan
  const cursosDisponibles = useMemo(() => {
    if (!formulario.id_establecimiento || !formulario.cod_tipo_ensenanza) return [];
    const idEst = Number(formulario.id_establecimiento);
    const codEns = Number(formulario.cod_tipo_ensenanza);

    const filtradas = todasLasMatriculas.filter(
      m => Number(m.id_establecimiento) === idEst && Number(m.cod_tipo_ensenanza) === codEns
    );

    const cursosSet = new Set<string>();
    filtradas.forEach(m => {
      if (m.curso) cursosSet.add(m.curso);
    });

    return Array.from(cursosSet).sort();
  }, [formulario.id_establecimiento, formulario.cod_tipo_ensenanza, todasLasMatriculas]);

  // Auto-seleccionar el primer código al cambiar de colegio
  useEffect(() => {
    if (codigosDisponibles.length > 0) {
      setFormulario(prev => ({ 
        ...prev, 
        cod_tipo_ensenanza: String(codigosDisponibles[0].codigo), 
        cursoSeleccionado: '' 
      }));
    } else {
      setFormulario(prev => ({ ...prev, cod_tipo_ensenanza: '', cursoSeleccionado: '' }));
    }
  }, [formulario.id_establecimiento, codigosDisponibles]);

  // Auto-seleccionar el primer curso al cambiar el código de plan
  useEffect(() => {
    if (cursosDisponibles.length > 0) {
      seleccionarCurso(cursosDisponibles[0]);
    } else {
      setFormulario(prev => ({ ...prev, cursoSeleccionado: '', cod_grado: 1, letra_curso: 'A' }));
    }
  }, [formulario.cod_tipo_ensenanza, cursosDisponibles]);

  // Descomponer curso y calcular nivel inteligentemente
  const seleccionarCurso = (cursoStr: string) => {
    const matchNumero = cursoStr.match(/\d+/);
    const gradoNum = matchNumero ? parseInt(matchNumero[0], 10) : 1;

    const partes = cursoStr.trim().split(' ');
    const letraEncontrada = partes.length > 0 ? partes[partes.length - 1] : 'A';
    const letraFinal = letraEncontrada.length <= 2 ? letraEncontrada.replace(/[^A-Z]/gi, '') || 'A' : 'A';

    const codigoActual = Number(formulario.cod_tipo_ensenanza) || 110;
    const nivelCalculado = determinarNivelInteligente(cursoStr, codigoActual);

    setFormulario(prev => ({
      ...prev,
      cursoSeleccionado: cursoStr,
      nivel_ensenanza: nivelCalculado,
      cod_grado: gradoNum,
      letra_curso: letraFinal
    }));
  };

  const handleEscribirBuscador = (texto: string) => {
    setRutBusqueda(texto);
    if (texto.length > 1) {
      const textoLimpio = texto.toLowerCase();
      const filtrados = estudiantesDb.filter(est => 
        est.run.toLowerCase().includes(textoLimpio) || 
        est.nombre_completo.toLowerCase().includes(textoLimpio)
      );
      setSugerencias(filtrados);
      setMostrarSugerencias(true);
    } else {
      setSugerencias([]);
      setMostrarSugerencias(false);
    }
  };

  const seleccionarEstudiante = async (est: any) => {
    setRutBusqueda(est.run);
    setMostrarSugerencias(false);
    setCargando(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const respuesta = await fetch(`http://127.0.0.1:8000/estudiante/${est.run}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!respuesta.ok) throw new Error('Estudiante no encontrado en el sistema.');
      
      const datos = await respuesta.json();
      setEstudiante(datos.personal); 
    } catch (err: any) {
      setError(err.message);
      setEstudiante(null);
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estudiante) return;

    setCargando(true);
    setError('');

    const payload = {
      numero_correlativo: parseInt(formulario.numero_correlativo),
      anio_escolar: parseInt(formulario.anio_escolar),
      id_estudiante: estudiante.id,
      id_establecimiento: parseInt(formulario.id_establecimiento),
      fecha_matricula: formulario.fecha_matricula,
      nivel_ensenanza: formulario.nivel_ensenanza,
      curso: formulario.cursoSeleccionado,
      estado: 'Activa',
      fecha_retiro: null,
      motivo_retiro: null,
      observaciones: 'Matrícula ingresada desde portal transaccional.',
      id_usuario_ejecutor: 1,
      cod_tipo_ensenanza: formulario.cod_tipo_ensenanza ? parseInt(formulario.cod_tipo_ensenanza) : null,
      cod_grado: formulario.cod_grado,
      letra_curso: formulario.letra_curso
    };

    const token = localStorage.getItem('token');

    try {
      const respuesta = await fetch('http://127.0.0.1:8000/matriculas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.detail || 'Error al guardar la matrícula.');
      
      navigate('/matriculas');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Registrar Nueva Matrícula</h2>
      
      {/* PASO 1: ESTUDIANTE */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-4">Paso 1: Identificación del Estudiante</h3>
        
        <div className="relative mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Ingrese RUT o Nombre del estudiante a matricular..."
                value={rutBusqueda} 
                onChange={(e) => handleEscribirBuscador(e.target.value)}
                onFocus={() => { if (sugerencias.length > 0) setMostrarSugerencias(true) }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 outline-none transition-all"
                disabled={estudiante !== null} 
              />
            </div>
            
            {estudiante && (
              <button 
                type="button" 
                onClick={() => { setEstudiante(null); setRutBusqueda(''); }} 
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
              >
                Cambiar Alumno
              </button>
            )}
          </div>

          {mostrarSugerencias && !estudiante && (
            <ul className="absolute z-50 w-full md:w-[calc(100%-140px)] mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {sugerencias.length === 0 ? (
                <li className="p-3 text-sm text-gray-500 text-center">No se encontraron estudiantes.</li>
              ) : (
                sugerencias.map((est) => (
                  <li 
                    key={est.id}
                    onClick={() => seleccionarEstudiante(est)}
                    className="p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors flex flex-col"
                  >
                    <span className="font-semibold text-gray-800">{est.nombre_completo}</span>
                    <span className="text-xs text-gray-500">RUT: {est.run}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-4">{error}</div>}

        {estudiante && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex items-start gap-4 animate-in fade-in">
            <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 mt-1"><UserCheck size={24} /></div>
            <div>
              <p className="text-sm text-emerald-800 font-semibold uppercase tracking-wider">Estudiante Precargado Correctamente</p>
              <p className="text-lg font-bold text-gray-900">{estudiante.nombres} {estudiante.apellidos}</p>
              <p className="text-sm text-gray-600">RUT: {estudiante.run}</p>
            </div>
          </div>
        )}
      </div>

      {/* PASO 2: DATOS ACADÉMICOS EN CASCADA */}
      <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 transition-opacity ${!estudiante ? 'opacity-50 pointer-events-none' : ''}`}>
        <h3 className="font-semibold text-gray-700 mb-6">Paso 2: Datos de Matrícula y Establecimiento</h3>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* 1. ESTABLECIMIENTO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Establecimiento Educacional</label>
            <select 
              name="id_establecimiento" 
              value={formulario.id_establecimiento} 
              onChange={handleChange} 
              required
              className="w-full border border-gray-300 rounded-lg p-2 outline-none bg-white font-medium text-gray-800"
            >
              {establecimientosDb.map((est) => (
                <option key={est.id_establecimiento} value={est.id_establecimiento}>
                  RBD: {est.rbd} - {est.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Correlativo (Folio)</label>
              <input required type="number" name="numero_correlativo" value={formulario.numero_correlativo} onChange={handleChange} placeholder="Ej: 1042" className="w-full border border-gray-300 rounded-lg p-2 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año Escolar</label>
              <input required type="number" name="anio_escolar" value={formulario.anio_escolar} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Matrícula</label>
            <input required type="date" name="fecha_matricula" value={formulario.fecha_matricula} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2 outline-none" />
          </div>

          {/* 2. CÓDIGO DE ENSEÑANZA Y CURSO EN CASCADA REAL */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de Plan (Tipo Enseñanza)</label>
              <select 
                name="cod_tipo_ensenanza" 
                value={formulario.cod_tipo_ensenanza} 
                onChange={handleChange} 
                required
                className="w-full border border-gray-300 rounded-lg p-2 outline-none bg-white font-mono"
              >
                {codigosDisponibles.length === 0 ? (
                  <option value="">No hay planes registrados</option>
                ) : (
                  codigosDisponibles.map(item => (
                    <option key={item.codigo} value={item.codigo}>
                      Cod. {item.codigo} - {item.nombre}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Curso (Sala)</label>
              <select 
                name="cursoSeleccionado" 
                value={formulario.cursoSeleccionado} 
                onChange={(e) => seleccionarCurso(e.target.value)} 
                required
                className="w-full border border-gray-300 rounded-lg p-2 outline-none bg-white font-bold text-blue-800"
              >
                {cursosDisponibles.length === 0 ? (
                  <option value="">Seleccione un plan primero</option>
                ) : (
                  cursosDisponibles.map(curso => (
                    <option key={curso} value={curso}>{curso}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Resumen automático de autocompletado */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-500 flex justify-between">
            <span>Grado autodetectado: <strong>{formulario.cod_grado}</strong></span>
            <span>Letra autodetectada: <strong>{formulario.letra_curso}</strong></span>
            <span>Nivel Real: <strong className="text-blue-600">{formulario.nivel_ensenanza}</strong></span>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => navigate('/matriculas')} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={cargando} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
              {cargando ? 'Procesando...' : 'Confirmar Matrícula'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}