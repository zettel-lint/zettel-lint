
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