import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api, useAuth } from '../context/AuthContext.jsx';
import {
  Upload, Film, Image, ToggleLeft, ToggleRight,
  Zap, ChevronRight, AlertCircle, Check, Loader2, X
} from 'lucide-react';
import { useLanguage, LANGUAGES } from './LanguageContext.jsx';
/* ─── Constantes ─────────────────────────────────────────────────── */
const ACCEPTED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png',
  // RAW formats (tratados como octet-stream por el navegador)
];
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.cr3', '.cr2', '.nef', '.arw', '.dng', '.orf', '.rw2', '.mp4', '.mov'];

const AGENCIES = [
  { key: 'adobe',        name: 'Adobe Stock',  color: 'red',    dot: 'bg-red-400' },
  { key: 'shutterstock', name: 'Shutterstock', color: 'orange', dot: 'bg-orange-400' },
  { key: 'getty',        name: 'Getty Images', color: 'blue',   dot: 'bg-blue-400' },
  { key: 'depositphotos',name: 'Depositphotos', color: 'emerald',dot: 'bg-emerald-400' },
  { key: 'freepik',      name: 'Freepik',      color: 'purple', dot: 'bg-purple-400' },
];

/* ─── Utilidades ─────────────────────────────────────────────────── */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileExtension(name) {
  return name.split('.').pop()?.toUpperCase() || '?';
}

