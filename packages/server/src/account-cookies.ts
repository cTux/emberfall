export function cookie(header: string | undefined, name: string) {
  const values = (header ?? '')
    .split(';')
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${name}=`));
  const value = values.length === 1 ? values[0].slice(name.length + 1) : '';
  return /^[a-f0-9]{64}$/.test(value) ? value : '';
}
export function setCookie(name: string, value: string, seconds: number, crossOrigin = false) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=${crossOrigin ? 'None' : 'Lax'}; Max-Age=${seconds}`;
}
