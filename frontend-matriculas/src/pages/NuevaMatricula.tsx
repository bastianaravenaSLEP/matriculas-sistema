import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserCheck } from 'lucide-react';

export default function NuevaMatricula() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // 1. Estados para la búsqueda y autocompletado
  const [rutBusqueda, setRutBusqueda] = useState('');
  const [estudiante, setEstudiante] = useState<any>(null);
  
  // NUEVOS: Estados del buscador inteligente
  const [estudiantesDb, setEstudiantesDb] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

 // DICCIONARIO DE CURSOS POR NIVEL
  const MAPA_CURSOS: Record<string, string[]> = {
    "Educación Parvularia": ["Pre-Kínder", "Kínder", "Nivel Medio Mayor", "Nivel Medio Menor"],
    "Educación Básica": ["1ro Básico", "2do Básico", "3ro Básico", "4to Básico", "5to Básico", "6to Básico", "7mo Básico", "8vo Básico"],
    "Educación Media": ["1ro Medio", "2do Medio", "3ro Medio", "4to Medio"]
  };
  
  const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  // NUEVO ESTADO DEL FORMULARIO
  const [formulario, setFormulario] = useState({
    numero_correlativo: '',
    anio_escolar: '2026',
    fecha_matricula: '',
    nivel_ensenanza: 'Educación Básica',
    grado: '1ro Básico', // Reemplaza al campo 'curso' libre
    letra: 'A',          // Nueva variable
  });

  // FUNCIÓN ESPECIAL PARA CAMBIAR EL NIVEL Y RESETEAR EL GRADO
  const handleNivelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoNivel = e.target.value;
    setFormulario({
      ...formulario,
      nivel_ensenanza: nuevoNivel,
      grado: MAPA_CURSOS[nuevoNivel][0] // Auto-selecciona el primer grado de la lista correspondiente
    });
  };

  // NUEVO: Cargar el diccionario de estudiantes al abrir la pantalla
  useEffect(() => {
    fetch('http://127.0.0.1:8000/estudiante')
      .then(res => res.json())
      .then(datos => setEstudiantesDb(datos))
      .catch(err => console.error("Error cargando estudiantes:", err));
  }, []);

  // NUEVO: Función que filtra en tiempo real
  const handleEscribirBuscador = (texto: string) => {
    setRutBusqueda(texto);
    
    if (texto.length > 2) {
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

  // NUEVO: Selecciona al alumno y trae su ficha para el Visto Bueno
  const seleccionarEstudiante = async (est: any) => {
    setRutBusqueda(est.run);
    setMostrarSugerencias(false);
    
    setCargando(true);
    setError('');
    
    try {
      const respuesta = await fetch(`http://127.0.0.1:8000/estudiante/${est.run}`);
      if (!respuesta.ok) throw new Error('Estudiante no encontrado en el sistema base.');
      
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

  // 4. Función final para matricular
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estudiante) return;

    setCargando(true);
    setError('');
    

    const payload = {
      numero_correlativo: parseInt(formulario.numero_correlativo),
      anio_escolar: parseInt(formulario.anio_escolar),
      id_estudiante: estudiante.id,
      id_establecimiento: 1, 
      fecha_matricula: formulario.fecha_matricula,
      nivel_ensenanza: formulario.nivel_ensenanza,
      curso: `${formulario.grado} ${formulario.letra}`,
      id_usuario_ejecutor: 1 
    };

    // 1. Recuperamos el token de la memoria del navegador
    const token = localStorage.getItem('token');

try {
      const respuesta = await fetch('http://127.0.0.1:8000/matriculas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // <--- AQUÍ ABRIMOS EL CANDADO
        },
        body: JSON.stringify(payload)
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error('Error al guardar la matrícula.');
      
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
      
      {/* PASO 1: BÚSQUEDA Y PRECARGA (Modificado con Dropdown) */}
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
            
            {/* Botón para resetear si nos equivocamos de alumno */}
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

          {/* MENÚ DESPLEGABLE DE SUGERENCIAS */}
          {mostrarSugerencias && !estudiante && (
            <ul className="absolute z-50 w-full md:w-[calc(100%-140px)] mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {sugerencias.length === 0 ? (
                <li className="p-3 text-sm text-gray-500 text-center">
                  No se encontraron estudiantes con ese nombre o RUT.
                </li>
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

        {/* Tarjeta de Visto Bueno */}
        {estudiante && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex items-start gap-4 animate-in fade-in">
            <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 mt-1"><UserCheck size={24} /></div>
            <div>
              <p className="text-sm text-emerald-800 font-semibold uppercase tracking-wider">Estudiante Encontrado (Visto Bueno)</p>
              <p className="text-lg font-bold text-gray-900">{estudiante.nombres} {estudiante.apellidos}</p>
              <p className="text-sm text-gray-600">RUT: {estudiante.run} | Nacimiento: {estudiante.fecha_nacimiento}</p>
            </div>
          </div>
        )}
      </div>

      {/* PASO 2: DATOS ACADÉMICOS */}
      <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 transition-opacity ${!estudiante ? 'opacity-50 pointer-events-none' : ''}`}>
        <h3 className="font-semibold text-gray-700 mb-6">Paso 2: Datos de Matrícula (Transacción)</h3>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Correlativo</label>
              <input required type="number" name="numero_correlativo" value={formulario.numero_correlativo} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2 outline-none" />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de Enseñanza</label>
              <select 
                name="nivel_ensenanza" 
                value={formulario.nivel_ensenanza} 
                onChange={handleNivelChange} 
                className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Educación Parvularia">Educación Parvularia</option>
                <option value="Educación Básica">Educación Básica</option>
                <option value="Educación Media">Educación Media</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grado</label>
              <select 
                name="grado" 
                value={formulario.grado} 
                onChange={(e) => setFormulario({...formulario, grado: e.target.value})} 
                className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MAPA_CURSOS[formulario.nivel_ensenanza].map(gradoOpcion => (
                  <option key={gradoOpcion} value={gradoOpcion}>{gradoOpcion}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Letra</label>
              <select 
                name="letra" 
                value={formulario.letra} 
                onChange={(e) => setFormulario({...formulario, letra: e.target.value})} 
                className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LETRAS.map(letraOpcion => (
                  <option key={letraOpcion} value={letraOpcion}>{letraOpcion}</option>
                ))}
              </select>
            </div>
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