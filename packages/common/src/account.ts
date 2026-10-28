import { z } from 'zod';

export const nicknameSchema = z.string().regex(/^[a-zA-Z0-9_]{3,12}$/);
export interface AccountView {
  mode: 'steam' | 'legacy';
  authenticated: boolean;
  nickname: string | null;
  steamName: string;
}
