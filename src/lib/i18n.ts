import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import fr from "@/locales/fr.json";
import en from "@/locales/en.json";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: { fr: { translation: fr }, en: { translation: en } },
      fallbackLng: "fr",
      lng: "fr",
      supportedLngs: ["fr", "en"],
      load: "languageOnly",
      nonExplicitSupportedLngs: true,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
      returnEmptyString: false,
    });
}

export default i18n;
