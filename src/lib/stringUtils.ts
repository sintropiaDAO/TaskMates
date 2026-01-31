/**
 * Remove accents/diacritics from a string for accent-insensitive comparison
 * e.g., "água" -> "agua", "música" -> "musica"
 */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Check if str1 contains str2, ignoring accents and case
 */
export function containsIgnoreAccents(str1: string, str2: string): boolean {
  const normalized1 = removeAccents(str1.toLowerCase());
  const normalized2 = removeAccents(str2.toLowerCase());
  return normalized1.includes(normalized2) || normalized2.includes(normalized1);
}

/**
 * Calculate similarity between two strings, ignoring accents
 * Returns a value between 0 and 1
 */
export function calculateSimilarityIgnoreAccents(str1: string, str2: string): number {
  const normalized1 = removeAccents(str1.toLowerCase());
  const normalized2 = removeAccents(str2.toLowerCase());
  
  const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
  const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;
  
  if (longer.length === 0) return 1.0;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  return matches / longer.length;
}

/**
 * Check if two strings match exactly, ignoring accents and case
 */
export function equalsIgnoreAccents(str1: string, str2: string): boolean {
  return removeAccents(str1.toLowerCase().trim()) === removeAccents(str2.toLowerCase().trim());
}