function isVideo(file) {
  return file.type.startsWith('video/') ||
    ['.mp4', '.mov', '.avi'].some(ext => file.name.toLowerCase().endsWith(ext));
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

/* ─── Componentes ────────────────────────────────────────────────── */
function AppHeader({ fileCount, onSend }) {
  const navigate = useNavigate();
  const { lang, toggleLanguage, t } = useLanguage();
  const { user } = useAuth();

  return (
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
                n.path === '/dashboard'
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

        {fileCount > 0 && (
          <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            {fileCount} {fileCount === 1 ? (lang === LANGUAGES.ES ? 'archivo seleccionado' : 'file selected') : (lang === LANGUAGES.ES ? 'archivos seleccionados' : 'files selected')}
          </span>
        )}
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {user?.credits ?? 25} {t.credits || 'créditos'}
        </div>
        <button
          id="btn-send-batch"
          onClick={onSend}
          disabled={fileCount === 0}
          className="btn-primary text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Zap className="w-3.5 h-3.5" />
          {t.dashProcess || 'Procesar Lote'}
        </button>
      </div>
    </header>
  );
}

function AgencyToggles({ agencies, activeAgencies, onToggle }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
        {t.dashDestinations || 'Destinos de envío'}
      </p>
      {agencies.map(a => {
        const active = activeAgencies.includes(a.key);
        return (
          <button
            key={a.key}
            id={`toggle-${a.key}`}
            onClick={() => onToggle(a.key)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${
              active
                ? `bg-${a.color}-500/10 border-${a.color}-500/30 text-${a.color}-400`
                : 'bg-slate-900 border-slate-800 text-slate-600'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full transition-colors ${active ? a.dot : 'bg-slate-700'}`} />
              <span className="text-sm font-medium">{a.name}</span>
            </div>
            {active
              ? <ToggleRight className="w-5 h-5" />
              : <ToggleLeft className="w-5 h-5 opacity-40" />
            }
          </button>
        );
      })}
    </div>
  );
}

function DropZone({ onFilesAdded, isDragging, onDragOver, onDragLeave, onDrop }) {
  const inputRef = useRef(null);
  const { lang, t } = useLanguage();

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex-1 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 p-12 ${
        isDragging
          ? 'border-cyan-500/60 bg-cyan-500/5 scale-[1.01]'
          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.map(e => `*${e}`).join(',')}
        className="hidden"
        onChange={e => onFilesAdded(Array.from(e.target.files || []))}
      />

      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
        isDragging
          ? 'bg-cyan-500/20 border border-cyan-500/40'
          : 'bg-slate-900 border border-slate-800'
      }`}>
        <Upload className={`w-9 h-9 transition-colors ${isDragging ? 'text-cyan-400' : 'text-slate-600'}`} />
      </div>

      <div className="text-center">
        <p className="text-slate-300 font-semibold text-lg mb-1">
          {isDragging ? (t.dashDropActive || '¡Suelta tus archivos aquí!') : (lang === LANGUAGES.ES ? 'Arrastra tus fotos o vídeos' : 'Drag your photos or videos')}
        </p>
        <p className="text-slate-500 text-sm">
          {lang === LANGUAGES.ES ? 'JPG, RAW (.CR3, .NEF, .ARW), MP4, MOV · o haz clic para explorar' : 'JPG, RAW (.CR3, .NEF, .ARW), MP4, MOV · or click to browse'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {['.CR3', '.NEF', '.ARW', '.DNG', '.JPG', '.MP4', '.MOV'].map(ext => (
          <span key={ext} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 text-xs font-mono">
            {ext}
          </span>
        ))}
      </div>
    </div>
  );
}

function FileList({ files, onRemove }) {
  const { lang } = useLanguage();
  if (files.length === 0) return null;

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          {lang === LANGUAGES.ES ? `Archivos seleccionados (${files.length})` : `Selected files (${files.length})`}
        </p>
      </div>
      {files.map((file, idx) => {
        const video = isVideo(file);
        const credits = video ? 5 : 1;
        return (
          <div
            key={`${file.name}-${idx}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 group animate-fade-in"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
              {video
                ? <Film className="w-4 h-4 text-blue-400" />
                : <Image className="w-4 h-4 text-cyan-400" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 truncate font-medium">{file.name}</p>
              <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-md font-mono border ${
                video
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
              }`}>
                {credits} cr.
              </span>
              <button
                onClick={() => onRemove(idx)}
                className="w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 text-slate-600 flex items-center justify-center transition-all text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CreditsSummary({ files }) {
  const { lang, t } = useLanguage();
  const total = files.reduce((sum, f) => sum + (isVideo(f) ? 5 : 1), 0);
  const videos = files.filter(isVideo).length;
  const photos = files.length - videos;

  return (
    <div className="glass-card p-4 space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
        {lang === LANGUAGES.ES ? 'Resumen del lote' : 'Batch summary'}
      </p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-cyan-400">{photos}</p>
          <p className="text-xs text-slate-500">{lang === LANGUAGES.ES ? 'Fotos' : 'Photos'}</p>
        </div>
        <div>
          <p className="text-lg font-bold text-blue-400">{videos}</p>
          <p className="text-xs text-slate-500">{lang === LANGUAGES.ES ? 'Vídeos' : 'Videos'}</p>
        </div>
        <div>
          <p className="text-lg font-bold text-emerald-400">{total}</p>
          <p className="text-xs text-slate-500">{t.credits || 'créditos'}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Página ─────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [files, setFiles]       = useState([]);
  const [isDragging, setDrag]   = useState(false);
  const [activeAgencies, setActive] = useState(['adobe', 'shutterstock', 'getty', 'depositphotos', 'freepik']);
  
  // Estados de subida segura
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  // Estado del Onboarding de bienvenida
  const [onboardingData, setOnboardingData] = useState(() => {
    const raw = localStorage.getItem('stocksling_onboarding');
    return raw ? JSON.parse(raw) : null;
  });

  const handleDismissOnboarding = () => {
    localStorage.removeItem('stocksling_onboarding');
    setOnboardingData(null);
  };

  const addFiles = useCallback((newFiles) => {
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const unique = newFiles.filter(f => !existing.has(f.name + f.size));
      return [...prev, ...unique];
    });
  }, []);

  const removeFile = useCallback((idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const toggleAgency = useCallback((key) => {
    setActive(prev =>
      prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]
    );
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setDrag(true); };
  const handleDragLeave = ()  => setDrag(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleSend = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileIndex(i);
        setUploadProgress(0);
        
        // 1. Obtener URL firmada
        const presignedRes = await api.post('/api/vault/generate-presigned-url', {
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          isVideo: isVideo(file)
        });
        
        const { upload_url, file_storage_path } = presignedRes.data;
        
        // 2. Subida directa binaria a S3
        await axios.put(upload_url, file, {
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        });
        
        // 3. Registrar foto e iniciar pipeline
        const photoId = crypto.randomUUID();
        await api.post('/api/process/start', {
          photo_id: photoId,
          storage_path: file_storage_path,
          is_video: isVideo(file),
          send_to_adobe: activeAgencies.includes('adobe'),
          send_to_shutterstock: activeAgencies.includes('shutterstock'),
          send_to_getty: activeAgencies.includes('getty'),
          send_to_depositphotos: activeAgencies.includes('depositphotos'),
          send_to_freepik: activeAgencies.includes('freepik')
        });
      }
      
      setFiles([]);
      navigate('/workspace');
    } catch (err) {
      console.error("Upload error:", err);
      alert(lang === LANGUAGES.ES ? "Ocurrió un error al subir tus archivos de stock." : "An error occurred uploading your stock files.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#090d16' }}>
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/80 backdrop-blur-md flex items-center justify-center animate-fade-in">
          <div className="glass-card max-w-sm w-full p-6 text-center space-y-4 border-cyan-500/30">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
              <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-md" />
            </div>
            <div>
              <h3 className="text-slate-200 font-bold text-lg">
                {lang === LANGUAGES.ES ? 'Subiendo archivos seguros…' : 'Uploading secure files...'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {lang === LANGUAGES.ES 
                  ? `Procesando ${currentFileIndex + 1} de ${files.length}: ${files[currentFileIndex]?.name}` 
                  : `Processing ${currentFileIndex + 1} of ${files.length}: ${files[currentFileIndex]?.name}`}
              </p>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{uploadProgress}%</span>
                <span>{formatBytes(files[currentFileIndex]?.size || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <AppHeader fileCount={files.length} onSend={handleSend} />

      <div className="flex-1 flex gap-0 overflow-hidden">
        {/* Sidebar izquierdo: destinos */}
        <aside className="w-72 shrink-0 border-r border-slate-800 p-5 flex flex-col gap-5 overflow-y-auto">
          <AgencyToggles
            agencies={AGENCIES}
            activeAgencies={activeAgencies}
            onToggle={toggleAgency}
          />

          {activeAgencies.length === 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {lang === LANGUAGES.ES ? 'Selecciona al menos una agencia de destino.' : 'Select at least one destination agency.'}
            </div>
          )}

          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              {lang === LANGUAGES.ES ? 'Tu balance' : 'Your balance'}
            </p>
            <div className="glass-card p-3 text-center">
              <p className="text-2xl font-bold text-gradient-cyan">{user?.credits ?? 25}</p>
              <p className="text-xs text-slate-500">{lang === LANGUAGES.ES ? 'créditos disponibles' : 'available credits'}</p>
              <button className="btn-secondary w-full justify-center mt-3 text-xs py-1.5">
                {lang === LANGUAGES.ES ? '+ Comprar créditos' : '+ Buy credits'}
              </button>
            </div>
          </div>
        </aside>

        {/* Área principal: zona de arrastre y lista de archivos */}
        <main className="flex-1 flex flex-col gap-5 p-6 overflow-y-auto">
          {onboardingData && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-cyan-950/40 border border-purple-500/20 flex gap-4 items-start animate-slide-in shrink-0 relative overflow-hidden backdrop-blur-md">
              {/* Absolutes for glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shrink-0 text-white font-bold text-lg shadow-lg shadow-purple-500/20">
                🚀
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {lang === LANGUAGES.ES ? '¡Bienvenido a StockSling, Creador!' : 'Welcome to StockSling, Creator!'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {lang === LANGUAGES.ES ? (
                    <>
                      Tu espacio de trabajo ha sido personalizado para un perfil de{' '}
                      <span className="text-cyan-400 font-bold">
                        {onboardingData.creatorType === 'photographer' ? 'Fotógrafo' :
                         onboardingData.creatorType === 'videographer' ? 'Videógrafo' :
                         onboardingData.creatorType === 'designer' ? 'Ilustrador/Diseñador' : 'Agencia'}
                      </span>{' '}
                      con volumen de subida{' '}
                      <span className="text-purple-400 font-bold">
                        {onboardingData.productionVolume === 'low' ? 'Bajo' :
                         onboardingData.productionVolume === 'medium' ? 'Medio' : 'Profesional'}
                      </span>.
                    </>
                  ) : (
                    <>
                      Your workspace is tailored for a{' '}
                      <span className="text-cyan-400 font-bold">
                        {onboardingData.creatorType === 'photographer' ? 'Photographer' :
                         onboardingData.creatorType === 'videographer' ? 'Videographer' :
                         onboardingData.creatorType === 'designer' ? 'Designer/Illustrator' : 'Agency'}
                      </span>{' '}
                      with{' '}
                      <span className="text-purple-400 font-bold">
                        {onboardingData.productionVolume === 'low' ? 'Low' :
                         onboardingData.productionVolume === 'medium' ? 'Medium' : 'Pro'}
                      </span>{' '}
                      upload volume.
                    </>
                  )}
                </p>
                {onboardingData.selectedAgencies && onboardingData.selectedAgencies.length > 0 && (
                  <p className="text-[10px] text-slate-400">
                    {lang === LANGUAGES.ES ? (
                      <>
                        Recomendado: Ve a{' '}
                        <a href="/integrations" className="text-cyan-400 underline font-semibold">Integraciones</a>{' '}
                        para conectar tus canales preferidos ({onboardingData.selectedAgencies.map(a => a.toUpperCase()).join(', ')}).
                      </>
                    ) : (
                      <>
                        Recommended: Head over to{' '}
                        <a href="/integrations" className="text-cyan-400 underline font-semibold">Integrations</a>{' '}
                        to connect your preferred platforms ({onboardingData.selectedAgencies.map(a => a.toUpperCase()).join(', ')}).
                      </>
                    )}
                  </p>
                )}
              </div>
              <button 
                onClick={handleDismissOnboarding}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <DropZone
            onFilesAdded={addFiles}
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />

          {files.length > 0 && (
            <>
              <CreditsSummary files={files} />
              <FileList files={files} onRemove={removeFile} />

              <button
                id="btn-start-processing"
                onClick={handleSend}
                className="btn-primary w-full justify-center py-3.5 text-base rounded-2xl glow-emerald"
              >
                <Zap className="w-5 h-5" />
                {lang === LANGUAGES.ES ? 'Analizar con Nuestra IA y Procesar Lote' : 'Analyze with Our AI and Process Batch'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
