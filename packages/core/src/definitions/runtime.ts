import { setting } from '../content/views.ts';
export const RUNTIME = setting<typeof import('../mods/base/runtime.ts').RUNTIME>('runtime');
