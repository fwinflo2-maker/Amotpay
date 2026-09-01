import { useTranslation } from 'react-i18next';

const LANGS = ['en', 'fr', 'es', 'pt', 'de', 'ar'] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      className="lang-switch"
      value={i18n.language.split('-')[0]}
      onChange={(e) => {
        const lang = e.target.value;
        localStorage.setItem('amotpay_lang', lang);
        void i18n.changeLanguage(lang);
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      }}
      aria-label="Language"
    >
      {LANGS.map((lang) => (
        <option key={lang} value={lang}>{lang.toUpperCase()}</option>
      ))}
    </select>
  );
}
