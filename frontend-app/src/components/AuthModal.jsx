import React, { useState } from 'react';
import { 
  X, Loader2, Mail, Lock, Camera, Video, 
  Palette, Building, Check, ArrowLeft, Zap 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage, LANGUAGES } from '../pages/LanguageContext';

export default function AuthModal({ isOpen, onClose }) {
  const { lang } = useLanguage();
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── ESTADOS DEL ONBOARDING MULTI-PASO ────────────────────────────────────
  const [step, setStep] = useState(1); // 1: Credenciales, 2: Perfil Creador, 3: Agencias
  const [creatorType, setCreatorType] = useState('photographer'); // photographer, videographer, designer, agency
  const [productionVolume, setProductionVolume] = useState('medium'); // low, medium, high
  const [selectedAgencies, setSelectedAgencies] = useState(['adobe', 'shutterstock']);

  if (!isOpen) return null;

  // Manejar el toggle entre Login y Register
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setStep(1);
    setError('');
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setError('');
    
    if (step === 1) {
      if (!email.includes('@')) {
        setError(lang === LANGUAGES.ES ? 'Ingresa un correo electrónico válido.' : 'Enter a valid email address.');
        return;
      }
      if (password.length < 6) {
        setError(lang === LANGUAGES.ES ? 'La contraseña debe tener al menos 6 caracteres.' : 'Password must be at least 6 characters.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setError('');
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmitRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // 1. Registro real en base de datos
      await register(email, password);
      
      // 2. Guardar datos de Onboarding localmente para personalizar el Dashboard
      localStorage.setItem('stocksling_onboarding', JSON.stringify({
        creatorType,
        productionVolume,
        selectedAgencies
      }));

      onClose();
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        (lang === LANGUAGES.ES ? 'Error al crear la cuenta. Inténtalo de nuevo.' : 'Failed to create account. Try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      onClose();
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        (lang === LANGUAGES.ES ? 'Ocurrió un error. Verifica tus credenciales.' : 'An error occurred. Check your credentials.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDevQuickLogin = async () => {
    setLoading(true);
    setError('');
    try {
      setEmail('demo@example.com');
      setPassword('demo-password');
      await login('demo@example.com', 'demo-password');
      onClose();
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        (lang === LANGUAGES.ES ? 'Error al iniciar sesión como desarrollador.' : 'Failed developer login.')
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleAgency = (key) => {
    if (selectedAgencies.includes(key)) {
      setSelectedAgencies(prev => prev.filter(a => a !== key));
    } else {
      setSelectedAgencies(prev => [...prev, key]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-purple-500/10 overflow-hidden transform transition-all">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/20 blur-[60px] pointer-events-none" />
        
        <div className="p-8">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Indicador de pasos para registro */}
          {!isLogin && (
            <div className="flex justify-center items-center gap-3 mb-6 select-none">
              <div className={`w-8 h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-cyan-500' : 'bg-slate-800'}`} />
              <div className={`w-8 h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-purple-500' : 'bg-slate-800'}`} />
              <div className={`w-8 h-1.5 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
            </div>
          )}

          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white mb-2">
              {isLogin 
                ? (lang === LANGUAGES.ES ? 'Iniciar Sesión' : 'Sign In') 
                : (lang === LANGUAGES.ES ? 'Crear Cuenta Gratis' : 'Create Free Account')}
            </h2>
            <p className="text-xs text-slate-400">
              {isLogin 
                ? (lang === LANGUAGES.ES ? 'Bienvenido de vuelta a StockSling' : 'Welcome back to StockSling') 
                : (
                    step === 1 ? (lang === LANGUAGES.ES ? 'Paso 1: Configura tus credenciales' : 'Step 1: Setup your credentials') :
                    step === 2 ? (lang === LANGUAGES.ES ? 'Paso 2: Personaliza tu perfil de stock' : 'Step 2: Custom stock profile') :
                    (lang === LANGUAGES.ES ? 'Paso 3: Selecciona tus agencias de interés' : 'Step 3: Choose target agencies')
                  )}
            </p>
          </div>

          {error && (
            <div className="p-3 mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
              {error}
            </div>
          )}

          {/* ── FORMULARIO INICIO SESIÓN ─────────────────────────────────────── */}
          {isLogin ? (
            <form onSubmit={handleSubmitLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {lang === LANGUAGES.ES ? 'Correo Electrónico' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/50 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    placeholder="tucorreo@ejemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {lang === LANGUAGES.ES ? 'Contraseña' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/50 text-slate-200 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === LANGUAGES.ES ? 'Entrar' : 'Enter')}
              </button>
            </form>
          ) : (
            /* ── FORMULARIO REGISTRO MULTI-PASO (ONBOARDING) ──────────────────── */
            <div className="space-y-4">
              
              {/* PASO 1: Datos Básicos */}
              {step === 1 && (
                <form onSubmit={handleNextStep} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {lang === LANGUAGES.ES ? 'Correo Electrónico' : 'Email Address'}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/50 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                        placeholder="tucorreo@ejemplo.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {lang === LANGUAGES.ES ? 'Contraseña' : 'Password'}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/50 text-slate-200 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 mt-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{lang === LANGUAGES.ES ? 'Continuar mi perfil' : 'Continue to profile'}</span>
                  </button>

                  <p className="text-[9px] text-slate-500 text-center mt-2 leading-relaxed">
                    {lang === LANGUAGES.ES 
                      ? <>Al continuar, aceptas nuestros <a href="http://localhost:8000/legal/terms" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Términos de Servicio</a> y <a href="http://localhost:8000/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Política de Privacidad</a>.</>
                      : <>By continuing, you agree to our <a href="http://localhost:8000/legal/terms" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Terms of Service</a> and <a href="http://localhost:8000/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Privacy Policy</a>.</>}
                  </p>
                </form>
              )}

              {/* PASO 2: Especialidad de Creador */}
              {step === 2 && (
                <form onSubmit={handleNextStep} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      {lang === LANGUAGES.ES ? '¿Qué tipo de creador eres?' : 'What type of creator are you?'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'photographer', icon: <Camera className="w-4 h-4" />, label: lang === LANGUAGES.ES ? 'Fotógrafo' : 'Photographer' },
                        { key: 'videographer', icon: <Video className="w-4 h-4" />, label: lang === LANGUAGES.ES ? 'Videógrafo' : 'Videographer' },
                        { key: 'designer', icon: <Palette className="w-4 h-4" />, label: lang === LANGUAGES.ES ? 'Ilustrador' : 'Designer' },
                        { key: 'agency', icon: <Building className="w-4 h-4" />, label: lang === LANGUAGES.ES ? 'Agencia / Prod.' : 'Agency' },
                      ].map(item => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setCreatorType(item.key)}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                            creatorType === item.key
                              ? 'border-purple-500 bg-purple-500/10 text-white shadow-lg shadow-purple-950/20'
                              : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:border-slate-750'
                          }`}
                        >
                          {item.icon}
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      {lang === LANGUAGES.ES ? 'Volumen Mensual de Subida' : 'Monthly Upload Volume'}
                    </label>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { key: 'low', label: lang === LANGUAGES.ES ? 'Bajo (Menos de 100 archivos/mes)' : 'Low (Under 100 assets/mo)' },
                        { key: 'medium', label: lang === LANGUAGES.ES ? 'Medio (100–500 archivos/mes)' : 'Medium (100–500 assets/mo)' },
                        { key: 'high', label: lang === LANGUAGES.ES ? 'Profesional (Más de 500 archivos/mes)' : 'Pro (Over 500 assets/mo)' },
                      ].map(item => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setProductionVolume(item.key)}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all ${
                            productionVolume === item.key
                              ? 'border-cyan-500 bg-cyan-500/10 text-white font-semibold'
                              : 'border-slate-800 bg-slate-950/20 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="btn-ghost flex-1 py-3 text-xs flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{lang === LANGUAGES.ES ? 'Atrás' : 'Back'}</span>
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex-[2] py-3 text-xs font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500"
                    >
                      <span>{lang === LANGUAGES.ES ? 'Continuar' : 'Next'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* PASO 3: Agencias de Interés */}
              {step === 3 && (
                <form onSubmit={handleSubmitRegister} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      {lang === LANGUAGES.ES ? 'Selecciona tus agencias de interés' : 'Select your microstock platforms'}
                    </label>
                    <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                      {lang === LANGUAGES.ES 
                        ? 'Marcaremos estas agencias en tu dashboard para facilitarte su conexión rápida.' 
                        : 'We will pre-configure these targets in your dashboard for immediate setup.'}
                    </p>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {[
                        { key: 'adobe', name: 'Adobe Stock', color: 'border-red-500/30 text-red-400 bg-red-950/10' },
                        { key: 'shutterstock', name: 'Shutterstock', color: 'border-orange-500/30 text-orange-400 bg-orange-950/10' },
                        { key: 'getty', name: 'Getty Images / iStock', color: 'border-blue-500/30 text-blue-400 bg-blue-950/10' },
                        { key: 'depositphotos', name: 'Depositphotos', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/10' },
                        { key: 'freepik', name: 'Freepik', color: 'border-purple-500/30 text-purple-400 bg-purple-950/10' },
                      ].map(agency => {
                        const active = selectedAgencies.includes(agency.key);
                        return (
                          <button
                            key={agency.key}
                            type="button"
                            onClick={() => toggleAgency(agency.key)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-xs ${
                              active 
                                ? `${agency.color} border-2`
                                : 'border-slate-800 bg-slate-950/30 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className="font-semibold">{agency.name}</span>
                            {active ? (
                              <span className="w-4 h-4 rounded-full bg-current flex items-center justify-center text-slate-950">
                                <Check className="w-2.5 h-2.5 stroke-[4px]" />
                              </span>
                            ) : (
                              <span className="w-4 h-4 rounded-full border border-slate-700" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handlePrevStep}
                      className="btn-ghost flex-1 py-3 text-xs flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{lang === LANGUAGES.ES ? 'Atrás' : 'Back'}</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary flex-[2] py-3 text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{lang === LANGUAGES.ES ? 'Creando...' : 'Creating...'}</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>{lang === LANGUAGES.ES ? 'Crear Mi Cuenta Gratis' : 'Create My Free Account'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Acceso rápido de desarrollador (Solo en paso 1 o login) */}
          {(isLogin || step === 1) && (
            <>
              {/* Divider */}
              <div className="relative flex items-center justify-center my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800/80"></div>
                </div>
                <span className="relative px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900">
                  {lang === LANGUAGES.ES ? 'Acceso Rápido' : 'Quick Access'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleDevQuickLogin}
                disabled={loading}
                className="w-full py-2.5 rounded-xl border border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-950 hover:border-purple-500/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span className="text-sm transition-transform group-hover:scale-110">🧪</span>
                <span>{lang === LANGUAGES.ES ? 'Entrar como Diógenes (Modo Dev)' : 'Sign In as Diógenes (Dev)'}</span>
              </button>
            </>
          )}

          {/* Toggle entre Iniciar Sesión / Registrarse */}
          <div className="mt-6 text-center text-sm text-slate-400">
            {isLogin 
              ? (lang === LANGUAGES.ES ? '¿No tienes cuenta?' : "Don't have an account?") 
              : (lang === LANGUAGES.ES ? '¿Ya tienes cuenta?' : 'Already have an account?')}
            <button 
              type="button"
              onClick={toggleMode}
              className="ml-2 font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              {isLogin 
                ? (lang === LANGUAGES.ES ? 'Crear una gratis' : 'Create one for free') 
                : (lang === LANGUAGES.ES ? 'Inicia sesión' : 'Sign in')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
