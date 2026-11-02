export const flush = () => {
  return new Promise<void>((resolve) => {
    return setImmediate(resolve);
  });
};
