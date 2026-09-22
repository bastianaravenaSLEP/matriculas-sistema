import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

export interface NuevoEstudianteForm {
  // 1. Estudiante
  run: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  sexo: string;
  domicilio: string;
  latitud: string;
  longitud: string;
  pais_origen_estudiante?: string;
  doc_extranjero_estudiante?: string;

  // 2. Apoderado Titular
  run_apoderado: string;
  nombres_apoderado: string;
  apellido_paterno_apoderado: string;
  apellido_materno_apoderado: string;
  domicilio_apoderado: string;
  telefono_apoderado: string;
  correo_apoderado: string;
  relacion_estudiante: string;
  pais_origen_apoderado?: string;
  doc_extranjero_apoderado?: string;

  // 3. Apoderado Suplente
  tiene_suplente: boolean;
  run_suplente: string;
  nombres_suplente: string;
  apellido_paterno_suplente: string;
  apellido_materno_suplente: string;
  domicilio_suplente: string;
  telefono_suplente: string;
  correo_suplente: string;
  relacion_suplente: string;

  // 4. Ficha Médica
  sistema_salud: string;
  letra_fonasa: string;
  cesfam: string;
  centro_emergencia: string;
  diagnostico_medico: string;
  medico_tratante: string;
  medicamento: string;
  alergias: string;
  nee: string;
  nee_tipo: string;
}

export const formatearRUT = (rut: string) => {
  const actual = rut.replace(/^0+/, "").replace(/[^0-9kK]/g, "").toUpperCase();
  if (actual.length <= 1) return actual;
  const cuerpo = actual.slice(0, -1);
  const dv = actual.slice(-1);
  return `${cuerpo}-${dv}`;
};

export const validarRUT = (rutCompleto: string) => {
  if (!/^[0-9]+[-|‐]{1}[0-9kK]{1}$/.test(rutCompleto)) return false;
  const tmp = rutCompleto.split('-');
  const rut = tmp[0];
  let digv = tmp[1]; 
  if (digv === 'K') digv = 'k';
  
  let M = 0, S = 1;
  let rutNum = parseInt(rut, 10);
  for (; rutNum; rutNum = Math.floor(rutNum / 10)) {
    S = (S + rutNum % 10 * (9 - M++ % 6)) % 11;
  }
  const dvEsperado = S ? (S - 1).toString() : 'k';
  return digv === dvEsperado;
};

const ESTUDIANTE_INICIAL: NuevoEstudianteForm = {
  run: '', nombres: '', apellido_paterno: '', apellido_materno: '', fecha_nacimiento: '', sexo: 'Masculino',
  domicilio: '', latitud: '', longitud: '',
  pais_origen_estudiante: '', doc_extranjero_estudiante: '',
  
  run_apoderado: '', nombres_apoderado: '', apellido_paterno_apoderado: '', apellido_materno_apoderado: '',
  domicilio_apoderado: '', telefono_apoderado: '', correo_apoderado: '', relacion_estudiante: '',
  pais_origen_apoderado: '', doc_extranjero_apoderado: '',

  tiene_suplente: false,
  run_suplente: '', nombres_suplente: '', apellido_paterno_suplente: '', apellido_materno_suplente: '',
  domicilio_suplente: '', telefono_suplente: '', correo_suplente: '', relacion_suplente: 'Familiar',

  sistema_salud: 'FONASA', letra_fonasa: 'A', cesfam: '', centro_emergencia: '',
  diagnostico_medico: 'No', medico_tratante: '', medicamento: '', alergias: '', nee: 'No', nee_tipo: 'No aplica'
};

