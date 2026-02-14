import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import hi from './locales/hi.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ar from './locales/ar.json';

// Translation resources
const resources = {
  en: {
    translation: en,
  },
  hi: {
    translation: hi,
  },
  es: {
    translation: es,
  },
  fr: {
    translation: fr,
  },
  de: {
    translation: de,
  },
  zh: {
    translation: zh,
  },
  ja: {
    translation: ja,
  },
  ar: {
    translation: ar,
  },
};

// Supported languages
export const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

// Initialize i18n
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    
    interpolation: {
      escapeValue: false, // React already escapes
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    backend: {
      loadPath: '/i18n/locales/{{lng}}.json',
    },

    react: {
      useSuspense: false,
    },
  });

// Export i18n instance
export default i18n;

// Helper functions
export const getCurrentLanguage = (): string => {
  return i18n.language;
};

export const changeLanguage = async (language: string): Promise<void> => {
  await i18n.changeLanguage(language);
  localStorage.setItem('i18nextLng', language);
};

export const getLanguageDirection = (language: string): 'ltr' | 'rtl' => {
  return ['ar'].includes(language) ? 'rtl' : 'ltr';
};

export const getLanguageName = (code: string): string => {
  const language = supportedLanguages.find(lang => lang.code === code);
  return language ? language.name : code;
};

export const getLanguageFlag = (code: string): string => {
  const language = supportedLanguages.find(lang => lang.code === code);
  return language ? language.flag : '';
};

// Custom hooks
export const useTranslation = () => {
  const { t, i18n } = i18next.useTranslation();
  
  return {
    t,
    i18n,
    currentLanguage: i18n.language,
    changeLanguage: i18n.changeLanguage,
    supportedLanguages,
    getLanguageDirection,
    getLanguageName,
    getLanguageFlag,
  };
};

