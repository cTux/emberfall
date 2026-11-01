import type { DrawingContext } from './rendering/drawing-context';
import type { VillageNpc } from '@emberfall/common';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';

import {
  WORK_PARTICLES,
  COOKING,
  BREWING,
  ALCHEMY,
  WRITING,
  FORGING,
  SMELTING,
  ARCHERY,
  LEATHERWORKING,
} from './npc-work-tuning.ts';

/** Small, bounded particle loops, anchored to the wrapped worker projection. */
export function drawNpcWork(
  ctx: DrawingContext,
  npc: VillageNpc,
  x: number,
  y: number,
  now: number,
  particles = true,
) {
  if (!particles || npc.moving) {
    return;
  }

  const station = VILLAGE_DEFINITION.workstations.find((s) => {
    return s.id === npc.workstationId;
  });

  if (!station) {
    return;
  }

  const phase = Math.max(0, now - (npc.workStartedAt ?? now));
  const dx = station.x - station.worker.x;
  const dy = station.y - station.worker.y;
  const opacity = ctx.globalAlpha;
  ctx.save();
  ctx.translate(x + dx, y + dy);

  for (let i = 0; i < WORK_PARTICLES.count; i++) {
    const seed =
      Math.sin(i * WORK_PARTICLES.seedIndex + station.art * WORK_PARTICLES.seedStation) *
      WORK_PARTICLES.seedScale;
    const spread = (seed - Math.floor(seed)) * 2 - 1;
    const age =
      ((phase + i * WORK_PARTICLES.phaseOffsetMs) % WORK_PARTICLES.driftMs) /
      WORK_PARTICLES.driftMs;
    let px = spread * WORK_PARTICLES.spread;
    let py = -WORK_PARTICLES.height - age * WORK_PARTICLES.rise;
    let radius = 1;
    ctx.globalAlpha = opacity * Math.sin(age * Math.PI) * WORK_PARTICLES.alpha;

    switch (station.activity) {
      case 'cooking': {
        // Soft steam puffs widen as they rise from the pot.
        ctx.fillStyle = '#eee4ce';
        px += Math.sin(age * COOKING.wobbleRate + i) * COOKING.wobbleWidth;
        radius = 1 + age * 2;
        ctx.globalAlpha *= COOKING.alpha;
        break;
      }

      case 'brewing': {
        // Amber bubbles rise slowly and swell before popping.
        ctx.strokeStyle = '#efbd62';
        px = spread * BREWING.spread + Math.sin(age * BREWING.wobbleRate + i) * 2;
        py = -BREWING.height - age * BREWING.rise;
        ctx.beginPath();
        ctx.arc(px, py, BREWING.radius + age * BREWING.growth, 0, Math.PI * 2);
        ctx.lineWidth = BREWING.stroke;
        ctx.stroke();
        continue;
      }

      case 'alchemy': {
        // Green and lilac motes spiral out of the remedy bottles.
        ctx.fillStyle = i % 2 ? '#b5ed9a' : '#d4aff5';
        px = Math.sin(age * ALCHEMY.orbitRate + i) * (ALCHEMY.spread + age * ALCHEMY.growth);
        py = -ALCHEMY.height - age * ALCHEMY.rise;
        radius = ALCHEMY.radius;
        break;
      }

      case 'writing': {
        // Tiny ink flecks skip across the page, rather than floating upward.
        ctx.fillStyle = i % 2 ? '#687ba5' : '#39435d';
        px = -WRITING.startX + age * WRITING.travel;
        py = -WRITING.height + spread * WRITING.spread - Math.sin(age * Math.PI) * WRITING.arc;
        radius = WRITING.radius;
        break;
      }

      case 'forging': {
        // A short fan of hot sparks follows each hammer strike.
        const strike = (phase % WORK_PARTICLES.actionMs) / WORK_PARTICLES.actionMs;

        if (strike < FORGING.startsAt || strike > FORGING.endsAt) {
          continue;
        }

        const flight = (strike - FORGING.startsAt) / FORGING.flight;
        ctx.fillStyle = i % 2 ? '#ffe6a0' : '#ff9847';
        px = spread * flight * FORGING.spread;
        py =
          -FORGING.height - Math.sin(flight * Math.PI) * (FORGING.arc + i) + flight * FORGING.fall;
        radius = FORGING.radius - flight * FORGING.shrink;
        ctx.globalAlpha = opacity * (1 - flight);
        break;
      }

      case 'smelting': {
        // Red embers accelerate upward from the furnace mouth.
        ctx.fillStyle = i % 2 ? '#ff7842' : '#ffc35b';
        px = spread * (SMELTING.spread + age * SMELTING.growth);
        py = -SMELTING.height - age * age * SMELTING.acceleration;
        radius = SMELTING.radius - age;
        break;
      }

      case 'archery': {
        // Pale motes trace the shot; straw dust scatters at the target.
        const shot = (phase % WORK_PARTICLES.actionMs) / WORK_PARTICLES.actionMs;

        if (shot < ARCHERY.startsAt || shot > ARCHERY.endsAt) {
          continue;
        }

        const flight = Math.min(1, (shot - ARCHERY.startsAt) / ARCHERY.flight);
        ctx.fillStyle = i < ARCHERY.arrowParticles ? '#e8dfb6' : '#bd995c';
        px =
          i < ARCHERY.arrowParticles
            ? -dx * (1 - flight) + i * ARCHERY.spacing
            : spread * age * ARCHERY.dustSpread;
        py =
          i < ARCHERY.arrowParticles
            ? -ARCHERY.arrowHeight - dy + (dy + ARCHERY.targetHeight) * flight
            : -ARCHERY.dustHeight + age * ARCHERY.dustRise;
        radius = ARCHERY.radius;

        if (i >= ARCHERY.arrowParticles && flight < 1) {
          continue;
        }

        break;
      }

      case 'leatherworking': {
        // Tan shavings fall from the hide in a loose outward tumble.
        ctx.fillStyle = i % 2 ? '#d1a071' : '#a57650';
        px = spread * (LEATHERWORKING.spread + age * LEATHERWORKING.growth);
        py = -LEATHERWORKING.height + age * age * LEATHERWORKING.fall;
        radius =
          LEATHERWORKING.radius + (i % LEATHERWORKING.sizeVariants) * LEATHERWORKING.sizeStep;
        break;
      }
    }

    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