export const useEstudiantes = () => {
  const { colegioSeleccionado } = useOutletContext<{ colegioSeleccionado: string }>();
  const navigate = useNavigate();

  const usuarioString = localStorage.getItem('usuario');
  const usuario = usuarioString ? JSON.parse(usuarioString) : null;
  const puedeEditar = !['Visualizador_SLEP', 'Visualizador_Colegio'].includes(usuario?.rol);

  const [listaEstudiantes, setListaEstudiantes] = useState<any[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);

  // Filtros Directorio
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState<string>('');
  const [filtroCodigo, setFiltroCodigo] = useState<string>('');
  const [filtroCurso, setFiltroCurso] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  const [datosEstudiante, setDatosEstudiante] = useState<any>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [error, setError] = useState('');

  // 🌟 CONTROL DE WIZARD PARA REGISTRO DE NUEVO ESTUDIANTE
  const [vistaCrearEstudiante, setVistaCrearEstudiante] = useState(false);
  const [pasoCrear, setPasoCrear] = useState(1);
  const [creando, setCreando] = useState(false);
  const [estudianteCreadoExito, setEstudianteCreadoExito] = useState(false);
  const [rutRecienCreado, setRutRecienCreado] = useState('');
  const [archivoTutor, setArchivoTutor] = useState<File | null>(null);

  const [nuevoEstudiante, setNuevoEstudiante] = useState<NuevoEstudianteForm>(ESTUDIANTE_INICIAL);

  const [modoEdicion, setModoEdicion] = useState(false);
  const [datosEdicion, setDatosEdicion] = useState<any>({});
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  
  const [buscandoMapa, setBuscandoMapa] = useState(false);
  const [sugerenciasMapa, setSugerenciasMapa] = useState<any[]>([]);

  const cargarDirectorio = () => {
    setCargandoLista(true);
    const token = localStorage.getItem('token'); 

    const url = colegioSeleccionado 
      ? `http://127.0.0.1:8000/estudiante?establecimiento_id=${colegioSeleccionado}`
      : `http://127.0.0.1:8000/estudiante`;

    fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    })
      .then(res => res.json())
      .then(datos => {
        setListaEstudiantes(Array.isArray(datos) ? datos : []);
        setCargandoLista(false);
      })
      .catch(err => {
        console.error(err);
        setCargandoLista(false);
      });
  };

  useEffect(() => {
    cargarDirectorio();
  }, [colegioSeleccionado]); 

  // Deduplicación y filtrado reactivo del directorio
  const { estudiantesFiltrados, aniosUnicos, codigosUnicos, cursosUnicos, estadosUnicos } = useMemo(() => {
    if (!listaEstudiantes || listaEstudiantes.length === 0) {
      return { estudiantesFiltrados: [], aniosUnicos: [], codigosUnicos: [], cursosUnicos: [], estadosUnicos: [] };
    }

    const mapaEstudiantes = new Map();

    listaEstudiantes.forEach(est => {
      const rut = est.run || est.estudiante_rut;
      if (!rut) return;

      if (!mapaEstudiantes.has(rut)) {
        mapaEstudiantes.set(rut, est);
      } else {
        const existente = mapaEstudiantes.get(rut);
        const anioNuevo = parseInt(est.anio_escolar || est.anio || 0);
        const anioViejo = parseInt(existente.anio_escolar || existente.anio || 0);

        if (anioNuevo > anioViejo) {
          mapaEstudiantes.set(rut, est);
        } else if (anioNuevo === anioViejo) {
          const idNuevo = est.id_matricula || est.id || 0;
          const idViejo = existente.id_matricula || existente.id || 0;
          if (idNuevo > idViejo) {
            mapaEstudiantes.set(rut, est);
          }
        }
      }
    });

    const estudiantesUnicos = Array.from(mapaEstudiantes.values());

    const anios = [...new Set(estudiantesUnicos.map(e => String(e.anio_escolar || e.anio)).filter(a => a && a !== 'undefined'))].sort().reverse();
    const codigos = [...new Set(estudiantesUnicos.map(e => String(e.cod_tipo_ensenanza)).filter(c => c && c !== 'undefined' && c !== 'null'))].sort();
    const estados = [...new Set(estudiantesUnicos.map(e => String(e.estado)).filter(e => e && e !== 'undefined'))].sort();

    let cursosParaSelect = estudiantesUnicos;
    if (filtroCodigo) {
      cursosParaSelect = estudiantesUnicos.filter(e => String(e.cod_tipo_ensenanza) === filtroCodigo);
    }
    const cursos = [...new Set(cursosParaSelect.map(e => e.curso).filter(c => c && c !== 'undefined'))].sort();

    const filtrados = estudiantesUnicos.filter(est => {
      const textoBusquedaLower = (textoBusqueda || '').toLowerCase();
      const nombre = (est.nombre_completo || est.nombres || '').toLowerCase();
      const rutEst = (est.run || est.estudiante_rut || '').toLowerCase();

      const matchTexto = textoBusquedaLower === '' || nombre.includes(textoBusquedaLower) || rutEst.includes(textoBusquedaLower);
      const matchAnio = filtroAnio === '' || String(est.anio_escolar || est.anio) === filtroAnio;
      const matchCodigo = filtroCodigo === '' || String(est.cod_tipo_ensenanza) === filtroCodigo;
      const matchCurso = filtroCurso === '' || est.curso === filtroCurso;
      const matchEstado = filtroEstado === '' || est.estado === filtroEstado;

      return matchTexto && matchAnio && matchCodigo && matchCurso && matchEstado;
    });

    return { estudiantesFiltrados: filtrados, aniosUnicos: anios, codigosUnicos: codigos, cursosUnicos: cursos, estadosUnicos: estados };
  }, [listaEstudiantes, textoBusqueda, filtroAnio, filtroCodigo, filtroCurso, filtroEstado]);

  const manejarSubidaCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendoArchivo(true);
    const formData = new FormData();
    formData.append("archivo", archivo);
    const token = localStorage.getItem('token');

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/estudiante/carga-masiva", {
        method: "POST",
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.detail || "Error al subir el archivo");
      alert(datos.mensaje); 
      cargarDirectorio();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSubiendoArchivo(false);
      e.target.value = ''; 
    }
  };

  const verFichaEstudiante = async (rut: string) => {
    setCargandoFicha(true);
    setError('');
    setModoEdicion(false); 
    const token = localStorage.getItem('token');
    
    try {
      const respuesta = await fetch(`http://127.0.0.1:8000/estudiante/${rut}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!respuesta.ok) throw new Error('Error al cargar la ficha');
      const datos = await respuesta.json();
      
      setDatosEstudiante({
        personal: datos.personal || {},
        apoderado: datos.apoderado || {},
        apoderado_suplente: datos.apoderado_suplente || null, 
        salud: datos.salud || null, 
        historial: datos.historial || []
      });
      
      setDatosEdicion({
        domicilio: datos.personal?.domicilio || '',
        telefono_apoderado: datos.apoderado?.telefono || '',
        correo_apoderado: datos.apoderado?.correo || ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargandoFicha(false);
    }
  };

  const handleGuardarEdicion = async () => {
    setGuardandoEdicion(true);
    const token = localStorage.getItem('token');
    try {
      const payloadEnvio = {
        domicilio_estudiante: datosEdicion.domicilio !== undefined ? datosEdicion.domicilio : (datosEstudiante.personal?.domicilio || "Sin registrar"),
        rut_apoderado: datosEstudiante.apoderado?.rut && datosEstudiante.apoderado.rut !== "Sin registrar" 
          ? datosEstudiante.apoderado.rut 
          : datosEstudiante.personal.run,
        nombres_apoderado: datosEstudiante.apoderado?.nombre?.split(' ')[0] || "Apoderado",
        apellido_paterno_apoderado: datosEstudiante.apoderado?.nombre?.split(' ')[1] || "Pendiente",
        apellido_materno_apoderado: datosEstudiante.apoderado?.nombre?.split(' ')[2] || "",
        domicilio_apoderado: datosEstudiante.apoderado?.domicilio || datosEstudiante.personal?.domicilio || "Sin registrar",
        telefono_apoderado: datosEdicion.telefono_apoderado !== undefined ? datosEdicion.telefono_apoderado : (datosEstudiante.apoderado?.telefono || ""),
        correo_apoderado: datosEdicion.correo_apoderado !== undefined ? datosEdicion.correo_apoderado : (datosEstudiante.apoderado?.correo || "")
      };

      const respuesta = await fetch(`http://127.0.0.1:8000/estudiante/${datosEstudiante.personal.run}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payloadEnvio),
      });

      if (!respuesta.ok) {
        const errorData = await respuesta.json();
        throw new Error(errorData.detail || "Error al actualizar");
      }

      await verFichaEstudiante(datosEstudiante.personal.run);
      setModoEdicion(false);
      alert("Estudiante actualizado correctamente.");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  };
  
  const buscarSugerencias = async () => {
    if (!nuevoEstudiante.domicilio) {
      alert("Primero escribe una calle o sector para buscar.");
      return;
    }
    setBuscandoMapa(true);
    setSugerenciasMapa([]); 
    try {
      const query = encodeURIComponent(nuevoEstudiante.domicilio);
      const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=cl&limit=5`);
      const datos = await respuesta.json();
      if (datos && datos.length > 0) {
        setSugerenciasMapa(datos);
      } else {
        alert("No se encontraron resultados en Chile. Intenta agregar la comuna, ej: 'Avenida Brasil, Valparaíso'.");
      }
    } catch (error) {
      alert("Hubo un error al conectar con el mapa.");
    } finally {
      setBuscandoMapa(false);
    }
  };

  const seleccionarDireccion = (lugar: any) => {
    setNuevoEstudiante({
      ...nuevoEstudiante,
      domicilio: lugar.display_name, 
      latitud: lugar.lat,
      longitud: lugar.lon
    });
    setSugerenciasMapa([]);
  };

  // 🌟 VALIDACIONES POR PASO
  const irSiguientePasoCrear = () => {
    if (pasoCrear === 1) {
      const esIpe = nuevoEstudiante.run.replace(/[^0-9kK]/g, '').length >= 10;
      if (!nuevoEstudiante.run.trim()) { alert("Debe ingresar el RUN o IPE del estudiante."); return; }
      if (!esIpe && !validarRUT(nuevoEstudiante.run)) { alert("El RUT del estudiante no es válido."); return; }
      if (esIpe && (!nuevoEstudiante.pais_origen_estudiante || !nuevoEstudiante.doc_extranjero_estudiante)) {
        alert("Para estudiantes con IPE es obligatorio ingresar País de Origen y Documento Extranjero.");
        return;
      }
      if (!nuevoEstudiante.nombres.trim() || !nuevoEstudiante.apellido_paterno.trim() || !nuevoEstudiante.fecha_nacimiento) {
        alert("Por favor complete los nombres, apellidos y fecha de nacimiento del estudiante.");
        return;
      }
      if (!nuevoEstudiante.domicilio.trim()) {
        alert("Debe ingresar el domicilio del estudiante.");
        return;
      }
      setPasoCrear(2);
    } else if (pasoCrear === 2) {
      const esIpa = nuevoEstudiante.run_apoderado.replace(/[^0-9kK]/g, '').length >= 10;
      if (!nuevoEstudiante.relacion_estudiante) { alert("Seleccione el parentesco del Apoderado Titular."); return; }
      if (nuevoEstudiante.relacion_estudiante === 'Tutor Legal Designado' && !archivoTutor) {
        alert("Debe adjuntar el documento que acredite la tutoría legal.");
        return;
      }
      if (!nuevoEstudiante.run_apoderado.trim()) { alert("Debe ingresar el RUT del Apoderado Titular."); return; }
      if (!esIpa && !validarRUT(nuevoEstudiante.run_apoderado)) { alert("El RUT del Apoderado Titular no es válido."); return; }
      if (!nuevoEstudiante.nombres_apoderado.trim() || !nuevoEstudiante.apellido_paterno_apoderado.trim()) {
        alert("Complete el nombre y apellido del apoderado titular.");
        return;
      }
      if (!nuevoEstudiante.telefono_apoderado.trim() || !nuevoEstudiante.correo_apoderado.trim()) {
        alert("El teléfono y correo del apoderado titular son obligatorios.");
        return;
      }
      if (nuevoEstudiante.tiene_suplente) {
        if (!nuevoEstudiante.run_suplente.trim()) { alert("Debe ingresar el RUT del Apoderado Suplente."); return; }
        if (!validarRUT(nuevoEstudiante.run_suplente)) { alert("El RUT del Apoderado Suplente no es válido."); return; }
        if (!nuevoEstudiante.nombres_suplente.trim() || !nuevoEstudiante.apellido_paterno_suplente.trim()) {
          alert("Complete el nombre y apellido del apoderado suplente.");
          return;
        }
      }
      setPasoCrear(3);
    }
  };

  const irPasoAnteriorCrear = () => {
    setPasoCrear(prev => Math.max(1, prev - 1));
  };

  const handleCrearEstudiante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEstudiante.cesfam.trim() || !nuevoEstudiante.centro_emergencia.trim()) {
      alert("Por favor complete el CESFAM y Centro de Emergencias en la Ficha Médica.");
      return;
    }

    setCreando(true);
    const token = localStorage.getItem('token');

    try {
      const respuesta = await fetch('http://127.0.0.1:8000/estudiante', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(nuevoEstudiante),
      });

      if (!respuesta.ok) {
        const errorData = await respuesta.json();
        throw new Error(errorData.detail || 'Error al guardar el estudiante.');
      }
      
      setRutRecienCreado(nuevoEstudiante.run);
      setEstudianteCreadoExito(true);
      cargarDirectorio();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreando(false);
    }
  };

  const irAMatricular = () => {
    setVistaCrearEstudiante(false);
    setEstudianteCreadoExito(false);
    setPasoCrear(1);
    navigate('/matriculas/nueva', { state: { rutPreseleccionado: rutRecienCreado } });
  };

  const cerrarModalExito = () => {
    setVistaCrearEstudiante(false);
    setEstudianteCreadoExito(false);
    setPasoCrear(1);
    setNuevoEstudiante(ESTUDIANTE_INICIAL);
  };

  const iniciarCrearEstudiante = () => {
    setDatosEstudiante(null);
    setModoEdicion(false);
    setEstudianteCreadoExito(false);
    setPasoCrear(1);
    setNuevoEstudiante(ESTUDIANTE_INICIAL);
    setVistaCrearEstudiante(true);
  };

  return {
    puedeEditar,
    datosEstudiante, setDatosEstudiante,
    modoEdicion, setModoEdicion,
    manejarSubidaCSV, subiendoArchivo,
    guardandoEdicion, handleGuardarEdicion,
    textoBusqueda, setTextoBusqueda,
    filtroAnio, setFiltroAnio,
    filtroEstado, setFiltroEstado,
    filtroCodigo, setFiltroCodigo,
    filtroCurso, setFiltroCurso,
    aniosUnicos, estadosUnicos, codigosUnicos, cursosUnicos,
    cargandoLista, estudiantesFiltrados,
    verFichaEstudiante,
    datosEdicion, setDatosEdicion,
    // Asistente Nuevo Estudiante
    vistaCrearEstudiante, setVistaCrearEstudiante,
    pasoCrear, setPasoCrear,
    irSiguientePasoCrear, irPasoAnteriorCrear,
    iniciarCrearEstudiante,
    estudianteCreadoExito, rutRecienCreado, cerrarModalExito, irAMatricular,
    nuevoEstudiante, setNuevoEstudiante, formatearRUT, handleCrearEstudiante,
    creando, buscarSugerencias, buscandoMapa, sugerenciasMapa, seleccionarDireccion, archivoTutor, setArchivoTutor
  };
};