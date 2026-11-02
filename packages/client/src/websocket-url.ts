import { apiUrl } from './api-url.ts';

export const websocketUrl = () => {
  const endpoint = new URL(apiUrl('/'), location.origin);
  endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';

  return import.meta.env.VITE_SERVER_URL || endpoint.toString();
};
