# HTTPS and connectivity

[Back to Running, hosting and saves](../operations.md).

## HTTPS and connectivity

Production serves the built client and secure WebSocket endpoint together at https://localhost:4003. `pnpm dev` and `pnpm start` create a self-signed certificate in ignored `.certs/` if missing (PowerShell 7 required for generation). The certificate covers localhost and current LAN IPv4 addresses and lasts one year. Browsers show a warning until the public certificate is trusted; private keys must never be shared. The OS trust store is not modified. HTTP and HTTPS have separate browser storage, so a saved nickname/character token on the old HTTP origin does not automatically migrate.

For a temporary internet test, build and run `pnpm start`, reserve this PC's LAN address in the router, and forward **TCP 4003 → PC:4003**. Visitors open `https://PUBLIC_IP:4003`; both game traffic and files use that port, with no UDP or separate WebSocket port. Allow inbound TCP 4003 in Windows Firewall on the active network profile. Keep the Vite development port 5174 private. An alternative is external TCP 443 → PC:4003, then use `https://PUBLIC_IP`. External testing requires a public reachable address: CGNAT or upstream double NAT needs ISP/router changes or a tunnel. Test from mobile data, not from the same LAN. A local self-signed certificate causes a warning on other devices and does not cover a public IP; use a domain and publicly trusted certificate for regular hosting.

`BASE_PORT` (falling back to `PORT_NEW`) and `HOST` configure the server. `TLS_CERT` and `TLS_KEY` accept certificate/key PEM paths for a trusted certificate. `HTTP_ONLY=1` explicitly disables backend TLS when using an HTTPS/WSS reverse proxy; do not expose that plaintext backend directly. Local HTTPS follows [Vite's server HTTPS configuration](https://vite.dev/config/server-options#server-https).

When changing the server port, update existing environment overrides, the Pages
`BASE_PORT` repository variable, backend `STEAM_ORIGIN`, and router/firewall or
reverse-proxy rules to match. Rebuild the remote client and restart the server.
Changing the port also changes the browser origin, so local browser settings and
login cookies do not automatically carry over; the server's saved characters stay
in the existing database.

The production health endpoint is `/health`; matchmaking and WebSocket traffic use Colyseus. Default binding is `0.0.0.0:4003`. Development proxies `/auth`, `/api`, `/matchmake` and `/colyseus` to the game server. See [development](../development.md) for test configuration.
