import type { CharacterStore } from './characters.ts';
import { type AccountView, nicknameSchema } from '@emberfall/core/contracts';

export function accountView(account: ReturnType<CharacterStore['session']>): AccountView {
  return {
    mode: 'steam',
    authenticated: !!account,
    nickname: nicknameSchema.safeParse(account?.nickname).success ? account!.nickname : null,
    steamName: account?.steamName ?? '',
  };
}
