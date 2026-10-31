export const wrap = (n: number, size: number) => {
  return n >= 0 && n < size ? n : ((n % size) + size) % size;
};

export const wrappedDelta = (a: number, b: number, size: number) => {
  return wrap(a - b + size / 2, size) - size / 2;
};
