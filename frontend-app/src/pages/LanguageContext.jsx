import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const LANGUAGES = {
  ES: 'es',
  EN: 'en'
};

const translations = {
  es: {
    // Navbar
    navFeatures: 'Características',
    navPricing: 'Precios',
    navAgencies: 'Agencias',
    navLogin: 'Iniciar Sesión',
    navStartFree: 'Empezar Gratis',
    
    // Hero
    heroBadge: 'Impulsado por IA: indexación SEO en segundos',
    heroHeadline1: 'De la',
    heroHeadline2: 'cámara',
    heroHeadline3: 'a todas las',
    heroHeadline4: 'agencias de stock',
    heroHeadline5: 'en un clic',
    heroSub: 'Sube tus fotos RAW y JPEG o tus vídeos en alta resolución. Nuestra IA analiza tu archivo, redacta títulos comerciales para SEO y distribuye automáticamente a Adobe Stock, Shutterstock y Getty.',
    heroCta: 'Empezar Gratis con 25 Créditos de Regalo',
    heroViewHow: 'Ver cómo funciona →',
    stat1Val: '99.9%', stat1Label: 'Calidad conservada',
    stat2Val: '50', stat2Label: 'Keywords por archivo',
    stat3Val: '< 10s', stat3Label: 'Análisis por archivo',
    stat4Val: '3', stat4Label: 'Agencias simultáneas',

    // Comparison
    compTitle1: 'El método tradicional',
    compTitle2: 'vs',
    compSub: 'Cada hora que pasas escribiendo keywords es una hora que no estás capturando contenido.',
    compManualTitle: 'Método Manual',
    compManualItems: [
      'Horas pensando 50 keywords en inglés por cada foto o vídeo',
      'Traducciones inexactas que reducen las ventas globales',
      'Abrir 3 o 4 webs lentas de agencias una por una',
      'Rechazos por model releases olvidados',
      'Re-comprimir archivos RAW perdiendo calidad de imagen',
      'Subir vídeos pesados manualmente sin automatización'
    ],
    compFlowTitle: 'Flujo StockSling',
    compFlowItems: [
      'Arrastras tus archivos RAW, JPEG o vídeos una sola vez',
      'Nuestra IA genera títulos y 50 keywords en inglés en segundos',
      'Distribución simultánea a todas tus agencias en paralelo',
      'Detección automática de rostros y gestión de contratos',
      'Tus píxeles viajan intactos: cero recompresión en imágenes',
      'Subida automatizada y optimizada para clips de vídeo profesionales'
    ],

    // Features
    featHeader: 'Infraestructura de',
    featHeaderGrad: 'nivel enterprise',
    featSub: 'Construido para creadores profesionales que no aceptan compromisos en calidad ni en velocidad.',
    featItems: [
      {
        title: 'Calidad 100% Intacta',
        desc: 'Inyección binaria de metadatos con ExifTool. Tus píxeles, tu resolución y tus perfiles de color se mantienen exactamente como salieron de tu cámara.'
      },
      {
        title: 'Soporte RAW y Vídeo Profesional',
        desc: 'Compatibilidad nativa con .CR3, .NEF, .ARW, .DNG, .MP4, .MOV. Olvídate de pre-convertir tus archivos. Nuestra IA analiza una miniatura, el original viaja intacto.'
      },
      {
        title: 'Vídeos 4K y ProRes',
        desc: 'FFmpeg extrae el fotograma clave para la IA. El vídeo original se transfiere byte a byte sin re-codificación a las agencias microstock.'
      },
      {
        title: 'Gestión de Model Releases',
        desc: 'Nuestra IA detecta rostros automáticamente. Asocia el PDF de autorización en un clic desde tu biblioteca de contratos. Evita rechazos de agencias.'
      },
      {
        title: 'Subidas Directas a la Nube',
        desc: 'Tus archivos viajan directamente a S3 desde tu navegador con URLs firmadas. El servidor nunca ralentiza tus subidas. Velocidad máxima y segura.'
      },
      {
        title: 'Indexación Global SEO',
        desc: 'Nuestra IA genera automáticamente títulos y 50 palabras clave en inglés nativo sin importar tu idioma de origen. Maximiza tus ventas a nivel mundial.'
      },
      {
        title: 'Colecciones Inteligentes',
        desc: 'Organiza tus subidas por proyectos o sesiones temáticas. Agrupa archivos y administra portfolios complejos cómodamente desde tu panel.'
      },
      {
        title: 'Monitoreo en Tiempo Real',
        desc: 'Sigue el progreso de tus transferencias asíncronas segundo a segundo. Control total sobre el estado de cada envío a las agencias asociadas.'
      }
    ],

    // Agencies Section
    agenciesTitle1: 'Agencias',
    agenciesTitle2: 'compatibles e integradas',
    agenciesSub: 'Distribuimos tus fotos y vídeos automáticamente a los principales mercados del mundo de forma simultánea.',
    agenciesList: [
      {
        name: 'Adobe Stock',
        status: 'Integrado',
        desc: 'El mercado líder para creadores. Sincronización instantánea de metadatos, soporte premium de vídeo 4K y ProRes, y las comisiones más competitivas del sector.',
        features: ['Búsqueda inteligente', 'ProRes Nativo', 'Alta Comisión'],
        color: 'from-red-500/20 to-rose-600/20 border-red-500/30 text-red-400'
      },
      {
        name: 'Shutterstock',
        status: 'Integrado',
        desc: 'Alcance global absoluto con millones de clientes activos. Auto-categorización guiada por IA para que tu portfolio aparezca en las primeras búsquedas.',
        features: ['Indexación por IA', 'Distribución Global', 'Volumen Alto'],
        color: 'from-orange-500/20 to-red-600/20 border-orange-500/30 text-orange-400'
      },
      {
        name: 'Getty Images / iStock',
        status: 'Integrado',
        desc: 'Prestigio editorial y comercial de primer nivel. Gestión automatizada de contratos de modelos y licencias exclusivas directamente desde el panel.',
        features: ['Licencias VIP', 'Model Releases', 'Mercado Editorial'],
        color: 'from-amber-500/20 to-yellow-600/20 border-amber-500/30 text-amber-400'
      },
      {
        name: 'Depositphotos',
        status: 'Integrado',
        desc: 'Mercado de rápido crecimiento perfecto para fotógrafos comerciales de stock. Subida masiva asíncrona optimizada sin límite de tamaño de archivo.',
        features: ['Subida Asíncrona', 'Formatos RAW', 'Procesado Rápido'],
        color: 'from-cyan-500/20 to-blue-600/20 border-cyan-500/30 text-cyan-400'
      },
      {
        name: 'Freepik',
        status: 'Integrado',
        desc: 'Excelente para vectores, ilustraciones y fotos de alto volumen comercial. Automatización de carga en segundo plano optimizada para grandes catálogos.',
        features: ['Carga por Lotes', 'Fotos y Vectores', 'Máxima Rotación'],
        color: 'from-emerald-500/20 to-teal-600/20 border-emerald-500/30 text-emerald-400'
      }
    ],

    // Testimonials
    testTitle1: 'Lo que dicen los',
    testTitle2: 'creadores',
    testItems: [
      {
        name: 'Carlos M.',
        role: 'Fotógrafo de naturaleza',
        text: 'Antes tardaba todo el fin de semana en indexar mis sesiones. Con StockSling, subo 300 fotos el domingo por la noche y el lunes ya están a la venta mientras sigo disparando.'
      },
      {
        name: 'Sofía R.',
        role: 'Videógrafa freelance',
        text: 'El soporte de ProRes es lo que me hizo cambiarme. Mis vídeos llegan a Adobe Stock exactamente como los exporté desde Final Cut. Sin pérdida, sin compromisos.'
      },
      {
        name: 'Agencia Lumina',
        role: 'Productora multimedia',
        text: 'Procesamos 1,800 archivos al mes para 12 fotógrafos. El plan Agencia cubre todo. La detección automática de model releases nos ahorró un problema legal serio.'
      }
    ],

    // Pricing
    priceTitle1: 'Precios',
    priceTitle2: 'transparentes',
    priceSub: '1 foto = 1 crédito · 1 vídeo = 5 créditos. Sin sorpresas.',
    priceReferral: '¿Invitas a un amigo? Tú recibes +50 créditos cuando complete su primera subida.',
    planPopular: 'Más Popular',
    planCtaFree: 'Empezar Gratis',
    planCtaPro: 'Elegir Pro',
    planCtaAgencia: 'Elegir Agencia',
    plans: [
      {
        name: 'Starter', price: '0', period: 'mes',
        credits: '25 créditos',
        features: ['25 fotos/vídeos procesados', 'Análisis con nuestra IA', '2 agencias de stock', 'Panel de revisión', 'Soporte email']
      },
      {
        name: 'Pro', price: '29.99', period: 'mes',
        credits: '500 créditos',
        features: ['500 fotos/vídeos procesados', 'Soporte vídeo 4K/ProRes', 'Gestión de contratos', 'Cola prioritaria', 'Soporte prioritario']
      },
      {
        name: 'Agencia', price: '79.99', period: 'mes',
        credits: '2,000 créditos',
        features: ['2,000 archivos procesados', 'Vídeos ProRes ilimitados', 'Gestor de modelos', 'Cola VIP ultra-rápida', 'API privada + Slack']
      }
    ],

    // Footer CTA
    footerCtaHeadline: 'Deja de escribir keywords.',
    footerCtaHeadlineGrad: 'Vuelve a tu cámara.',
    footerCtaSub: 'Únete a fotógrafos y agencias que ya automatizan su portfolio de stock con StockSling.',
    footerCtaBtn: 'Crear Mi Cuenta Gratis',
    footerPriv: 'Privacidad',
    footerTerms: 'Términos',
    footerCont: 'Contacto',
    footerRights: '© 2026 StockSling. Todos los derechos reservados.',

    // Dashboard Pages & Panel (ES)
    tabUpload: 'Subida',
    tabReview: 'Revisión',
    tabHistory: 'Historial',
    tabIntegrations: 'Integraciones',
    credits: 'créditos',
    dashDestinations: 'Destinos de envío',
    dashProcess: 'Procesar Lote',
    dashDragText: 'Arrastra tus fotos RAW, JPEG o vídeos aquí',
    dashBrowse: 'o haz clic para explorar',
    dashMaxFiles: 'Soporta RAW, JPEG, MP4 y MOV profesionales.',
    dashDropActive: '¡Suelta tus archivos aquí!',
    workSession: 'Sesión de revisión',
    workFiles: 'archivos',
    workSendAll: 'Enviar Lote Completo',
    workReady: 'listos',
    workTitle: 'Título',
    workDescription: 'Descripción',
    workKeywords: 'Palabras Clave (Keywords)',
    workAddKey: 'Añadir',
    workAlertModel: 'Contrato de Modelo Requerido',
    workAlertModelSub: 'Claude ha detectado un rostro reconocible. Debes asociar un contrato legal.',
    workSelectContract: 'Selecciona el contrato para esta foto',
    histTitle: 'Monitor de Envíos en Tiempo Real',
    histLive: 'En tiempo real',
    histRecon: 'Reconectando...',
    histProgress: 'Progreso del Lote',
    histColFile: 'Archivo',
    histColAgency: 'Agencia',
    histColStatus: 'Estado',
    histStatusPending: 'En cola',
    histStatusUploading: 'Subiendo...',
    histStatusCompleted: 'Completado',
    histStatusFailed: 'Error',
    intTitle: 'Ajustes de Integración y Agencias',
    intSub: 'Configura y cifra tus credenciales FTP individuales de forma segura y automatizada.',
    intConnected: 'Cuentas Conectadas',
    intConnect: 'Conectar Cuenta',
    intDisconnect: 'Desconectar',
    intEncrypted: 'Encriptado',
    intNoAgency: 'Ninguna agencia seleccionada',
    intNoAgencySub: 'Haz clic en "Conectar Cuenta" en cualquiera de las agencias de la izquierda para cifrar e ingresar tus llaves FTP individuales.',
    intSecurityHeader: 'Cifrado de grado militar habilitado',
    intUserLabel: 'Usuario o ID de Colaborador',
    intPassLabel: 'Contraseña de FTP o Cuenta',
    intSave: 'Guardar y Cifrar',
    intSaving: 'Cifrando...',
    intCancel: 'Cancelar'
  },
  en: {
    // Navbar
    navFeatures: 'Features',
    navPricing: 'Pricing',
    navAgencies: 'Agencies',
    navLogin: 'Log In',
    navStartFree: 'Get Started Free',
    
    // Hero
    heroBadge: 'Powered by AI: SEO indexing in seconds',
    heroHeadline1: 'From',
    heroHeadline2: 'camera',
    heroHeadline3: 'to all',
    heroHeadline4: 'stock agencies',
    heroHeadline5: 'in one click',
    heroSub: 'Upload your RAW, JPEG photos or high-resolution videos. Our AI analyzes your file, writes commercial SEO titles, and automatically distributes to Adobe Stock, Shutterstock, and Getty Images.',
    heroCta: 'Get Started Free with 25 Credits',
    heroViewHow: 'See how it works →',
    stat1Val: '99.9%', stat1Label: 'Quality preserved',
    stat2Val: '50', stat2Label: 'Keywords per file',
    stat3Val: '< 10s', stat3Label: 'Analysis per file',
    stat4Val: '3', stat4Label: 'Simultaneous agencies',

    // Comparison
    compTitle1: 'The traditional method',
    compTitle2: 'vs',
    compSub: 'Every hour you spend writing keywords is an hour you are not capturing content.',
    compManualTitle: 'Manual Method',
    compManualItems: [
      'Hours thinking of 50 English keywords for every photo or video',
      'Inaccurate translations reducing global sales',
      'Opening 3 or 4 slow agency portals one by one',
      'Rejections due to forgotten model releases',
      'Re-compressing RAW files losing image quality',
      'Uploading heavy videos manually without automation'
    ],
    compFlowTitle: 'StockSling Workflow',
    compFlowItems: [
      'Drag and drop your RAW, JPEG or video files just once',
      'Our AI generates titles and 50 English keywords in seconds',
      'Simultaneous parallel distribution to all your stock agencies',
      'Automatic face detection and model release management',
      'Your pixels travel intact: zero image compression',
      'Automated and optimized upload for professional video clips'
    ],

    // Features
    featHeader: 'Enterprise-grade',
    featHeaderGrad: 'infrastructure',
    featSub: 'Built for professional creators who accept no compromises in quality or speed.',
    featItems: [
      {
        title: '100% Intact Quality',
        desc: 'Binary metadata injection using ExifTool. Your pixels, resolution, and color profiles remain exactly as they left your camera.'
      },
      {
        title: 'RAW & Professional Video Support',
        desc: 'Native support for .CR3, .NEF, .ARW, .DNG, .MP4, .MOV. Forget about pre-converting your files. Our AI analyzes a thumbnail, the original travels untouched.'
      },
      {
        title: '4K & ProRes Videos',
        desc: 'FFmpeg extracts keyframes for the AI. The original video is transferred byte-for-byte with no re-encoding directly to microstock servers.'
      },
      {
        title: 'Model Release Management',
        desc: 'Our AI automatically detects faces. Link signed PDF releases in one click from your contract library. Prevent rejections easily.'
      },
      {
        title: 'Direct Cloud Uploads',
        desc: 'Your files travel directly to S3 from your browser via cryptographically signed URLs. The server never slows down your uploads. Max speed.'
      },
      {
        title: 'Global SEO Indexing',
        desc: 'Our AI automatically generates titles and 50 keywords in native English regardless of your native language. Maximize global sales.'
      },
      {
        title: 'Intelligent Collections',
        desc: 'Organize uploads by projects or shooting sessions. Easily group files and manage complex portfolios comfortably from your panel.'
      },
      {
        title: 'Real-Time Monitoring',
        desc: 'Track the progress of your asynchronous uploads second by second. Full visibility on transfer status for every single agency.'
      }
    ],

    // Agencies Section
    agenciesTitle1: 'Agencies',
    agenciesTitle2: 'compatible and integrated',
    agenciesSub: 'We automatically distribute your photos and videos to the world\'s leading stock marketplaces in parallel.',
    agenciesList: [
      {
        name: 'Adobe Stock',
        status: 'Integrated',
        desc: 'The leading marketplace for creators. Instant metadata syncing, premium support for 4K and ProRes video formats, and the industry\'s most competitive royalties.',
        features: ['Smart Search', 'Native ProRes', 'High Royalties'],
        color: 'from-red-500/20 to-rose-600/20 border-red-500/30 text-red-400'
      },
      {
        name: 'Shutterstock',
        status: 'Integrated',
        desc: 'Absolute global reach with millions of active buyers. Guided by our AI categorization helper to ensure your portfolio appears on top search queries.',
        features: ['AI Indexing', 'Global Reach', 'High Volume'],
        color: 'from-orange-500/20 to-red-600/20 border-orange-500/30 text-orange-400'
      },
      {
        name: 'Getty Images / iStock',
        status: 'Integrated',
        desc: 'Premium editorial and commercial prestige. Automated management of model release contracts and exclusive licensing options straight from your dashboard.',
        features: ['VIP Licensing', 'Model Releases', 'Editorial Market'],
        color: 'from-amber-500/20 to-yellow-600/20 border-amber-500/30 text-amber-400'
      },
      {
        name: 'Depositphotos',
        status: 'Integrated',
        desc: 'A fast-growing marketplace ideal for commercial stock photographers. Mass asynchronous upload optimized without file size limitations.',
        features: ['Async Upload', 'RAW Formats', 'Fast Processing'],
        color: 'from-cyan-500/20 to-blue-600/20 border-cyan-500/30 text-cyan-400'
      },
      {
        name: 'Freepik',
        status: 'Integrated',
        desc: 'Superb for high commercial volume vectors, illustrations, and photos. Direct background upload automation tailored for substantial catalogs.',
        features: ['Batch Upload', 'Photos & Vectors', 'High Turnover'],
        color: 'from-emerald-500/20 to-teal-600/20 border-emerald-500/30 text-emerald-400'
      }
    ],

    // Testimonials
    testTitle1: 'What creators',
    testTitle2: 'are saying',
    testItems: [
      {
        name: 'Carlos M.',
        role: 'Wildlife Photographer',
        text: 'I used to spend my entire weekend indexing sessions. With StockSling, I upload 300 photos on Sunday night and they are on sale by Monday while I keep shooting.'
      },
      {
        name: 'Sofía R.',
        role: 'Freelance Videographer',
        text: 'The ProRes support is what made me switch. My video clips reach Adobe Stock exactly as I exported them from Final Cut. No quality loss, no compromises.'
      },
      {
        name: 'Agencia Lumina',
        role: 'Multimedia Production',
        text: 'We process 1,800 files monthly for 12 photographers. The Agency plan covers everything. Auto face detection for model releases saved us from serious legal headaches.'
      }
    ],

    // Pricing
    priceTitle1: 'Transparent',
    priceTitle2: 'pricing',
    priceSub: '1 photo = 1 credit · 1 video = 5 credits. No hidden surprises.',
    priceReferral: 'Inviting a friend? You receive +50 credits once they complete their first successful upload.',
    planPopular: 'Most Popular',
    planCtaFree: 'Start Free',
    planCtaPro: 'Choose Pro',
    planCtaAgencia: 'Choose Agency',
    plans: [
      {
        name: 'Starter', price: '0', period: 'mo',
        credits: '25 credits',
        features: ['25 photos/videos processed', 'Analysis with our AI', '2 stock agencies', 'Review dashboard', 'Email support']
      },
      {
        name: 'Pro', price: '29.99', period: 'mo',
        credits: '500 credits',
        features: ['500 photos/videos processed', '4K/ProRes video support', 'Contract management', 'Priority queue', 'Priority support']
      },
      {
        name: 'Agency', price: '79.99', period: 'mo',
        credits: '2,000 credits',
        features: ['2,000 files processed', 'Unlimited ProRes video uploads', 'Model manager', 'VIP ultra-fast queue', 'Private API + Slack']
      }
    ],

    // Footer CTA
    footerCtaHeadline: 'Stop writing keywords.',
    footerCtaHeadlineGrad: 'Get back to your camera.',
    footerCtaSub: 'Join photographers and agencies already automating their stock portfolios with StockSling.',
    footerCtaBtn: 'Create My Free Account',
    footerPriv: 'Privacy',
    footerTerms: 'Terms',
    footerCont: 'Contact',
    footerRights: '© 2026 StockSling. All rights reserved.',

    // Dashboard Pages & Panel (EN)
    tabUpload: 'Upload',
    tabReview: 'Review',
    tabHistory: 'History',
    tabIntegrations: 'Integrations',
    credits: 'credits',
    dashDestinations: 'Send Destinations',
    dashProcess: 'Process Batch',
    dashDragText: 'Drag your RAW, JPEG photos or videos here',
    dashBrowse: 'or click to browse',
    dashMaxFiles: 'Supports professional RAW, JPEG, MP4, and MOV formats.',
    dashDropActive: 'Drop your files here!',
    workSession: 'Review session',
    workFiles: 'files',
    workSendAll: 'Send Complete Batch',
    workReady: 'ready',
    workTitle: 'Title',
    workDescription: 'Description',
    workKeywords: 'Keywords',
    workAddKey: 'Add',
    workAlertModel: 'Model Release Required',
    workAlertModelSub: 'Claude has detected a recognizable face. You must link a legal contract.',
    workSelectContract: 'Select model release contract for this file',
    histTitle: 'Real-Time Upload Monitor',
    histLive: 'Real-time sync',
    histRecon: 'Reconnecting...',
    histProgress: 'Batch Progress',
    histColFile: 'File',
    histColAgency: 'Agency',
    histColStatus: 'Status',
    histStatusPending: 'Pending',
    histStatusUploading: 'Uploading...',
    histStatusCompleted: 'Completed',
    histStatusFailed: 'Failed',
    intTitle: 'Integration & Agency Settings',
    intSub: 'Configure and encrypt your individual FTP credentials securely and automatically.',
    intConnected: 'Connected Accounts',
    intConnect: 'Connect Account',
    intDisconnect: 'Disconnect',
    intEncrypted: 'Encrypted',
    intNoAgency: 'No agency selected',
    intNoAgencySub: 'Click "Connect Account" on any agency on the left to encrypt and enter your individual FTP credentials.',
    intSecurityHeader: 'Military-grade encryption active',
    intUserLabel: 'Username or Contributor ID',
    intPassLabel: 'FTP or Account Password',
    intSave: 'Save & Encrypt',
    intSaving: 'Encrypting...',
    intCancel: 'Cancel'
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('stocksling_lang') || LANGUAGES.ES;
  });

  useEffect(() => {
    localStorage.setItem('stocksling_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => (prev === LANGUAGES.ES ? LANGUAGES.EN : LANGUAGES.ES));
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
