import React from 'react';
import { Search, UserCheck, AlertCircle, X, Copy, CheckCircle, Download, Mail, ArrowRight, Upload } from 'lucide-react';
import { useNuevaMatricula } from './hooks/useNuevaMatricula';

export default function NuevaMatricula() {
  const {
    navigate, cargando, error, matriculaExitosa,
    rutBusqueda, estudiante, setEstudiante,
    sugerencias, mostrarSugerencias, setMostrarSugerencias, 
    handleEscribirBuscador, seleccionarEstudiante,
    datosFaltantes, setDatosFaltantes, modalFaltantes, setModalFaltantes,
    formFaltantes, setFormFaltantes, guardandoFaltantes, guardarDatosFaltantes, copiarDomicilio,
    formulario, handleChange, establecimientosDb, esPerfilColegio,
    codigosDisponibles, cursosDisponibles, seleccionarCurso,
    colegioProcedencia, esTraslado, huboPrecarga, setHuboPrecarga,
    idEstablecimientoPrevio, setIdEstablecimientoPrevio,
    setCursoPrevio, setCodigoPrevio, alertasTransicion, setAlertasTransicion,
    esColegioEMTP,esCuartoMedio,
    checkCertNotas, setCheckCertNotas, checkCertRetiro, setCheckCertRetiro,
    handleSubmit, generarComprobantePDF,
    cuposOcupados, limiteCupos,
    archivoResolucion, setArchivoResolucion // 🌟 Traemos el estado del PDF
  } = useNuevaMatricula();

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      
      <h2 className="text-2xl font-bold text-gray-800">Registrar Nueva Matrícula</h2>
      
      {/* ... (Todo el PASO 1 se mantiene igual) ... */}
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
                onClick={() => { 
                  setEstudiante(null); handleEscribirBuscador(''); setHuboPrecarga(false); setDatosFaltantes([]); 
                  setCursoPrevio(''); setCodigoPrevio(null); setAlertasTransicion([]);
                  setCheckCertNotas(false); setCheckCertRetiro(false); setIdEstablecimientoPrevio(null);
                }} 
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

      {/* =======================================================================
          PASO 2: DATOS DE MATRÍCULA Y ESTABLECIMIENTO
          ======================================================================= */}
      <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 transition-opacity ${(!estudiante || datosFaltantes.length > 0) ? 'opacity-50 pointer-events-none' : ''}`}>
        <h3 className="font-semibold text-gray-700 mb-6">Paso 2: Datos de Matrícula y Establecimiento</h3>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colegio de Procedencia</label>
              <input 
                type="text" disabled value={colegioProcedencia || 'Esperando selección...'} 
                className={`w-full border rounded-lg p-2 outline-none font-medium text-sm ${esTraslado ? 'bg-orange-50 border-orange-300 text-orange-800' : 'bg-gray-100 border-gray-300 text-gray-600'}`} 
              />
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
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-medium text-gray-700">Curso (Sala)</label>
                {formulario.cursoSeleccionado && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm transition-colors ${
                    cuposOcupados >= limiteCupos ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    Cupos: {cuposOcupados} / {limiteCupos}
                  </span>
                )}
              </div>
              <select name="cursoSeleccionado" value={formulario.cursoSeleccionado} onChange={(e) => seleccionarCurso(e.target.value)} required className={`w-full border rounded-lg p-2 outline-none font-bold transition-colors ${
                cuposOcupados >= limiteCupos ? 'border-red-300 text-red-800 bg-red-50' : 'border-gray-300 text-blue-800 bg-white'
              }`}>
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

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-500 flex justify-between">
            <span>Grado autodetectado: <strong>{formulario.cod_grado}</strong></span>
            <span>Letra autodetectada: <strong>{formulario.letra_curso}</strong></span>
            <span>Nivel Real: <strong className="text-blue-600">{formulario.nivel_ensenanza}</strong></span>
          </div>

          <div className="border-t border-gray-200 pt-5 mt-5">
            <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
              Recepción de Documentos Obligatorios
            </h4>
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={checkCertNotas}
                  onChange={(e) => setCheckCertNotas(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                    Se presentó el Certificado de Promoción (Notas) del año anterior
                  </p>
                  <p className="text-xs text-gray-500">Documento que acredita la aprobación o repitencia del último curso.</p>
                </div>
              </label>

              {idEstablecimientoPrevio !== String(formulario.id_establecimiento) && (
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checkCertRetiro}
                    onChange={(e) => setCheckCertRetiro(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                      Se presentó el Certificado de Retiro o Traslado
                    </p>
                    <p className="text-xs text-gray-500">Obligatorio para alumnos provenientes de otros establecimientos.</p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* =======================================================================
              🌟 ACTUALIZADO: SECCIÓN EXCEDENTES CON CARGA DE PDF Y DESGLOSE
              ======================================================================= */}
          <div className="border-t border-gray-200 pt-5 mt-5">
            <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
              Condición de Matrícula (Cupos)
            </h4>
            
            <div className={`p-4 rounded-lg border transition-colors ${formulario.es_excedente ? (cuposOcupados >= limiteCupos ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200') : 'bg-gray-50 border-gray-200'}`}>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  name="es_excedente"
                  checked={formulario.es_excedente}
                  onChange={handleChange}
                  disabled={cuposOcupados >= limiteCupos} 
                  className={`mt-1 w-4 h-4 rounded focus:ring-2 cursor-pointer transition-colors ${
                    cuposOcupados >= limiteCupos ? 'text-red-600 focus:ring-red-500 border-red-300' : 'text-orange-600 focus:ring-orange-500 border-gray-300'
                  }`}
                />
                <div>
                  <p className={`text-sm font-bold transition-colors ${
                    cuposOcupados >= limiteCupos ? 'text-red-900' : (formulario.es_excedente ? 'text-orange-900' : 'text-gray-800 group-hover:text-orange-700')
                  }`}>
                    Matricular como Estudiante Excedente (Sobrecupo Autorizado)
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {cuposOcupados >= limiteCupos 
                      ? <span className="text-red-600 font-bold">⚠️ El curso ha alcanzado su máxima capacidad legal ({limiteCupos}). Esta opción es obligatoria para continuar.</span>
                      : "Seleccione esta opción solo si el estudiante ingresa por sobre el cupo máximo autorizado mediante resolución."
                    }
                  </p>
                </div>
              </label>

              {formulario.es_excedente && (
                <div className="mt-4 pt-4 border-t border-orange-200 animate-in slide-in-from-top-2 space-y-4">
                  
                  {/* Selector del Tipo de Resolución */}
                  <div>
                    <label className="block text-xs font-bold text-orange-800 mb-1">
                      Tipo de Resolución Autorizatoria <span className="text-red-500">*</span>
                    </label>
                    <select 
                      required={formulario.es_excedente} 
                      name="res_tipo"
                      value={formulario.res_tipo}
                      onChange={handleChange}
                      className="w-full border border-orange-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 bg-white" 
                    >
                      <option value="">Seleccione el tipo...</option>
                      <option value="Administrativa">Resolución Administrativa</option>
                      <option value="Judicial">Resolución Judicial</option>
                    </select>
                  </div>

                  {/* Detalle de la Resolución (Causa, N°, Año, Tribunal, Fecha) */}
                  {formulario.res_tipo && (
                    <div className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Causa / Materia <span className="text-red-500">*</span></label>
                        <input required type="text" name="res_causa" value={formulario.res_causa} onChange={handleChange} placeholder="Ej: Vulneración de derechos, Traslado laboral..." className="w-full border rounded p-2 text-sm outline-none focus:border-orange-500 bg-gray-50 focus:bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">N° de Resolución / Rol <span className="text-red-500">*</span></label>
                        <input required type="text" name="res_numero" value={formulario.res_numero} onChange={handleChange} placeholder="Ej: 12345" className="w-full border rounded p-2 text-sm outline-none focus:border-orange-500 bg-gray-50 focus:bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Año de Resolución <span className="text-red-500">*</span></label>
                        <input required type="number" name="res_anio" value={formulario.res_anio} onChange={handleChange} className="w-full border rounded p-2 text-sm outline-none focus:border-orange-500 bg-gray-50 focus:bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Tribunal / Entidad Emisora <span className="text-red-500">*</span></label>
                        <input required type="text" name="res_tribunal" value={formulario.res_tribunal} onChange={handleChange} placeholder="Ej: Juzgado de Familia de Valparaíso" className="w-full border rounded p-2 text-sm outline-none focus:border-orange-500 bg-gray-50 focus:bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Fecha del Documento <span className="text-red-500">*</span></label>
                        <input required type="date" name="fecha_resolucion_excedente" value={formulario.fecha_resolucion_excedente} onChange={handleChange} className="w-full border rounded p-2 text-sm outline-none focus:border-orange-500 bg-gray-50 focus:bg-white" />
                      </div>

                      {/* Carga del PDF */}
                      <div className="sm:col-span-2 border-t border-dashed border-orange-200 pt-3 mt-1">
                        <label className="block text-xs font-bold text-gray-700 mb-2">Adjuntar Documento Digital (PDF) <span className="text-red-500">*</span></label>
                        <div className="flex items-center justify-center w-full">
                          <label htmlFor="pdf-upload" className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${archivoResolucion ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              {archivoResolucion ? (
                                <>
                                  <CheckCircle className="w-6 h-6 mb-2 text-emerald-500" />
                                  <p className="text-sm font-semibold text-emerald-700 truncate max-w-xs">{archivoResolucion.name}</p>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-6 h-6 mb-2 text-gray-500" />
                                  <p className="text-sm text-gray-500"><span className="font-semibold">Haga clic para subir</span> o arrastre el archivo</p>
                                  <p className="text-xs text-gray-400">PDF (MAX. 5MB)</p>
                                </>
                              )}
                            </div>
                            <input 
                              id="pdf-upload" 
                              type="file" 
                              accept=".pdf,application/pdf" 
                              className="hidden" 
                              required={!archivoResolucion} 
                              onChange={(e) => setArchivoResolucion(e.target.files?.[0] || null)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-orange-800 font-medium bg-white p-2.5 rounded border border-orange-100 shadow-sm flex gap-2 items-start">
                    <span className="text-sm">⚠️</span>
                    <p>
                      <strong>Nota Normativa:</strong> En caso de que este estudiante sea retirado en el futuro, su cupo no podrá ser reemplazado por otro en el registro general sin una nueva resolución. El documento PDF respaldará legalmente el ingreso de este alumno en caso de auditorías de la Superintendencia de Educación.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => navigate('/matriculas')} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={
                cargando || 
                !estudiante || 
                datosFaltantes.length > 0 || 
                !checkCertNotas || 
                (idEstablecimientoPrevio !== String(formulario.id_establecimiento) && !checkCertRetiro) ||
                (formulario.es_excedente && !archivoResolucion) // Bloqueamos si es excedente y no ha subido el PDF
              } 
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {cargando ? 'Procesando...' : 'Confirmar Matrícula'}
            </button>
          </div>
        </form>
      </div>

      {/* ... (Modales de Faltantes y Éxito se mantienen sin cambios) ... */}
      
      {/* =======================================================================
          MODAL ÉXITO Y DOCUMENTOS 
          ======================================================================= */}
      {matriculaExitosa && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-[#25306B] p-6 text-center">
              <CheckCircle className="mx-auto text-emerald-400 mb-3" size={48} />
              <h3 className="text-xl font-bold text-white">¡Matrícula Registrada!</h3>
              <p className="text-blue-200 text-sm mt-1">El estudiante ha sido ingresado exitosamente al sistema.</p>
            </div>
            
            <div className="p-6 space-y-4">
              <button 
                onClick={generarComprobantePDF}
                className="w-full flex items-center justify-center gap-3 bg-blue-50 text-[#006BB9] border border-blue-200 hover:bg-blue-100 py-3 rounded-lg font-bold transition-colors"
              >
                <Download size={20} />
                Descargar Comprobante (PDF)
              </button>
              <div className="border-t border-gray-100 pt-4 mt-2">
                <button 
                  onClick={() => navigate('/matriculas')}
                  className="w-full flex items-center justify-center gap-2 bg-[#006BB9] hover:bg-[#25306B] text-white py-3 rounded-lg font-bold transition-colors shadow-md"
                >
                  Finalizar y volver al inicio
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}