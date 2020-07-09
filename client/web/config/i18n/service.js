import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationBackend from 'i18next-http-backend';
import browserLanguageDetector from 'i18next-browser-languagedetector';

const xhrOptions = {
  loadPath: '/locales/{{lng}}/{{ns}}.json',
};

const languageDetectionOptions = {
  order: ['navigator', 'htmlTag'],
};

i18n
  .use(translationBackend)
  .use(browserLanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    backend: xhrOptions,
    detection: languageDetectionOptions,
  });

export default i18n;
