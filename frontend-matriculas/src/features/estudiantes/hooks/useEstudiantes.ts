import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

export interface NuevoEstudianteForm {
  run: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  sexo: string;
  domicilio: string;
  latitud: string;
  longitud: string;
  run_apoderado: string;
  nombres_apoderado: string;
  apellido_paterno_apoderado: string;
  apellido_materno_apoderado: string;
  domicilio_apoderado: string;
  telefono_apoderado: string;
  correo_apoderado: string;
  relacion_estudiante: string;
  pais_origen_estudiante?: string;
  doc_extranjero_estudiante?: string;
  pais_origen_apoderado?: string;
  doc_extranjero_apoderado?: string;
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

export const useEstudiantes = () => {
  const { colegioSeleccionado } = useOutletContext<{ colegioSeleccionado: string }>();
  const navigate = useNavigate();

  const usuarioString = localStorage.getItem('usuario');
  const usuario = usuarioString ? JSON.parse(usuarioString) : null;
  const puedeEditar = !['Visualizador_SLEP', 'Visualizador_Colegio'].includes(usuario?.rol);

  const [listaEstudiantes, setListaEstudiantes] = useState<any[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);

  // 🌟 NUEVOS FILTROS DINÁMICOS
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState<string>('');
  const [filtroCodigo, setFiltroCodigo] = useState<string>('');
  const [filtroCurso, setFiltroCurso] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  const [datosEstudiante, setDatosEstudiante] = useState<any>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [error, setError] = useState('');

  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  
  const [estudianteCreadoExito, setEstudianteCreadoExito] = useState(false);
  const [rutRecienCreado, setRutRecienCreado] = useState('');
  const [archivoTutor, setArchivoTutor] = useState<File | null>(null);

  const [nuevoEstudiante, setNuevoEstudiante] = useState<NuevoEstudianteForm>({
    run: '', nombres: '', apellido_paterno: '', apellido_materno: '', fecha_nacimiento: '', sexo: 'Masculino', domicilio: '', latitud:'', longitud:'',
    run_apoderado: '', nombres_apoderado: '', apellido_paterno_apoderado: '', apellido_materno_apoderado: '', domicilio_apoderado: '', telefono_apoderado: '', correo_apoderado: '',
    pais_origen_estudiante: '', doc_extranjero_estudiante: '',
    pais_origen_apoderado: '', doc_extranjero_apoderado: '',relacion_estudiante:''
  });

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
        setListaEstudiantes(datos);
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

  // 🌟 Lógica combinada: Deduplicación + Generación de Filtros + Búsqueda
  const { estudiantesFiltrados, aniosUnicos, codigosUnicos, cursosUnicos, estadosUnicos } = useMemo(() => {
    if (!listaEstudiantes) return { estudiantesFiltrados: [], aniosUnicos: [], codigosUnicos: [], cursosUnicos: [], estadosUnicos: [] };

    // 1. DEDUPLICAR: Agrupar por RUT dejando solo el registro más reciente
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

    // 2. GENERAR LISTAS DESPLEGABLES (Basadas en los alumnos únicos)
    const anios = [...new Set(estudiantesUnicos.map(e => String(e.anio_escolar || e.anio)).filter(a => a && a !== 'undefined'))].sort().reverse();
    const codigos = [...new Set(estudiantesUnicos.map(e => String(e.cod_tipo_ensenanza)).filter(c => c && c !== 'undefined' && c !== 'null'))].sort();
    const estados = [...new Set(estudiantesUnicos.map(e => String(e.estado)).filter(e => e && e !== 'undefined'))].sort();

    // Los cursos disponibles se filtran si ya se eligió un Plan de Estudio
    let cursosParaSelect = estudiantesUnicos;
    if (filtroCodigo) {
      cursosParaSelect = estudiantesUnicos.filter(e => String(e.cod_tipo_ensenanza) === filtroCodigo);
    }
    const cursos = [...new Set(cursosParaSelect.map(e => e.curso).filter(c => c && c !== 'undefined'))].sort();

    // 3. APLICAR FILTROS (Texto, Año, Plan, Curso y Estado)
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

    return {
      estudiantesFiltrados: filtrados,
      aniosUnicos: anios,
      codigosUnicos: codigos,
      cursosUnicos: cursos,
      estadosUnicos: estados
    };
  }, [listaEstudiantes, textoBusqueda, filtroAnio, filtroCodigo, filtroCurso, filtroEstado]);

  const manejarSubidaCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    if (!archivo.name.endsWith('.csv') && !archivo.name.endsWith('.xls') && !archivo.name.endsWith('.xlsx')) {
      alert("Por favor, selecciona un archivo en formato .csv, .xls o .xlsx");
      return;
    }

    setSubiendoArchivo(true);
    const formData = new FormData();
    formData.append("archivo", archivo);
    const token = localStorage.getItem('token');

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/estudiante/carga-masiva", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}` 
        },
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
      
