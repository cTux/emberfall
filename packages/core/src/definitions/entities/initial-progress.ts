import { setting } from '../../content/views.ts';

export const INITIAL_PROGRESS =
  setting<typeof import('../../mods/base/entities/players.ts').INITIAL_PROGRESS>('initialProgress');
