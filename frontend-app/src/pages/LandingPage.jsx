import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Shield, RefreshCw, Film, Check, ArrowRight,
  Camera, Upload, Star, ChevronRight, Globe, FolderOpen, Activity
} from 'lucide-react';
import { useLanguage, LANGUAGES } from './LanguageContext.jsx';
import AuthModal from '../components/AuthModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/* ─── Datos de Agencias ─── */
const AGENCIES = ['Adobe Stock', 'Shutterstock', 'Getty Images', 'Depositphotos', 'Freepik'];

/* ─── Logotipo SVG / Isotipo Identidad ─── */
function BrandLogo() {
  return (
    <div className="flex items-center gap-3 group cursor-pointer">
      <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
        {/* Glow effect sutil */}
        <div className="absolute inset-0 bg-purple-500/10 rounded-xl blur-md transition-all duration-300 group-hover:bg-purple-500/25" />
        
        {/* Carga del favicon.svg exacto como imagen para coincidir al 100% con los degradados e iluminaciones */}
        <img
          src="/favicon.svg"
          alt="StockSling Logo"
          className="relative w-7 h-7 group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      
      {/* Texto de la marca original en bold y degradado brand */}
      <span className="text-xl font-bold tracking-tight text-gradient-brand transition-colors duration-200">
        StockSling
      </span>
    </div>
  );
}

