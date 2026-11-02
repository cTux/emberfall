import { createGameServer } from '../worlds.ts';

const app = await createGameServer();
await app.listen(0);
const address = app.server.address();

if (!address || typeof address === 'string') {
  throw new Error('Expected a TCP address');
}

process.send?.(address.port);
process.on('disconnect', () => {
  void app.close();
});
