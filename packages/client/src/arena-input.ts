import { VIEWPORT_MIDPOINT } from './arena-contract.ts';
import { inputBlocked } from './arena-keyboard';
import { wrap, type ClientMessage, type Player, type WorldState } from '@emberfall/common';
import { ARENA, FOREST, TICK_MS } from '@emberfall/core';
import { pickInteraction, interactionInRange, type InteractionTarget } from './interaction-targets';
import type { Interaction } from './effects';
import type { Preferences } from './preferences';

export function createArenaInput({
  element,
  world,
  player,
  preferences,
  send,
  activate,
  move,
}: {
  element: HTMLCanvasElement;
  world: () => WorldState | null;
  player: () => Player | undefined;
  preferences: () => Preferences;
  send: (message: ClientMessage) => void;
  activate: (source: Interaction) => void;
  move: (x: number, y: number, now: number) => void;
}) {
  const keys = new Set<string>();
  const altKeys = new Set<string>();
  let altHeldAt = Infinity;
  let pointer: { x: number; y: number } | undefined;
  let held = false;
  let pointerInside = false;
  let targets: InteractionTarget[] = [];
  const pointerPoint = () => {
    return pointerInside && pointer && !inputBlocked()
      ? {
          x: inputCamera.x + pointer.x * inputCamera.width,
          y: inputCamera.y + pointer.y * inputCamera.height,
        }
      : undefined;
  };

  let combat: Extract<ClientMessage, { type: 'combatInput' }> | undefined;
  let inputCamera: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: ARENA.width,
    height: ARENA.height,
  };
  const currentAim = () => {
    return {
      aimX: wrap(
        inputCamera.x + (pointer?.x ?? VIEWPORT_MIDPOINT) * inputCamera.width,
        FOREST.width,
      ),
      aimY: wrap(
        inputCamera.y + (pointer?.y ?? VIEWPORT_MIDPOINT) * inputCamera.height,
        FOREST.height,
      ),
    };
  };

  const pointerMove = (event: PointerEvent) => {
    pointerInside = true;
    const rect = element.getBoundingClientRect();
    pointer = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };

  const pointerLeave = () => {
    pointerInside = false;
    element.dataset.cursor = 'default';
  };

  const pointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || inputBlocked()) {
      return;
    }

    pointerMove(event);
    const target = pickInteraction(targets, pointerPoint());

    if (target) {
      held = false;

      if (interactionInRange(target, player())) {
        activate(target.source);
      }

      return;
    }

    held = true;
    sendMovement();
  };

  const pointerUp = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    held = false;
    sendMovement();
  };

  element.addEventListener('pointermove', pointerMove);
  element.addEventListener('pointerenter', pointerMove);
  element.addEventListener('pointerleave', pointerLeave);
  element.addEventListener('pointerdown', pointerDown);
  window.addEventListener('pointerup', pointerUp);
  window.addEventListener('pointercancel', pointerUp);
  const key = (event: KeyboardEvent, down: boolean) => {
    if (event.code === 'AltLeft' || event.code === 'AltRight') {
      if (world()) {
        event.preventDefault();
      }

      if (down) {
        if (altKeys.size === 0) {
          altHeldAt = performance.now();
        }

        altKeys.add(event.code);
      } else {
        altKeys.delete(event.code);

        if (altKeys.size === 0) {
          altHeldAt = Infinity;
        }
      }

      return;
    }

    if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
      return;
    }

    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (event.altKey && world()) {
      event.preventDefault();
    }

    const value = event.code;

    if (
      !['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(
        value,
      )
    ) {
      return;
    }

    if (world()) {
      event.preventDefault();
    }

    const changed = keys.has(value) !== down;

    if (down) {
      keys.add(value);
    } else {
      keys.delete(value);
    }

    if (changed) {
      sendMovement();
    }
  };

  const down = (event: KeyboardEvent) => {
    return key(event, true);
  };

  const up = (event: KeyboardEvent) => {
    return key(event, false);
  };

  const reset = () => {
    keys.clear();
    altKeys.clear();
    altHeldAt = Infinity;
    held = false;
    pointerInside = false;
    element.dataset.cursor = 'default';
    sendMovement();
  };

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);
  const movement = () => {
    return {
      x:
        Number(keys.has('KeyD') || keys.has('ArrowRight')) -
        Number(keys.has('KeyA') || keys.has('ArrowLeft')),
      y:
        Number(keys.has('KeyS') || keys.has('ArrowDown')) -
        Number(keys.has('KeyW') || keys.has('ArrowUp')),
    };
  };

  function sendMovement() {
    const current = world();

    if (!current) {
      return;
    }

    if (inputBlocked()) {
      keys.clear();
      held = false;
    }

    if (combat) {
      send({
        ...combat,
        autoAttack: preferences().autoAttack,
        autoTarget: preferences().autoTarget,
        autoLoot: preferences().autoLoot,
        attacking: held && !inputBlocked(),
      });
    }

    const { x, y } = movement();
    move(x, y, performance.now());
  }

  const input = setInterval(sendMovement, TICK_MS);

  return {
    get camera() {
      return inputCamera;
    },
    set camera(value) {
      inputCamera = value;
    },
    get combat() {
      return combat;
    },
    set combat(value) {
      combat = value;
    },
    get targets() {
      return targets;
    },
    set targets(value) {
      targets = value;
    },
    get held() {
      return held;
    },
    get altHeldAt() {
      return altHeldAt;
    },
    get pointer() {
      return pointerInside ? pointer : undefined;
    },
    blocked: inputBlocked,
    currentAim,
    pointerPoint,
    clearKeys: () => {
      return keys.clear();
    },
    dispose() {
      clearInterval(input);
      element.removeEventListener('pointermove', pointerMove);
      element.removeEventListener('pointerenter', pointerMove);
      element.removeEventListener('pointerleave', pointerLeave);
      element.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointercancel', pointerUp);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', reset);
    },
  };
}
