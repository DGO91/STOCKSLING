import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, Loader2, Tag, Send, X, Plus, Zap } from 'lucide-react';
import { useLanguage, LANGUAGES } from './LanguageContext.jsx';
import { api } from '../context/AuthContext.jsx';


/* ─── Status badge ───────────────────────────────────────────────── */
const STATUS_CONFIG = {
  pending:    { label: 'En cola',      cls: 'badge-pending',    icon: null },
  processing: { label: 'Analizando…', cls: 'badge-processing', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  ready:      { label: 'Listo',        cls: 'badge-ready',      icon: <Check className="w-3 h-3" /> },
  uploading:  { label: 'Subiendo…',   cls: 'badge-uploading',  icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  completed:  { label: 'Completado',  cls: 'badge-completed',  icon: <Check className="w-3 h-3" /> },
  failed:     { label: 'Error',        cls: 'badge-failed',     icon: null },
};

function StatusBadge({ status }) {
  const { lang } = useLanguage();
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const labels = {
    pending: lang === LANGUAGES.ES ? 'En cola' : 'Pending',
    processing: lang === LANGUAGES.ES ? 'Analizando…' : 'Analyzing...',
    ready: lang === LANGUAGES.ES ? 'Listo' : 'Ready',
    uploading: lang === LANGUAGES.ES ? 'Subiendo…' : 'Uploading...',
    completed: lang === LANGUAGES.ES ? 'Completado' : 'Completed',
    failed: lang === LANGUAGES.ES ? 'Error' : 'Failed',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.cls}`}>
      {cfg.icon}
      {labels[status] || labels.pending}
    </span>
  );
}

/* ─── Photo card (izquierda) ─────────────────────────────────────── */
function PhotoCard({ photo, selected, onClick, onDelete }) {
  const { lang } = useLanguage();
  const isProcessing = photo.status === 'processing';

  return (
    <div
      id={`photo-card-${photo.id}`}
      onClick={onClick}
      className={`relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group
        border-2 transition-all duration-200
        ${selected
          ? 'border-cyan-500 shadow-lg shadow-cyan-950/50'
          : 'border-slate-800 hover:border-slate-700'
        }
        bg-slate-900`}
    >
      {/* Botón flotante de eliminación (X) */}
      <button
        type="button"
        title={lang === LANGUAGES.ES ? "Eliminar archivo permanentemente" : "Permanently delete file"}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(photo.id);
        }}
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full 
          bg-rose-950/80 hover:bg-rose-600/90 border border-rose-500/30 
          text-rose-200 hover:text-white flex items-center justify-center 
          backdrop-blur shadow-md transition-all duration-200 
          opacity-0 group-hover:opacity-100"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Visualizador de imagen / video */}
      {photo.isVideo ? (
        <video
          src={photo.url}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
          onMouseOver={e => e.target.play()}
          onMouseLeave={e => e.target.pause()}
        />
      ) : (
        <img
          src={photo.url}
          alt={photo.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      )}

      {/* Placeholder alternativo si la imagen falla o está cargando */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center -z-10">
        <span className="text-slate-700 font-mono text-xs">.{photo.format}</span>
      </div>

      {/* Overlay de processing */}
      {isProcessing && (
        <div className="ai-loading-overlay">
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
          <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
            {lang === LANGUAGES.ES ? 'Nuestra IA analizando…' : 'Our AI is analyzing...'}
          </span>
        </div>
      )}

      {/* Model release alert */}
      {photo.requires_model_release && (
        <div className="absolute top-2 left-2">
          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
            <AlertTriangle className="w-3 h-3 text-white" />
          </div>
        </div>
      )}

      {/* Format + status badge */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="bg-slate-900/80 backdrop-blur text-slate-400 text-[10px] font-mono px-1.5 py-0.5 rounded">
          .{photo.format}
        </span>
        <StatusBadge status={photo.status} />
      </div>
    </div>
  );
}

/* ─── Keyword bubble ─────────────────────────────────────────────── */
function KeywordBubble({ word, onRemove }) {
  return (
    <span className="keyword-tag group">
      {word}
      <button
        onClick={() => onRemove(word)}
        className="text-slate-600 hover:text-red-400 transition-colors ml-0.5"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

/* ─── Editor panel (derecha) ─────────────────────────────────────── */
function MetadataEditor({ photo, onUpdate, modelReleases = [] }) {
  const [newKeyword, setNewKeyword] = useState('');
  const { lang, t } = useLanguage();

  if (!photo) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
        <div className="text-center">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          {lang === LANGUAGES.ES ? 'Selecciona una foto para editar sus metadatos' : 'Select a photo to edit its metadata'}
        </div>
      </div>
    );
  }

  const isProcessing = photo.status === 'processing' || photo.status === 'pending';
  const isFailed = photo.status === 'failed';

  const removeKeyword = (word) => {
    onUpdate({ ...photo, keywords: photo.keywords.filter(k => k !== word) });
  };

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (kw && !photo.keywords.includes(kw)) {
      onUpdate({ ...photo, keywords: [...photo.keywords, kw] });
    }
    setNewKeyword('');
  };

  return (
    <div className="flex-1 flex flex-col gap-5 overflow-y-auto p-5 animate-slide-in">
      {/* Preview header */}
      <div className="flex gap-4 items-start shrink-0">
        <div className="w-20 aspect-[4/3] rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden relative">
          {photo.isVideo ? (
            <video src={photo.url} className="w-full h-full object-cover" muted controls={false} />
          ) : (
            <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
          )}
          {/* Fallback de carga en segundo plano */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center -z-10">
            <span className="text-slate-700 text-[10px] font-mono">.{photo.format}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate mb-1">{photo.name}</p>
          <StatusBadge status={photo.status} />
          {photo.isVideo && (
            <span className="ml-2 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-medium">
              5 {t.credits || 'créditos'}
            </span>
          )}
        </div>
      </div>

      {isProcessing ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-amber-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">{lang === LANGUAGES.ES ? 'Nuestra IA está analizando la imagen…' : 'Our AI is analyzing the image...'}</p>
          <p className="text-xs text-slate-500">{lang === LANGUAGES.ES ? 'En unos segundos verás los metadatos' : 'In a few seconds you will see the metadata'}</p>
        </div>
      ) : (
        <>
          {/* Failed Status Alert */}
          {isFailed && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-3 items-start animate-fade-in">
              <AlertTriangle className="w-5.5 h-5.5 text-rose-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">
                  {lang === LANGUAGES.ES ? 'Error de Indexación' : 'Indexing Error'}
                </h3>
                <p className="text-xs text-slate-400 mb-2">
                  {lang === LANGUAGES.ES 
                    ? 'Hubo un inconveniente procesando este archivo con la Inteligencia Artificial.' 
                    : 'There was an issue processing this file with Artificial Intelligence.'}
                </p>
                {photo.incident_code && (
                  <div className="bg-slate-950 px-2 py-1.5 rounded border border-slate-800 font-mono text-[10px] text-rose-400">
                    <span className="text-slate-500">CODE:</span> {photo.incident_code}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Model Release Alert */}
          {photo.requires_model_release && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                  {t.workAlertModel || 'Se requiere Autorización de Modelo'}
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  {t.workAlertModelSub || 'Nuestra IA detectó un rostro reconocible. Asocia el contrato legal antes de enviar.'}
                </p>
                <select
                  id={`model-release-${photo.id}`}
                  className="input-field text-xs py-1.5"
                  value={photo.model_release_id || ""}
                  onChange={e => onUpdate({ ...photo, model_release_id: e.target.value })}
                >
                  <option value="">{t.workSelectContract || 'Seleccionar contrato de mi biblioteca'}</option>
                  {modelReleases.map(mr => (
                    <option key={mr.id} value={mr.id}>{mr.model_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Título */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {(t.workTitle || 'Título')} (SEO)
            </label>
            <input
              type="text"
              id={`title-${photo.id}`}
              value={photo.title || ''}
              onChange={e => onUpdate({ ...photo, title: e.target.value })}
              className="input-field"
              placeholder={lang === LANGUAGES.ES ? 'Generando título con nuestra IA…' : 'Generating title with our AI...'}
            />
            <p className="text-xs text-slate-600">{(photo.title || '').length}/255 {lang === LANGUAGES.ES ? 'caracteres' : 'characters'}</p>
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t.workDescription || 'Descripción Comercial'}
            </label>
            <textarea
              id={`desc-${photo.id}`}
              rows={3}
              value={photo.description || ''}
              onChange={e => onUpdate({ ...photo, description: e.target.value })}
              className="textarea-field"
              placeholder={lang === LANGUAGES.ES ? 'Descripción SEO generada por nuestra IA…' : 'SEO Description generated by our AI...'}
            />
          </div>

          {/* Keywords */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t.workKeywords || 'Palabras Clave'} ({photo.keywords.length} {lang === LANGUAGES.ES ? 'generadas' : 'generated'})
              </label>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                photo.keywords.length >= 40 && photo.keywords.length <= 50
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              }`}>
                {photo.keywords.length >= 40 && photo.keywords.length <= 50 ? (lang === LANGUAGES.ES ? '✓ Óptimo' : '✓ Optimal') : (lang === LANGUAGES.ES ? `Objetivo: 40–50` : 'Goal: 40–50')}
              </span>
            </div>

            {/* Burbujas */}
            <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {photo.keywords.map(kw => (
                <KeywordBubble key={kw} word={kw} onRemove={removeKeyword} />
              ))}
            </div>

            {/* Añadir keyword */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addKeyword()}
                className="input-field text-xs py-1.5 flex-1"
                placeholder={lang === LANGUAGES.ES ? 'Añadir palabra clave…' : 'Add keyword...'}
              />
              <button
                onClick={addKeyword}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Destinos activos */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {lang === LANGUAGES.ES ? 'Destinos activos' : 'Active destinations'}
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'send_to_adobe', name: 'Adobe Stock', color: 'red' },
                { key: 'send_to_shutterstock', name: 'Shutterstock', color: 'orange' },
                { key: 'send_to_getty', name: 'Getty Images', color: 'blue' },
                { key: 'send_to_depositphotos', name: 'Depositphotos', color: 'emerald' },
                { key: 'send_to_freepik', name: 'Freepik', color: 'purple' },
              ].filter(a => photo[a.key]).map(a => (
                <span key={a.name} className={`text-xs px-2.5 py-1 rounded-lg bg-${a.color}-500/10 border border-${a.color}-500/30 text-${a.color}-400 flex items-center gap-1.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-${a.color}-400`} />
                  {a.name}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Logotipo SVG / Isotipo Identidad ─── */
function BrandLogo() {
  return (
    <div className="flex items-center gap-2 group cursor-pointer">
      <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
        <div className="absolute inset-0 bg-purple-500/10 rounded blur-sm transition-all duration-300 group-hover:bg-purple-500/20" />
        <img
          src="/favicon.svg"
          alt="StockSling Logo"
          className="relative w-5.5 h-5.5 group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <span className="text-sm font-bold tracking-tight text-gradient-brand transition-colors duration-200">
        StockSling
      </span>
    </div>
  );
}

/* ─── Página ─────────────────────────────────────────────────────── */
export default function WorkspacePage() {
  const navigate = useNavigate();
  const { lang, toggleLanguage, t } = useLanguage();
  const [photos, setPhotos] = useState([]);
  const [modelReleases, setModelReleases] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchWorkspaceData = async () => {
    try {
      setLoading(true);
      const [photosRes, releasesRes] = await Promise.all([
        api.get('/api/photos'),
        api.get('/api/releases')
      ]);

      const mappedPhotos = photosRes.data.map(p => ({
        id: p.id,
        name: p.original_filename || p.original_storage_url.split('/').pop(),
        url: p.original_storage_url,
        format: p.file_format || 'JPG',
        status: p.status,
        title: p.title || '',
        description: p.description || '',
        keywords: p.keywords || [],
        requires_model_release: p.requires_model_release,
        model_release_id: p.model_release_id || '',
        isVideo: p.is_video,
        incident_code: p.incident_code || '',
        // Los destinos se pintan desde estos campos (ver "Destinos activos").
        // Si no se copian aquí, la sección se queda vacía siempre.
        send_to_adobe: p.send_to_adobe,
        send_to_shutterstock: p.send_to_shutterstock,
        send_to_getty: p.send_to_getty,
        send_to_depositphotos: p.send_to_depositphotos,
        send_to_freepik: p.send_to_freepik
      }));

      setPhotos(mappedPhotos);
      setModelReleases(releasesRes.data);
      if (mappedPhotos.length > 0) {
        setSelected(mappedPhotos[0]);
      }
    } catch (err) {
      console.error("Error loading workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const updatePhoto = useCallback((updated) => {
    setPhotos(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelected(updated);
  }, []);

  const handleDeletePhoto = async (photoId) => {
    const confirmMsg = lang === LANGUAGES.ES
      ? "¿Estás seguro de que deseas eliminar permanentemente este archivo del workspace y del almacenamiento físico?"
      : "Are you sure you want to permanently delete this file from the workspace and physical storage?";
      
    if (!window.confirm(confirmMsg)) return;

    try {
      setSaving(true);
      await api.delete(`/api/photos/${photoId}`);
      
      setPhotos(prev => {
        const remaining = prev.filter(p => p.id !== photoId);
        
        // Si el archivo borrado es el actualmente seleccionado, seleccionamos otro
        if (selected?.id === photoId) {
          if (remaining.length > 0) {
            setSelected(remaining[0]);
          } else {
            setSelected(null);
          }
        }
        
        return remaining;
      });

    } catch (err) {
      console.error("Error deleting photo:", err);
      alert(lang === LANGUAGES.ES ? "Error al eliminar el archivo." : "Error deleting the file.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhoto = async () => {

    if (!selected) return;
    try {
      setSaving(true);
      await api.put(`/api/photos/${selected.id}`, {
        title: selected.title,
        description: selected.description,
        keywords: selected.keywords,
        model_release_id: selected.model_release_id || null
      });
      
      const updated = { ...selected, status: 'ready' };
      updatePhoto(updated);
      
      alert(lang === LANGUAGES.ES ? "¡Metadatos y cambios guardados con éxito en la base de datos!" : "Metadata and changes successfully saved to database!");
    } catch (err) {
      console.error("Error saving photo:", err);
      alert(lang === LANGUAGES.ES ? "Error al guardar metadatos." : "Error saving metadata.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendAll = async () => {
    const readyPhotos = photos.filter(p => p.status === 'ready');
    if (readyPhotos.length === 0) {
      alert(lang === LANGUAGES.ES ? "No hay fotos revisadas y listas para enviar." : "No photos reviewed and ready to send.");
      return;
    }

    try {
      setSaving(true);
      await Promise.all(
        readyPhotos.map(p => api.post(`/api/photos/${p.id}/approve`))
      );
      navigate('/history');
    } catch (err) {
      console.error("Error sending photos:", err);
      alert(lang === LANGUAGES.ES ? "Error al iniciar el envío FTP." : "Error initiating FTP upload.");
    } finally {
      setSaving(false);
    }
  };

  const readyCount = photos.filter(p => p.status === 'ready').length;

  if (loading) {
    return (
      <div className="h-screen bg-[#090d16] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin animate-pulse" />
        <p className="text-slate-500 text-sm font-semibold">{lang === LANGUAGES.ES ? 'Abriendo búnker de mesa de trabajo...' : 'Opening workspace secure bunker...'}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#090d16' }}>
      {saving && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/75 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="glass-card max-w-sm w-full p-6 text-center space-y-3 border-cyan-500/20">
            <Loader2 className="w-8 h-8 mx-auto text-cyan-400 animate-spin" />
            <h4 className="text-slate-200 font-bold text-sm">
              {lang === LANGUAGES.ES ? 'Guardando metadatos en la nube…' : 'Saving metadata to cloud...'}
            </h4>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')}>
            <BrandLogo />
          </button>
          <span className="text-slate-700">|</span>
          <nav className="flex gap-1">
            {[
              { label: t.tabUpload || 'Subida', path: '/dashboard' },
              { label: t.tabReview || 'Revisión', path: '/workspace' },
              { label: t.tabHistory || 'Historial', path: '/history' },
              { label: t.tabIntegrations || 'Integraciones', path: '/integrations' },
            ].map(n => (
              <button
                key={n.path}
                onClick={() => navigate(n.path)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  n.path === '/workspace'
                    ? 'text-cyan-400 bg-slate-800'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {n.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* Selector de idioma premium de doble pestaña */}
          <div className="flex items-center bg-slate-950/60 border border-slate-800/80 p-0.5 rounded-full text-[10px] font-bold select-none shrink-0">
            <button
              onClick={() => lang !== LANGUAGES.ES && toggleLanguage()}
              className={`px-2.5 py-0.5 rounded-full transition-all duration-300 ${
                lang === LANGUAGES.ES
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ES
            </button>
            <button
              onClick={() => lang !== LANGUAGES.EN && toggleLanguage()}
              className={`px-2.5 py-0.5 rounded-full transition-all duration-300 ${
                lang === LANGUAGES.EN
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
          </div>

          <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            {readyCount}/{photos.length} {lang === LANGUAGES.ES ? 'listos' : 'ready'}
          </span>
          <button
            id="btn-send-all"
            onClick={handleSendAll}
            disabled={readyCount === 0}
            className="btn-primary text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            {t.workSendAll || 'Enviar Lote Completo'}
          </button>
        </div>
      </header>

      {/* Split layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Izquierda: galería */}
        <section className="w-5/12 border-r border-slate-800 p-5 overflow-y-auto bg-slate-950">
          <div className="grid grid-cols-2 gap-3">
            {photos.map(photo => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                selected={selected?.id === photo.id}
                onClick={() => setSelected(photo)}
                onDelete={handleDeletePhoto}
              />
            ))}
          </div>
        </section>

        {/* Derecha: editor */}
        <section className="w-7/12 bg-slate-900/40 flex flex-col overflow-hidden">
          <MetadataEditor photo={selected} onUpdate={updatePhoto} modelReleases={modelReleases} />

          {/* Acción de confirmación de foto individual */}
          {selected && selected.status !== 'processing' && selected.status !== 'pending' && (
            <div className="p-4 border-t border-slate-800 shrink-0">
              <button 
                onClick={handleSavePhoto}
                className="btn-primary w-full justify-center text-sm py-2.5 glow-cyan"
              >
                <Check className="w-4 h-4" />
                {lang === LANGUAGES.ES ? 'Guardar Cambios y Marcar como Listo' : 'Save Changes and Mark as Ready'}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

