import { ar, Translations } from "./ar";

// Currently only Arabic is supported as per requirements
export const translations: Record<string, Translations> = {
  ar,
};

export const defaultLanguage = "ar";

export function t(key: string, params?: Record<string, string | number | boolean>): string {
  const lang = translations[defaultLanguage];
  const keys = key.split(".");
  
  let value: unknown = lang;
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key; // Return key if not found
    }
  }

  // Handle returnObjects flag for arrays
  if (params?.returnObjects === true && Array.isArray(value)) {
    return value.join('\n');
  }

  if (typeof value !== "string") return key;

  // Replace parameters like {count}
  if (params) {
    return Object.entries(params).reduce(
      (str, [paramKey, paramValue]) =>
        str.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue)),
      value
    );
  }

  return value;
}

export function tArray(key: string): string[] {
  const lang = translations[defaultLanguage];
  const keys = key.split(".");
  
  let value: unknown = lang;
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return [key]; // Return key if not found
    }
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [String(value)];
}
