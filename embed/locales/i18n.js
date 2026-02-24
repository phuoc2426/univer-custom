// =====================================================
// I18N - Internationalization runtime
// =====================================================
// Provides t(key, params?) function for locale string lookup.
// Must be loaded AFTER locale files (vi-VN.js, en-US.js, etc.)
// Usage:
//   UNIVER_I18N.setLocale('en-US');
//   UNIVER_I18N.t('sidebar.title')              => "Spreadsheet Editor Tools"
//   UNIVER_I18N.t('success.dataInserted', {count: '5', cell: 'A1'})
//                                                => "✅ Inserted 5 rows from A1"
// =====================================================
(function (global) {
  const I18N = {};

  // Default locale
  let currentLocale = "vi-VN";
  const fallbackLocale = "en-US";

  /**
   * Set the active locale
   * @param {string} locale - e.g. 'en-US', 'vi-VN', 'zh-CN'
   */
  I18N.setLocale = function (locale) {
    const locales = global.UNIVER_LOCALES || {};
    if (locales[locale]) {
      currentLocale = locale;
    } else {
      console.warn(
        `[i18n] Locale "${locale}" not found. Available: ${Object.keys(locales).join(", ")}`,
      );
      // Try partial match (e.g. 'en' -> 'en-US')
      const match = Object.keys(locales).find((k) => k.startsWith(locale));
      if (match) {
        currentLocale = match;
        console.log(`[i18n] Using closest match: ${match}`);
      }
    }
  };

  /**
   * Get current locale code
   * @returns {string}
   */
  I18N.getLocale = function () {
    return currentLocale;
  };

  /**
   * Get list of available locales
   * @returns {string[]}
   */
  I18N.getAvailableLocales = function () {
    return Object.keys(global.UNIVER_LOCALES || {});
  };

  /**
   * Get nested value from object using dot notation
   * @param {object} obj
   * @param {string} path - e.g. 'sidebar.title'
   * @returns {*}
   */
  function getNestedValue(obj, path) {
    if (!path || !obj) return undefined;
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== "object") return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Translate a key with optional parameter interpolation
   * @param {string} key - dot-notation key e.g. 'sidebar.title'
   * @param {object} [params] - replacement values e.g. {name: 'Test', count: '5'}
   * @returns {string}
   */
  I18N.t = function (key, params) {
    const locales = global.UNIVER_LOCALES || {};

    // Try current locale
    let text = getNestedValue(locales[currentLocale], key);

    // Fallback to en-US
    if (text === undefined && currentLocale !== fallbackLocale) {
      text = getNestedValue(locales[fallbackLocale], key);
    }

    // Fallback to vi-VN
    if (text === undefined && currentLocale !== "vi-VN") {
      text = getNestedValue(locales["vi-VN"], key);
    }

    // If still not found, return the key itself
    if (text === undefined) return key;

    // Interpolate {param} placeholders
    if (params && typeof text === "string") {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp("\\{" + k + "\\}", "g"), String(v));
      }
    }

    return text;
  };

  /**
   * Map toolkit locale code to Univer core LocaleType key
   * e.g. 'vi-VN' -> 'VI_VN', 'en-US' -> 'EN_US', 'zh-CN' -> 'ZH_CN'
   * @param {string} locale
   * @returns {string}
   */
  I18N.toUniverLocaleKey = function (locale) {
    if (!locale) return "EN_US";
    return locale.replace("-", "_").toUpperCase();
  };

  // Export
  global.UNIVER_I18N = I18N;
})(window);
