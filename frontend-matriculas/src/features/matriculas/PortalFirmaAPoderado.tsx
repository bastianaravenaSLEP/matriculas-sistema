import React from 'react';
import { ChevronRight, ChevronLeft, ShieldCheck, FileText, CheckCircle } from 'lucide-react';
import { usePortalFirmaApoderado } from './hooks/usePortalFirmaApoderado';

export default function PortalFirmaApoderado() {
  const {
    pasoActual,
    firmado,
    respuestas,
    setRespuestas,
    irSiguiente,
    irAtras,
    firmarClaveUnica,
    datosAlumno // 🌟 Recibimos los datos de la memoria
  } = usePortalFirmaApoderado();

  // Si aún no lee la memoria, mostramos un cargador
  if (!datosAlumno) {
    return <div className="p-10 text-center font-bold text-gray-500">Cargando información del estudiante...</div>;
  }
  
  const datos = datosAlumno;

  // Definición de los 5 documentos con su VISUALIZADOR HTML INCRUSTADO
  const documentos = [
    {
      id: 1,
      titulo: "1. Asignatura de Religión",
      descripcion: "Decreto Supremo N°924/1983. Seleccione la opción para el estudiante.",
      contenidoVisor: (
        <div className="font-serif text-gray-800 space-y-6 text-sm">
          <h3 className="font-bold text-center text-lg uppercase underline mb-8">Encuesta Oficial Sobre Clases de Religión</h3>
          <p>Estimados Sres. Padres y Apoderados:</p>
          <p>Indique el nombre completo y curso de su hijo(a), que matriculará en este establecimiento.</p>
          <div className="space-y-2">
            <p>NOMBRE: <span className="font-bold text-base uppercase">{datos.estudiante}</span></p>
            <p>CURSO: <span className="font-bold text-base uppercase">{datos.curso}</span></p>
          </div>
          <p>1.- Este establecimiento impartirá 02 hrs. semanales de clases de Religión, dentro del horario lectivo.</p>
          <p>2.- Marque con una X su preferencia para las clases de religión:</p>
          
          <table className="w-full border-collapse border border-black text-center mt-4">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-2">PROPUESTA</th>
                <th className="border border-black p-2">PREFERENCIA</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-black p-2 text-left">Opto por clases de Religión Católica</td><td className="border border-black p-2 font-bold text-lg">{respuestas.religion === 'Católica' ? 'X' : ''}</td></tr>
              <tr><td className="border border-black p-2 text-left">Opto por clases de Religión Evangélica</td><td className="border border-black p-2 font-bold text-lg">{respuestas.religion === 'Evangélica' ? 'X' : ''}</td></tr>
              <tr><td className="border border-black p-2 text-left">Opto por otra religión con programas aprobados.</td><td className="border border-black p-2 font-bold text-lg">{respuestas.religion === 'Otra religión' ? 'X' : ''}</td></tr>
              <tr><td className="border border-black p-2 text-left">No opto</td><td className="border border-black p-2 font-bold text-lg">{respuestas.religion === 'Ninguna' ? 'X' : ''}</td></tr>
            </tbody>
          </table>

          <p className="pt-6">Nombre del Apoderado o Tutor: <span className="font-bold uppercase">{datos.apoderado}</span></p>
          <p className="text-xs text-justify mt-8">Esta encuesta se realiza en conformidad con lo dispuesto en el Decreto Supremo N° 924/1983 de Educación, que estipula que en todos los establecimientos educacionales del país, deberá ofrecerse clases de Religión con carácter de optativa para los alumnos y sus familias.</p>
        </div>
      ),
      pregunta: (
        <div className="w-full text-left">
          <label className="block text-sm font-bold text-gray-800 mb-2">Seleccione su preferencia *</label>
          <select 
            value={respuestas.religion}
            onChange={(e) => setRespuestas({...respuestas, religion: e.target.value})}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
          >
            <option value="">(Seleccione para continuar)</option>
            <option value="Católica">Religión Católica</option>
            <option value="Evangélica">Religión Evangélica</option>
            <option value="Otra religión">Otra religión (Con Programa Aprobado)</option>
            <option value="Ninguna">No opto por clases de religión</option>
          </select>
        </div>
      ),
      puedeAvanzar: respuestas.religion !== ''
    },
    {
      id: 2,
      titulo: "2. Acta de Información y Compromiso",
      descripcion: "Normativas y reglamentos internos del establecimiento educacional.",
      contenidoVisor: (
        <div className="font-serif text-gray-800 space-y-4 text-sm leading-relaxed text-justify">
          <h3 className="font-bold text-center text-lg uppercase mb-6">Acta de Información y Compromiso del Apoderado</h3>
          <p>Al firmar esta Acta declaro comprometerme, frente a toda la comunidad de este Liceo, a valorar y respetar lo siguiente:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Conozco y acepto el Proyecto Educativo Institucional de este Liceo y apoyaré a mi pupilo(a) para alcanzar los objetivos que el PEI señala.</li>
            <li>Conozco y acepto el Reglamento Interno de Convivencia, el Manual de Protocolos y el Reglamento de Evaluación del establecimiento.</li>
            <li>Reconozco que mi apoyo, en cuanto a los aprendizajes y comportamientos en convivencia de mi pupilo(a), es de la más alta relevancia por lo que me comprometo a cumplir en estos ámbitos.</li>
            <li>Asistiré a todas las reuniones de apoderados y, citaciones convocadas por algún miembro de la Comunidad Educativa.</li>
            <li>Enviaré a mi pupilo(a) todos los días a clases, evitando retrasos, evitando retirarlo durante la jornada escolar o antes del término de ésta, cuidando que asista con el <strong>uniforme establecido y con sus útiles escolares y accesorios que representen un riesgo</strong>.</li>
            <li>Me comprometo a enviar a mi pupilo(a) a los reforzamientos que sean necesarios para su aprendizaje, entendiendo que éstos son obligatorios.</li>
            <li>Participaré e incentivaré a mi pupilo(a) a interesarse en las actividades liceanas extra-curriculares.</li>
            <li>Apoyaré al establecimiento en la consecución de los objetivos declarados en nuestro PEI.</li>
            <li>Acepto y respeto las remediales de acuerdo con el Manual de Convivencia.</li>
            <li>Asistiré a firmar cada vez que mi pupilo/a <strong>NO ASISTA A CLASES</strong>, entendiendo que esto perjudica su avance.</li>
            <li>Justificaré por escrito los atrasos de mi pupilo/a, y aceptaré las remediales para mejorar su puntualidad.</li>
            <li>Presentaré Certificación Médica y/o diagnóstico médico en caso de inasistencia.</li>
            <li>Estoy de acuerdo en que mi pupilo/a participe en actividades pedagógicas y convivenciales.</li>
            <li>Tomo conocimiento que desde mi rol de apoderado/a soy garante de derecho del estudiante.</li>
            <li>Tomo conocimiento y acepto que soy el o la responsable por daños cometidos por el estudiante en contra del mobiliario o infraestructura.</li>
          </ol>
          <div className="mt-8">
            <p>NOMBRE ALUMNO(A): <span className="font-bold">{datos.estudiante}</span></p>
            <p>NOMBRE APODERADO: <span className="font-bold">{datos.apoderado}</span></p>
            <p>R.U.T: <span className="font-bold">{datos.rutApoderado}</span></p>
          </div>
        </div>
      ),
      pregunta: (
        <label className="flex items-center gap-3 cursor-pointer bg-white p-3 rounded-lg border border-gray-200 hover:bg-blue-50 transition-colors w-full text-left">
          <input 
            type="checkbox" 
            checked={respuestas.compromiso}
            onChange={(e) => setRespuestas({...respuestas, compromiso: e.target.checked})}
            className="w-5 h-5 text-blue-600 rounded"
          />
          <span className="text-sm font-bold text-gray-800">He leído y acepto el Acta de Información y Compromiso Institucional.</span>
        </label>
      ),
      puedeAvanzar: respuestas.compromiso === true
    },
    {
      id: 3,
      titulo: "3. Autorización de Entrevistas (2026)",
      descripcion: "Entrevistas pedagógicas y formativas al estudiante.",
      contenidoVisor: (
        <div className="font-serif text-gray-800 space-y-6 text-sm leading-relaxed">
          <div className="text-center mb-10">
            <h3 className="font-bold text-lg uppercase">Autorización Entrevista Estudiante {datos.anio}</h3>
            <h4 className="font-bold text-md uppercase">{datos.colegio}</h4>
          </div>
          <p>
            Yo, <strong>{datos.apoderado}</strong>, R.U.T. <strong>{datos.rutApoderado}</strong>, en mi calidad de <strong>{datos.relacion}</strong> de:
          </p>
          <p className="uppercase">
            <strong>{datos.estudiante}</strong>, RUT.: <strong>{datos.rutEstudiante}</strong>
          </p>
          <p>CURSO: <strong>{datos.curso}</strong></p>
          
          <p className="mt-6 text-justify">
            Autorizo a realizar entrevistas a mi pupilo, en caso de ser requeridas, en procesos educativos, investigativos, conductuales y formativos. 
            Pudiendo ser realizada por el Equipo de Convivencia o el Estamento que considere necesario la Directora de nuestra comunidad Educativa.
          </p>

          <div className="flex items-center gap-8 mt-10">
            <span className="font-bold">AUTORIZACIÓN:</span>
            <div className="flex gap-4">
              <div className="border border-black px-6 py-2 rounded font-bold">{respuestas.entrevista ? 'X' : ''} SÍ</div>
              <div className="border border-black px-6 py-2 rounded font-bold">{!respuestas.entrevista && respuestas.entrevista !== false ? 'X' : ''} NO</div>
            </div>
          </div>
        </div>
      ),
      pregunta: (
        <label className="flex items-center gap-3 cursor-pointer bg-white p-3 rounded-lg border border-gray-200 hover:bg-blue-50 transition-colors w-full text-left">
          <input 
            type="checkbox" 
            checked={respuestas.entrevista}
            onChange={(e) => setRespuestas({...respuestas, entrevista: e.target.checked})}
            className="w-5 h-5 text-blue-600 rounded"
          />
          <span className="text-sm font-bold text-gray-800">Autorizo la realización de entrevistas a mi pupilo.</span>
        </label>
      ),
      puedeAvanzar: respuestas.entrevista === true
    },
    {
      id: 4,
      titulo: "4. Uso de Imágenes y Testimonios",
      descripcion: "Permiso para material audiovisual del estudiante.",
      contenidoVisor: (
        <div className="font-serif text-gray-800 space-y-4 text-xs leading-relaxed text-justify">
           <div className="text-center mb-6">
            <h3 className="font-bold text-base uppercase">Autorización para el uso de Imágenes y/o Testimonio de Menores</h3>
            <h4 className="font-bold text-sm uppercase">{datos.colegio} - {datos.anio}</h4>
          </div>
          <p>Yo, <strong>{datos.apoderado}</strong>, R.U.T. <strong>{datos.rutApoderado}</strong>, para estos efectos domiciliado(a) en <strong>{datos.domicilio}</strong> en mi calidad de <strong>{datos.relacion}</strong> de:</p>
          <p><strong>{datos.estudiante}</strong>, RUT.: <strong>{datos.rutEstudiante}</strong></p>
          <p>autorizo voluntariamente el uso de su imagen y/o testimonio.</p>
          <p>En razón de lo anterior accedo a que mi representado sea entrevistado, fotografiado y/o grabado en video, comprometiéndome a que toda la información escrita, fotografías, videos o cualquier otro material que se obtenga de él, en el proceso de realización de videos, documentos, afiches, gigantografías, cuadros, pendones, página web y otros elementos en el marco de la difusión de las políticas, beneficios y programas del Ministerio de Educación, serán de exclusiva propiedad del Gobierno de Chile, y no me serán devueltos, pudiendo éste utilizarlos libremente.</p>
          <p>Autorizo expresa e irrevocablemente al Liceo Bicentenario de Valparaíso para grabar la voz de mi representado, mediante cualquier sistema apto para ello y capturar y registrar su imagen mediante cualquier sistema fotográfico o audiovisual.</p>
          <p>Asimismo, autorizo expresa e irrevocablemente al Ministerio de Educación para grabar, filmar, registrar imágenes de su persona, para ser usadas en el proceso de creación y producción audiovisual u otros programas de difusión...</p>
          <p>En virtud de lo anterior, asumo plena responsabilidad por los dichos de mi representado, declaraciones y actuaciones que él (ella) realice en el marco de las grabaciones a que se refiere esta autorización y eximo de toda responsabilidad al Ministerio de Educación, haciéndome personalmente responsable ante ella y terceros por sus expresiones y actuaciones.</p>
          <p>Firmo en señal de consentimiento y conformidad,</p>
        </div>
      ),
      pregunta: (
        <label className="flex items-center gap-3 cursor-pointer bg-white p-3 rounded-lg border border-gray-200 hover:bg-blue-50 transition-colors w-full text-left">
          <input 
            type="checkbox" 
            checked={respuestas.imagen}
            onChange={(e) => setRespuestas({...respuestas, imagen: e.target.checked})}
            className="w-5 h-5 text-blue-600 rounded"
          />
          <span className="text-sm font-bold text-gray-800">Autorizo el uso de imágenes y/o testimonios de mi pupilo.</span>
        </label>
      ),
      puedeAvanzar: respuestas.imagen === true
    },
    {
      id: 5,
      titulo: "5. Comprobante Final de Matrícula",
      descripcion: "Resumen de su matrícula. Al firmar con Clave Única, se generarán las copias oficiales.",
      contenidoVisor: (
        <div className="font-sans text-gray-800 space-y-6">
          <div className="flex items-center justify-between border-b-2 border-[#006BB9] pb-4">
             <div>
               <h2 className="text-2xl font-black text-[#25306B]">COMPROBANTE DE MATRÍCULA</h2>
               <p className="text-sm text-gray-500">Año Escolar {datos.anio}</p>
             </div>
             <div className="text-right">
               <p className="font-bold text-lg">{datos.colegio}</p>
               <p className="text-sm text-gray-600">Fecha: {datos.fecha}</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-bold text-[#006BB9] mb-2 border-b pb-1">Datos del Estudiante</h4>
              <p className="text-sm"><span className="text-gray-500">Nombre:</span> {datos.estudiante}</p>
              <p className="text-sm"><span className="text-gray-500">RUT:</span> {datos.rutEstudiante}</p>
              <p className="text-sm"><span className="text-gray-500">Curso:</span> {datos.curso}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-bold text-[#006BB9] mb-2 border-b pb-1">Datos del Apoderado</h4>
              <p className="text-sm"><span className="text-gray-500">Nombre:</span> {datos.apoderado}</p>
              <p className="text-sm"><span className="text-gray-500">RUT:</span> {datos.rutApoderado}</p>
              <p className="text-sm"><span className="text-gray-500">Relación:</span> {datos.relacion}</p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-6">
             <h4 className="font-bold text-[#25306B] mb-3">Resumen de Autorizaciones Aceptadas</h4>
             <ul className="space-y-2 text-sm">
               <li className="flex justify-between border-b border-blue-100 pb-1">
                 <span>Opciones de Religión:</span> 
                 <span className="font-bold">{respuestas.religion || 'No especificada'}</span>
               </li>
               <li className="flex justify-between border-b border-blue-100 pb-1">
                 <span>Acta de Compromiso:</span> 
                 <span className="font-bold text-emerald-600">Aceptada</span>
               </li>
               <li className="flex justify-between border-b border-blue-100 pb-1">
                 <span>Entrevistas Estudiante:</span> 
                 <span className="font-bold text-emerald-600">Autorizada</span>
               </li>
               <li className="flex justify-between">
                 <span>Uso de Imágenes:</span> 
                 <span className="font-bold text-emerald-600">Autorizada</span>
               </li>
             </ul>
          </div>
          
          <div className="text-center pt-8 opacity-50">
             <div className="w-48 border-b border-gray-800 mx-auto mb-2"></div>
             <p className="text-xs uppercase">Firma Digital Pendiente (Clave Única)</p>
          </div>
        </div>
      ),
      pregunta: (
        <div className="w-full text-center">
          <p className="text-xs text-gray-500 mb-3">Las copias finales firmadas serán enviadas automáticamente a su correo electrónico.</p>
          <button 
            onClick={firmarClaveUnica}
            className="w-full bg-[#006BB9] hover:bg-[#25306B] text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 transition-colors"
          >
            <ShieldCheck size={24} /> Firmar y Autorizar con Clave Única
          </button>
        </div>
      ),
      puedeAvanzar: false 
    }
  ];

  const docActivo = documentos[pasoActual - 1];

  // Pantalla de Éxito al finalizar
  if (firmado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
          <CheckCircle size={64} className="mx-auto text-emerald-500 mb-4" />
          <h2 className="text-2xl font-black text-gray-800 mb-2">¡Firma Exitosa!</h2>
          <p className="text-gray-600 text-sm">
            La matrícula ha sido formalizada. En los próximos minutos recibirá un correo con el Sobre Digital y todos los documentos firmados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* CABECERA INSTITUCIONAL */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <FileText className="text-[#006BB9]" size={28} />
          <div>
            <h1 className="font-black text-[#25306B] text-lg leading-tight">Portal de Firma de Matrícula</h1>
            <p className="text-xs text-gray-500 font-medium">Servicio Local de Educación Pública</p>
          </div>
        </div>
        <div className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
          Paso {pasoActual} de 5
        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 flex flex-col gap-4 h-[calc(100vh-80px)]">
        
        {/* Título y Descripción del Documento */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 shrink-0">
          <h2 className="text-xl font-bold text-gray-800">{docActivo.titulo}</h2>
          <p className="text-sm text-gray-600 mt-1">{docActivo.descripcion}</p>
        </div>

        {/* Visor de Documento HTML (Reemplaza al Iframe) */}
        <div className="flex-1 bg-gray-200 rounded-xl overflow-hidden shadow-inner border border-gray-300 p-4 sm:p-8 flex items-start justify-center overflow-y-auto">
          
          {/* HOJA DE PAPEL BLANCA */}
          <div className="bg-white w-full max-w-3xl min-h-full p-8 sm:p-12 shadow-md rounded border border-gray-300">
             {docActivo.contenidoVisor}
          </div>

        </div>

        {/* Barra Inferior (Controles y Pregunta) */}
        <div className="bg-gray-50 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <button 
              onClick={irAtras} 
              disabled={pasoActual === 1}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl font-bold transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft size={18} /> Anterior
            </button>

            <div className="flex-1 w-full max-w-md">
              {docActivo.pregunta}
            </div>

            {pasoActual < 5 && (
              <button 
                onClick={irSiguiente}
                disabled={!docActivo.puedeAvanzar}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                Siguiente Documento <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}