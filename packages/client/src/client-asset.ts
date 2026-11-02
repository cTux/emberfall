export const clientAsset = (path: string) => {
  return `${import.meta.env?.BASE_URL ?? '/'}${path.replace(/^\//, '')}`;
};
