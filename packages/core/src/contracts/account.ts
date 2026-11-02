import { z } from 'zod';

// Keep the existing 3–12 ASCII-character account-name contract for wire/save compatibility.
export const nicknameSchema = z.string().regex(/^[a-zA-Z0-9_]{3,12}$/);
export interface AccountView {
  mode: 'steam' | 'legacy';
  authenticated: boolean;
  nickname: string | null;
  steamName: string;
}
