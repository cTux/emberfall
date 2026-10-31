import type { DrawingContext } from './rendering/drawing-context';
import type { VillageNpc } from '@emberfall/common';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';

/** Small, bounded particle loops, anchored to the wrapped worker projection. */
export function drawNpcWork(
  ctx: DrawingContext,
  npc: VillageNpc,
  x: number,
  y: number,
  now: number,
  particles = true,
) {
  if (!particles || npc.moving) return;
  const station = VILLAGE_DEFINITION.workstations.find((s) => s.id === npc.workstationId);
  if (!station) return;
  const phase = Math.max(0, now - (npc.workStartedAt ?? now));
  const dx = station.x - station.worker.x;
  const dy = station.y - station.worker.y;
  const opacity = ctx.globalAlpha;
  ctx.save();
  ctx.translate(x + dx, y + dy);
  for (let i = 0; i < 8; i++) {
    const seed = Math.sin(i * 127.1 + station.art * 311.7) * 43758.5453;
    const spread = (seed - Math.floor(seed)) * 2 - 1;
    const age = ((phase + i * 211) % 1800) / 1800;
    let px = spread * 9;
    let py = -24 - age * 20;
    let radius = 1;
    ctx.globalAlpha = opacity * Math.sin(age * Math.PI) * 0.8;
    switch (station.activity) {
      case 'cooking':
        // Soft steam puffs widen as they rise from the pot.
        ctx.fillStyle = '#eee4ce';
        px += Math.sin(age * 5 + i) * 4;
        radius = 1 + age * 2;
        ctx.globalAlpha *= 0.45;
        break;
      case 'brewing':
        // Amber bubbles rise slowly and swell before popping.
        ctx.strokeStyle = '#efbd62';
        px = spread * 7 + Math.sin(age * 4 + i) * 2;
        py = -28 - age * 16;
        ctx.beginPath();
        ctx.arc(px, py, 0.7 + age * 1.5, 0, Math.PI * 2);
        ctx.lineWidth = 0.7;
        ctx.stroke();
        continue;
      case 'alchemy':
        // Green and lilac motes spiral out of the remedy bottles.
        ctx.fillStyle = i % 2 ? '#b5ed9a' : '#d4aff5';
        px = Math.sin(age * 8 + i) * (3 + age * 8);
        py = -25 - age * 25;
        radius = 1.1;
        break;
      case 'writing':
        // Tiny ink flecks skip across the page, rather than floating upward.
        ctx.fillStyle = i % 2 ? '#687ba5' : '#39435d';
        px = -5 + age * 12;
        py = -18 + spread * 3 - Math.sin(age * Math.PI) * 3;
        radius = 0.7;
        break;
      case 'forging': {
        // A short fan of hot sparks follows each hammer strike.
        const strike = (phase % 1600) / 1600;
        if (strike < 0.45 || strike > 0.8) continue;
        const flight = (strike - 0.45) / 0.35;
        ctx.fillStyle = i % 2 ? '#ffe6a0' : '#ff9847';
        px = spread * flight * 23;
        py = -18 - Math.sin(flight * Math.PI) * (9 + i) + flight * 6;
        radius = 1.2 - flight * 0.6;
        ctx.globalAlpha = opacity * (1 - flight);
        break;
      }

      case 'smelting':
        // Red embers accelerate upward from the furnace mouth.
        ctx.fillStyle = i % 2 ? '#ff7842' : '#ffc35b';
        px = spread * (4 + age * 10);
        py = -20 - age * age * 34;
        radius = 1.5 - age;
        break;
      case 'archery': {
        // Pale motes trace the shot; straw dust scatters at the target.
        const shot = (phase % 1600) / 1600;
        if (shot < 0.4 || shot > 0.95) continue;
        const flight = Math.min(1, (shot - 0.4) / 0.45);
        ctx.fillStyle = i < 4 ? '#e8dfb6' : '#bd995c';
        px = i < 4 ? -dx * (1 - flight) + i * 1.2 : spread * age * 10;
        py = i < 4 ? -26 - dy + (dy + 8) * flight : -18 + age * 8;
        radius = 0.8;
        if (i >= 4 && flight < 1) continue;
        break;
      }

      case 'leatherworking':
        // Tan shavings fall from the hide in a loose outward tumble.
        ctx.fillStyle = i % 2 ? '#d1a071' : '#a57650';
        px = spread * (4 + age * 12);
        py = -23 + age * age * 23;
        radius = 0.8 + (i % 3) * 0.2;
        break;
    }

    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
