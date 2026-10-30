import type { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';

export function createAccountRepository(
  db: DatabaseSync,
  transaction: <T>(operation: () => T) => T,
  createCharacter: (name: string) => { id: string },
) {
  function steamAccount(steamId: string) {
    const row = db.prepare('SELECT * FROM steam_accounts WHERE steam_id=?').get(steamId);
    if (!row) return undefined;
    return {
      steamId,
      characterId: String(row.character_id),
      nickname: row.nickname === null ? null : String(row.nickname),
      steamName: String(row.steam_name),
    };
  }
  function loginSteam(steamId: string, steamName: string) {
    return transaction(() => {
      if (!steamAccount(steamId)) {
        const character = createCharacter('Wanderer');
        db.prepare('INSERT INTO steam_accounts VALUES (?, ?, NULL, ?)').run(
          steamId,
          character.id,
          steamName,
        );
      } else if (steamName) {
        db.prepare('UPDATE steam_accounts SET steam_name=? WHERE steam_id=?').run(
          steamName,
          steamId,
        );
      }
      return steamAccount(steamId)!;
    });
  }
  function renameSteam(steamId: string, nickname: string) {
    return transaction(() => {
      const account = steamAccount(steamId);
      if (!account) throw new Error('Account not found');
      db.prepare('UPDATE steam_accounts SET nickname=? WHERE steam_id=?').run(nickname, steamId);
      db.prepare('UPDATE characters SET name=?, updated_at=? WHERE id=?').run(
        nickname,
        Date.now(),
        account.characterId,
      );
      return steamAccount(steamId)!;
    });
  }
  function createSession(steamId: string, expiresAt: number) {
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM account_sessions WHERE expires_at<=?').run(Date.now());
    db.prepare('INSERT INTO account_sessions VALUES (?, ?, ?)').run(
      createHash('sha256').update(token).digest('hex'),
      steamId,
      expiresAt,
    );
    return token;
  }
  function session(token: string) {
    const row = db
      .prepare('SELECT steam_id FROM account_sessions WHERE token_hash=? AND expires_at>?')
      .get(createHash('sha256').update(token).digest('hex'), Date.now());
    return row ? steamAccount(String(row.steam_id)) : undefined;
  }
  function revokeSession(token: string) {
    db.prepare('DELETE FROM account_sessions WHERE token_hash=?').run(
      createHash('sha256').update(token).digest('hex'),
    );
  }
  return { steamAccount, loginSteam, renameSteam, createSession, session, revokeSession };
}
