export function setCookie(name: string, value: string, seconds: number, crossOrigin = false) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=${crossOrigin ? 'None' : 'Lax'}; Max-Age=${seconds}`;
}