// Translation keys for common UI elements
export const translationKeys = {
  // Navigation
  nav: {
    home: 'nav.home',
    dashboard: 'nav.dashboard',
    chat: 'nav.chat',
    jobs: 'nav.jobs',
    investments: 'nav.investments',
    payments: 'nav.payments',
    profile: 'nav.profile',
    settings: 'nav.settings',
    logout: 'nav.logout',
    login: 'nav.login',
    register: 'nav.register',
  },

  // Common
  common: {
    loading: 'common.loading',
    error: 'common.error',
    success: 'common.success',
    warning: 'common.warning',
    info: 'common.info',
    cancel: 'common.cancel',
    save: 'common.save',
    delete: 'common.delete',
    edit: 'common.edit',
    view: 'common.view',
    search: 'common.search',
    filter: 'common.filter',
    sort: 'common.sort',
    refresh: 'common.refresh',
    back: 'common.back',
    next: 'common.next',
    previous: 'common.previous',
    submit: 'common.submit',
    reset: 'common.reset',
    close: 'common.close',
    yes: 'common.yes',
    no: 'common.no',
    ok: 'common.ok',
    done: 'common.done',
    retry: 'common.retry',
    continue: 'common.continue',
    finish: 'common.finish',
  },

  // Auth
  auth: {
    login: 'auth.login',
    register: 'auth.register',
    logout: 'auth.logout',
    email: 'auth.email',
    password: 'auth.password',
    confirmPassword: 'auth.confirmPassword',
    forgotPassword: 'auth.forgotPassword',
    resetPassword: 'auth.resetPassword',
    rememberMe: 'auth.rememberMe',
    loginSuccess: 'auth.loginSuccess',
    loginError: 'auth.loginError',
    registerSuccess: 'auth.registerSuccess',
    registerError: 'auth.registerError',
    invalidCredentials: 'auth.invalidCredentials',
    emailRequired: 'auth.emailRequired',
    passwordRequired: 'auth.passwordRequired',
    passwordMismatch: 'auth.passwordMismatch',
    emailInvalid: 'auth.emailInvalid',
    passwordTooShort: 'auth.passwordTooShort',
  },

  // User
  user: {
    profile: 'user.profile',
    name: 'user.name',
    email: 'user.email',
    phone: 'user.phone',
    address: 'user.address',
    resume: 'user.resume',
    aadhaar: 'user.aadhaar',
    education: 'user.education',
    experience: 'user.experience',
    skills: 'user.skills',
    preferences: 'user.preferences',
    notifications: 'user.notifications',
    privacy: 'user.privacy',
    security: 'user.security',
    accountSettings: 'user.accountSettings',
    updateProfile: 'user.updateProfile',
    updateSuccess: 'user.updateSuccess',
    updateError: 'user.updateError',
  },

  // Chat
  chat: {
    messages: 'chat.messages',
    sendMessage: 'chat.sendMessage',
    typeMessage: 'chat.typeMessage',
    typing: 'chat.typing',
    online: 'chat.online',
    offline: 'chat.offline',
    lastSeen: 'chat.lastSeen',
    newMessage: 'chat.newMessage',
    messageSent: 'chat.messageSent',
    messageError: 'chat.messageError',
    fileUpload: 'chat.fileUpload',
    emoji: 'chat.emoji',
    searchMessages: 'chat.searchMessages',
    clearChat: 'chat.clearChat',
    muteNotifications: 'chat.muteNotifications',
    unmuteNotifications: 'chat.unmuteNotifications',
  },

  // Jobs
  jobs: {
    title: 'jobs.title',
    company: 'jobs.company',
    location: 'jobs.location',
    type: 'jobs.type',
    workMode: 'jobs.workMode',
    experience: 'jobs.experience',
    salary: 'jobs.salary',
    skills: 'jobs.skills',
    education: 'jobs.education',
    description: 'jobs.description',
    requirements: 'jobs.requirements',
    benefits: 'jobs.benefits',
    apply: 'jobs.apply',
    save: 'jobs.save',
    unsave: 'jobs.unsave',
    applicationSent: 'jobs.applicationSent',
    applicationError: 'jobs.applicationError',
    noJobsFound: 'jobs.noJobsFound',
    searchJobs: 'jobs.searchJobs',
    filterJobs: 'jobs.filterJobs',
    sortBy: 'jobs.sortBy',
    relevance: 'jobs.relevance',
    date: 'jobs.date',
    salary: 'jobs.salary',
    location: 'jobs.location',
    company: 'jobs.company',
  },

  // Investments
  investments: {
    amount: 'investments.amount',
    duration: 'investments.duration',
    interestRate: 'investments.interestRate',
    monthlyPayment: 'investments.monthlyPayment',
    totalPayment: 'investments.totalPayment',
    status: 'investments.status',
    active: 'investments.active',
    completed: 'investments.completed',
    pending: 'investments.pending',
    cancelled: 'investments.cancelled',
    invest: 'investments.invest',
    investSuccess: 'investments.investSuccess',
    investError: 'investments.investError',
    noInvestments: 'investments.noInvestments',
    createInvestment: 'investments.createInvestment',
    investmentDetails: 'investments.investmentDetails',
    investmentHistory: 'investments.investmentHistory',
  },

  // Payments
  payments: {
    amount: 'payments.amount',
    method: 'payments.method',
    status: 'payments.status',
    date: 'payments.date',
    description: 'payments.description',
    pay: 'payments.pay',
    paySuccess: 'payments.paySuccess',
    payError: 'payments.payError',
    noPayments: 'payments.noPayments',
    paymentHistory: 'payments.paymentHistory',
    paymentDetails: 'payments.paymentDetails',
    receipt: 'payments.receipt',
    downloadReceipt: 'payments.downloadReceipt',
    razorpay: 'payments.razorpay',
    creditCard: 'payments.creditCard',
    debitCard: 'payments.debitCard',
    netBanking: 'payments.netBanking',
    upi: 'payments.upi',
    wallet: 'payments.wallet',
  },

  // Repayments
  repayments: {
    dueDate: 'repayments.dueDate',
    amount: 'repayments.amount',
    status: 'repayments.status',
    paid: 'repayments.paid',
    unpaid: 'repayments.unpaid',
    overdue: 'repayments.overdue',
    payNow: 'repayments.payNow',
    paySuccess: 'repayments.paySuccess',
    payError: 'repayments.payError',
    schedule: 'repayments.schedule',
    history: 'repayments.history',
    overview: 'repayments.overview',
    nextPayment: 'repayments.nextPayment',
    totalPaid: 'repayments.totalPaid',
    totalDue: 'repayments.totalDue',
    noRepayments: 'repayments.noRepayments',
  },

  // Admin
  admin: {
    dashboard: 'admin.dashboard',
    users: 'admin.users',
    jobs: 'admin.jobs',
    analytics: 'admin.analytics',
    settings: 'admin.settings',
    totalUsers: 'admin.totalUsers',
    activeUsers: 'admin.activeUsers',
    totalJobs: 'admin.totalJobs',
    activeJobs: 'admin.activeJobs',
    totalInvestments: 'admin.totalInvestments',
    totalRepayments: 'admin.totalRepayments',
    systemHealth: 'admin.systemHealth',
    cpuUsage: 'admin.cpuUsage',
    memoryUsage: 'admin.memoryUsage',
    diskUsage: 'admin.diskUsage',
    activeConnections: 'admin.activeConnections',
    databaseConnections: 'admin.databaseConnections',
    cacheHitRate: 'admin.cacheHitRate',
    exportData: 'admin.exportData',
    importData: 'admin.importData',
    backup: 'admin.backup',
    restore: 'admin.restore',
    maintenance: 'admin.maintenance',
    logs: 'admin.logs',
    audit: 'admin.audit',
    security: 'admin.security',
    notifications: 'admin.notifications',
    emails: 'admin.emails',
    sms: 'admin.sms',
    push: 'admin.push',
  },

  // Errors
  errors: {
    networkError: 'errors.networkError',
    serverError: 'errors.serverError',
    notFound: 'errors.notFound',
    unauthorized: 'errors.unauthorized',
    forbidden: 'errors.forbidden',
    validationError: 'errors.validationError',
    timeoutError: 'errors.timeoutError',
    unknownError: 'errors.unknownError',
    fileUploadError: 'errors.fileUploadError',
    fileSizeError: 'errors.fileSizeError',
    fileTypeError: 'errors.fileTypeError',
    emailExists: 'errors.emailExists',
    userNotFound: 'errors.userNotFound',
    jobNotFound: 'errors.jobNotFound',
    investmentNotFound: 'errors.investmentNotFound',
    paymentFailed: 'errors.paymentFailed',
    chatError: 'errors.chatError',
  },

  // Success messages
  success: {
    profileUpdated: 'success.profileUpdated',
    passwordChanged: 'success.passwordChanged',
    emailVerified: 'success.emailVerified',
    phoneVerified: 'success.phoneVerified',
    investmentCreated: 'success.investmentCreated',
    paymentSuccessful: 'success.paymentSuccessful',
    applicationSent: 'success.applicationSent',
    jobSaved: 'success.jobSaved',
    messageSent: 'success.messageSent',
    fileUploaded: 'success.fileUploaded',
    settingsSaved: 'success.settingsSaved',
    notificationEnabled: 'success.notificationEnabled',
    notificationDisabled: 'success.notificationDisabled',
  },

  // Form validation
  validation: {
    required: 'validation.required',
    email: 'validation.email',
    minLength: 'validation.minLength',
    maxLength: 'validation.maxLength',
    pattern: 'validation.pattern',
    number: 'validation.number',
    positive: 'validation.positive',
    integer: 'validation.integer',
    decimal: 'validation.decimal',
    url: 'validation.url',
    phone: 'validation.phone',
    date: 'validation.date',
    future: 'validation.future',
    past: 'validation.past',
    fileSize: 'validation.fileSize',
    fileType: 'validation.fileType',
  },
};

// Export default i18n
export { i18n };
