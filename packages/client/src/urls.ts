/** Only these public build settings are exposed by vite.config.ts. */
const host = import.meta.env?.BASE_API;
const port = import.meta.env?.BASE_PORT;
const configured = host ? new URL(`https://${host}`) : undefined;

if (configured && port) {
  configured.port = port;
}

export const apiUrl = (path: string) => {
  return configured ? new URL(path, configured).toString() : path;
};

export const websocketUrl = () => {
  const endpoint = new URL(apiUrl('/'), location.origin);
  endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';

  return import.meta.env.VITE_SERVER_URL || endpoint.toString();
};

export const clientAsset = (path: string) => {
  return `${import.meta.env?.BASE_URL ?? '/'}${path.replace(/^\//, '')}`;
};
