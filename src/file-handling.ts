/**
 * Extracts the identifier portion from a filename or file path.
 *
 * @param filename - A filename or path; may include directories and extensions.
 * @returns The substring before the first hyphen of the base filename (the base filename is taken before the first dot). Returns an empty string for falsy input or if no valid base name can be determined.
 */
export function idFromFilename(filename: string) : string {
  if (!filename) return '';

  // Extract just the filename from the path without regex to prevent ReDoS
  const lastSlash = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
  const match = lastSlash !== -1 ? filename.slice(lastSlash + 1) : filename;
  if (!match) return '';

  // Get string before the first dot
  const dotIndex = match.indexOf('.');
  const withoutExt = dotIndex !== -1 ? match.slice(0, dotIndex) : match;

  // Get string before the first hyphen
  const hyphenIndex = withoutExt.indexOf('-');
  return hyphenIndex !== -1 ? withoutExt.slice(0, hyphenIndex) : withoutExt;
}
