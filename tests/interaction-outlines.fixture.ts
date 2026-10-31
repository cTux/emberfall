import { createRequire } from 'node:module';
import { resolve } from 'node:path';

export const require = createRequire(resolve('packages/client/package.json'));

export const sharp =
  require('sharp') as typeof import('../packages/client/node_modules/sharp/lib/index.js');