/* ─── Componentes ────────────────────────────────────────────────── */
function Navbar({ onStart }) {
  const { lang, toggleLanguage, t } = useLanguage();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <BrandLogo />
        
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <a href="#features" className="hover:text-slate-200 transition-colors">{t.navFeatures}</a>
          <a href="#pricing"  className="hover:text-slate-200 transition-colors">{t.navPricing}</a>
          <a href="#agencies" className="hover:text-slate-200 transition-colors">{t.navAgencies}</a>
        </nav>

        <div className="flex items-center gap-4">
          {/* Selector de idioma premium de doble pestaña */}
          <div className="flex items-center bg-slate-950/60 border border-slate-800/80 p-0.5 rounded-full text-[11px] font-semibold select-none">
            <button
              onClick={() => lang !== LANGUAGES.ES && toggleLanguage()}
              className={`px-2.5 py-1 rounded-full transition-all duration-300 ${
                lang === LANGUAGES.ES
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-md shadow-purple-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ES
            </button>
            <button
              onClick={() => lang !== LANGUAGES.EN && toggleLanguage()}
              className={`px-2.5 py-1 rounded-full transition-all duration-300 ${
                lang === LANGUAGES.EN
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-md shadow-purple-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
          </div>

          <button onClick={onStart} className="btn-ghost text-sm hidden md:flex">{t.navLogin}</button>
          <button onClick={onStart} className="btn-primary text-sm">
            {t.navStartFree}
          </button>
        </div>
      </div>
    </header>
  );
}

function HeroSection({ onStart }) {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden bg-grid">
      {/* Glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute top-2/3 left-1/3 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 text-center">
        {/* Sleek Powered by AI Badge using our official favicon.svg */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 text-xs font-medium mb-8 animate-fade-in">
          <img src="/favicon.svg" alt="Rayo Logo" className="w-3.5 h-3.5" />
          <span>{t.heroBadge}</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6 animate-fade-in">
          {t.heroHeadline1}{' '}
          <span className="text-gradient-cyan">{t.heroHeadline2}</span>
          {' '}{t.heroHeadline3}<br />
          {t.heroHeadline4}{' '}
          <span className="text-gradient-emerald">{t.heroHeadline5}</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed mb-10 animate-fade-in">
          {t.heroSub}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <button
            onClick={onStart}
            id="hero-cta-primary"
            className="btn-primary text-base px-8 py-3.5 rounded-2xl glow-emerald group"
          >
            {t.heroCta}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          <a href="#features" className="btn-ghost text-base">
            {t.heroViewHow}
          </a>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
          {[
            { value: t.stat1Val, label: t.stat1Label },
            { value: t.stat2Val, label: t.stat2Label },
            { value: t.stat3Val, label: t.stat3Label },
            { value: t.stat4Val, label: t.stat4Label },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold text-gradient-cyan">{s.value}</div>
              <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  const { t } = useLanguage();

  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">
          {t.compTitle1}{' '}
          <span className="text-slate-500">{t.compTitle2}</span>{' '}
          <span className="text-gradient-cyan">StockSling</span>
        </h2>
        <p className="text-slate-400 text-center mb-12">
          {t.compSub}
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* El Dolor */}
          <div className="glass-card p-6 border-red-500/10">
            <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {t.compManualTitle}
            </h3>
            <ul className="space-y-3">
              {t.compManualItems.map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-400">
                  <span className="mt-0.5 text-red-500/60 shrink-0">✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* La Solución */}
          <div className="glass-card p-6 border-emerald-500/20 glow-emerald">
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t.compFlowTitle}
            </h3>
            <ul className="space-y-3">
              {t.compFlowItems.map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-200">
                  <Check className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const { t } = useLanguage();

  return (
    <section id="features" className="py-20 px-6 bg-grid">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t.featHeader}{' '}
            <span className="text-gradient-cyan">{t.featHeaderGrad}</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            {t.featSub}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {t.featItems.map((f, i) => {
            // Iconos dinámicos basados en la posición
            const icons = [Shield, Camera, Film, Shield, Zap, Globe, FolderOpen, Activity];
            const colors = ['text-emerald-400', 'text-cyan-400', 'text-blue-400', 'text-amber-400', 'text-rose-400', 'text-purple-400', 'text-yellow-400', 'text-fuchsia-400'];
            const bgs = ['bg-emerald-500/10 border-emerald-500/20', 'bg-cyan-500/10 border-cyan-500/20', 'bg-blue-500/10 border-blue-500/20', 'bg-amber-500/10 border-amber-500/20', 'bg-rose-500/10 border-rose-500/20', 'bg-purple-500/10 border-purple-500/20', 'bg-yellow-500/10 border-yellow-500/20', 'bg-fuchsia-500/10 border-fuchsia-500/20'];
            
            const Icon = icons[i] || Shield;
            const color = colors[i] || 'text-slate-400';
            const bg = bgs[i] || 'bg-slate-800/20';

            return (
              <div key={f.title} className={`glass-card p-6 border ${bg} hover:scale-[1.02] transition-transform duration-200`}>
                <div className={`w-10 h-10 rounded-xl ${bg} border flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="font-semibold text-slate-100 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AgenciesSection() {
  const { t } = useLanguage();

  return (
    <section id="agencies" className="py-24 px-6 border-y border-slate-800/40 bg-slate-950/20 scroll-mt-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            StockSling Network
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-slate-100">
            {t.agenciesTitle1}{' '}
            <span className="text-gradient-purple">{t.agenciesTitle2}</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            {t.agenciesSub}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {t.agenciesList.map(a => {
            const isHighlight = a.name.includes('Adobe') || a.name.includes('Shutterstock');
            return (
              <div
                key={a.name}
                className={`group relative glass-card p-6 flex flex-col justify-between border transition-all duration-300 hover:scale-[1.03] ${
                  isHighlight 
                    ? 'border-purple-500/30 bg-purple-500/5 shadow-lg shadow-purple-500/5' 
                    : 'border-slate-800/60 hover:border-slate-700/80 bg-slate-900/10'
                }`}
              >
                {/* Glowing Background Effect for Highlights */}
                {isHighlight && (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-slate-100 group-hover:text-white transition-colors">
                      {a.name}
                    </h3>
                    <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                      {a.status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-400 leading-relaxed mb-6 group-hover:text-slate-300 transition-colors">
                    {a.desc}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800/60">
                  {a.features.map(feat => (
                    <span
                      key={feat}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-slate-300 transition-colors"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const { t } = useLanguage();

  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          {t.testTitle1}{' '}
          <span className="text-gradient-cyan">{t.testTitle2}</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {t.testItems.map((item, i) => {
            const avatars = ['CM', 'SR', 'AL'];
            return (
              <div key={item.name} className="glass-card p-6 flex flex-col gap-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed flex-1">"{item.text}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-xs font-bold text-white">
                    {avatars[i] || 'CM'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-200">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.role}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ onStart }) {
  const { t } = useLanguage();

  return (
    <section id="pricing" className="py-20 px-6 bg-grid">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t.priceTitle1}{' '}
            <span className="text-gradient-emerald">{t.priceTitle2}</span>
          </h2>
          <p className="text-slate-400">
            {t.priceSub}
          </p>
          <p className="text-sm text-slate-400 mt-2">
            {t.priceReferral}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {t.plans.map((plan, i) => {
            const highlight = i === 1; // Pro plan destacado
            const ctas = [t.planCtaFree, t.planCtaPro, t.planCtaAgencia];

            return (
              <div
                key={plan.name}
                className={`relative glass-card p-6 flex flex-col gap-5 transition-transform hover:scale-[1.02] duration-200 ${
                  highlight ? 'border-cyan-500/40 glow-cyan' : ''
                }`}
              >
                {highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-cyan-500 text-white text-xs font-bold">
                    {t.planPopular}
                  </span>
                )}

                <div>
                  <h3 className="font-bold text-slate-100 text-lg mb-1">{plan.name}</h3>
                  <p className="text-xs text-slate-500">{plan.credits}</p>
                </div>

                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-slate-100">{plan.price}€</span>
                  <span className="text-slate-500 text-sm mb-1">/{plan.period}</span>
                </div>

                <ul className="space-y-2.5 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onStart}
                  className={highlight ? 'btn-primary w-full justify-center' : 'btn-secondary w-full justify-center'}
                >
                  {ctas[i] || 'Choose'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FooterCTA({ onStart }) {
  const { t } = useLanguage();

  return (
    <section className="py-24 px-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[100px]" />
      </div>
      <div className="relative max-w-2xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
          {t.footerCtaHeadline}<br />
          <span className="text-gradient-emerald">{t.footerCtaHeadlineGrad}</span>
        </h2>
        <p className="text-slate-400 mb-8">
          {t.footerCtaSub}
        </p>
        <button onClick={onStart} id="footer-cta" className="btn-primary text-base px-10 py-4 rounded-2xl">
          {t.footerCtaBtn}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-slate-800 py-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <BrandLogo />
        <span>{t.footerRights}</span>
        <div className="flex gap-4">
          <a href="http://localhost:8000/legal/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">{t.footerPriv}</a>
          <a href="http://localhost:8000/legal/terms" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">{t.footerTerms}</a>
          <a href="mailto:support@stocksling.com" className="hover:text-slate-300 transition-colors">{t.footerCont}</a>
        </div>
      </div>
    </footer>
  );
}

/* ─── Componentes del Modo Desarrollador ─── */
function DevModeWidget({ devMode, setDevMode }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md shadow-2xl shadow-purple-500/10 transition-all duration-300 hover:border-purple-500/30">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {devMode ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-600"></span>
          )}
        </span>
        <span className="text-xs font-bold text-slate-300 tracking-wide uppercase select-none">
          Modo Dev: {devMode ? 'ON 🧪' : 'OFF'}
        </span>
      </div>
      <button
        onClick={() => {
          const next = !devMode;
          setDevMode(next);
          localStorage.setItem('stocksling_dev_mode', String(next));
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          devMode ? 'bg-gradient-to-r from-purple-500 to-cyan-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            devMode ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function DevLoadingOverlay({ isOpen }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md">
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute w-24 h-24 bg-cyan-500/20 rounded-full blur-[30px] animate-pulse" />
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-transparent border-t-cyan-400 border-b-purple-500" />
        <span className="absolute text-lg">🧪</span>
      </div>
      <h3 className="text-lg font-bold text-white mb-2 animate-pulse">
        Iniciando sesión en Modo Desarrollador...
      </h3>
      <p className="text-sm text-slate-400">
        Accediendo con la cuenta de: <span className="text-cyan-400 font-mono">demo@example.com</span>
      </p>
    </div>
  );
}

/* ─── Página principal ───────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [devMode, setDevMode] = useState(() => localStorage.getItem('stocksling_dev_mode') === 'true');
  const [devLoading, setDevLoading] = useState(false);

  const handleStart = async () => {
    if (devMode) {
      setDevLoading(true);
      try {
        await login('demo@example.com', 'demo-password');
        await new Promise(resolve => setTimeout(resolve, 800)); // Delay sutil para feedback visual Premium
        navigate('/dashboard');
      } catch (err) {
        console.error("Developer login failed, opening normal modal:", err);
        setIsAuthModalOpen(true);
      } finally {
        setDevLoading(false);
      }
    } else {
      setIsAuthModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#090d16' }}>
      <Navbar onStart={handleStart} />
      <HeroSection onStart={handleStart} />
      <AgenciesSection />
      <ComparisonSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection onStart={handleStart} />
      <FooterCTA onStart={handleStart} />
      <Footer />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      {import.meta.env.DEV && <DevModeWidget devMode={devMode} setDevMode={setDevMode} />}
      <DevLoadingOverlay isOpen={devLoading} />
    </div>
  );
}
