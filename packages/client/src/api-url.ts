const port = import.meta.env?.BASE_PORT;
/** Only these public build settings are exposed by vite.config.ts. */
const host = import.meta.env?.BASE_API;
const configured = host ? new URL(`https://${host}`) : undefined;

if (configured && port) {
  configured.port = port;
}

export const apiUrl = (path: string) => {
  return configured ? new URL(path, configured).toString() : path;
};
