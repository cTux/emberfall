import { z } from "zod";

// Match the existing 24 UTF-16-unit name limit; reject invisible controls.
export const nicknameSchema = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .regex(/^[^\p{Cc}\p{Cf}]*$/u);
export interface AccountView {
  mode: "steam" | "legacy";
  authenticated: boolean;
  nickname: string | null;
  steamName: string;
}
