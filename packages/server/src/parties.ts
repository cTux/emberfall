// One second bounds invitation spam independently of invitation expiration.
const INVITATION_COOLDOWN_MS = 1000;
// Preserve the four-player cooperative party limit exposed by the existing error messages.
const MAX_PARTY_MEMBERS = 4;
// Give invitations the existing thirty-second response window.
const PARTY_INVITATION_MS = 30_000;
// A party needs two members; dissolve singleton parties.
const MIN_PARTY_MEMBERS = 2;

import type { Party, PartyRequest, PartyWorld } from './party-models.ts';
import { interactParty, partyCommand } from './party-interactions.ts';
import { randomUUID } from 'node:crypto';
import type { Player } from '@emberfall/common';
import { restoreResources } from '@emberfall/core';
import { createPlayers, simulationFor } from './ecs/simulation.ts';
import { returnToLobby, tickScene, type SceneWorld } from './scenes.ts';
import { addChat } from './chat.ts';

export class Parties {
  readonly parties = new Map<string, Party>();
  readonly runs = new Map<string, SceneWorld>();
  readonly requests: PartyRequest[] = [];
  private sentAt = new Map<string, number>();
  private world: PartyWorld;

  constructor(world: PartyWorld) {
    this.world = world;
  }

  home(player: Player) {
    return (player.homeRunId ??= randomUUID());
  }

  key(player: Player) {
    return player.scene ? (player.runId ?? this.home(player)) : this.home(player);
  }

  run(player: Player) {
    const key = this.key(player);
    let run = this.runs.get(key);

    if (!run) {
      run = { players: createPlayers(), skipTraining: true, runKey: key };
      this.runs.set(key, run);
    }

    this.sync(run, key);

    return run;
  }

  private sync(run: SceneWorld, key: string) {
    run.rewardPlayers = [...this.world.players.values()];
    run.voters = [...this.world.players.values()].filter((p) => {
      return this.home(p) === key;
    });

    for (const id of run.players.keys()) {
      if (!this.world.players.has(id) || this.key(this.world.players.get(id)!) !== key) {
        run.players.delete(id);
      }
    }

    for (const p of this.world.players.values()) {
      if (this.key(p) === key && !run.players.has(p.id)) {
        run.players.set(p.id, p);
      }
    }
  }

  tick(now: number, dt: number) {
    this.expire(now);

    for (const [key, run] of this.runs) {
      this.sync(run, key);

      if (!run.players.size) {
        simulationFor(run.players)?.retain([]);
        this.runs.delete(key);
        continue;
      }

      restoreResources(run.resources, now);
      run.chat = this.world.chat;
      tickScene(run, now, dt);
      this.world.chat = run.chat;

      for (const p of run.players.values()) {
        if (p.scene) {
          p.runId = key;
        } else {
          delete p.runId;
        }
      }
    }
  }

  announce(text: string, ids: string[]) {
    addChat(this.world, text);
    this.world.chat!.at(-1)!.recipientIds = ids;
  }

  private expire(now: number) {
    for (let i = this.requests.length - 1; i >= 0; i--) {
      const r = this.requests[i];
      const from = this.world.players.get(r.fromId);
      const to = this.world.players.get(r.toId);

      if (
        r.expiresAt <= now ||
        !from ||
        !to ||
        from.partyId !== r.fromPartyId ||
        to.partyId !== r.toPartyId ||
        (r.partyId
          ? from.partyId !== r.partyId && to.partyId !== r.partyId
          : from.partyId || to.partyId) ||
        (r.partyId && this.parties.get(r.partyId)?.members[0] !== (from.partyId ? from.id : to.id))
      ) {
        this.requests.splice(i, 1);
        this.announce('Party request expired or is no longer valid.', [r.fromId, r.toId]);
      }
    }
  }

  incoming(player: Player, now: number) {
    this.expire(now);

    return this.requests.filter((r) => {
      return r.toId === player.id;
    });
  }

