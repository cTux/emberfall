import { require } from './require.fixture.ts';

export const sharp =
  require('sharp') as typeof import('../packages/client/node_modules/sharp/lib/index.js');
