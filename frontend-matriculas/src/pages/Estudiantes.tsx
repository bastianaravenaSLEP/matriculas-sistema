import React, { useState, useEffect } from 'react';
import { Search, User, UserCheck, Clock, ArrowLeft, ChevronRight, UserPlus, Edit2, Save, X } from 'lucide-react';

export default function Estudiantes() {
  const [listaEstudiantes, setListaEstudiantes] = useState<any[]>([]);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [cargandoLista, setCargandoLista] = useState(true);

  const [datosEstudiante, setDatosEstudiante] = useState<any>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [error, setError] = useState('');

  // Estados para crear estudiante
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nuevoEstudiante, setNuevoEstudiante] = useState({
    run: '', nombres: '', apellido_paterno: '', apellido_materno: '', fecha_nacimiento: '', sexo: 'Masculino', domicilio: '', latitud:'', longitud:'',
    run_apoderado: '', nombres_apoderado: '', apellido_paterno_apoderado: '', apellido_materno_apoderado: '', domicilio_apoderado: '', telefono_apoderado: '', correo_apoderado: ''
  });

  // NUEVO: Estados para editar estudiante
  const [modoEdicion, setModoEdicion] = useState(false);
  const [datosEdicion, setDatosEdicion] = useState<any>({});
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const cargarDirectorio = () => {
    fetch('http://127.0.0.1:8000/estudiante')
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
  }, []);

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
      const respuesta = await fetch("http://127.0.0.1:8000/estudiante/carga-masiva", {
        method: "POST",
        body: formData,
      });

      const datos = await respuesta.json();
      
      if (!respuesta.ok) throw new Error(datos.detail || "Error al subir el archivo");
      
      alert(datos.mensaje); // Muestra cuántos se subieron
      // window.location.reload(); // Descomenta esto si quieres que la página se recargue para ver los cambios
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSubiendoArchivo(false);
      // Limpiamos el input para que se pueda volver a subir el mismo archivo si hubo error
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
    setModoEdicion(false); // Asegura que siempre entre en modo lectura
    
    try {
      const respuesta = await fetch(`http://127.0.0.1:8000/estudiante/${rut}`);
      if (!respuesta.ok) throw new Error('Error al cargar la ficha');
      const datos = await respuesta.json();
      setDatosEstudiante(datos);
      
      // Preparamos los datos editables
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
    try {
      const respuesta = await fetch(`http://127.0.0.1:8000/estudiante/${datosEstudiante.personal.run}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEdicion),
      });

      if (!respuesta.ok) throw new Error('Error al actualizar los datos');

      // Refrescamos la ficha para ver los cambios aplicados
      await verFichaEstudiante(datosEstudiante.personal.run);
      setModoEdicion(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  };

const [buscandoMapa, setBuscandoMapa] = useState(false);
const [sugerenciasMapa, setSugerenciasMapa] = useState<any[]>([]);
const buscarSugerencias = async () => {
    if (!nuevoEstudiante.domicilio) {
      alert("Primero escribe una calle o sector para buscar.");
      return;
    }
    setBuscandoMapa(true);
    setSugerenciasMapa([]); // Limpiamos búsquedas anteriores
    
    try {
      // Usamos encodeURIComponent y limitamos la búsqueda a Chile (countrycodes=cl) y a 5 resultados
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
    // Al hacer clic, guardamos la dirección completa y formal, junto con sus coordenadas
    setNuevoEstudiante({
      ...nuevoEstudiante,
      domicilio: lugar.display_name, 
      latitud: lugar.lat,
      longitud: lugar.lon
    });
    // Ocultamos la lista de sugerencias
    setSugerenciasMapa([]);
  };
  const handleCrearEstudiante = async (e: React.FormEvent) => {
    // ... (El código de crear estudiante sigue exactamente igual)
    e.preventDefault();
    setCreando(true);
    try {
      const respuesta = await fetch('http://127.0.0.1:8000/estudiante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoEstudiante),
      });
      if (!respuesta.ok) throw new Error('Error al guardar. Verifica que el RUT no esté duplicado.');
      setModalNuevoAbierto(false);
      setNuevoEstudiante({ run: '', nombres: '', apellido_paterno: '', apellido_materno: '', fecha_nacimiento: '', sexo: 'Masculino', domicilio: '',latitud:'', longitud:'', run_apoderado: '', nombres_apoderado: '', apellido_paterno_apoderado: '', apellido_materno_apoderado: '', domicilio_apoderado: '', telefono_apoderado: '', correo_apoderado: '' });
      cargarDirectorio();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto relative">
      
      {/* CABECERA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {datosEstudiante && (
            <button onClick={() => { setDatosEstudiante(null); setModoEdicion(false); }} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-800">
            {datosEstudiante ? 'Ficha del Estudiante' : 'Directorio de Estudiantes'}
          </h1>
        </div>
        
        {/* BOTONES DE CABECERA SEGÚN LA VISTA */}
        {!datosEstudiante ? (
      <div className="flex gap-3">
            {/* BOTÓN OCULTO DE INPUT FILE */}
            <input 
              type="file" 
              accept=".csv" 
              id="csv-upload" 
              className="hidden" 
              onChange={manejarSubidaCSV} 
              disabled={subiendoArchivo}
            />
            
            {/* BOTÓN VISUAL QUE ACTIVA EL INPUT OCULTO */}
            <label 
              htmlFor="csv-upload" 
              className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg font-medium transition-colors border ${
                subiendoArchivo 
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                  : 'bg-white text-emerald-600 border-emerald-600 hover:bg-emerald-50'
              }`}
            >
              {subiendoArchivo ? 'Cargando...' : '📄 Cargar CSV'}
            </label>

            {/* TU BOTÓN ORIGINAL */}
            <button onClick={() => setModalNuevoAbierto(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              <UserPlus size={20} /> Nuevo Estudiante
            </button>
          </div>
        ) : (
          !modoEdicion ? (
            <button onClick={() => setModoEdicion(true)} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              <Edit2 size={18} /> Editar Datos
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setModoEdicion(false)} className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors">
                <X size={18} /> Cancelar
              </button>
              <button onClick={handleGuardarEdicion} disabled={guardandoEdicion} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50">
                <Save size={18} /> {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          )
          
        )}
      </div>

      {/* VISTA 1: DIRECTORIO */}
      {!datosEstudiante && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input 
                type="text" placeholder="Buscar por nombre, apellido o RUT..."
                value={textoBusqueda} onChange={(e) => setTextoBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <ul className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {estudiantesFiltrados.map((est) => (
              <li key={est.id}>
                <button 
                  onClick={() => verFichaEstudiante(est.run)}
                  className="w-full flex items-center justify-between p-4 hover:bg-blue-50 transition-colors text-left"
                >
                  <div>
                    <p className="font-semibold text-gray-800 text-lg">{est.nombre_completo}</p>
                    <p className="text-sm text-gray-500">RUT: {est.run}</p>
                  </div>
                  <div className="text-blue-500"><ChevronRight size={20} /></div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* VISTA 2: FICHA DEL ESTUDIANTE */}
      {datosEstudiante && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-8 duration-300">
          
          {/* Tarjeta 1: Datos Personales */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-1 h-fit">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><User size={24} /></div>
              <h2 className="text-lg font-bold text-gray-800">Datos Personales</h2>
            </div>
            <div className="space-y-4">
              <div><p className="text-sm text-gray-500">RUN / IPE</p><p className="font-medium">{datosEstudiante.personal.run}</p></div>
              <div><p className="text-sm text-gray-500">Nombre Completo</p><p className="font-medium">{datosEstudiante.personal.nombres} {datosEstudiante.personal.apellidos}</p></div>
              <div><p className="text-sm text-gray-500">Fecha Nacimiento</p><p className="font-medium">{datosEstudiante.personal.fecha_nacimiento}</p></div>
              
              <div className="pt-2 border-t border-gray-50">
                <p className="text-sm text-gray-500 mb-1">Domicilio Actual</p>
                {!modoEdicion ? (
                  <p className="font-medium">{datosEstudiante.personal.domicilio}</p>
                ) : (
                  <input 
                    type="text" value={datosEdicion.domicilio} 
                    onChange={(e) => setDatosEdicion({...datosEdicion, domicilio: e.target.value})}
                    className="w-full border border-blue-300 bg-blue-50 rounded p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-colors" 
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            {/* Tarjeta 2: Apoderado */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><UserCheck size={24} /></div>
                <h2 className="text-lg font-bold text-gray-800">Apoderado Titular</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Nombre</p><p className="font-medium">{datosEstudiante.apoderado.nombre}</p></div>
                <div><p className="text-sm text-gray-500">RUT</p><p className="font-medium">{datosEstudiante.apoderado.rut}</p></div>
                
                <div className="pt-2 border-t border-gray-50">
                  <p className="text-sm text-gray-500 mb-1">Teléfono</p>
                  {!modoEdicion ? (
                    <p className="font-medium">{datosEstudiante.apoderado.telefono}</p>
                  ) : (
                    <input 
                      type="text" value={datosEdicion.telefono_apoderado} 
                      onChange={(e) => setDatosEdicion({...datosEdicion, telefono_apoderado: e.target.value})}
                      className="w-full border border-blue-300 bg-blue-50 rounded p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-colors" 
                    />
                  )}
                </div>
                
                <div className="pt-2 border-t border-gray-50">
                  <p className="text-sm text-gray-500 mb-1">Correo Electrónico</p>
                  {!modoEdicion ? (
                    <p className="font-medium">{datosEstudiante.apoderado.correo}</p>
                  ) : (
                    <input 
                      type="text" value={datosEdicion.correo_apoderado} 
                      onChange={(e) => setDatosEdicion({...datosEdicion, correo_apoderado: e.target.value})}
                      className="w-full border border-blue-300 bg-blue-50 rounded p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-colors" 
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Tarjeta 3: Historial (Se mantiene igual, no es editable por aquí) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Clock size={24} /></div>
                <h2 className="text-lg font-bold text-gray-800">Historial RGM</h2>
              </div>
              <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-100">
                      <th className="pb-2">Año</th>
                      <th className="pb-2">Curso</th>
                      <th className="pb-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosEstudiante.historial.length === 0 && (
                      <tr><td colSpan={3} className="py-4 text-center text-gray-500">Sin historial de matrículas</td></tr>
                    )}
                    {datosEstudiante.historial.map((reg: any) => (
                      <tr key={reg.id} className="border-b border-gray-50">
                        <td className="py-3">{reg.anio}</td>
                        <td className="py-3 font-medium">{reg.curso}</td>
                        <td className="py-3 text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">{reg.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        </div>
      )}
      {/* MODAL CREAR NUEVO ESTUDIANTE */}
      {modalNuevoAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Registrar Nuevo Estudiante</h3>
            
            <form onSubmit={handleCrearEstudiante} className="space-y-4 overflow-y-auto max-h-[70vh] pr-2">
              
              <h4 className="font-semibold text-blue-600 border-b pb-1">Datos del Estudiante</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">RUT o IPE</label>
                  <input required type="text" placeholder="Ej: 21123456-7" value={nuevoEstudiante.run} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, run: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombres</label>
                  <input required type="text" value={nuevoEstudiante.nombres} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, nombres: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ap. Paterno</label>
                  <input required type="text" value={nuevoEstudiante.apellido_paterno} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, apellido_paterno: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ap. Materno</label>
                  <input required type="text" value={nuevoEstudiante.apellido_materno} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, apellido_materno: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">F. Nacimiento</label>
                  <input required type="date" value={nuevoEstudiante.fecha_nacimiento} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, fecha_nacimiento: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sexo</label>
                  <select required value={nuevoEstudiante.sexo} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, sexo: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm">
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-gray-700 mb-1">Domicilio Actual (Estudiante)</label>
                <div className="flex gap-2">
                  <input 
                    required type="text" 
                    placeholder="Ej: Calle Prat, Valparaíso"
                    value={nuevoEstudiante.domicilio} 
                    onChange={(e) => {
                      setNuevoEstudiante({...nuevoEstudiante, domicilio: e.target.value, latitud: '', longitud: ''});
                    }} 
                    className="flex-1 border border-gray-300 rounded-lg p-2 focus:ring-blue-500 outline-none text-sm" 
                  />
                  <button 
                    type="button" 
                    onClick={buscarSugerencias}
                    disabled={buscandoMapa}
                    className="px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg border border-blue-200 transition-colors disabled:opacity-50"
                  >
                    {buscandoMapa ? 'Buscando...' : '🔍 Buscar'}
                  </button>
                </div>
                
                {/* MENÚ DESPLEGABLE DE SUGERENCIAS */}
                {sugerenciasMapa.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {sugerenciasMapa.map((lugar, index) => (
                      <li 
                        key={index}
                        onClick={() => seleccionarDireccion(lugar)}
                        className="p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <p className="text-sm text-gray-800">{lugar.display_name}</p>
                      </li>
                    ))}
                  </ul>
                )}
                
                {/* INDICADOR DE ÉXITO */}
                {nuevoEstudiante.latitud && (
                  <p className="text-xs text-green-600 mt-2 font-medium bg-green-50 p-2 rounded border border-green-100 inline-block">
                    ✓ Ubicación validada y geolocalizada con éxito.
                  </p>
                )}
              </div>

              <h4 className="font-semibold text-emerald-600 border-b pb-1 mt-6">Datos del Apoderado Titular</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">RUT o Pasaporte</label>
                  <input required type="text" placeholder="Ej: 12345678-9" value={nuevoEstudiante.run_apoderado} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, run_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-emerald-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombres</label>
                  <input required type="text" value={nuevoEstudiante.nombres_apoderado} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, nombres_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-emerald-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ap. Paterno</label>
                  <input required type="text" value={nuevoEstudiante.apellido_paterno_apoderado} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, apellido_paterno_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-emerald-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ap. Materno</label>
                  <input required type="text" value={nuevoEstudiante.apellido_materno_apoderado} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, apellido_materno_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-emerald-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                  <input required type="text" placeholder="+569..." value={nuevoEstudiante.telefono_apoderado} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, telefono_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-emerald-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Correo Electrónico</label>
                  <input required type="email" value={nuevoEstudiante.correo_apoderado} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, correo_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-emerald-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Domicilio Apoderado</label>
                <div className="flex gap-2">
                  <input required type="text" value={nuevoEstudiante.domicilio_apoderado} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, domicilio_apoderado: e.target.value})} className="flex-1 border border-gray-300 rounded-lg p-2 focus:ring-emerald-500 outline-none text-sm" />
                  <button type="button" onClick={() => setNuevoEstudiante({...nuevoEstudiante, domicilio_apoderado: nuevoEstudiante.domicilio})} className="px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg border border-emerald-200 transition-colors">
                    Copiar del estudiante
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setModalNuevoAbierto(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Cancelar</button>
                <button type="submit" disabled={creando} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                  {creando ? 'Guardando...' : 'Crear Estudiante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}