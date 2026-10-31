import { useCallback, useRef } from 'react';
import type { ClientMessage, Player, WorldState } from '@emberfall/common';
import { BULLSEYE } from '@emberfall/core';
import type { Interaction } from './effects';
import type { GameMenu } from './game-panels';

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
    if (me?.gathering && interaction.current?.activate && source?.id.startsWith('gather:')) {
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

    if (source.id.startsWith('party:')) {
      send({ type: 'partyInteract', targetId: source.id.slice(6) });

      return;
    }

    if (source.id.startsWith('gather:')) {
      if (me) {
        send({
          type: 'gather',
          nodeId: source.id.slice(7),
          epoch: me.scene === 'forest' ? (world?.scene?.id ?? '') : 'lobby',
        });
      }
    } else if (source.id === 'return') {
      send({ type: 'returnLobby' });
    } else if (source.id === BULLSEYE?.id) {
      setMenu('resetTalents');
    } else if (source.id === 'wardrobe') {
      setMenu('wardrobe');
    } else if (source.id === 'portal') {
      setMenu('portal');
    } else {
      setBuilding(source.name);
      setMenu('building');
    }
  };

  return { interaction, setCursorAim, castTalent, interact };
}
