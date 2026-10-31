import type { DrawingContext } from './rendering/drawing-context';
import { itemDefinition, PLANT_KINDS } from '@emberfall/core';
import { itemArtName } from './class-art';
import { drawArt, loadArt, plantArt } from './art';
import { lootHintFrame, type LootHint } from './loot-hints';

export function drawLootHints(
  ctx: DrawingContext,
  hints: readonly LootHint[],
  player: { x: number; y: number },
  now: number,
) {
  const visible = hints.flatMap((hint) => {
    const frame = lootHintFrame(hint.at, now);

    return frame ? [{ hint, frame }] : [];
  });
  let y =
    player.y -
    30 -
    visible.reduce((sum, row) => {
      return sum + row.frame.height;
    }, 0) /
      2;

  for (const { hint, frame } of visible) {
    ctx.save();
    ctx.translate(player.x + 35, y + frame.offset);
    ctx.globalAlpha *= frame.alpha;
    ctx.font = 'bold 14px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#18251c';
    ctx.fillStyle = '#b8ed93';
    ctx.strokeText('+', 0, 9);
    ctx.fillText('+', 0, 9);
    const art = itemArtName(hint.itemId);
    const plant = PLANT_KINDS.findIndex((kind) => {
      return kind === hint.itemId;
    });

    if (art) {
      drawArt(ctx, loadArt(art), 0, 0, 12, 0, 18, 18);
    } else if (plant >= 0) {
      drawArt(ctx, plantArt, plant, 0, 12, 0, 18, 18);
    }

    ctx.fillStyle = '#fff5dc';
    const name = itemDefinition(hint.itemId).name;
    ctx.strokeText(name, 36, 9);
    ctx.fillText(name, 36, 9);

    if (hint.quantity >= 2) {
      ctx.font = 'bold 10px "Alegreya Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.strokeText(String(hint.quantity), 32, 16);
      ctx.fillText(String(hint.quantity), 32, 16);
    }

    ctx.restore();
    y += frame.height;
  }

  ctx.canvas.dataset.lootHintCount = String(visible.length);
}
