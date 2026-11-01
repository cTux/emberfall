import { browserCrypto, realZeroToOneExclusive } from 'random-js';

/** Shared [0, 1) gameplay draws; Web Crypto is available in Node 24 and secure browsers. */
export const randomSource = {
  next: () => {
    return realZeroToOneExclusive(browserCrypto);
  },
};
