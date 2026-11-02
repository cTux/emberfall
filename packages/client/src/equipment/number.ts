export const number = (value: number) => {
  return Number.isFinite(value) ? value.toLocaleString('en', { maximumFractionDigits: 2 }) : '—';
};
