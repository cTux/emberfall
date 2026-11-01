import { MILLISECONDS_PER_SECOND } from '@emberfall/common';
// Retain 256-bit random bearer credentials and their existing hexadecimal wire length.
const CHARACTER_TOKEN_BYTES = 32;

import { createTransaction } from './persistence/transaction.ts';
import { createProgressCodec } from './persistence/progress.ts';
import { createWorldRepository } from './persistence/worlds.ts';
import { createAccountRepository } from './persistence/accounts.ts';
import { initializeCharacterTables, openCharacterDatabase } from './persistence/schema.ts';
import type { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { getTableName } from 'drizzle-orm';
import { GameDatabase, VersionConflictError } from '@colyseus/database';
import { game, type createGame } from '@emberfall/core';
import type { CharacterProgress, ClassId, Player, Merchant } from '@emberfall/common';

export function createCharacterPersistence(context: ReturnType<typeof createGame> = game) {
  const { merchantSchema, freshMerchant, progressSchema, classSchema, storehouseSchema } =
    context.rules;
  const {
    classIds: CLASS_IDS,
    freshProgress,
    classProgress,
    decodeProgress,
    selectClassProgress,
  } = createProgressCodec(context);

  /** SQLite's synchronous transaction keeps identity and Colyseus save rows atomic.
   * Await ready before use. Cloud-save revisions interoperate with database.saves.
   */
  class CharacterStore {
    private db: DatabaseSync;
    private transaction: ReturnType<typeof createTransaction>;
    private worldRepository: ReturnType<typeof createWorldRepository>;
    private accountRepository: ReturnType<typeof createAccountRepository>;
    readonly database: GameDatabase;
    readonly ready: Promise<void>;
    private versions = new Map<string, number>();

    private get savesTable() {
      return getTableName(this.database.tables.cloudSaves);
    }

    private get usersTable() {
      return getTableName(this.database.tables.users);
    }

    constructor(path: string) {
      this.db = openCharacterDatabase(path);
      this.transaction = createTransaction(this.db);
      this.worldRepository = createWorldRepository(this.db, (operation) => {
        return this.transaction(operation);
      });
      this.accountRepository = createAccountRepository(
        this.db,
        (operation) => {
          return this.transaction(operation);
        },
        (name) => {
          return this.create(name);
        },
      );
      this.database = new GameDatabase({ db: drizzle({ client: this.db }), dialect: 'sqlite' });
      this.ready = this.database
        .boot()
        .then(() => {
          initializeCharacterTables(this.db);
        })
        .catch((error) => {
          this.close();

          throw error;
        });
    }

    worlds() {
      return this.worldRepository.worlds();
    }

    saveWorld(world: { id: string; name: string; salt: string; hash?: Buffer }, permanent = false) {
      return this.worldRepository.saveWorld(world, permanent);
    }

    deleteWorld(id: string) {
      return this.worldRepository.deleteWorld(id);
    }

    rememberWorld(characterId: string, worldId: string) {
      return this.worldRepository.rememberWorld(characterId, worldId);
    }

    forgetWorld(characterId: string) {
      return this.worldRepository.forgetWorld(characterId);
    }

    canResume(characterId: string, worldId: string) {
      return this.worldRepository.canResume(characterId, worldId);
    }

    load(token: string) {
      const hash = createHash('sha256').update(token).digest('hex');
      const identity = this.db.prepare('SELECT id FROM characters WHERE token_hash=?').get(hash);

      if (!identity) {
        throw new Error('Character save not found.');
      }

      return this.loadById(String(identity.id));
    }

    loadById(id: string) {
      const row = this.db
        .prepare(
          `SELECT c.id, c.name, s.data, s.version FROM characters c JOIN ${this.savesTable} s ON s.user_id=c.id AND s.slot=0 WHERE c.id=?`,
        )
        .get(id);

      if (!row) {
        throw new Error(
          'Character save not found. Check that you are connected to the correct server.',
        );
      }

      const result = decodeProgress(String(row.data));
      this.versions.set(String(row.id), Number(row.version));

      return { id: String(row.id), name: String(row.name), ...result };
    }

    create(name: string) {
      const token = randomBytes(CHARACTER_TOKEN_BYTES).toString('hex'),
        id = randomUUID();
      this.importCharacter(
        id,
        createHash('sha256').update(token).digest('hex'),
        name,
        JSON.stringify(freshProgress()),
      );

      return { token, ...this.load(token) };
    }

    importCharacter(id: string, tokenHash: string, name: string, raw: string) {
      const { classId, classes, storehouse } = decodeProgress(raw);

      if (
        this.db.prepare('SELECT 1 FROM characters WHERE id=? OR token_hash=?').get(id, tokenHash)
      ) {
        throw new Error('Character already exists; refusing to overwrite progress');
      }

      this.transaction(() => {
        const now = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
        this.db
          .prepare(
            `INSERT INTO ${this.usersTable} (id, anonymous, created_at, updated_at) VALUES (?, 1, ?, ?)`,
          )
          .run(id, now, now);
        this.db.prepare('INSERT INTO characters VALUES (?, ?, ?, ?)').run(id, tokenHash, name, now);
        this.db
          .prepare(
            `INSERT INTO ${this.savesTable} (user_id, slot, version, data, created_at, updated_at) VALUES (?, 0, 1, ?, ?, ?)`,
          )
          .run(id, JSON.stringify({ formatVersion: 2, classId, classes, storehouse }), now, now);
      });
      this.versions.set(id, 1);
    }

    merchant(worldId: string): Merchant {
      const row = this.db.prepare('SELECT data FROM merchants WHERE world_id=?').get(worldId);

      if (row) {
        return merchantSchema.parse(JSON.parse(String(row.data)));
      }

      const merchant = freshMerchant();
      this.saveMerchant(worldId, merchant);

      return merchant;
    }

    saveMerchant(worldId: string, state: Merchant) {
      this.db
        .prepare(
          'INSERT INTO merchants VALUES (?, ?) ON CONFLICT(world_id) DO UPDATE SET data=excluded.data',
        )
        .run(worldId, JSON.stringify(merchantSchema.parse(state)));
    }

    save(
      id: string,
      name: string,
      progress: CharacterProgress & Partial<Pick<Player, 'classId' | 'classes'>>,
      merchant?: { worldId: string; state: Merchant },
    ) {
      const row = this.db
        .prepare(`SELECT data, version FROM ${this.savesTable} WHERE user_id=? AND slot=0`)
        .get(id);

      if (!row) {
        throw new Error('Character save is missing.');
      }

      const previous = decodeProgress(String(row.data));
      const classId = classSchema.parse(progress.classId ?? previous.classId);
      const classes = {
        ...previous.classes,
        ...progress.classes,
        [classId]: progressSchema.parse(progress),
      };

      for (const id of CLASS_IDS) {
        classes[id] = classProgress(classes[id], id);
        delete classes[id].coins;
        delete classes[id].storages;
      }

      const storehouse = storehouseSchema.parse({
        coins: progress.coins ?? previous.storehouse.coins,
        storages: progress.storages ?? previous.storehouse.storages,
      });
      const version = this.versions.get(id) ?? Number(row.version);
      this.transaction(() => {
        const result = this.db
          .prepare(
            `UPDATE ${this.savesTable} SET data=?, version=version+1, updated_at=? WHERE user_id=? AND slot=0 AND version=?`,
          )
          .run(
            JSON.stringify({ formatVersion: 2, classId, classes, storehouse }),
            Math.floor(Date.now() / MILLISECONDS_PER_SECOND),
            id,
            version,
          );

        if (!result.changes) {
          throw new VersionConflictError(id, 0, version);
        }

        if (merchant) {
          this.saveMerchant(merchant.worldId, merchant.state);
        }

        this.db
          .prepare(
            'UPDATE characters SET name=COALESCE((SELECT nickname FROM steam_accounts WHERE character_id=characters.id), ?), updated_at=? WHERE id=?',
          )
          .run(name, Date.now(), id);
      });
      this.versions.set(id, version + 1);
    }

    selectClass(id: string, player: Player, classId: ClassId) {
      const updated = selectClassProgress(player, classId);
      this.save(id, player.name, updated);
      Object.assign(player, updated);
    }

    steamAccount(steamId: string) {
      return this.accountRepository.steamAccount(steamId);
    }

    loginSteam(steamId: string, steamName: string) {
      return this.accountRepository.loginSteam(steamId, steamName);
    }

    renameSteam(steamId: string, nickname: string) {
      return this.accountRepository.renameSteam(steamId, nickname);
    }

    createSession(steamId: string, expiresAt: number) {
      return this.accountRepository.createSession(steamId, expiresAt);
    }

    session(token: string) {
      return this.accountRepository.session(token);
    }

    revokeSession(token: string) {
      return this.accountRepository.revokeSession(token);
    }

    close() {
      if (this.db.isOpen) {
        this.db.close();
      }
    }
  }

  return { freshProgress, decodeProgress, CharacterStore };
}

export const { freshProgress, decodeProgress, CharacterStore } = createCharacterPersistence();
export type CharacterStore = InstanceType<typeof CharacterStore>;
