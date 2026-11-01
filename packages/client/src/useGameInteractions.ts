import { useCallback, useRef } from 'react';
import type { ClientMessage, Player, WorldState } from '@emberfall/common';
import { BULLSEYE } from '@emberfall/core';
import type { Interaction } from './effects';
import type { GameMenu } from './game-panels';

// Strip the actual routing prefix so changes to its spelling cannot invalidate numeric offsets.
const PARTY_TARGET_PREFIX = 'party:';
const GATHER_TARGET_PREFIX = 'gather:';

export function useGameInteractions({
  me,
  world,
  unavailable,
  send,
  setMenu,
  setBuilding,
}: {
  me?: Player;
  world: WorldState | null;
  unavailable: boolean;
  send: (message: ClientMessage) => void;
  setMenu: (menu: GameMenu | null) => void;
  setBuilding: (name: string) => void;
}) {
  const scene = world?.scene;
  const interaction = useRef<Interaction | null>(null);
  const cursorAim = useRef<(() => { aimX: number; aimY: number }) | null>(null);
  const setCursorAim = useCallback((reader: (() => { aimX: number; aimY: number }) | null) => {
    cursorAim.current = reader;
  }, []);
  const castTalent = (slot: number, automatic = false) => {
    const aim = cursorAim.current?.();

    if (!me || unavailable || !aim) {
      return;
    }

    send({
      type: 'talentCast',
      automatic,
      ...aim,
      slot,
      classId: me.classId ?? 'warrior',
      epoch: me.scene === 'forest' ? (scene?.id ?? '') : 'lobby',
    });
  };

  const interact = (source = interaction.current) => {
    if (
      me?.gathering &&
      interaction.current?.activate &&
      source?.id.startsWith(GATHER_TARGET_PREFIX)
    ) {
      interaction.current.activate();

      return;
    }

    if (!source) {
      return;
    }

    if (source.activate) {
      source.activate();

      return;
    }

    if (source.id.startsWith(PARTY_TARGET_PREFIX)) {
      send({ type: 'partyInteract', targetId: source.id.slice(PARTY_TARGET_PREFIX.length) });

      return;
    }

    if (source.id.startsWith(GATHER_TARGET_PREFIX)) {
      if (me) {
        send({
          type: 'gather',
          nodeId: source.id.slice(GATHER_TARGET_PREFIX.length),
          epoch: me.scene === 'forest' ? (world?.scene?.id ?? '') : 'lobby',
        });
      }

      return;
    }

    if (source.id === BULLSEYE?.id) {
      setMenu('resetTalents');

      return;
    }

    const methods: Readonly<Record<string, () => void>> = {
      return: () => {
        send({ type: 'returnLobby' });
      },
      wardrobe: () => {
        setMenu('wardrobe');
      },
      portal: () => {
        setMenu('portal');
      },
    };

    if (Object.hasOwn(methods, source.id)) {
      methods[source.id]();
    } else {
      setBuilding(source.name);
      setMenu('building');
    }
  };

  return { interaction, setCursorAim, castTalent, interact };
}
