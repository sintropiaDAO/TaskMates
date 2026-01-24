/**
 * Converts a string to title case (first letter of each word capitalized)
 * @param str - The string to convert
 * @returns The string in title case format
 */
export function toTitleCase(str: string): string {
  if (!str) return str;
  
  return str
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
