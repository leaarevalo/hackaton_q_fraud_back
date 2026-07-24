export function getByPath(source, path) {
  return path.split('.').reduce((current, key) => current?.[key], source);
}
