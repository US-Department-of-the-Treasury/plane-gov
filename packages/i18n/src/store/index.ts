import IntlMessageFormat from "intl-messageformat";
import { get as lodashGet, merge } from "lodash-es";
import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
// constants
import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES, LANGUAGE_STORAGE_KEY, ETranslationFiles } from "../constants";

// SSR-safe storage that only uses localStorage in browser
const createSSRSafeStorage = (): StateStorage => {
  if (typeof window === "undefined") {
    // Return a no-op storage for SSR
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return localStorage;
};
// core translations imports
import { enCore, locales } from "../locales";
// types
import type { TLanguage, ILanguageOption, ITranslations } from "../types";

/**
 * Internal state that isn't exposed to consumers
 */
interface InternalState {
  // Core translations that are always loaded
  coreTranslations: ITranslations;
  // List of translations for each language
  translations: ITranslations;
  // Cache for IntlMessageFormat instances
  messageCache: Map<string, IntlMessageFormat>;
  // Set of loaded languages
  loadedLanguages: Set<TLanguage>;
}

/**
 * Public state exposed to consumers
 */
interface TranslationState {
  // Current language
  currentLocale: TLanguage;
  // Loading state
  isLoading: boolean;
  isInitialized: boolean;
  // Internal state
  _internal: InternalState;
}

/**
 * Actions for managing translations
 */
interface TranslationActions {
  // Public methods
  t: (key: string, params?: Record<string, unknown>) => string;
  setLanguage: (lng: TLanguage) => Promise<void>;
  availableLanguages: ILanguageOption[];

  // Internal methods
  _initialize: () => Promise<void>;
  _isValidLanguage: (lang: string | null) => lang is TLanguage;
  _getCacheKey: (key: string, locale: TLanguage) => string;
  _getMessageInstance: (key: string, locale: TLanguage) => IntlMessageFormat | null;
  _importAndMergeFiles: (language: TLanguage, files: string[]) => Promise<{ default: any }>;
  _importLanguageFile: (language: TLanguage) => Promise<{ default: any }>;
  _loadLanguageTranslations: (language: TLanguage) => Promise<void>;
  _loadPrimaryLanguages: () => Promise<void>;
  _loadRemainingLanguages: () => void;
}

export type TranslationStoreType = TranslationState & TranslationActions;

// Helper to read locale from localStorage (for initial hydration)
function getInitialLocale(): TLanguage {
  if (typeof window === "undefined") return FALLBACK_LANGUAGE;
  const savedLocale = localStorage.getItem(LANGUAGE_STORAGE_KEY) as TLanguage;
  // Basic validation - full validation happens in store
  if (savedLocale && SUPPORTED_LANGUAGES.some((l) => l.value === savedLocale)) {
    return savedLocale;
  }
  return FALLBACK_LANGUAGE;
}

/**
 * Zustand store for handling translations and language changes in the application
 * Provides methods to translate keys with params and change the language
 * Uses IntlMessageFormat to format the translations
 */
export const useTranslationStore = create<TranslationStoreType>()(
  persist(
    (set, get) => ({
      // Public state
      currentLocale: getInitialLocale(),
      isLoading: true,
      isInitialized: false,

      // Internal state
      _internal: {
        coreTranslations: {
          en: enCore,
        },
        translations: {
          en: enCore,
        },
        messageCache: new Map<string, IntlMessageFormat>(),
        loadedLanguages: new Set<TLanguage>(),
      },

      // Public methods
      availableLanguages: SUPPORTED_LANGUAGES,

      /**
       * Translates a key with params using the current locale
       * Falls back to the default language if the translation is not found
       * Returns the key itself if the translation is not found
       */
      t: (key: string, params?: Record<string, unknown>): string => {
        const state = get();
        try {
          // Try current locale
          let formatter = state._getMessageInstance(key, state.currentLocale);

          // Fallback to default language if necessary
          if (!formatter && state.currentLocale !== FALLBACK_LANGUAGE) {
            formatter = state._getMessageInstance(key, FALLBACK_LANGUAGE);
          }

          // If we have a formatter, use it
          if (formatter) {
            return formatter.format(params || {}) as string;
          }

          // Last resort: return the key itself
          return key;
        } catch (error) {
          console.error(`Translation error for key "${key}":`, error);
          return key;
        }
      },

      /**
       * Sets the current language and updates the translations
       */
      setLanguage: async (lng: TLanguage): Promise<void> => {
        const state = get();
        try {
          if (!state._isValidLanguage(lng)) {
            throw new Error(`Invalid language: ${lng}`);
          }

          // Safeguard in case background loading failed
          if (!state._internal.loadedLanguages.has(lng)) {
            await state._loadLanguageTranslations(lng);
          }

          if (typeof window !== "undefined") {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
            document.documentElement.lang = lng;
          }

          set((state) => ({
            currentLocale: lng,
            _internal: {
              ...state._internal,
              messageCache: new Map(), // Clear cache when language changes
            },
          }));
        } catch (error) {
          console.error("Failed to set language:", error);
        }
      },

      // Internal methods
      _initialize: async (): Promise<void> => {
        try {
          // Set initialized to true (Core translations are already loaded)
          set({ isInitialized: true });

          // Load current and fallback languages in parallel
          await get()._loadPrimaryLanguages();

          // Load all remaining languages in parallel
          get()._loadRemainingLanguages();
        } catch (error) {
          console.error("Failed in translation initialization:", error);
          set({ isLoading: false });
        }
      },

      _isValidLanguage: (lang: string | null): lang is TLanguage => {
        return lang !== null && SUPPORTED_LANGUAGES.some((l) => l.value === lang);
      },

      _getCacheKey: (key: string, locale: TLanguage): string => {
        return `${locale}:${key}`;
      },

      _getMessageInstance: (key: string, locale: TLanguage): IntlMessageFormat | null => {
        const state = get();
        const cacheKey = state._getCacheKey(key, locale);

        // Check if the cache already has the key
        if (state._internal.messageCache.has(cacheKey)) {
          return state._internal.messageCache.get(cacheKey) || null;
        }

        // Get the message from the translations
        const message = lodashGet(state._internal.translations[locale], key);
        if (typeof message !== "string") return null;

        try {
          const formatter = new IntlMessageFormat(message, locale);
          // Update cache
          state._internal.messageCache.set(cacheKey, formatter);
          return formatter;
        } catch (error) {
          console.error(`Failed to create message formatter for key "${key}":`, error);
          return null;
        }
      },

      _importAndMergeFiles: async (language: TLanguage, files: string[]) => {
        try {
          const localeData = locales[language as keyof typeof locales];
          if (!localeData) {
            throw new Error(`Locale data not found for language: ${language}`);
          }

          // Filter out files that don't exist for this language
          const availableFiles = files.filter((file) => {
            const fileKey = file as keyof typeof localeData;
            return fileKey in localeData;
          });

          const importPromises = availableFiles.map((file) => {
            const fileKey = file as keyof typeof localeData;
            return localeData[fileKey]();
          });

          const modules = await Promise.all(importPromises);
          const merged = modules.reduce((acc: any, module: any) => merge(acc, module.default), {});
          return { default: merged };
        } catch (error) {
          throw new Error(`Failed to import and merge files for ${language}: ${error}`);
        }
      },

      _importLanguageFile: async (language: TLanguage) => {
        const files = Object.values(ETranslationFiles);
        return get()._importAndMergeFiles(language, files);
      },

      _loadLanguageTranslations: async (language: TLanguage): Promise<void> => {
        const state = get();
        // Skip if already loaded
        if (state._internal.loadedLanguages.has(language)) return;

        try {
          const translations = await state._importLanguageFile(language);

          set((state) => {
            // Use lodash merge for deep merging
            const mergedTranslations = merge(
              {},
              state._internal.coreTranslations[language] || {},
              translations.default
            );

            return {
              _internal: {
                ...state._internal,
                translations: {
                  ...state._internal.translations,
                  [language]: mergedTranslations,
                },
                loadedLanguages: new Set([...state._internal.loadedLanguages, language]),
                messageCache: new Map(), // Clear cache when new translations are loaded
              },
            };
          });
        } catch (error) {
          console.error(`Failed to load translations for ${language}:`, error);
        }
      },

      _loadPrimaryLanguages: async (): Promise<void> => {
        const state = get();
        try {
          // Load current and fallback languages in parallel
          const languagesToLoad = new Set<TLanguage>([state.currentLocale]);
          // Add fallback language only if different from current
          if (state.currentLocale !== FALLBACK_LANGUAGE) {
            languagesToLoad.add(FALLBACK_LANGUAGE);
          }
          // Load all primary languages in parallel
          const loadPromises = Array.from(languagesToLoad).map((lang) => state._loadLanguageTranslations(lang));
          await Promise.all(loadPromises);
          // Update loading state
          set({ isLoading: false });
        } catch (error) {
          console.error("Failed to load primary languages:", error);
          set({ isLoading: false });
        }
      },

      _loadRemainingLanguages: (): void => {
        const state = get();
        const remainingLanguages = SUPPORTED_LANGUAGES.map((lang) => lang.value).filter(
          (lang) =>
            !state._internal.loadedLanguages.has(lang) &&
            lang !== state.currentLocale &&
            lang !== FALLBACK_LANGUAGE
        );
        // Load all remaining languages in parallel
        Promise.all(remainingLanguages.map((lang) => state._loadLanguageTranslations(lang))).catch((error) => {
          console.error("Failed to load some remaining languages:", error);
        });
      },
    }),
    {
      name: "plane-translation-storage",
      storage: createJSONStorage(createSSRSafeStorage),
      // Only persist the current locale, not translations or cache
      partialize: (state) => ({
        currentLocale: state.currentLocale,
      }),
      // Skip hydration on the server to avoid SSR issues
      skipHydration: typeof window === "undefined",
    }
  )
);

/**
 * Legacy class wrapper for backward compatibility
 * @deprecated Use useTranslationStore hook directly
 */
export class TranslationStore {
  private unsubscribe: () => void;

  constructor() {
    // Subscribe to store changes
    this.unsubscribe = useTranslationStore.subscribe(() => {
      // Trigger re-render for MobX observers
    });

    // Initialize translations on first instantiation
    if (!useTranslationStore.getState().isInitialized) {
      useTranslationStore.getState()._initialize();
    }
  }

  get currentLocale(): TLanguage {
    return useTranslationStore.getState().currentLocale;
  }

  get isLoading(): boolean {
    return useTranslationStore.getState().isLoading;
  }

  get isInitialized(): boolean {
    return useTranslationStore.getState().isInitialized;
  }

  get availableLanguages(): ILanguageOption[] {
    return useTranslationStore.getState().availableLanguages;
  }

  t(key: string, params?: Record<string, unknown>): string {
    return useTranslationStore.getState().t(key, params);
  }

  async setLanguage(lng: TLanguage): Promise<void> {
    return useTranslationStore.getState().setLanguage(lng);
  }

  destroy(): void {
    this.unsubscribe();
  }
}
