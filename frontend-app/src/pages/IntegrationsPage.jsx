import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Shield, Key, Check, Loader2, AlertCircle, RefreshCw, LogOut
} from 'lucide-react';
import { useLanguage, LANGUAGES } from './LanguageContext.jsx';
import { api } from '../context/AuthContext.jsx';

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

const AGENCIES_CONFIG = [
  { key: 'adobe', name: 'Adobe Stock', color: 'red', host: 'sftp://sftp.contributor.adobestock.com', desc: 'Permite la subida automática a tu panel de colaboradores de Adobe Stock.', descEn: 'Allows automatic uploading to your Adobe Stock contributor panel.' },
  { key: 'shutterstock', name: 'Shutterstock', color: 'orange', host: 'ftps.shutterstock.com', desc: 'Permite la subida automática a tu panel de colaboradores de Shutterstock.', descEn: 'Allows automatic uploading to your Shutterstock contributor panel.' },
  { key: 'getty', name: 'Getty Images / iStock', color: 'blue', host: 'ftp.istockphoto.com', desc: 'Permite la subida automática a tu panel de colaboradores de Getty Images / iStock.', descEn: 'Allows automatic uploading to your Getty Images / iStock contributor panel.' },
  { key: 'depositphotos', name: 'Depositphotos', color: 'emerald', host: 'ftp.depositphotos.com', desc: 'Permite la subida automática a tu panel de colaboradores de Depositphotos.', descEn: 'Allows automatic uploading to your Depositphotos contributor panel.' },
  { key: 'freepik', name: 'Freepik', color: 'purple', host: 'sftp://contributor-ftp.freepik.com:60022', desc: 'Permite la subida automática a tu panel de colaboradores de Freepik.', descEn: 'Allows automatic uploading to your Freepik contributor panel.' }
];

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const { lang, toggleLanguage, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Estado de conexión de agencias
  const [status, setStatus] = useState({
    adobe: { connected: false, username: null },
    shutterstock: { connected: false, username: null },
    getty: { connected: false, username: null },
    depositphotos: { connected: false, username: null },
    freepik: { connected: false, username: null }
  });

  // Estado del formulario
  const [form, setForm] = useState({
    agency: '', // 'adobe', 'shutterstock', 'getty', 'depositphotos', 'freepik'
    username: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Cargar estado de credenciales al montar la página
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/vault/credentials');
      setStatus(res.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo conectar con la API de StockSling. Asegúrate de tener los contenedores Docker activos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Guardar credenciales
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.agency || !form.username || !form.password) {
      setError('Por favor, rellena todos los campos.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');

      await api.post('/api/vault/credentials', form);

      const agencyNameMap = {
        adobe: 'Adobe Stock',
        shutterstock: 'Shutterstock',
        getty: 'Getty Images',
        depositphotos: 'Depositphotos',
        freepik: 'Freepik'
      };

      setSuccessMsg(`¡Cuenta de ${agencyNameMap[form.agency] || form.agency} conectada y cifrada con éxito!`);
      setForm({ agency: '', username: '', password: '' });
      await fetchStatus();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Desconectar cuenta (Limpia enviando vacío)
  const handleDisconnect = async (agency) => {
    const agencyNameMap = {
      adobe: 'Adobe Stock',
      shutterstock: 'Shutterstock',
      getty: 'Getty Images',
      depositphotos: 'Depositphotos',
      freepik: 'Freepik'
    };

    if (!window.confirm(`¿Estás seguro de que deseas desconectar tu cuenta de ${agencyNameMap[agency] || agency}?`)) {
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/vault/credentials', {
        agency,
        username: '',
        password: ''
      });

      setSuccessMsg(`Cuenta de ${agencyNameMap[agency] || agency} desconectada.`);
      await fetchStatus();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

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
              { label: t.tabUpload, path: '/dashboard' },
              { label: t.tabReview, path: '/workspace' },
              { label: t.tabHistory, path: '/history' },
              { label: t.tabIntegrations, path: '/integrations' },
            ].map(n => (
              <button
                key={n.path}
                onClick={() => navigate(n.path)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  n.path === '/integrations'
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

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {lang === LANGUAGES.ES ? 'Búnker Cifrado AES-256' : 'AES-256 Encrypted Vault'}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400 animate-pulse" />
            {t.intTitle}
          </h1>
          <p className="text-sm text-slate-400">
            {t.intSub}
          </p>
        </div>

        {/* Alertas */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm">
            <Check className="w-5 h-5 shrink-0" />
            <p>{successMsg}</p>
          </div>
        )}

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-slate-500 text-sm font-semibold">{lang === LANGUAGES.ES ? 'Consultando búnker de credenciales...' : 'Querying secure vault credentials...'}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 items-start">
            
            {/* ── SECCIÓN DE CUENTAS VINCULADAS ── */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {t.intConnected}
              </h2>

              {AGENCIES_CONFIG.map(a => {
                const agencyStatus = status[a.key] || { connected: false, username: null };
                return (
                  <div key={a.key} className={`relative p-5 rounded-2xl border transition-all duration-300 ${
                    agencyStatus.connected 
                      ? `border-${a.color}-500/25 bg-${a.color}-500/5 glow-${a.color}` 
                      : 'border-slate-800/80 bg-slate-900/10'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${agencyStatus.connected ? `bg-${a.color}-400` : 'bg-slate-700'}`} />
                        <h3 className="font-bold text-slate-200">{a.name} FTP</h3>
                      </div>
                      {agencyStatus.connected && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                          {t.intEncrypted}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      {lang === LANGUAGES.ES ? a.desc : a.descEn}
                    </p>

                    <div className="mb-4 bg-slate-950/50 border border-slate-800/60 px-3.5 py-2 rounded-xl text-left">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                        {lang === LANGUAGES.ES ? 'Servidor / Host' : 'Server / Host'}
                      </div>
                      <div className="text-xs font-mono text-cyan-400 select-all font-semibold break-all">
                        {a.host}
                      </div>
                    </div>

                    {agencyStatus.connected ? (
                      <div className="flex items-center justify-between bg-slate-950/40 border border-slate-800/40 p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Key className={`w-4 h-4 text-${a.color}-400`} />
                          <span className="text-xs font-semibold text-slate-300 font-mono">{agencyStatus.username}</span>
                        </div>
                        <button 
                          onClick={() => handleDisconnect(a.key)}
                          className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          {t.intDisconnect}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setForm({ agency: a.key, username: '', password: '' })}
                        className="w-full btn-secondary py-2 justify-center text-xs"
                      >
                        {t.intConnect}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── FORMULARIO DE CONEXIÓN SEGURO ── */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {form.agency ? (lang === LANGUAGES.ES ? `Conectar ${AGENCIES_CONFIG.find(ac => ac.key === form.agency)?.name}` : `Connect ${AGENCIES_CONFIG.find(ac => ac.key === form.agency)?.name}`) : (lang === LANGUAGES.ES ? 'Selecciona una Agencia para conectar' : 'Select an Agency to connect')}
              </h2>

              {form.agency ? (
                <form onSubmit={handleSubmit} className="glass-card p-5 space-y-4 border-purple-500/10">
                  <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 mb-1">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase">{t.intSecurityHeader}</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">{t.intUserLabel}</label>
                    <input
                      type="text"
                      required
                      placeholder={form.agency === 'adobe' ? (lang === LANGUAGES.ES ? 'ej. 209531234' : 'e.g. 209531234') : (lang === LANGUAGES.ES ? 'ej. member_1982' : 'e.g. member_1982')}
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 text-sm focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">{t.intPassLabel}</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setForm({ agency: '', username: '', password: '' })}
                      className="btn-secondary text-xs flex-1 justify-center py-2.5"
                    >
                      {t.intCancel}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary text-xs flex-1 justify-center py-2.5"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {t.intSaving}
                        </>
                      ) : (
                        t.intSave
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="glass-card p-8 border-dashed border-slate-800 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Globe className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="font-semibold text-slate-300 text-sm">{t.intNoAgency}</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    {t.intNoAgencySub}
                  </p>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
