import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, RotateCcw, Wifi, Activity } from 'lucide-react';
import { useLanguage, LANGUAGES } from './LanguageContext.jsx';
import { useAuth, api } from '../context/AuthContext.jsx';

const STATUS_CFG = {
  pending:   { icon: <Loader2 className="w-4 h-4 text-slate-500" />,            label: 'En cola',       bar: 'bg-slate-700' },
  uploading: { icon: <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />,label: 'Subiendo…',    bar: 'bg-cyan-500' },
  completed: { icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,     label: 'Completado',    bar: 'bg-emerald-500' },
  failed:    { icon: <XCircle className="w-4 h-4 text-red-400" />,              label: 'Error',         bar: 'bg-red-500' },
};

/* ─── Componentes ────────────────────────────────────────────────── */
function WsIndicator({ connected }) {
  const { lang, t } = useLanguage();
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
      connected
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        : 'bg-slate-800 border-slate-700 text-slate-500'
    }`}>
      <Wifi className="w-3 h-3" />
      {connected ? (t.histLive || 'En tiempo real') : (t.histRecon || 'Reconectando…')}
    </div>
  );
}

function ProgressBar({ progress, colorClass }) {
  return (
    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function JobRow({ job }) {
  const { lang, t } = useLanguage();
  const cfg = STATUS_CFG[job.status] || STATUS_CFG.pending;
  const labels = {
    pending: t.histStatusPending || 'En cola',
    uploading: t.histStatusUploading || 'Subiendo…',
    completed: t.histStatusCompleted || 'Completado',
    failed: t.histStatusFailed || 'Error',
  };

  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-900 border border-slate-800 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="shrink-0">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-medium text-slate-200 truncate">{job.file}</p>
            <span className="text-slate-600 text-xs shrink-0">→</span>
            <p className="text-xs text-slate-400 shrink-0">{job.agency}</p>
          </div>
          <div className="flex items-center gap-3">
            <ProgressBar progress={job.progress} colorClass={cfg.bar} />
            <span className="text-xs text-slate-500 shrink-0 w-8 text-right">{job.progress}%</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className={`text-xs font-semibold ${
            job.status === 'completed' ? 'text-emerald-400' :
            job.status === 'failed'    ? 'text-red-400'     :
            job.status === 'uploading' ? 'text-cyan-400'    : 'text-slate-500'
          }`}>
            {labels[job.status] || labels.pending}
          </span>
          <p className="text-[10px] text-slate-600">{job.ts}</p>
        </div>
      </div>

      {/* Error amigable */}
      {job.status === 'failed' && (
        <div className="ml-7 p-3 rounded-lg bg-red-500/5 border border-red-500/15 text-xs text-red-400/90">
          <p className="font-medium mb-1">{lang === LANGUAGES.ES ? 'Error de conexión con la agencia' : 'Agency connection error'}</p>
          <p className="text-red-400/60">{lang === LANGUAGES.ES ? 'StockSling reintentará automáticamente en 10 min. Código: ' : 'StockSling will automatically retry in 10 min. Code: '}<span className="font-mono">{job.error}</span></p>
          <button className="mt-2 flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors">
            <RotateCcw className="w-3 h-3" />
            {lang === LANGUAGES.ES ? 'Reintentar ahora' : 'Retry now'}
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryCards({ jobs }) {
  const { lang, t } = useLanguage();
  const total     = jobs.length;
  const completed = jobs.filter(j => j.status === 'completed').length;
  const failed    = jobs.filter(j => j.status === 'failed').length;
  const uploading = jobs.filter(j => j.status === 'uploading').length;
  const pending   = jobs.filter(j => j.status === 'pending').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: lang === LANGUAGES.ES ? 'Completados' : 'Completed', value: completed, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/15' },
        { label: lang === LANGUAGES.ES ? 'Subiendo' : 'Uploading',    value: uploading, color: 'text-cyan-400',    bg: 'bg-cyan-500/5 border-cyan-500/15' },
        { label: t.histStatusPending || 'En cola',     value: pending,   color: 'text-slate-400',   bg: 'bg-slate-800/50 border-slate-700/50' },
        { label: lang === LANGUAGES.ES ? 'Errores' : 'Errors',     value: failed,    color: 'text-red-400',     bg: 'bg-red-500/5 border-red-500/15' },
      ].map(s => (
        <div key={s.label} className={`glass-card p-4 text-center border ${s.bg}`}>
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
        </div>
      ))}
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
export default function HistoryPage() {
  const navigate = useNavigate();
  const { lang, toggleLanguage, t } = useLanguage();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/photos');
      const loadedJobs = [];
      
      res.data.forEach(p => {
        const file_name = p.name || p.original_filename || p.original_storage_url.split('/').pop();
        const tsFormatted = p.created_at 
          ? new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '--:--';
          
        if (p.send_to_adobe) {
          loadedJobs.push({
            id: `${p.id}-adobe`,
            photoId: p.id,
            file: file_name,
            agency: 'Adobe Stock',
            status: p.status === 'completed' ? 'completed' : (p.status === 'failed' ? 'failed' : (p.status === 'uploading' ? 'uploading' : 'pending')),
            progress: p.status === 'completed' ? 100 : (p.status === 'failed' ? 0 : (p.status === 'uploading' ? 45 : 0)),
            ts: tsFormatted,
            error: p.incident_code || ''
          });
        }
        if (p.send_to_shutterstock) {
          loadedJobs.push({
            id: `${p.id}-shutterstock`,
            photoId: p.id,
            file: file_name,
            agency: 'Shutterstock',
            status: p.status === 'completed' ? 'completed' : (p.status === 'failed' ? 'failed' : (p.status === 'uploading' ? 'uploading' : 'pending')),
            progress: p.status === 'completed' ? 100 : (p.status === 'failed' ? 0 : (p.status === 'uploading' ? 45 : 0)),
            ts: tsFormatted,
            error: p.incident_code || ''
          });
        }
        if (p.send_to_getty) {
          loadedJobs.push({
            id: `${p.id}-getty`,
            photoId: p.id,
            file: file_name,
            agency: 'Getty Images',
            status: p.status === 'completed' ? 'completed' : (p.status === 'failed' ? 'failed' : (p.status === 'uploading' ? 'uploading' : 'pending')),
            progress: p.status === 'completed' ? 100 : (p.status === 'failed' ? 0 : (p.status === 'uploading' ? 45 : 0)),
            ts: tsFormatted,
            error: p.incident_code || ''
          });
        }
        if (p.send_to_depositphotos) {
          loadedJobs.push({
            id: `${p.id}-depositphotos`,
            photoId: p.id,
            file: file_name,
            agency: 'Depositphotos',
            status: p.status === 'completed' ? 'completed' : (p.status === 'failed' ? 'failed' : (p.status === 'uploading' ? 'uploading' : 'pending')),
            progress: p.status === 'completed' ? 100 : (p.status === 'failed' ? 0 : (p.status === 'uploading' ? 45 : 0)),
            ts: tsFormatted,
            error: p.incident_code || ''
          });
        }
        if (p.send_to_freepik) {
          loadedJobs.push({
            id: `${p.id}-freepik`,
            photoId: p.id,
            file: file_name,
            agency: 'Freepik',
            status: p.status === 'completed' ? 'completed' : (p.status === 'failed' ? 'failed' : (p.status === 'uploading' ? 'uploading' : 'pending')),
            progress: p.status === 'completed' ? 100 : (p.status === 'failed' ? 0 : (p.status === 'uploading' ? 45 : 0)),
            ts: tsFormatted,
            error: p.incident_code || ''
          });
        }
      });
      
      setJobs(loadedJobs);
    } catch (err) {
      console.error("Error loading history list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (!user) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/${user.id}`);
    
    ws.onopen = () => {
      setWsConnected(true);
      console.log("WebSocket connected to StockSling server.");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WS message received:", data);
        
        // Mapear eventos en tiempo real
        setJobs(prev => prev.map(job => {
          if (job.photoId === data.photo_id) {
            let newStatus = job.status;
            let newProgress = job.progress;
            let newError = job.error || '';

            if (data.event === "upload_started") {
              newStatus = 'uploading';
              newProgress = 45;
            } else if (data.event === "upload_completed") {
              newStatus = 'completed';
              newProgress = 100;
            } else if (data.event === "upload_failed") {
              newStatus = 'failed';
              newProgress = 0;
              newError = data.incident_code || 'ERR-TRANSFER-FTP';
            }

            return {
              ...job,
              status: newStatus,
              progress: newProgress,
              error: newError
            };
          }
          return job;
        }));
      } catch (err) {
        console.error("Error parsing WS message:", err);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      console.log("WebSocket connection closed. Reconnecting...");
    };

    return () => {
      ws.close();
    };
  }, [user]);

  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const totalCount = jobs.length;
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#090d16' }}>
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
                  n.path === '/history'
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
          <WsIndicator connected={wsConnected} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Progress global */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-200">{t.histProgress || 'Progreso del Lote'}</span>
            <span className="text-slate-400">{completedCount} / {totalCount} {lang === LANGUAGES.ES ? 'archivos' : 'files'}</span>
          </div>
          <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">{overallProgress}% {lang === LANGUAGES.ES ? 'completado' : 'completed'}</p>
        </div>

        {/* Cards de resumen */}
        <SummaryCards jobs={jobs} />

        {/* Lista de jobs */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
            {lang === LANGUAGES.ES ? 'Detalle de transferencias' : 'Transfer details'}
          </h2>
          {jobs.map(job => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      </main>
    </div>
  );
}
