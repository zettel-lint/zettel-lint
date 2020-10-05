export function idFromFilename(filename: string) {
  const nameOnly = filename.split("/").pop();
  const withoutExt = nameOnly?.split(".")[0];
  return withoutExt?.split("-")[0];
}