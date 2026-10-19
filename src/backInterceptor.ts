/**
 * Ekran ichidagi o'z "orqaga" tarixi bor bo'limlar (masalan O'rganish) uchun.
 * Android "orqaga" tugmasi bosilganda App avval shu ushlagichni so'raydi:
 * true qaytsa — ichki sahifadan chiqildi, ekran almashmaydi.
 */
let interceptor: (() => boolean) | null = null;

export function setBackInterceptor(fn: (() => boolean) | null) {
  interceptor = fn;
}

export function runBackInterceptor(): boolean {
  return interceptor ? interceptor() : false;
}
