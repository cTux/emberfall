import { LOOT_STYLE as STYLE, HIT_BURST } from './loot-style.ts';
import { MILLISECONDS_PER_SECOND } from '@emberfall/common';
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

  if (sprite) {
    return sprite;
  }

  sprite = document.createElement('canvas');
  sprite.width = sprite.height = STYLE.spritePixels;
  const ctx = sprite.getContext('2d')!;
  // Authored coin/mote geometry in the forty-pixel fallback sprite.
  const glow = ctx.createRadialGradient(20, 20, 1, 20, 20, 18);
  glow.addColorStop(0, kind === 'gold' ? '#ffca5599' : '#68ffc399');
  glow.addColorStop(1, '#0000');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 40, 40);
  ctx.fillStyle = kind === 'gold' ? '#ffc74e' : '#72ffd0';
  ctx.beginPath();
  ctx.ellipse(20, 20, kind === 'gold' ? STYLE.goldRadius : STYLE.moteRadius, 5, 0, 0, Math.PI * 2);
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
  const visible = (p: { x: number; y: number }) => {
    return (
      p.x >= view.x - STYLE.cullMargin &&
      p.x <= view.x + view.width + STYLE.cullMargin &&
      p.y >= view.y - STYLE.cullMargin &&
      p.y <= view.y + view.height + STYLE.cullMargin
    );
  };

  ctx.save();

  for (const drop of scene.drops ?? []) {
    const p = near(drop.x, drop.y + STYLE.feetOffset);

    if (!visible(p)) {
      continue;
    }

    const age = Math.max(0, now - drop.at);
    const jump =
      Math.abs(Math.sin(age / STYLE.bouncePeriodMs + drop.id * STYLE.phasePerDrop)) *
      (STYLE.idleBounce + STYLE.initialBounce * Math.exp(-age / STYLE.bounceDecayMs));
    ctx.fillStyle = '#06181080';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + STYLE.shadowOffset, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    if (drop.kind === 'item') {
      const beam = ctx.createLinearGradient(p.x, p.y - STYLE.beamHeight, p.x, p.y);
      const color = rarityColor[itemRarity(drop)];
      beam.addColorStop(0, `${color}00`);
      beam.addColorStop(1, `${color}aa`);
      ctx.fillStyle = beam;
      ctx.fillRect(p.x - STYLE.beamHalfWidth, p.y - STYLE.beamHeight, 6, 36);
      const gear = GEAR_DEFINITIONS[drop.itemId ?? ''];
      const slot = EQUIPMENT_SLOTS.find((slot) => {
        return SLOT_GEAR_TYPES[slot].includes(gear?.gearType);
      });
      const icon = loadArt(itemArtName(drop.itemId ?? '') ?? equipmentSlotArt(slot ?? 'amulet'));
      drawArt(ctx, icon, 0, 0, p.x - STYLE.iconHalfWidth, p.y - STYLE.itemOffset - jump, 20, 20);
    } else if (pickupArt.naturalWidth) {
      drawArt(
        ctx,
        pickupArt,
        Math.floor((now + drop.id * STYLE.phaseMsPerDrop) / STYLE.frameMs) % STYLE.frames,
        drop.kind === 'gold' ? STYLE.goldRow : STYLE.experienceRow,
        p.x - STYLE.iconHalfWidth,
        p.y - STYLE.pickupOffset - jump,
        20,
        20,
      );
    } else {
      ctx.drawImage(
        lootSprite(drop.kind),
        p.x - STYLE.fallbackHalfWidth,
        p.y - STYLE.fallbackOffset - jump,
      );
    }
  }

  // Bound bursts independently of ambient-particle settings, so hits remain readable on Low.
  for (const hit of scene.damage.slice(-HIT_BURST.recentHits)) {
    const age = (now - hit.at) / MILLISECONDS_PER_SECOND;

    if (age < 0 || age > HIT_BURST.durationSeconds) {
      continue;
    }

    const p = near(hit.x, hit.y);

    if (!visible(p)) {
      continue;
    }

    ctx.globalAlpha = 1 - age / HIT_BURST.durationSeconds;

    for (let i = 0; i < HIT_BURST.particles; i++) {
      const angle = i * HIT_BURST.angleStep + hit.id;
      const speed = HIT_BURST.minimumSpeed + ((i * HIT_BURST.speedSeed) % HIT_BURST.speedRange);
      ctx.fillStyle = i % HIT_BURST.brightParticleEvery ? '#bd283b' : '#f45561';
      ctx.fillRect(
        p.x + Math.cos(angle) * speed * age,
        p.y -
          HIT_BURST.launchHeight +
          Math.sin(angle) * speed * age -
          HIT_BURST.upwardSpeed * age +
          HIT_BURST.gravity * age * age,
        i % HIT_BURST.brightParticleEvery ? HIT_BURST.particleWidth : HIT_BURST.brightParticleWidth,
        2,
      );
    }
  }

  ctx.restore();
}
