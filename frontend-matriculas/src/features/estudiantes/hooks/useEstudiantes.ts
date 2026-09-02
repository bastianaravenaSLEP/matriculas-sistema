import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

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

  // --- LÓGICA DE ROLES ---
  const usuarioString = localStorage.getItem('usuario');
  const usuario = usuarioString ? JSON.parse(usuarioString) : null;
  const puedeEditar = !['Visualizador_SLEP', 'Visualizador_Colegio'].includes(usuario?.rol);

  const [listaEstudiantes, setListaEstudiantes] = useState<any[]>([]);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [cargandoLista, setCargandoLista] = useState(true);

  const [datosEstudiante, setDatosEstudiante] = useState<any>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [error, setError] = useState('');

  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  
  const [estudianteCreadoExito, setEstudianteCreadoExito] = useState(false);
  const [rutRecienCreado, setRutRecienCreado] = useState('');

  const [nuevoEstudiante, setNuevoEstudiante] = useState({
    run: '', nombres: '', apellido_paterno: '', apellido_materno: '', fecha_nacimiento: '', sexo: 'Masculino', domicilio: '', latitud:'', longitud:'',
    run_apoderado: '', nombres_apoderado: '', apellido_paterno_apoderado: '', apellido_materno_apoderado: '', domicilio_apoderado: '', telefono_apoderado: '', correo_apoderado: ''
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

  const estudiantesFiltrados = listaEstudiantes.filter(est => 
    est.nombre_completo.toLowerCase().includes(textoBusqueda.toLowerCase()) ||
    est.run.includes(textoBusqueda)
  );

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
      setDatosEstudiante(datos);
      
      setDatosEdicion({
        domicilio: datos.personal.domicilio || '',
        telefono_apoderado: datos.apoderado.telefono || '',
        correo_apoderado: datos.apoderado.correo || ''
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
      const respuesta = await fetch(`http://127.0.0.1:8000/estudiante/${datosEstudiante.personal.run}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(datosEdicion),
      });

      if (!respuesta.ok) throw new Error('Error al actualizar los datos');

      await verFichaEstudiante(datosEstudiante.personal.run);
      setModoEdicion(false);
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

    if (!validarRUT(nuevoEstudiante.run)) {
      alert("⚠️ El RUT del Estudiante no es válido. Revisa que el dígito verificador sea correcto.");
      return;
    }
    if (!validarRUT(nuevoEstudiante.run_apoderado)) {
      alert("⚠️ El RUT del Apoderado no es válido. Revisa que el dígito verificador sea correcto.");
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
      if (!respuesta.ok) throw new Error('Error al guardar. Verifica que el RUT no esté duplicado en la base de datos.');
      
      setRutRecienCreado(nuevoEstudiante.run);
      setEstudianteCreadoExito(true);
      cargarDirectorio();

      setNuevoEstudiante({ run: '', nombres: '', apellido_paterno: '', apellido_materno: '', fecha_nacimiento: '', sexo: 'Masculino', domicilio: '',latitud:'', longitud:'', run_apoderado: '', nombres_apoderado: '', apellido_paterno_apoderado: '', apellido_materno_apoderado: '', domicilio_apoderado: '', telefono_apoderado: '', correo_apoderado: '' });
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
    cargandoLista, estudiantesFiltrados,
    verFichaEstudiante,
    datosEdicion, setDatosEdicion,
    estudianteCreadoExito, rutRecienCreado, cerrarModalExito, irAMatricular,
    nuevoEstudiante, setNuevoEstudiante, formatearRUT, handleCrearEstudiante,
    creando, buscarSugerencias, buscandoMapa, sugerenciasMapa, seleccionarDireccion
  };
};