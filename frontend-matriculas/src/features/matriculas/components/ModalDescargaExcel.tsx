import React, { useState, useEffect } from 'react';
import { X, Download, FileSpreadsheet, Filter, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';

interface OpcionesFiltro {
  anios: number[];
  cursos: string[];
  planes: { codigo: number; descripcion: string }[];
  cursos_por_plan: Record<string, string[]>; // key = String(codigo_plan)
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  colegioSeleccionado: string; // '' = sin filtro (SLEP global)
}

type AlcanceDescarga =
  | 'filtrado'       // Año + curso + plan a elección
  | 'por_anio'       // Solo año (todos los cursos/planes de ese año)
  | 'global';        // Sin filtros: todos los registros

export default function ModalDescargaExcel({ abierto, onCerrar, colegioSeleccionado }: Props) {
  const [opciones, setOpciones] = useState<OpcionesFiltro>({
    anios: [],
    cursos: [],
    planes: [],
    cursos_por_plan: {},
  });
  const [cargandoOpciones, setCargandoOpciones] = useState(false);

  const [alcance, setAlcance] = useState<AlcanceDescarga>('filtrado');
  const [anioSel, setAnioSel] = useState('');
  const [cursoSel, setCursoSel] = useState('');
  const [planSel, setPlanSel] = useState('');

  const [descargando, setDescargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar opciones cada vez que se abre el modal
  useEffect(() => {
    if (!abierto) return;
    setCargandoOpciones(true);
    setErrorMsg('');
    const token = localStorage.getItem('token');
    let url = `${API_BASE_URL}/matriculas/opciones-filtro`;
    if (colegioSeleccionado) url += `?establecimiento_id=${colegioSeleccionado}`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Error al cargar filtros');
        return r.json();
      })
      .then(data => {
        setOpciones(data);
        // Preseleccionar el año más reciente
        if (data.anios?.length) setAnioSel(String(data.anios[0]));
      })
      .catch(e => setErrorMsg(e.message))
      .finally(() => setCargandoOpciones(false));
  }, [abierto, colegioSeleccionado]);

  const handleDescargar = async () => {
    setDescargando(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      if (colegioSeleccionado) params.set('establecimiento_id', colegioSeleccionado);

      if (alcance === 'filtrado') {
        if (anioSel) params.set('anio', anioSel);
        if (cursoSel) params.set('curso', cursoSel);
        if (planSel) params.set('codigo_plan', planSel);
      } else if (alcance === 'por_anio') {
        if (anioSel) params.set('anio', anioSel);
      }
      // alcance === 'global': sin filtros adicionales

      const url = `${API_BASE_URL}/matriculas/exportar-excel?${params.toString()}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error('Error al generar el archivo Excel.');

      const blob = await resp.blob();
      const urlBlob = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;

      // Nombre descriptivo del archivo
      let nombre = 'Reporte_Matriculas';
      if (alcance === 'filtrado') {
        if (anioSel) nombre += `_${anioSel}`;
        if (cursoSel) nombre += `_${cursoSel.replace(/\s+/g, '_')}`;
        if (planSel) nombre += `_Plan${planSel}`;
      } else if (alcance === 'por_anio' && anioSel) {
        nombre += `_${anioSel}`;
      } else {
        nombre += '_Global';
      }
      link.download = `${nombre}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(urlBlob);
      onCerrar();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setDescargando(false);
    }
  };

  if (!abierto) return null;

  const labelAlcance: Record<AlcanceDescarga, string> = {
    filtrado: 'Descarga filtrada (año, curso y/o plan)',
    por_anio: 'Todo un año escolar',
    global: colegioSeleccionado ? 'Todos los registros del establecimiento' : 'Todos los registros de la Red SLEP',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-900 to-blue-700">
          <div className="flex items-center gap-3 text-white">
            <FileSpreadsheet size={22} />
            <h2 className="text-lg font-bold">Descargar Excel de Matrículas</h2>
          </div>
          <button
            onClick={onCerrar}
            className="text-white/70 hover:text-white transition-colors rounded-lg p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {cargandoOpciones ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-500">
              <Loader2 size={28} className="animate-spin text-blue-600" />
              <span className="text-sm">Cargando opciones disponibles...</span>
            </div>
          ) : (
            <>
              {/* Alcance */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <Filter size={12} className="inline mr-1" />
                  ¿Qué deseas descargar?
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {(['filtrado', 'por_anio', 'global'] as AlcanceDescarga[]).map(op => (
                    <label
                      key={op}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        alcance === op
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-blue-300 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="alcance"
                        value={op}
                        checked={alcance === op}
                        onChange={() => {
                          setAlcance(op);
                          setCursoSel('');
                          setPlanSel('');
                          if (op !== 'global' && opciones.anios.length) setAnioSel(String(opciones.anios[0]));
                        }}
                        className="accent-blue-600"
                      />
                      <span className="text-sm font-medium">{labelAlcance[op]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filtros según alcance */}
              {alcance !== 'global' && (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filtros</p>

                  {/* Año */}
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-1">
                      Año Escolar {alcance === 'por_anio' && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={anioSel}
                      onChange={e => setAnioSel(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                    >
                      {alcance === 'filtrado' && <option value="">— Todos los años —</option>}
                      {opciones.anios.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  {/* Plan de Estudio (solo en filtrado) — va PRIMERO para filtrar cursos */}
                  {alcance === 'filtrado' && (
                    <div>
                      <label className="block text-xs text-gray-600 font-semibold mb-1">Plan de Estudio</label>
                      <select
                        value={planSel}
                        onChange={e => {
                          setPlanSel(e.target.value);
                          setCursoSel(''); // resetear curso al cambiar el plan
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                      >
                        <option value="">— Todos los planes —</option>
                        {opciones.planes.map(p => (
                          <option key={p.codigo} value={p.codigo}>
                            [{p.codigo}] {p.descripcion}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Curso (solo en filtrado) — se filtra según plan seleccionado */}
                  {alcance === 'filtrado' && (() => {
                    // Si hay plan seleccionado → mostramos solo sus cursos; si no → todos
                    const cursosDisponibles = planSel
                      ? (opciones.cursos_por_plan[planSel] ?? [])
                      : opciones.cursos;
                    return (
                      <div>
                        <label className="block text-xs text-gray-600 font-semibold mb-1">
                          Curso
                          {planSel && cursosDisponibles.length > 0 && (
                            <span className="ml-2 font-normal text-blue-600">
                              ({cursosDisponibles.length} disponibles para este plan)
                            </span>
                          )}
                        </label>
                        <select
                          value={cursoSel}
                          onChange={e => setCursoSel(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                        >
                          <option value="">— Todos los cursos —</option>
                          {cursosDisponibles.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                </div>
              )}


              {/* Resumen de lo que se descargará */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
                <span className="font-bold">Se descargará: </span>
                {alcance === 'global'
                  ? labelAlcance['global']
                  : [
                      anioSel ? `Año ${anioSel}` : 'Todos los años',
                      alcance === 'filtrado' && cursoSel ? `Curso ${cursoSel}` : null,
                      alcance === 'filtrado' && planSel
                        ? `Plan ${opciones.planes.find(p => String(p.codigo) === planSel)?.descripcion || planSel}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
              </div>

              {/* Error */}
              {errorMsg && (
                <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  ⚠️ {errorMsg}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDescargar}
            disabled={descargando || cargandoOpciones}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
          >
            {descargando ? (
              <><Loader2 size={15} className="animate-spin" /> Generando...</>
            ) : (
              <><Download size={15} /> Descargar Excel</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
