// Estudiantes.tsx
import React from 'react';
import { 
  Search, User, UserCheck, Clock, ArrowLeft, ChevronRight, ChevronLeft, 
  UserPlus, Edit2, Save, X, CheckCircle, HeartPulse, ShieldAlert, Activity, 
  Stethoscope, Check, FileText 
} from 'lucide-react';
import { useEstudiantes } from './hooks/useEstudiantes'; 
import { API_BASE_URL } from '../../config/api';

export default function Estudiantes() {
  const {
    puedeEditar,
    datosEstudiante, setDatosEstudiante,
    modoEdicion, setModoEdicion,
    guardandoEdicion, handleGuardarEdicion,
    textoBusqueda, setTextoBusqueda,
    cargandoLista, estudiantesFiltrados,
    verFichaEstudiante,
    datosEdicion, setDatosEdicion,
    // Wizard Nuevo Estudiante
    vistaCrearEstudiante, setVistaCrearEstudiante,
    pasoCrear, irSiguientePasoCrear, irPasoAnteriorCrear, iniciarCrearEstudiante,
    estudianteCreadoExito, rutRecienCreado, cerrarModalExito, irAMatricular,
    nuevoEstudiante, setNuevoEstudiante, formatearRUT, handleCrearEstudiante,
    creando, buscarSugerencias, buscandoMapa, sugerenciasMapa, seleccionarDireccion, archivoTutor, setArchivoTutor,
    
    filtroAnio, setFiltroAnio,
    filtroCodigo, setFiltroCodigo,
    filtroCurso, setFiltroCurso,
    aniosUnicos, codigosUnicos, cursosUnicos
  } = useEstudiantes();

  const esIpeEstudiante = nuevoEstudiante.run.replace(/[^0-9kK]/g, '').length >= 10;

  // Estado para el historial RGM colapsable
  const [historialExpandido, setHistorialExpandido] = React.useState(false);

  return (
    <div className="space-y-6 max-w-6xl mx-auto relative pb-10">
      
      {/* =======================================================================
          CABECERA GLOBAL DINÁMICA
          ======================================================================= */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {(datosEstudiante || vistaCrearEstudiante) && (
            <button 
              onClick={() => { 
                setDatosEstudiante(null); 
                setModoEdicion(false); 
                setVistaCrearEstudiante(false); 
              }} 
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-800">
            {vistaCrearEstudiante 
              ? 'Ingreso de Nuevo Estudiante' 
              : datosEstudiante 
              ? (modoEdicion ? 'Editando Ficha Completa del Estudiante' : 'Ficha del Estudiante') 
              : 'Directorio de Estudiantes'}
          </h1>
        </div>
        
        {vistaCrearEstudiante ? (
          <div className="hidden sm:flex items-center gap-2 text-sm font-bold">
            <span className={`px-3 py-1 rounded-full ${pasoCrear >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1. Estudiante</span>
            <div className={`w-8 h-1 ${pasoCrear >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <span className={`px-3 py-1 rounded-full ${pasoCrear >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2. Apoderados</span>
            <div className={`w-8 h-1 ${pasoCrear >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <span className={`px-3 py-1 rounded-full ${pasoCrear >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3. Ficha Médica</span>
          </div>
        ) : !datosEstudiante ? (
          <div className="flex gap-3">
            {puedeEditar && (
              <button 
                onClick={iniciarCrearEstudiante} 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"
              >
                <UserPlus size={20} /> Nuevo Estudiante
              </button>
            )}
          </div>
        ) : (
          !modoEdicion ? (
            puedeEditar && (
              <button 
                onClick={() => setModoEdicion(true)} 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"
              >
                <Edit2 size={18} /> Editar Ficha Completa
              </button>
            )
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={() => setModoEdicion(false)} 
                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <X size={18} /> Cancelar
              </button>
              <button 
                onClick={handleGuardarEdicion} 
                disabled={guardandoEdicion} 
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold transition-colors shadow-md disabled:opacity-50"
              >
                <Save size={18} /> {guardandoEdicion ? 'Guardando...' : 'Guardar Todos los Cambios'}
              </button>
            </div>
          )
        )}
      </div>

      {/* =======================================================================
          VISTA: ASISTENTE INTEGRAL DE CREACIÓN
          ======================================================================= */}
      {vistaCrearEstudiante && (
        estudianteCreadoExito ? (
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-200 text-center max-w-xl mx-auto animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={44} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">¡Estudiante Registrado con Éxito!</h3>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              El estudiante quedó registrado en la base de datos central bajo el identificador <strong className="font-mono bg-gray-100 px-2 py-0.5 rounded text-blue-800">{rutRecienCreado}</strong>, junto a sus apoderados y su ficha médica completa.
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={cerrarModalExito} 
                className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors"
              >
                Volver al Directorio
              </button>
              <button 
                onClick={irAMatricular} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-md"
              >
                Matricular Ahora <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCrearEstudiante} className="space-y-6">
            
            {/* PASO 1: DATOS PERSONALES */}
            {pasoCrear === 1 && (
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="border-b pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-gray-800">Paso 1: Identificación y Datos Personales del Estudiante</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Ingrese los antecedentes de identidad y geolocalización de residencia del alumno.</p>
                  </div>
                  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">Paso 1 de 3</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">RUN o IPE <span className="text-red-500">*</span></label>
                    <input 
                      required type="text" placeholder="Ej: 21123456-7" 
                      value={nuevoEstudiante.run} 
                      onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, run: formatearRUT(e.target.value)})} 
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono" 
                      maxLength={12} 
                    />
                  </div>

                  {esIpeEstudiante && (
                    <div className="col-span-full bg-blue-50 border border-blue-200 p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-blue-900 mb-1">País de Origen <span className="text-red-500">*</span></label>
                        <select 
                          required 
                          value={nuevoEstudiante.pais_origen_estudiante || ''} 
                          onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, pais_origen_estudiante: e.target.value})} 
                          className="w-full border border-blue-300 rounded-lg p-2 text-sm bg-white"
                        >
                          <option value="">Seleccione país...</option>
                          <option value="Venezuela">Venezuela</option>
                          <option value="Colombia">Colombia</option>
                          <option value="Perú">Perú</option>
                          <option value="Bolivia">Bolivia</option>
                          <option value="Haití">Haití</option>
                          <option value="Ecuador">Ecuador</option>
                          <option value="Otro">Otro país</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-blue-900 mb-1">Documento Nacional Extranjero <span className="text-red-500">*</span></label>
                        <input 
                          required type="text" placeholder="N° DNI o Pasaporte" 
                          value={nuevoEstudiante.doc_extranjero_estudiante || ''} 
                          onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, doc_extranjero_estudiante: e.target.value})} 
                          className="w-full border border-blue-300 rounded-lg p-2 text-sm bg-white" 
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                    <input required type="text" value={nuevoEstudiante.nombres} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, nombres: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Apellido Paterno <span className="text-red-500">*</span></label>
                    <input required type="text" value={nuevoEstudiante.apellido_paterno} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, apellido_paterno: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Apellido Materno <span className="text-red-500">*</span></label>
                    <input required type="text" value={nuevoEstudiante.apellido_materno} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, apellido_materno: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Fecha de Nacimiento <span className="text-red-500">*</span></label>
                    <input required type="date" value={nuevoEstudiante.fecha_nacimiento} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, fecha_nacimiento: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Sexo <span className="text-red-500">*</span></label>
                    <select required value={nuevoEstudiante.sexo} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, sexo: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white">
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="No Informado">No Informado</option>
                    </select>
                  </div>
                </div>

                {/* Geolocalización */}
                <div className="relative pt-2 border-t">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Domicilio Actual del Estudiante <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input 
                      required type="text" placeholder="Ej: Calle Prat 450, Valparaíso" 
                      value={nuevoEstudiante.domicilio} 
                      onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, domicilio: e.target.value, latitud: '', longitud: ''})} 
                      className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm" 
                    />
                    <button 
                      type="button" onClick={buscarSugerencias} disabled={buscandoMapa} 
                      className={`px-4 text-xs font-bold rounded-lg border transition-colors ${nuevoEstudiante.latitud ? 'bg-green-100 text-green-700 border-green-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      {buscandoMapa ? 'Buscando...' : (nuevoEstudiante.latitud ? '✓ Validado' : '🔍 Validar Mapa')}
                    </button>
                  </div>
                  {sugerenciasMapa.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {sugerenciasMapa.map((lugar: any, idx: number) => (
                        <li key={idx} onClick={() => seleccionarDireccion(lugar)} className="p-3 border-b hover:bg-blue-50 cursor-pointer text-sm">
                          {lugar.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button 
                    type="button" onClick={irSiguientePasoCrear} 
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-colors"
                  >
                    Siguiente: Apoderados <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* PASO 2: APODERADO TITULAR Y SUPLENTE */}
            {pasoCrear === 2 && (
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="border-b pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-gray-800">Paso 2: Directorio de Apoderados</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Defina al Apoderado Titular responsable y, de forma opcional pero recomendada, a su suplente de contacto.</p>
                  </div>
                  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">Paso 2 de 3</span>
                </div>

                {/* Apoderado Titular */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 1. Apoderado Titular (Obligatorio)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/50 p-5 rounded-xl border border-emerald-100">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Parentesco con el Estudiante <span className="text-red-500">*</span></label>
                      <select 
                        required value={nuevoEstudiante.relacion_estudiante} 
                        onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, relacion_estudiante: e.target.value})} 
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
                      >
                        <option value="">Seleccione parentesco...</option>
                        <option value="Madre">Madre</option>
                        <option value="Padre">Padre</option>
                        <option value="Abuelo Paterno">Abuelo Paterno</option>
                        <option value="Abuela Paterna">Abuela Paterna</option>
                        <option value="Abuelo Materno">Abuelo Materno</option>
                        <option value="Abuela Materna">Abuela Materna</option>
                        <option value="Tutor Legal Designado">Tutor Legal Designado (Medida Judicial/Proteccional)</option>
                      </select>
                    </div>

                    {nuevoEstudiante.relacion_estudiante === 'Tutor Legal Designado' && (
                      <div className="md:col-span-2 bg-orange-50 border border-orange-200 p-4 rounded-xl">
                        <label className="block text-xs font-bold text-orange-900 mb-2">Adjuntar Resolución Judicial / Notarial de Tutoría (PDF) <span className="text-red-500">*</span></label>
                        <input required={!archivoTutor} type="file" accept=".pdf" onChange={(e) => setArchivoTutor(e.target.files?.[0] || null)} className="text-sm" />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">RUT o Pasaporte <span className="text-red-500">*</span></label>
                      <input required type="text" placeholder="Ej: 12345678-9" value={nuevoEstudiante.run_apoderado} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, run_apoderado: formatearRUT(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono" maxLength={12} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                      <input required type="text" value={nuevoEstudiante.nombres_apoderado} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, nombres_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Apellido Paterno <span className="text-red-500">*</span></label>
                      <input required type="text" value={nuevoEstudiante.apellido_paterno_apoderado} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, apellido_paterno_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Apellido Materno</label>
                      <input type="text" value={nuevoEstudiante.apellido_materno_apoderado} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, apellido_materno_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono Móvil <span className="text-red-500">*</span></label>
                      <input required type="text" placeholder="+569..." value={nuevoEstudiante.telefono_apoderado} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, telefono_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico <span className="text-red-500">*</span></label>
                      <input required type="email" value={nuevoEstudiante.correo_apoderado} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, correo_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Domicilio del Apoderado <span className="text-red-500">*</span></label>
                      <div className="flex gap-2">
                        <input required type="text" value={nuevoEstudiante.domicilio_apoderado} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, domicilio_apoderado: e.target.value})} className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm" />
                        <button type="button" onClick={() => setNuevoEstudiante({...nuevoEstudiante, domicilio_apoderado: nuevoEstudiante.domicilio})} className="px-3 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg hover:bg-emerald-200 transition-colors">Copiar Estudiante</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Apoderado Suplente */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span> 2. Apoderado Suplente (Opcional)
                    </h4>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                      <input 
                        type="checkbox" checked={nuevoEstudiante.tiene_suplente} 
                        onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, tiene_suplente: e.target.checked})} 
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      Habilitar registro de Suplente
                    </label>
                  </div>

                  {nuevoEstudiante.tiene_suplente ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-5 rounded-xl border border-gray-200 animate-in fade-in duration-200">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">RUT Suplente <span className="text-red-500">*</span></label>
                        <input required={nuevoEstudiante.tiene_suplente} type="text" placeholder="Ej: 15987654-3" value={nuevoEstudiante.run_suplente} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, run_suplente: formatearRUT(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono" maxLength={12} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Parentesco / Relación</label>
                        <input type="text" placeholder="Ej: Tía, Hermano mayor, etc." value={nuevoEstudiante.relacion_suplente} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, relacion_suplente: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                        <input required={nuevoEstudiante.tiene_suplente} type="text" value={nuevoEstudiante.nombres_suplente} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, nombres_suplente: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Apellido Paterno <span className="text-red-500">*</span></label>
                        <input required={nuevoEstudiante.tiene_suplente} type="text" value={nuevoEstudiante.apellido_paterno_suplente} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, apellido_paterno_suplente: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono Móvil <span className="text-red-500">*</span></label>
                        <input required={nuevoEstudiante.tiene_suplente} type="text" placeholder="+569..." value={nuevoEstudiante.telefono_suplente} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, telefono_suplente: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico</label>
                        <input type="email" value={nuevoEstudiante.correo_suplente} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, correo_suplente: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No se registrará un apoderado suplente para este alumno.</p>
                  )}
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <button type="button" onClick={irPasoAnteriorCrear} className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors">
                    <ChevronLeft size={18} /> Volver
                  </button>
                  <button type="button" onClick={irSiguientePasoCrear} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-colors">
                    Siguiente: Ficha Médica <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3: FICHA MÉDICA COMPLETA */}
            {pasoCrear === 3 && (
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="border-b pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-gray-800">Paso 3: Ficha Médica y Antecedentes Clínicos</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Toda la información de previsión, centros de atención y condiciones médicas declaradas.</p>
                  </div>
                  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">Paso 3 de 3</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Cobertura */}
                  <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                      <Activity size={16} className="text-blue-600" /> Cobertura Asistencial
                    </h4>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Previsión / Sistema <span className="text-red-500">*</span></label>
                      <select value={nuevoEstudiante.sistema_salud} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, sistema_salud: e.target.value})} className="w-full border rounded-lg p-2 text-sm bg-white">
                        <option value="FONASA">FONASA</option>
                        <option value="ISAPRE">ISAPRE</option>
                        <option value="DIPRECA">DIPRECA</option>
                        <option value="CAPREDENA">CAPREDENA</option>
                        <option value="Particular">Particular</option>
                        <option value="Sin Información">Sin Información</option>
                      </select>
                    </div>

                    {nuevoEstudiante.sistema_salud === 'FONASA' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Tramo FONASA</label>
                        <select value={nuevoEstudiante.letra_fonasa} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, letra_fonasa: e.target.value})} className="w-full border rounded-lg p-2 text-sm bg-white">
                          <option value="A">Tramo A</option>
                          <option value="B">Tramo B</option>
                          <option value="C">Tramo C</option>
                          <option value="D">Tramo D</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">CESFAM Asignado <span className="text-red-500">*</span></label>
                      <input required type="text" placeholder="Ej: CESFAM Jean y Marie Thierry" value={nuevoEstudiante.cesfam} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, cesfam: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Centro en Caso de Emergencia <span className="text-red-500">*</span></label>
                      <input required type="text" placeholder="Ej: Hospital Carlos Van Buren" value={nuevoEstudiante.centro_emergencia} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, centro_emergencia: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                    </div>
                  </div>

                  {/* Diagnóstico y Medicamentos */}
                  <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                      <Stethoscope size={16} className="text-emerald-600" /> Diagnóstico y Fármacos
                    </h4>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">¿Presenta Diagnóstico Médico? <span className="text-red-500">*</span></label>
                      <select value={nuevoEstudiante.diagnostico_medico} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, diagnostico_medico: e.target.value})} className="w-full border rounded-lg p-2 text-sm bg-white">
                        <option value="No">No</option>
                        <option value="Sí">Sí</option>
                      </select>
                    </div>

                    {nuevoEstudiante.diagnostico_medico === 'Sí' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Médico Tratante</label>
                        <input type="text" placeholder="Dr/a..." value={nuevoEstudiante.medico_tratante} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, medico_tratante: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Medicamentos Frecuentes / Permanentes</label>
                      <textarea rows={3} placeholder="Detalle medicamento y dosis, o deje vacío si no requiere..." value={nuevoEstudiante.medicamento} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, medicamento: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                    </div>
                  </div>

                  {/* Alergias e Inclusión */}
                  <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                      <ShieldAlert size={16} className="text-rose-600" /> Alergias e Inclusión (NEE)
                    </h4>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Alergias Alimentarias o Medicamentosas</label>
                      <textarea rows={2} placeholder="Ej: Alergia a la penicilina, maní, celiaquía..." value={nuevoEstudiante.alergias} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, alergias: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Programa PIE / NEE <span className="text-red-500">*</span></label>
                      <select value={nuevoEstudiante.nee} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, nee: e.target.value})} className="w-full border rounded-lg p-2 text-sm bg-white">
                        <option value="No">No</option>
                        <option value="Sí">Sí</option>
                      </select>
                    </div>

                    {nuevoEstudiante.nee === 'Sí' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de NEE Declarada</label>
                        <input type="text" placeholder="Ej: TEA, TDAH, DIL, etc." value={nuevoEstudiante.nee_tipo} onChange={(e) => setNuevoEstudiante({...nuevoEstudiante, nee_tipo: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t">
                  <button type="button" onClick={irPasoAnteriorCrear} className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors">
                    <ChevronLeft size={18} /> Volver
                  </button>
                  <button 
                    type="submit" disabled={creando} 
                    className="flex items-center gap-2 px-8 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
                  >
                    {creando ? 'Guardando Registro Completo...' : <><Check size={20} /> Finalizar y Crear Estudiante</>}
                  </button>
                </div>
              </div>
            )}

          </form>
        )
      )}

      {/* =======================================================================
          VISTA 1: DIRECTORIO DE ESTUDIANTES
          ======================================================================= */}
      {!vistaCrearEstudiante && !datosEstudiante && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">🔍 Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                  type="text" placeholder="RUT o Nombre..."
                  value={textoBusqueda} onChange={(e) => setTextoBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">📅 1. Año</label>
              <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none bg-white cursor-pointer">
                <option value="">Todos los años</option>
                {aniosUnicos.map((anio: any) => <option key={anio} value={anio}>{anio}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">📚 2. Plan de Estudio</label>
              <select value={filtroCodigo} onChange={(e) => setFiltroCodigo(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none bg-white cursor-pointer">
                <option value="">Todos los planes</option>
                {codigosUnicos.map((cod: any) => <option key={cod} value={cod}>Cod. {cod}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">🏫 3. Curso</label>
              <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)} disabled={cursosUnicos.length === 0} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400">
                <option value="">Todos los cursos</option>
                {cursosUnicos.map((curso: any) => <option key={curso} value={curso}>{curso}</option>)}
              </select>
            </div>
          </div>

          <ul className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {cargandoLista ? (
              <div className="p-8 text-center text-gray-500">Cargando directorio...</div>
            ) : estudiantesFiltrados.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No hay estudiantes que coincidan con los filtros.</div>
            ) : (
              estudiantesFiltrados.map((est: any) => (
                <li key={est.id}>
                  <button 
                    onClick={() => verFichaEstudiante(est.run)}
                    className="w-full flex items-center justify-between p-4 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div>
                      <p className="font-semibold text-gray-800 text-lg">{est.nombre_completo}</p>
                      <p className="text-sm text-gray-500">RUT: {est.run} {est.curso ? `| Curso: ${est.curso}` : ''}</p>
                    </div>
                    <div className="text-blue-500"><ChevronRight size={20} /></div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {/* =======================================================================
          VISTA 2: FICHA DETALLADA DEL ESTUDIANTE (MODO VISTA / MODO EDICIÓN TOTAL)
          ======================================================================= */}
      {!vistaCrearEstudiante && datosEstudiante && (() => {
        const historialOrdenado = [...datosEstudiante.historial].sort((a: any, b: any) => b.id - a.id);
        const ultimaMatricula = historialOrdenado.length > 0 ? historialOrdenado[0] : null;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-8 duration-300">
            
            {/* Columna Izquierda: Identificación e Historial */}
            <div className="space-y-6 lg:col-span-1">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><User size={24} /></div>
                  <h2 className="text-lg font-bold text-gray-800">Datos Personales</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">RUN / IPE</p>
                    <p className="font-mono font-bold text-gray-800">{datosEstudiante.personal.run}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Nombre Completo</p>
                    <p className="font-medium text-gray-900">{datosEstudiante.personal.nombres} {datosEstudiante.personal.apellidos}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Fecha Nacimiento</p>
                    <p className="font-medium text-gray-700">{datosEstudiante.personal.fecha_nacimiento}</p>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-50">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Última Matrícula Registrada</p>
                    <p className="font-bold text-blue-800">{ultimaMatricula ? ultimaMatricula.establecimiento : 'Sin registro'}</p>
                    <p className="text-xs text-gray-500 font-mono">RBD: {ultimaMatricula ? ultimaMatricula.rbd : 'N/A'}</p>
                  </div>

                  <div className="pt-2 border-t border-gray-50">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                      Domicilio Actual {modoEdicion && <span className="text-red-500">*</span>}
                    </p>
                    {!modoEdicion ? (
                      <p className="font-medium text-gray-800">{datosEstudiante.personal.domicilio}</p>
                    ) : (
                      <input 
                        type="text" 
                        value={datosEdicion.domicilio || ''} 
                        onChange={(e) => setDatosEdicion({...datosEdicion, domicilio: e.target.value})} 
                        placeholder="Ej: Av. Argentina 1234, Valparaíso"
                        className="w-full border border-blue-300 bg-blue-50/50 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium" 
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Historial RGM */}
              {(() => {
                const anioActual = new Date().getFullYear();
                const LIMITE_VISIBLE = 4;
                const registrosVisibles = historialExpandido
                  ? historialOrdenado
                  : historialOrdenado.slice(0, LIMITE_VISIBLE);
                const hayMas = historialOrdenado.length > LIMITE_VISIBLE;

                const coloresEstado: Record<string, string> = {
                  Activa:   'bg-green-100 text-green-700 border border-green-200',
                  Retirado: 'bg-red-50 text-red-600 border border-red-100',
                  Inactiva: 'bg-orange-50 text-orange-600 border border-orange-100',
                  Anulada:  'bg-gray-100 text-gray-400 border border-gray-200',
                };

                return (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Clock size={24} /></div>
                        <div>
                          <h2 className="text-lg font-bold text-gray-800">Historial RGM</h2>
                          <p className="text-xs text-gray-400">
                            {historialOrdenado.length} registro{historialOrdenado.length !== 1 ? 's' : ''} en total
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {historialOrdenado.length === 0 && (
                        <p className="text-sm text-center text-gray-400 py-4">Sin historial de matrículas</p>
                      )}

                      {registrosVisibles.map((reg: any) => {
                        const esVigente = reg.estado === 'Activa' && reg.anio === anioActual;
                        const esActivoAnterior = reg.estado === 'Activa' && !esVigente;
                        const badgeCls = esActivoAnterior
                          ? 'bg-gray-100 text-gray-500 border border-gray-200'
                          : (coloresEstado[reg.estado] ?? 'bg-gray-100 text-gray-500 border border-gray-200');
                        const badgeLabel = esActivoAnterior ? 'Promovido' : reg.estado;

                        return (
                          <div
                            key={reg.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                              esVigente
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                            }`}
                          >
                            {/* Pill de año */}
                            <div className={`shrink-0 w-12 text-center text-[13px] font-black rounded-lg py-1 ${
                              esVigente ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {reg.anio}
                            </div>

                            {/* Establecimiento + RBD + Curso */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${esVigente ? 'text-green-900' : 'text-gray-800'}`}>
                                {reg.establecimiento}
                              </p>
                              <p className="text-[11px] text-gray-400 font-mono">
                                RBD: {reg.rbd}&nbsp;·&nbsp;{reg.curso || 'Sin curso'}
                              </p>
                            </div>

                            {/* Badge estado */}
                            <span className={`shrink-0 px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${badgeCls}`}>
                              {badgeLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Toggle expandir / colapsar */}
                    {hayMas && (
                      <button
                        onClick={() => setHistorialExpandido(prev => !prev)}
                        className="mt-3 w-full text-xs font-semibold text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg py-2 transition-colors border border-purple-100"
                      >
                        {historialExpandido
                          ? '▲ Mostrar menos'
                          : `▼ Ver historial completo (${historialOrdenado.length - LIMITE_VISIBLE} más)`}
                      </button>
                    )}
                  </div>
                );
              })()}

            </div>

            {/* Columna Derecha: Directorio de Apoderados y Ficha de Salud */}
            <div className="space-y-6 lg:col-span-2">
              
              {/* Directorio de Apoderados */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><UserCheck size={24} /></div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Directorio de Apoderados</h2>
                    <p className="text-xs text-gray-500">Apoderado titular responsable y apoderado suplente ante emergencias</p>
                  </div>
                </div>
                
                {/* 1. Apoderado Titular */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-emerald-800 uppercase flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Apoderado Titular
                  </h3>

                  {!modoEdicion ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div><p className="text-xs font-bold text-gray-500 uppercase">Nombre Completo</p><p className="font-semibold text-gray-800">{datosEstudiante.apoderado?.nombre || 'Sin registrar'}</p></div>
                      <div><p className="text-xs font-bold text-gray-500 uppercase">RUT</p><p className="font-mono font-medium text-gray-800">{datosEstudiante.apoderado?.rut || 'Sin registrar'}</p></div>
                      <div><p className="text-xs font-bold text-gray-500 uppercase">Parentesco</p><p className="font-medium text-gray-700">{datosEstudiante.apoderado?.relacion || 'No informado'}</p></div>
                      <div><p className="text-xs font-bold text-gray-500 uppercase">Teléfono Móvil</p><p className="font-medium text-gray-700">{datosEstudiante.apoderado?.telefono || '-'}</p></div>
                      <div className="sm:col-span-2"><p className="text-xs font-bold text-gray-500 uppercase">Correo Electrónico</p><p className="font-medium text-gray-700">{datosEstudiante.apoderado?.correo || '-'}</p></div>
                      <div className="sm:col-span-2"><p className="text-xs font-bold text-gray-500 uppercase">Domicilio</p><p className="font-medium text-gray-700">{datosEstudiante.apoderado?.domicilio || 'Sin registrar'}</p></div>
                      {datosEstudiante.apoderado?.ruta_documento_tutor && (
                        <div className="sm:col-span-2 pt-3 border-t border-gray-200 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-emerald-800 uppercase">Documento de Tutoría Legal</p>
                            <p className="text-xs text-gray-500">Acreditación / Resolución judicial adjunta</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const token = localStorage.getItem('token');
                              window.open(`${API_BASE_URL}/documentos/adjunto?tipo=tutor&id=${encodeURIComponent(datosEstudiante.personal.run)}&token=${token}`, '_blank');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                          >
                            <FileText size={15} /> Ver Documento PDF
                          </button>
                        </div>
                      )}
                    </div>

                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-emerald-50/40 p-4 rounded-xl border border-emerald-200">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">RUT Apoderado <span className="text-red-500">*</span></label>
                        <input type="text" value={datosEdicion.rut_apoderado || ''} onChange={(e) => setDatosEdicion({...datosEdicion, rut_apoderado: formatearRUT(e.target.value)})} placeholder="12345678-9" className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Parentesco <span className="text-red-500">*</span></label>
                        <select value={datosEdicion.relacion_apoderado || 'Madre'} onChange={(e) => setDatosEdicion({...datosEdicion, relacion_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="Madre">Madre</option>
                          <option value="Padre">Padre</option>
                          <option value="Abuelo Paterno">Abuelo Paterno</option>
                          <option value="Abuela Paterna">Abuela Paterna</option>
                          <option value="Abuelo Materno">Abuelo Materno</option>
                          <option value="Abuela Materna">Abuela Materna</option>
                          <option value="Tutor Legal Designado">Tutor Legal Designado</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                        <input type="text" value={datosEdicion.nombres_apoderado || ''} onChange={(e) => setDatosEdicion({...datosEdicion, nombres_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Apellido Paterno <span className="text-red-500">*</span></label>
                        <input type="text" value={datosEdicion.apellido_paterno_apoderado || ''} onChange={(e) => setDatosEdicion({...datosEdicion, apellido_paterno_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Apellido Materno</label>
                        <input type="text" value={datosEdicion.apellido_materno_apoderado || ''} onChange={(e) => setDatosEdicion({...datosEdicion, apellido_materno_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono Móvil <span className="text-red-500">*</span></label>
                        <input type="text" value={datosEdicion.telefono_apoderado || ''} onChange={(e) => setDatosEdicion({...datosEdicion, telefono_apoderado: e.target.value})} placeholder="+569..." className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico <span className="text-red-500">*</span></label>
                        <input type="email" value={datosEdicion.correo_apoderado || ''} onChange={(e) => setDatosEdicion({...datosEdicion, correo_apoderado: e.target.value})} placeholder="correo@ejemplo.com" className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="sm:col-span-2">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-bold text-gray-700">Domicilio Apoderado <span className="text-red-500">*</span></label>
                          <button type="button" onClick={() => setDatosEdicion({...datosEdicion, domicilio_apoderado: datosEdicion.domicilio})} className="text-xs text-blue-600 font-bold hover:underline">Copiar del Alumno</button>
                        </div>
                        <input type="text" value={datosEdicion.domicilio_apoderado || ''} onChange={(e) => setDatosEdicion({...datosEdicion, domicilio_apoderado: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Apoderado Suplente */}
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-600 uppercase flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span> Apoderado Suplente
                    </h3>
                    {modoEdicion && (
                      <label className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={Boolean(datosEdicion.tiene_suplente)} 
                          onChange={(e) => setDatosEdicion({...datosEdicion, tiene_suplente: e.target.checked})} 
                          className="rounded text-blue-600"
                        />
                        Habilitar Apoderado Suplente
                      </label>
                    )}
                  </div>

                  {!modoEdicion ? (
                    datosEstudiante.apoderado_suplente?.rut ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/60">
                        <div><p className="text-xs font-bold text-gray-500 uppercase">Nombre</p><p className="font-medium text-gray-800 text-sm">{datosEstudiante.apoderado_suplente.nombre}</p></div>
                        <div><p className="text-xs font-bold text-gray-500 uppercase">RUT</p><p className="font-medium text-gray-800 text-sm font-mono">{datosEstudiante.apoderado_suplente.rut}</p></div>
                        <div><p className="text-xs font-bold text-gray-500 uppercase">Parentesco</p><p className="font-medium text-gray-700 text-sm">{datosEstudiante.apoderado_suplente.relacion || 'Suplente'}</p></div>
                        <div><p className="text-xs font-bold text-gray-500 uppercase">Teléfono Móvil</p><p className="font-medium text-gray-700 text-sm">{datosEstudiante.apoderado_suplente.telefono || '-'}</p></div>
                        <div className="sm:col-span-2"><p className="text-xs font-bold text-gray-500 uppercase">Correo Electrónico</p><p className="font-medium text-gray-700 text-sm">{datosEstudiante.apoderado_suplente.correo || '-'}</p></div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-gray-300 text-center text-sm text-gray-500 bg-gray-50">
                        El estudiante no tiene un apoderado suplente registrado en el sistema.
                      </div>
                    )
                  ) : (
                    datosEdicion.tiene_suplente ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">RUT Suplente <span className="text-red-500">*</span></label>
                          <input type="text" value={datosEdicion.rut_suplente || ''} onChange={(e) => setDatosEdicion({...datosEdicion, rut_suplente: formatearRUT(e.target.value)})} placeholder="Ej: 15987654-3" className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Parentesco</label>
                          <input type="text" value={datosEdicion.relacion_suplente || ''} onChange={(e) => setDatosEdicion({...datosEdicion, relacion_suplente: e.target.value})} placeholder="Ej: Tía, Hermano mayor..." className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                          <input type="text" value={datosEdicion.nombres_suplente || ''} onChange={(e) => setDatosEdicion({...datosEdicion, nombres_suplente: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Apellido Paterno <span className="text-red-500">*</span></label>
                          <input type="text" value={datosEdicion.apellido_paterno_suplente || ''} onChange={(e) => setDatosEdicion({...datosEdicion, apellido_paterno_suplente: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Apellido Materno</label>
                          <input type="text" value={datosEdicion.apellido_materno_suplente || ''} onChange={(e) => setDatosEdicion({...datosEdicion, apellido_materno_suplente: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono Móvil <span className="text-red-500">*</span></label>
                          <input type="text" value={datosEdicion.telefono_suplente || ''} onChange={(e) => setDatosEdicion({...datosEdicion, telefono_suplente: e.target.value})} placeholder="+569..." className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico</label>
                          <input type="email" value={datosEdicion.correo_suplente || ''} onChange={(e) => setDatosEdicion({...datosEdicion, correo_suplente: e.target.value})} placeholder="correo@ejemplo.com" className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No se encuentra configurado un apoderado suplente.</p>
                    )
                  )}
                </div>
              </div>

              {/* Ficha Médica y Salud */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><HeartPulse size={24} /></div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Ficha Médica y Antecedentes Clínicos</h2>
                    <p className="text-xs text-gray-500">Previsión de salud, centros asistenciales y requerimientos especiales</p>
                  </div>
                </div>

                {!modoEdicion ? (
                  datosEstudiante.salud ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Cobertura */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Activity size={14} className="text-blue-600" /> Cobertura Asistencial
                        </h4>
                        <div>
                          <p className="text-xs text-gray-500">Previsión</p>
                          <p className="font-semibold text-sm text-gray-800">
                            {datosEstudiante.salud.sistema_salud}
                            {datosEstudiante.salud.letra_fonasa && datosEstudiante.salud.letra_fonasa !== '-' && (
                              <span className="ml-1.5 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                                Tramo {datosEstudiante.salud.letra_fonasa}
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">CESFAM Asignado</p>
                          <p className="font-medium text-sm text-gray-800">{datosEstudiante.salud.cesfam || 'No informado'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Centro en Emergencias</p>
                          <p className="font-medium text-sm text-gray-800">{datosEstudiante.salud.centro_emergencia || 'No informado'}</p>
                        </div>
                      </div>

                      {/* Diagnóstico y Fármacos */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Stethoscope size={14} className="text-emerald-600" /> Diagnóstico y Fármacos
                        </h4>
                        <div>
                          <p className="text-xs text-gray-500">Diagnóstico Médico</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${datosEstudiante.salud.diagnostico_medico === 'Sí' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'}`}>
                            {datosEstudiante.salud.diagnostico_medico || 'No'}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Médico Tratante</p>
                          <p className="font-medium text-sm text-gray-800">{datosEstudiante.salud.medico_tratante || 'No informado'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Medicamentos Frecuentes</p>
                          <p className={`text-sm ${datosEstudiante.salud.medicamento ? 'font-bold text-blue-700' : 'font-medium text-gray-800'}`}>
                            {datosEstudiante.salud.medicamento || 'No requiere'}
                          </p>
                        </div>
                      </div>

                      {/* Alergias e Inclusión */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <ShieldAlert size={14} className="text-rose-600" /> Alergias e Inclusión
                        </h4>
                        <div>
                          <p className="text-xs text-gray-500">Alergias</p>
                          <p className={`text-sm ${datosEstudiante.salud.alergias ? 'font-bold text-amber-800 bg-amber-50 p-1 rounded' : 'font-medium text-gray-800'}`}>
                            {datosEstudiante.salud.alergias || 'Ninguna registrada'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Programa NEE / PIE</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${datosEstudiante.salud.nee === 'Sí' ? 'bg-purple-100 text-purple-800' : 'bg-gray-200 text-gray-700'}`}>
                              {datosEstudiante.salud.nee || 'No'}
                            </span>
                            {datosEstudiante.salud.nee_tipo && datosEstudiante.salud.nee_tipo !== 'No aplica' && (
                              <span className="text-xs text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded">
                                {datosEstudiante.salud.nee_tipo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-gray-300 text-center text-sm text-gray-500 bg-gray-50">
                      Sin antecedentes clínicos registrados.
                    </div>
                  )
                ) : (
                  /* Formulario de Edición de Salud */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-rose-50/30 p-5 rounded-xl border border-rose-200">
                    
                    {/* Cobertura */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-blue-900 uppercase flex items-center gap-1.5 border-b pb-1">
                        <Activity size={14} className="text-blue-600" /> 1. Previsión
                      </h4>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Sistema de Salud</label>
                        <select value={datosEdicion.sistema_salud || 'FONASA'} onChange={(e) => setDatosEdicion({...datosEdicion, sistema_salud: e.target.value})} className="w-full border rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="FONASA">FONASA</option>
                          <option value="ISAPRE">ISAPRE</option>
                          <option value="DIPRECA">DIPRECA</option>
                          <option value="CAPREDENA">CAPREDENA</option>
                          <option value="Particular">Particular</option>
                          <option value="Sin Información">Sin Información</option>
                        </select>
                      </div>

                      {datosEdicion.sistema_salud === 'FONASA' && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Tramo FONASA</label>
                          <select value={datosEdicion.letra_fonasa || 'A'} onChange={(e) => setDatosEdicion({...datosEdicion, letra_fonasa: e.target.value})} className="w-full border rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="A">Tramo A</option>
                            <option value="B">Tramo B</option>
                            <option value="C">Tramo C</option>
                            <option value="D">Tramo D</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">CESFAM Asignado</label>
                        <input type="text" value={datosEdicion.cesfam || ''} onChange={(e) => setDatosEdicion({...datosEdicion, cesfam: e.target.value})} placeholder="CESFAM..." className="w-full border rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Centro de Emergencia</label>
                        <input type="text" value={datosEdicion.centro_emergencia || ''} onChange={(e) => setDatosEdicion({...datosEdicion, centro_emergencia: e.target.value})} placeholder="Hospital / SAR..." className="w-full border rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>

                    {/* Diagnóstico y Medicamentos */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-emerald-900 uppercase flex items-center gap-1.5 border-b pb-1">
                        <Stethoscope size={14} className="text-emerald-600" /> 2. Fármacos y Control
                      </h4>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">¿Presenta Diagnóstico?</label>
                        <select value={datosEdicion.diagnostico_medico || 'No'} onChange={(e) => setDatosEdicion({...datosEdicion, diagnostico_medico: e.target.value})} className="w-full border rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="No">No</option>
                          <option value="Sí">Sí</option>
                        </select>
                      </div>

                      {datosEdicion.diagnostico_medico === 'Sí' && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Médico Tratante</label>
                          <input type="text" value={datosEdicion.medico_tratante || ''} onChange={(e) => setDatosEdicion({...datosEdicion, medico_tratante: e.target.value})} placeholder="Dr/a..." className="w-full border rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Medicamentos Frecuentes</label>
                        <textarea rows={3} value={datosEdicion.medicamento || ''} onChange={(e) => setDatosEdicion({...datosEdicion, medicamento: e.target.value})} placeholder="Indique medicamentos o deje vacío si no requiere..." className="w-full border rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>

                    {/* Alergias e Inclusión */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-rose-900 uppercase flex items-center gap-1.5 border-b pb-1">
                        <ShieldAlert size={14} className="text-rose-600" /> 3. Alergias e Inclusión
                      </h4>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Alergias Conocidas</label>
                        <textarea rows={2} value={datosEdicion.alergias || ''} onChange={(e) => setDatosEdicion({...datosEdicion, alergias: e.target.value})} placeholder="Alimentos, medicamentos, etc." className="w-full border rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Programa PIE / NEE</label>
                        <select value={datosEdicion.nee || 'No'} onChange={(e) => setDatosEdicion({...datosEdicion, nee: e.target.value})} className="w-full border rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="No">No</option>
                          <option value="Sí">Sí</option>
                        </select>
                      </div>

                      {datosEdicion.nee === 'Sí' && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de NEE</label>
                          <input type="text" value={datosEdicion.nee_tipo || ''} onChange={(e) => setDatosEdicion({...datosEdicion, nee_tipo: e.target.value})} placeholder="Ej: TEA, TDAH, DIL..." className="w-full border rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>

            </div>

          </div>
        );
      })()}

    </div>
  );
}