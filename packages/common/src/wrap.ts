export const wrap = (n: number, size: number) => {
  return n >= 0 && n < size ? n : ((n % size) + size) % size;
};