      // 🌟 Formateando datos para prevenir errores si faltan campos
      const datosFormateados = {
        personal: datos.personal || {},
        apoderado: datos.apoderado || {},
        apoderado_suplente: datos.apoderado_suplente || null, 
        salud: datos.salud || null, 
        historial: datos.historial || []
      };
      
      setDatosEstudiante(datosFormateados);
      
      setDatosEdicion({
        domicilio: datosFormateados.personal.domicilio || '',
        telefono_apoderado: datosFormateados.apoderado.telefono || '',
        correo_apoderado: datosFormateados.apoderado.correo || ''
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payloadEnvio),
      });

      if (!respuesta.ok) {
        const errorData = await respuesta.json();
        throw new Error(`Error de validación: ${JSON.stringify(errorData.detail || errorData)}`);
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
      console.error("Error al buscar coordenadas:", error);
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

  const handleCrearEstudiante = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nuevoEstudiante.relacion_estudiante === 'Tutor Legal Designado' && !archivoTutor) {
      alert("⚠️ Debe adjuntar el documento legal que acredite la tutoría del estudiante.");
      return;
    }

    const esIpeEstudiante = nuevoEstudiante.run.replace(/[^0-9kK]/g, '').length >= 10;
    const esIpaApoderado = nuevoEstudiante.run_apoderado.replace(/[^0-9kK]/g, '').length >= 10;

    if (!esIpeEstudiante && !validarRUT(nuevoEstudiante.run)) {
      alert("⚠️ El RUT del Estudiante no es válido. Revisa que el dígito verificador sea correcto.");
      return;
    }
    if (esIpeEstudiante && (!nuevoEstudiante.pais_origen_estudiante || !nuevoEstudiante.doc_extranjero_estudiante)) {
      alert("⚠️ El estudiante tiene un IPE. Debes ingresar obligatoriamente su País de Origen y Documento Nacional.");
      return;
    }

    if (!esIpaApoderado && !validarRUT(nuevoEstudiante.run_apoderado)) {
      alert("⚠️ El RUT del Apoderado no es válido. Revisa que el dígito verificador sea correcto.");
      return;
    }
    if (esIpaApoderado && (!nuevoEstudiante.pais_origen_apoderado || !nuevoEstudiante.doc_extranjero_apoderado)) {
      alert("⚠️ El apoderado tiene un IPA. Debes ingresar obligatoriamente su País de Origen y Documento Nacional.");
      return;
    }

    if (!nuevoEstudiante.latitud || !nuevoEstudiante.longitud) {
      alert("⚠️ Acción requerida: Debes validar el Domicilio Actual usando el botón 'Buscar' antes de crear al estudiante.");
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
      if (!respuesta.ok) throw new Error('Error al guardar. Verifica que el RUT/IPE no esté duplicado en la base de datos.');
      
      setRutRecienCreado(nuevoEstudiante.run);
      setEstudianteCreadoExito(true);
      cargarDirectorio();

      setNuevoEstudiante({ 
        run: '', nombres: '', apellido_paterno: '', apellido_materno: '', fecha_nacimiento: '', sexo: 'Masculino', 
        domicilio: '', latitud:'', longitud:'', 
        run_apoderado: '', nombres_apoderado: '', apellido_paterno_apoderado: '', apellido_materno_apoderado: '', 
        domicilio_apoderado: '', telefono_apoderado: '', correo_apoderado: '',
        pais_origen_estudiante: '', doc_extranjero_estudiante: '',
        pais_origen_apoderado: '', doc_extranjero_apoderado: '',relacion_estudiante:''
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreando(false);
    }
  };

  const irAMatricular = () => {
    setModalNuevoAbierto(false);
    setEstudianteCreadoExito(false);
    navigate('/matriculas/nueva', { state: { rutPreseleccionado: rutRecienCreado } });
  };

  const cerrarModalExito = () => {
    setModalNuevoAbierto(false);
    setEstudianteCreadoExito(false);
  };

  return {
    puedeEditar,
    datosEstudiante, setDatosEstudiante,
    modoEdicion, setModoEdicion,
    manejarSubidaCSV, subiendoArchivo,
    modalNuevoAbierto, setModalNuevoAbierto,
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
    estudianteCreadoExito, rutRecienCreado, cerrarModalExito, irAMatricular,
    nuevoEstudiante, setNuevoEstudiante, formatearRUT, handleCrearEstudiante,
    creando, buscarSugerencias, buscandoMapa, sugerenciasMapa, seleccionarDireccion, archivoTutor, setArchivoTutor
  };
};