import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { Search, UserCheck, AlertCircle, X, Copy } from 'lucide-react';

interface MatriculaBase {
  id_establecimiento: number;
  cod_tipo_ensenanza: number | null;
  tipo_ensenanza: string;
  nivel_ensenanza: string;
  curso: string;
  estudiante_rut: string;
  anio_escolar: number;
}

export default function NuevaMatricula() {
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Estados para búsqueda de estudiantes
  const [rutBusqueda, setRutBusqueda] = useState('');
  const [estudiante, setEstudiante] = useState<any>(null);
  const [estudianteCompleto, setEstudianteCompleto] = useState<any>(null);
  const [estudiantesDb, setEstudiantesDb] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // Estados de Precarga y Validación Completa
  const [huboPrecarga, setHuboPrecarga] = useState(false);
  const [cursoPrevio, setCursoPrevio] = useState(''); // 🌟 NUEVO
  const [codigoPrevio, setCodigoPrevio] = useState<number | null>(null); // 🌟 NUEVO
  const [alertasTransicion, setAlertasTransicion] = useState<{texto: string, tipo: 'info' | 'alerta' | 'peligro'}[]>([]);
  const [datosFaltantes, setDatosFaltantes] = useState<string[]>([]);
  const [modalFaltantes, setModalFaltantes] = useState(false);
  const { colegioSeleccionado } = useOutletContext<any>() || { colegioSeleccionado: '' };

  // 🌟 LÓGICA DE ROLES PARA SEGURIDAD 🌟
  const usuarioString = localStorage.getItem('usuario');
  const usuario = usuarioString ? JSON.parse(usuarioString) : null;
  
  // 1. Convertimos el rol a minúsculas por si acaso
  const rolUsuario = usuario?.rol?.toLowerCase() || '';
  
  // 2. Bloqueamos SÍ o SÍ si el usuario tiene un colegio asignado en su sesión,
  // o si su rol incluye las palabras "colegio" o "director".
  const esPerfilColegio = Boolean(usuario?.id_establecimiento) || rolUsuario.includes('colegio') || rolUsuario.includes('director');

  useEffect(() => {
    // Si es un colegio, forzamos SU id de establecimiento por seguridad
    if (esPerfilColegio && usuario?.id_establecimiento) {
      setFormulario(prev => ({
        ...prev,
        id_establecimiento: String(usuario.id_establecimiento)
      }));
    } else if (colegioSeleccionado) {
      setFormulario(prev => ({
        ...prev,
        id_establecimiento: String(colegioSeleccionado)
      }));
    }
  }, [colegioSeleccionado]);

  
  // NUEVO: Estado con todos los campos obligatorios del apoderado
  const [formFaltantes, setFormFaltantes] = useState({
    domicilio_estudiante: '',
    rut_apoderado: '',
    nombres_apoderado: '',
    apellido_paterno_apoderado: '',
    apellido_materno_apoderado: '',
    domicilio_apoderado: '',
    telefono_apoderado: '',
    correo_apoderado: ''
  });

  // --- NUEVOS ESTADOS PARA PROCEDENCIA ---
  const [colegioProcedencia, setColegioProcedencia] = useState('');
  const [esTraslado, setEsTraslado] = useState(false);
  const [guardandoFaltantes, setGuardandoFaltantes] = useState(false);
  

  // Estados para la lógica en cascada
  const [establecimientosDb, setEstablecimientosDb] = useState<any[]>([]);
  const [todasLasMatriculas, setTodasLasMatriculas] = useState<MatriculaBase[]>([]);

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    fetch('http://127.0.0.1:8000/establecimientos', { headers })
      .then(res => res.json())
      .then(data => {
        setEstablecimientosDb(data);
        
        if (data.length > 0 && !formulario.id_establecimiento) {
          
          // Buscamos si el colegio del filtro global existe en la lista de colegios
          const colegioFiltro = data.find((est: any) => String(est.id_establecimiento) === String(colegioSeleccionado));
          
          if (colegioFiltro) {
            // Si coincide, seleccionamos automáticamente ese
            setFormulario(prev => ({ ...prev, id_establecimiento: String(colegioFiltro.id_establecimiento) }));
          } else {
            // Si el usuario está viendo "Todos los establecimientos" (Nivel Central), seleccionamos el primero por defecto
            setFormulario(prev => ({ ...prev, id_establecimiento: String(data[0].id_establecimiento) }));
          }
        }
      })
      .catch(err => console.error("Error establecimientos:", err));

    fetch('http://127.0.0.1:8000/matriculas', { headers })
      .then(res => res.json())
      .then(data => setTodasLasMatriculas(data))
      .catch(err => console.error("Error matrículas:", err));

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
      .catch(err => console.error("Error estudiantes:", err));
  }, [location.state]);

  const determinarNivelInteligente = (cursoStr: string, codigoPlan: number) => {
    const texto = cursoStr.toLowerCase();
    if (texto.includes('básico') || texto.includes('basico')) return 'Educación Básica';
    if (texto.includes('medio') || texto.includes('media')) return 'Educación Media';
    if (texto.includes('parvularia') || texto.includes('kínder') || texto.includes('kinder') || texto.includes('pre-kínder') || texto.includes('sala cuna')) return 'Educación Parvularia';
    if (codigoPlan === 10) return 'Educación Parvularia';
    if (codigoPlan >= 110 && codigoPlan <= 119) return 'Educación Básica';
    if (codigoPlan >= 300) return 'Educación Media';
    return 'Educación Básica'; 
  };

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

  useEffect(() => {
    if (codigosDisponibles.length > 0) {
      const existe = codigosDisponibles.find(c => String(c.codigo) === formulario.cod_tipo_ensenanza);
      if (!existe) {
        setFormulario(prev => ({ ...prev, cod_tipo_ensenanza: String(codigosDisponibles[0].codigo), cursoSeleccionado: '' }));
      }
    }
  }, [formulario.id_establecimiento, codigosDisponibles]);

  useEffect(() => {
    if (cursosDisponibles.length > 0) {
      if (!cursosDisponibles.includes(formulario.cursoSeleccionado)) {
        seleccionarCurso(cursosDisponibles[0]);
      } else {
        seleccionarCurso(formulario.cursoSeleccionado);
      }
    }
  }, [formulario.cod_tipo_ensenanza, cursosDisponibles]);

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

  const procesarEstudiante =  async (datos: any, estRun: string) => {
    setEstudiante(datos.personal);
    setEstudianteCompleto(datos);

    // 1. VALIDACIÓN ESTRICTA (Si falta un dato base, se exige completar todo el formulario)
    const faltan: string[] = [];
    if (!datos.personal.domicilio || datos.personal.domicilio === "Sin registrar") faltan.push("Domicilio del Estudiante");
    if (!datos.apoderado.rut || datos.apoderado.rut === "Sin registrar") faltan.push("RUT del Apoderado");
    if (!datos.apoderado.nombre || datos.apoderado.nombre === "Pendiente") faltan.push("Nombre Completo del Apoderado");
    if (!datos.apoderado.telefono || datos.apoderado.telefono === "-") faltan.push("Teléfono del Apoderado");
    if (!datos.apoderado.correo || datos.apoderado.correo === "-") faltan.push("Correo del Apoderado");
    
    setDatosFaltantes(faltan);

    if (faltan.length > 0) {
      // Pre-cargamos lo que haya disponible para no borrar datos existentes
      setFormFaltantes({
        domicilio_estudiante: datos.personal.domicilio !== "Sin registrar" ? datos.personal.domicilio : '',
        rut_apoderado: datos.apoderado.rut !== "Sin registrar" ? datos.apoderado.rut : '',
        nombres_apoderado: '',
        apellido_paterno_apoderado: '',
        apellido_materno_apoderado: '',
        domicilio_apoderado: '',
        telefono_apoderado: datos.apoderado.telefono !== "-" ? datos.apoderado.telefono : '',
        correo_apoderado: datos.apoderado.correo !== "-" ? datos.apoderado.correo : ''
      });
    }

    // ---CONSULTA DE COLEGIO PREVIO ---
    try {
        const token = localStorage.getItem('token');
        const resProcedencia = await fetch(`http://127.0.0.1:8000/matriculas/procedencia/${estRun}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resProcedencia.ok) {
            const procedencia = await resProcedencia.json();
            
            if (procedencia.encontrado) {
                setColegioProcedencia(`${procedencia.colegio_procedencia} (RBD: ${procedencia.rbd_procedencia})`);
                
                // Si el colegio de donde viene ES DISTINTO al que está seleccionado actualmente en el select
                if (String(procedencia.id_establecimiento_previo) !== String(formulario.id_establecimiento)) {
                    setEsTraslado(true);
                } else {
                    setEsTraslado(false);
                }
            } else {
                setColegioProcedencia('Estudiante Nuevo (Sin registros previos)');
                setEsTraslado(false);
            }
        }
    } catch (e) {
        console.error("Error buscando procedencia", e);
    }
  };

  // 🌟 EFECTO REACTIVO PARA PRECARGA DE HISTORIAL ACADÉMICO 🌟
  // Esto arregla el bug de recarga de página: Espera pacientemente a que estén listos el estudiante y las matrículas
  useEffect(() => {
    if (estudiante && todasLasMatriculas.length > 0) {
      const historicas = todasLasMatriculas.filter(m => m.estudiante_rut === estudiante.run);
      
      if (historicas.length > 0) {
        historicas.sort((a, b) => b.anio_escolar - a.anio_escolar); 
        const ultima = historicas[0];

        setCursoPrevio(ultima.curso);
        setCodigoPrevio(ultima.cod_tipo_ensenanza ? Number(ultima.cod_tipo_ensenanza) : null);

        if (!huboPrecarga) {
          setFormulario(prev => ({
            ...prev,
            cod_tipo_ensenanza: ultima.cod_tipo_ensenanza ? String(ultima.cod_tipo_ensenanza) : prev.cod_tipo_ensenanza,
            cursoSeleccionado: ultima.curso
          }));
          setHuboPrecarga(true);
        }
      } else {
        setCursoPrevio('');
        setCodigoPrevio(null);
        setHuboPrecarga(false);
      }
    }
  }, [estudiante, todasLasMatriculas, huboPrecarga]);

  const seleccionarEstudiante = async (est: any) => {
    setRutBusqueda(est.run);
    setMostrarSugerencias(false);
    setCargando(true);
    setError('');
    setHuboPrecarga(false);
    
    try {
      const token = localStorage.getItem('token');
      const respuesta = await fetch(`http://127.0.0.1:8000/estudiante/${est.run}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!respuesta.ok) throw new Error('Estudiante no encontrado en el sistema.');
      
      const datos = await respuesta.json();
      procesarEstudiante(datos, est.run);
    } catch (err: any) {
      setError(err.message);
      setEstudiante(null);
    } finally {
      setCargando(false);
    }
  };

  const guardarDatosFaltantes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estudiante) return;
    setGuardandoFaltantes(true);

    try {
      const token = localStorage.getItem('token');
      
      // 1. Envío al Backend
      const respuesta = await fetch(`http://127.0.0.1:8000/estudiante/${estudiante.run}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formFaltantes) // Ahora envía los 8 campos exactos
      });

      if (!respuesta.ok) throw new Error('Error al guardar la información');
      
      // 2. Cache-Buster
      const timestamp = new Date().getTime();
      const refreshRes = await fetch(`http://127.0.0.1:8000/estudiante/${estudiante.run}?t=${timestamp}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store' 
      });
      
      const datosNuevos = await refreshRes.json();
      procesarEstudiante(datosNuevos, estudiante.run);
      setModalFaltantes(false);
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGuardandoFaltantes(false);
    }
  };

  const copiarDomicilio = () => {
    setFormFaltantes(prev => ({ ...prev, domicilio_apoderado: prev.domicilio_estudiante }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estudiante || datosFaltantes.length > 0) return;

    setCargando(true);
    setError('');

    const payload = {
      numero_correlativo: 0,
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

  useEffect(() => {
    // Si no hay un estudiante seleccionado, o no tiene historial, no hacemos nada
    if (!estudiante || !cursoPrevio || !formulario.cursoSeleccionado) {
      setAlertasTransicion([]);
      return;
    }

    const alertas: {texto: string, tipo: 'info' | 'alerta' | 'peligro'}[] = [];

    // 1. Verificación de Código de Enseñanza
    if (codigoPrevio && formulario.cod_tipo_ensenanza && String(codigoPrevio) !== String(formulario.cod_tipo_ensenanza)) {
      alertas.push({texto: `Cambio de Plan de Estudio (de Cod. ${codigoPrevio} a Cod. ${formulario.cod_tipo_ensenanza}).`, tipo: 'alerta'});
    }

    // 2. Verificación de Salto/Repitencia Numérica
    const numPrevioMatch = cursoPrevio.match(/\d+/);
    const numDestinoMatch = formulario.cursoSeleccionado.match(/\d+/);

    if (numPrevioMatch && numDestinoMatch) {
      const numPrevio = parseInt(numPrevioMatch[0]);
      const numDestino = parseInt(numDestinoMatch[0]);

      if (numDestino === numPrevio + 1) {
        alertas.push({texto: `Promoción: El estudiante avanza al curso siguiente (de ${numPrevio} a ${numDestino}).`, tipo: 'info'});
      } else if (numDestino === numPrevio) {
        alertas.push({texto: `Repitencia: El estudiante mantiene el mismo nivel cursado (${numPrevio}).`, tipo: 'alerta'});
      } else if (numDestino < numPrevio) {
        alertas.push({texto: `Retroceso abrupto: Está matriculando al estudiante en un grado INFERIOR al que ya cursó (de ${numPrevio} a ${numDestino}).`, tipo: 'peligro'});
      } else if (numDestino > numPrevio + 1) {
        alertas.push({texto: `Salto abrupto: Está adelantando al estudiante múltiples grados (de ${numPrevio} a ${numDestino}).`, tipo: 'peligro'});
      }
    } else {
      // 3. Fallback para cursos sin número (Ej: Pre Kínder, Kínder, Sala Cuna)
      const basePrevio = cursoPrevio.replace(/\s*[A-Z]\s*$/i, '').trim().toLowerCase();
      const baseDestino = formulario.cursoSeleccionado.replace(/\s*[A-Z]\s*$/i, '').trim().toLowerCase();
      
      if (basePrevio === baseDestino) {
        alertas.push({texto: `Repitencia: El estudiante se mantiene en el nivel '${cursoPrevio}'.`, tipo: 'alerta'});
      } else {
        alertas.push({texto: `Transición de nivel preescolar: de '${cursoPrevio}' a '${formulario.cursoSeleccionado}'.`, tipo: 'info'});
      }
    }

    setAlertasTransicion(alertas);
  }, [formulario.cursoSeleccionado, formulario.cod_tipo_ensenanza, cursoPrevio, codigoPrevio, estudiante]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
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
                onClick={() => { setEstudiante(null); setRutBusqueda(''); setHuboPrecarga(false); setDatosFaltantes([]); setCursoPrevio(''); setCodigoPrevio(null); setAlertasTransicion([]); }} 
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
            <div className="flex-1">
              <p className="text-sm text-emerald-800 font-semibold uppercase tracking-wider">Estudiante Seleccionado</p>
              <p className="text-lg font-bold text-gray-900">{estudiante.nombres} {estudiante.apellidos}</p>
              <p className="text-sm text-gray-600 mb-1">RUT: {estudiante.run}</p>
              
              {/* ALERTA DE DATOS FALTANTES */}
              {datosFaltantes.length > 0 && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-800 font-bold text-sm mb-1">
                    <AlertCircle size={16} /> 
                    <span>* Información Incompleta (Estudiante / Apoderado)</span>
                  </div>
                  <ul className="list-disc pl-5 text-xs text-orange-700 mb-3">
                    {datosFaltantes.map(dato => <li key={dato}>{dato}</li>)}
                  </ul>
                  <button 
                    type="button" 
                    onClick={() => setModalFaltantes(true)}
                    className="text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded transition-colors"
                  >
                    Completar Ficha Obligatoria
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PASO 2: DATOS ACADÉMICOS */}
      <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 transition-opacity ${(!estudiante || datosFaltantes.length > 0) ? 'opacity-50 pointer-events-none' : ''}`}>
        <h3 className="font-semibold text-gray-700 mb-6">Paso 2: Datos de Matrícula y Establecimiento</h3>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 🌟 SELECT DE ESTABLECIMIENTO BLOQUEADO PARA COLEGIOS 🌟 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Establecimiento Educacional</label>
            <select 
              name="id_establecimiento" 
              value={formulario.id_establecimiento} 
              onChange={handleChange} 
              required 
              disabled={esPerfilColegio}
              className={`w-full border rounded-lg p-2 outline-none font-medium ${
                esPerfilColegio ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-300 text-gray-800'
              }`}
            >
              {establecimientosDb.map((est) => (
                <option key={est.id_establecimiento} value={est.id_establecimiento}>
                  RBD: {est.rbd} - {est.nombre}
                </option>
              ))}
            </select>
            {esPerfilColegio && (
              <p className="text-xs text-gray-500 mt-1 font-bold">
                * Asignado automáticamente a su establecimiento por seguridad.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
        {/* CAMPO DE PROCEDENCIA DE SOLO LECTURA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colegio de Procedencia</label>
              <input 
                type="text" 
                disabled 
                value={colegioProcedencia || 'Esperando selección...'} 
                className={`w-full border rounded-lg p-2 outline-none font-medium text-sm ${esTraslado ? 'bg-orange-50 border-orange-300 text-orange-800' : 'bg-gray-100 border-gray-300 text-gray-600'}`} 
              />
              {esTraslado && (
                <p className="text-xs text-orange-600 mt-1 font-bold">⚠️ Se registrará como un traslado.</p>
              )}
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

          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de Plan (Tipo Enseñanza)</label>
              <select name="cod_tipo_ensenanza" value={formulario.cod_tipo_ensenanza} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg p-2 outline-none bg-white font-mono">
                {codigosDisponibles.length === 0 ? (
                  <option value="">No hay planes registrados</option>
                ) : (
                  codigosDisponibles.map(item => (
                    <option key={item.codigo} value={item.codigo}>Cod. {item.codigo} - {item.nombre}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Curso (Sala)</label>
              <select name="cursoSeleccionado" value={formulario.cursoSeleccionado} onChange={(e) => seleccionarCurso(e.target.value)} required className="w-full border border-gray-300 rounded-lg p-2 outline-none bg-white font-bold text-blue-800">
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
          
                      {/* ALERTAS DE TRANSICIÓN ACADÉMICA */}
          {alertasTransicion.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              {alertasTransicion.map((alerta, index) => (
                <div key={index} className={`p-3 rounded-lg border text-sm font-medium flex items-start gap-2 ${
                  alerta.tipo === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                  alerta.tipo === 'alerta' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                  'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <span className="mt-0.5 text-base leading-none">
                    {alerta.tipo === 'info' ? '✅' : alerta.tipo === 'alerta' ? '⚠️' : '🚨'}
                  </span>
                  <p>{alerta.texto}</p>
                </div>
              ))}
            </div>
          )}

          {huboPrecarga && (
            <div className="bg-emerald-50 text-emerald-700 text-xs font-bold p-2 rounded border border-emerald-200">
              ✓ Se ha precargado exitosamente la información del establecimiento y curso anterior.
            </div>
            
          )}

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-500 flex justify-between">
            <span>Grado autodetectado: <strong>{formulario.cod_grado}</strong></span>
            <span>Letra autodetectada: <strong>{formulario.letra_curso}</strong></span>
            <span>Nivel Real: <strong className="text-blue-600">{formulario.nivel_ensenanza}</strong></span>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => navigate('/matriculas')} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={cargando || !estudiante || datosFaltantes.length > 0} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
              {cargando ? 'Procesando...' : 'Confirmar Matrícula'}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL COMPLETAR DATOS FALTANTES - FORMULARIO ESTRICTO DE 8 CAMPOS */}
      {modalFaltantes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center bg-gray-50 p-4 border-b border-gray-200 sticky top-0 z-10">
              <h3 className="font-bold text-gray-800">Actualización Obligatoria de Datos</h3>
              <button type="button" onClick={() => setModalFaltantes(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={guardarDatosFaltantes} className="p-5 space-y-6">
              
              {/* Sección 1: Estudiante */}
              <div>
                <h4 className="text-sm font-bold text-blue-800 border-b pb-1 mb-3">1. Datos del Estudiante</h4>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Domicilio del Alumno</label>
                  <input required type="text" value={formFaltantes.domicilio_estudiante} onChange={e => setFormFaltantes({...formFaltantes, domicilio_estudiante: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-blue-500" placeholder="Ej: Calle Prat 123, Valparaíso" />
                </div>
              </div>

              {/* Sección 2: Apoderado */}
              <div>
                <h4 className="text-sm font-bold text-emerald-800 border-b pb-1 mb-3">2. Identificación del Apoderado Titular</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">RUT / Pasaporte</label>
                    <input required type="text" value={formFaltantes.rut_apoderado} onChange={e => setFormFaltantes({...formFaltantes, rut_apoderado: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-emerald-500" placeholder="Ej: 12345678-9" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombres</label>
                    <input required type="text" value={formFaltantes.nombres_apoderado} onChange={e => setFormFaltantes({...formFaltantes, nombres_apoderado: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-emerald-500" placeholder="Ej: Juan Carlos" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Apellido Paterno</label>
                    <input required type="text" value={formFaltantes.apellido_paterno_apoderado} onChange={e => setFormFaltantes({...formFaltantes, apellido_paterno_apoderado: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-emerald-500" placeholder="Ej: Pérez" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Apellido Materno</label>
                    <input required type="text" value={formFaltantes.apellido_materno_apoderado} onChange={e => setFormFaltantes({...formFaltantes, apellido_materno_apoderado: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-emerald-500" placeholder="Ej: González" />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Domicilio del Apoderado</label>
                    <button type="button" onClick={copiarDomicilio} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                      <Copy size={14} /> Usar domicilio del estudiante
                    </button>
                  </div>
                  <input required type="text" value={formFaltantes.domicilio_apoderado} onChange={e => setFormFaltantes({...formFaltantes, domicilio_apoderado: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-emerald-500" placeholder="Dirección completa del apoderado" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono</label>
                    <input required type="text" value={formFaltantes.telefono_apoderado} onChange={e => setFormFaltantes({...formFaltantes, telefono_apoderado: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-emerald-500" placeholder="Ej: +569..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Correo Electrónico</label>
                    <input required type="email" value={formFaltantes.correo_apoderado} onChange={e => setFormFaltantes({...formFaltantes, correo_apoderado: e.target.value})} className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-emerald-500" placeholder="correo@ejemplo.cl" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setModalFaltantes(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded font-medium">Cancelar</button>
                <button type="submit" disabled={guardandoFaltantes} className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded font-medium disabled:opacity-50">
                  {guardandoFaltantes ? 'Guardando...' : 'Guardar y Continuar Matrícula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}