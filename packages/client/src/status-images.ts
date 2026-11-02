import { load } from './load.ts';
import { statusSrc } from './class-art';

export const statusImages = {
  bleed: load(statusSrc('bleed')),
  poison: load(statusSrc('poison')),
  burn: load(statusSrc('burn')),
  roots: load(statusSrc('roots')),
  silence: load(statusSrc('silence')),
};
