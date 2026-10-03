export function normalizeR3SerbianCopy(value: string) {
  return value
    .replace(/\bInlay-a\b/gi, "inleja")
    .replace(/\bOnlay-a\b/gi, "onleja")
    .replace(/\bInlay\b/gi, "inlej")
    .replace(/\bOnlay\b/gi, "onlej")
    .replace(/\bMargin Line\b/gi, "linija završetka preparacije")
    .replace(/\bmesh objekat\b/gi, "mrežni objekat");
}

export function normalizeImplantSerbianCopy(value: string) {
  return value
    .replace(/indeksirani sintetički scan body/gi, "indeksirano sintetičko skenirajuće telo (scan body)")
    .replace(/indeksirani scan body/gi, "indeksirano skenirajuće telo (scan body)")
    .replace(/scan body-ja/gi, "skenirajućeg tela (scan body)")
    .replace(/scan body-jem/gi, "skenirajućim telom (scan body)")
    .replace(/scan body-ju/gi, "skenirajućem telu (scan body)")
    .replace(/scan body(?!\))/gi, "skenirajuće telo (scan body)")
    .replace(/abatmenta/gi, "suprastrukture (abutment)")
    .replace(/abatmentu/gi, "suprastrukturi (abutment)")
    .replace(/abatmentom/gi, "suprastrukturom (abutment)")
    .replace(/pregledajte i prilagodite abatment/gi, "pregledajte i prilagodite suprastrukturu (abutment)")
    .replace(/izaberite abatment/gi, "izaberite suprastrukturu (abutment)")
    .replace(/\babatment\b/gi, "suprastruktura (abutment)")
    .replace(/nicanja/gi, "izranjanja")
    .replace(/nicanje/gi, "izranjanje");
}

/** Normalize only localized Serbian fields in nested content records. */
export function mapSerbianFields<T>(value: T, normalize: (text: string) => string): T {
  if (Array.isArray(value)) return value.map((item) => mapSerbianFields(item, normalize)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      key === "sr" && typeof child === "string" ? normalize(child)
        : key === "sr" && Array.isArray(child) ? child.map((item) => typeof item === "string" ? normalize(item) : mapSerbianFields(item, normalize))
          : mapSerbianFields(child, normalize),
    ])) as T;
  }
  return value;
}
