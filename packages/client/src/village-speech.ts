import type { Player } from '@emberfall/common';
import { INTERACTION_RADIUS } from '@emberfall/core';
import type { DrawingContext } from './rendering/drawing-context';
import type { InteractionTarget } from './interaction-targets';
import type { Scenery } from './village';
import type { crittersAt } from './critter-motion';
import { critterCaster } from './critters';
import { CatSpeech } from './cat-speech';
import { drawChatBubble } from './effects';
import { drawDebuffs } from './combat-effects';

// Keep cat bubbles below their 24-unit sprites and NPC status icons above the 40-unit health-row footprint.
const VILLAGE_SPEECH = { catBubbleY: 20, npcStatusLeft: 20, npcStatusTop: 61, npcBubbleY: 24 };

const NPC_SILENCE = { debuffs: [{ kind: 'silence' as const }] };

export class VillageSpeech {
  private speech = new CatSpeech();
  private onSpeech: (text: string) => void;

  constructor(onSpeech: (text: string) => void) {
    this.onSpeech = onSpeech;
  }

  targets(critters: ReturnType<typeof crittersAt>) {
    const cats: InteractionTarget[] = [];

    for (const cat of critters) {
      if (cat.kind !== 'cat') {
        continue;
      }

      const caster = critterCaster(cat);

      if (!caster) {
        continue;
      }

      cats.push({
        source: {
          id: cat.id,
          name: 'Cat',
          x: cat.x,
          y: cat.y,
          activate: () => {
            const text = this.speech.pet(cat.id, performance.now());

            if (text) {
              this.onSpeech(text);
            }
          },
        },
        x: cat.x - 12,
        y: cat.y - 24,
        width: 24,
        height: 24,
        mask: caster.mask,
        reach: cat,
        radius: INTERACTION_RADIUS,
      });
    }

    return cats;
  }

  draw(
    ctx: DrawingContext,
    players: Player[],
    critters: ReturnType<typeof crittersAt>,
    visibleScenery: Scenery[],
    now: number,
    serverTime: number,
  ) {
    for (const player of players) {
      drawChatBubble(ctx, player.x, player.y, player.chat);
    }

    const catMessages: string[] = [];

    for (const cat of critters) {
      if (cat.kind !== 'cat') {
        continue;
      }

      const message = this.speech.message(cat.id, now);

      if (message) {
        drawChatBubble(ctx, cat.x, cat.y + VILLAGE_SPEECH.catBubbleY, message);
        catMessages.push(message);
      }
    }

    for (const object of visibleScenery) {
      // NPC positions are feet anchors; this matches the 40-unit actor health/status row.
      if (object.npc?.silenced) {
        drawDebuffs(
          ctx,
          NPC_SILENCE,
          object.x - VILLAGE_SPEECH.npcStatusLeft,
          object.y - VILLAGE_SPEECH.npcStatusTop,
          serverTime,
        );
      } else if (object.npc && (object.npc.chatUntil ?? 0) > serverTime) {
        drawChatBubble(ctx, object.x, object.y - VILLAGE_SPEECH.npcBubbleY, object.npc.chat);
      }
    }

    return catMessages.join(',');
  }
}
