/**
 * Extracts the identifier portion from a filename or file path.
 *
 * @param filename - A filename or path; may include directories and extensions.
 * @returns The substring before the first hyphen of the base filename (the base filename is taken before the first dot). Returns an empty string for falsy input or if no valid base name can be determined.
 */
export function idFromFilename(filename: string) : string {
  if (!filename) return '';
  
  // Extract just the filename from the path using regex to handle all path separators
  const match = filename.match(/[^\/\\]+$/)?.[0];
  if (!match) return '';
  
  // Split the name before the first dot to handle multiple extensions
  const withoutExt = match.split('.')[0];
  
  // Extract the ID before the first hyphen
  return withoutExt.split('-')[0] ?? '';
}