  request(from: Player, target: Player, now: number) {
    this.expire(now);

    if (from.id === target.id || (from.partyId && from.partyId === target.partyId)) {
      throw new Error('You are already together.');
    }

    if (from.partyId && target.partyId) {
      throw new Error('Leave your party first.');
    }

    if (from.partyId && from.partyLeaderId !== from.id) {
      throw new Error('Only the party leader can invite.');
    }

    const to = target.partyId ? this.world.players.get(target.partyLeaderId!)! : target;

    if (!to || to.reconnecting) {
      throw new Error('That player is unavailable.');
    }

    const partyId = from.partyId ?? to.partyId;

    if (partyId && this.parties.get(partyId)!.members.length >= MAX_PARTY_MEMBERS) {
      throw new Error('Party is full (4 players).');
    }

    if (now - (this.sentAt.get(from.id) ?? -Infinity) < INVITATION_COOLDOWN_MS) {
      throw new Error('Please wait before requesting again.');
    }

    if (
      this.requests.some((r) => {
        return r.fromId === from.id && r.toId === to.id;
      })
    ) {
      throw new Error('A request is already pending.');
    }

    this.sentAt.set(from.id, now);
    this.requests.push({
      fromId: from.id,
      toId: to.id,
      partyId,
      fromPartyId: from.partyId,
      toPartyId: to.partyId,
      expiresAt: now + PARTY_INVITATION_MS,
    });
    this.announce(
      `${from.name} ${to.partyId ? 'requested to join' : 'invited'} ${to.name}${to.partyId ? "'s party" : ' to a party'}. Use /accept @${from.name}.`,
      [from.id, to.id],
    );
  }

  accept(to: Player, fromId: string | undefined, now: number) {
    const incoming = this.incoming(to, now).filter((r) => {
      return !fromId || r.fromId === fromId;
    });

    if (incoming.length !== 1) {
      throw new Error('Specify /accept @name for one pending request.');
    }

    const r = incoming[0];
    const from = this.world.players.get(r.fromId)!;
    let party = r.partyId ? this.parties.get(r.partyId) : undefined;

    if (party && party.members.length >= MAX_PARTY_MEMBERS) {
      throw new Error('Party is full (4 players).');
    }

    if (!party) {
      party = { id: randomUUID(), members: [from.id, to.id] };
      this.parties.set(party.id, party);
    } else {
      party.members.push(from.partyId ? to.id : from.id);
    }

    const leader = this.world.players.get(party.members[0])!;

    for (const id of party.members) {
      const p = this.world.players.get(id)!;
      p.partyId = party.id;
      p.partyLeaderId = leader.id;
      p.homeRunId = this.home(leader);
    }

    this.requests.splice(this.requests.indexOf(r), 1);
    this.announce(
      `${to.name} accepted ${from.name}'s request. Party: ${party.members
        .map((id) => {
          return this.world.players.get(id)!.name;
        })
        .join(', ')}.`,
      party.members,
    );
    this.expire(now);
  }

  leave(player: Player, departing = false) {
    if (departing) {
      this.sentAt.delete(player.id);

      for (let i = this.requests.length - 1; i >= 0; i--) {
        const r = this.requests[i];

        if (r.fromId === player.id || r.toId === player.id) {
          this.requests.splice(i, 1);
        }
      }
    }

    const party = this.parties.get(player.partyId ?? '');

    if (!party) {
      if (!departing) {
        throw new Error('You are not in a party.');
      }

      return;
    }

    const members = [...party.members];

    if (player.scene) {
      const run = this.run(player);
      run.chat = this.world.chat;
      returnToLobby(run, player);
      this.world.chat = run.chat;
    }

    delete player.gathering;
    delete player.runId;
    delete player.partyId;
    delete player.partyLeaderId;
    delete player.homeRunId;
    party.members = party.members.filter((id) => {
      return id !== player.id;
    });

    for (const id of party.members) {
      const p = this.world.players.get(id)!;
      p.partyLeaderId = party.members[0];

      if (party.members.length === 1) {
        delete p.partyId;
        delete p.partyLeaderId;
      }
    }

    if (party.members.length < MIN_PARTY_MEMBERS) {
      this.parties.delete(party.id);
    }

    this.announce(
      `${player.name} left the party.${party.members.length === 1 ? ' Party dissolved; the remaining dimension is retained.' : ''}`,
      members,
    );
    this.sentAt.delete(player.id);
    this.expire(Date.now());
  }

  interact(player: Player, targetId: string, now: number) {
    interactParty(this, this.world.players, player, targetId, now);
  }

  command(player: Player, text: string, now: number) {
    partyCommand(this, this.world.players, player, text, now);
  }
}
