import type { DrawingContext } from '../rendering/drawing-context';
import type { SceneState, LootDrop } from '@emberfall/common';
import {
  EQUIPMENT_SLOTS,
  GEAR_DEFINITIONS,
  SLOT_GEAR_TYPES,
  rarityColor,
  itemRarity,
} from '@emberfall/core';
import { equipmentSlotArt } from '../content-views';
import { itemArtName } from '../class-art';
import { pickupArt, drawArt, loadArt } from '../art';

const lootSprites = new Map<LootDrop['kind'], HTMLCanvasElement>();
function lootSprite(kind: LootDrop['kind']) {
  let sprite = lootSprites.get(kind);
  if (sprite) return sprite;
  sprite = document.createElement('canvas');
  sprite.width = sprite.height = 40;
  const ctx = sprite.getContext('2d')!;
  const glow = ctx.createRadialGradient(20, 20, 1, 20, 20, 18);
  glow.addColorStop(0, kind === 'gold' ? '#ffca5599' : '#68ffc399');
  glow.addColorStop(1, '#0000');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 40, 40);
  ctx.fillStyle = kind === 'gold' ? '#ffc74e' : '#72ffd0';
  ctx.beginPath();
  ctx.ellipse(20, 20, kind === 'gold' ? 4 : 3.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = kind === 'gold' ? '#fff0a5' : '#e7fff8';
  ctx.fillRect(18, 17, 2, 3);
  if (kind === 'gold') {
    ctx.strokeStyle = '#ad7420';
    ctx.strokeRect(19, 18, 2, 5);
  }
  lootSprites.set(kind, sprite);
  return sprite;
}

export function drawLootAndBlood(
  ctx: DrawingContext,
  scene: SceneState,
  now: number,
  near: (x: number, y: number) => { x: number; y: number },
  view: { x: number; y: number; width: number; height: number },
) {
  const visible = (p: { x: number; y: number }) =>
    p.x >= view.x - 40 &&
    p.x <= view.x + view.width + 40 &&
    p.y >= view.y - 40 &&
    p.y <= view.y + view.height + 40;
  ctx.save();
  for (const drop of scene.drops ?? []) {
    const p = near(drop.x, drop.y + 15);
    if (!visible(p)) continue;
    const age = Math.max(0, now - drop.at);
    const jump = Math.abs(Math.sin(age / 190 + drop.id * 0.7)) * (4 + 7 * Math.exp(-age / 650));
    ctx.fillStyle = '#06181080';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (drop.kind === 'item') {
      const beam = ctx.createLinearGradient(p.x, p.y - 36, p.x, p.y);
      const color = rarityColor[itemRarity(drop)];
      beam.addColorStop(0, `${color}00`);
      beam.addColorStop(1, `${color}aa`);
      ctx.fillStyle = beam;
      ctx.fillRect(p.x - 3, p.y - 36, 6, 36);
      const gear = GEAR_DEFINITIONS[drop.itemId ?? ''];
      const slot = EQUIPMENT_SLOTS.find((slot) =>
        (SLOT_GEAR_TYPES[slot] as readonly string[]).includes(gear?.gearType),
      );
      const icon = loadArt(itemArtName(drop.itemId ?? '') ?? equipmentSlotArt(slot ?? 'amulet'));
      drawArt(ctx, icon, 0, 0, p.x - 10, p.y - 18 - jump, 20, 20);
    } else if (pickupArt.naturalWidth)
      drawArt(
        ctx,
        pickupArt,
        Math.floor((now + drop.id * 70) / 170) % 4,
        drop.kind === 'gold' ? 1 : 2,
        p.x - 10,
        p.y - 16 - jump,
        20,
        20,
      );
    else ctx.drawImage(lootSprite(drop.kind), p.x - 20, p.y - 24 - jump);
  }
  // Bound bursts independently of ambient-particle settings, so hits remain readable on Low.
  for (const hit of scene.damage.slice(-80)) {
    const age = (now - hit.at) / 1000;
    if (age < 0 || age > 0.6) continue;
    const p = near(hit.x, hit.y);
    if (!visible(p)) continue;
    ctx.globalAlpha = 1 - age / 0.6;
    for (let i = 0; i < 12; i++) {
      const angle = i * 2.399963 + hit.id;
      const speed = 20 + ((i * 13) % 43);
      ctx.fillStyle = i % 3 ? '#bd283b' : '#f45561';
      ctx.fillRect(
        p.x + Math.cos(angle) * speed * age,
        p.y - 5 + Math.sin(angle) * speed * age - 30 * age + 65 * age * age,
        i % 3 ? 2 : 3,
        2,
      );
    }
  }
  ctx.restore();
}
