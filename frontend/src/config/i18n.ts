import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// --- Vietnamese (vi-VN) ---
import viCommon from '../locales/vi-VN/common.json';
import viAuth from '../locales/vi-VN/auth.json';
import viCustomer from '../locales/vi-VN/customer.json';
import viStaff from '../locales/vi-VN/staff.json';
import viAdmin from '../locales/vi-VN/admin.json';

// --- English (en-US) ---
import enCommon from '../locales/en-US/common.json';
import enAuth from '../locales/en-US/auth.json';
import enCustomer from '../locales/en-US/customer.json';
import enStaff from '../locales/en-US/staff.json';
import enAdmin from '../locales/en-US/admin.json';

const STORAGE_LANG_KEY = 'foodie_lang';

const savedLang = localStorage.getItem(STORAGE_LANG_KEY) || 'vi-VN';

i18n.use(initReactI18next).init({
    resources: {
        'vi-VN': {
            common: viCommon,
            auth: viAuth,
            customer: viCustomer,
            staff: viStaff,
            admin: viAdmin,
        },
        'en-US': {
            common: enCommon,
            auth: enAuth,
            customer: enCustomer,
            staff: enStaff,
            admin: enAdmin,
        },
    },
    lng: savedLang,
    fallbackLng: 'en-US',
    ns: ['common', 'auth', 'customer', 'staff', 'admin'],
    defaultNS: 'common',
    interpolation: {
        escapeValue: false, // React already escapes
    },
});

// Persist language selection
i18n.on('languageChanged', (lng) => {
    localStorage.setItem(STORAGE_LANG_KEY, lng);
});

export default i18n;
