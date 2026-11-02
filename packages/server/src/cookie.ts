export function cookie(header: string | undefined, name: string) {
  const values = (header ?? '')
    .split(';')
    .map((value) => {
      return value.trim();
    })
    .filter((value) => {
      return value.startsWith(`${name}=`);
    });
  const value = values.length === 1 ? values[0].slice(name.length + 1) : '';

  return /^[a-f0-9]{64}$/.test(value) ? value : '';
}
