import type { DrawingContext } from '../rendering/drawing-context';
import type { SceneState } from '@emberfall/common';
import type { Preferences } from '../preferences';
import { abilityEffectOpacity } from '../ability-effects';
import { clientAsset } from '../urls';
import { effectsArt, pickupArt, drawArt } from '../art';
import { hitOutline } from './hits.ts';

export const talentCastArt = new Image();
talentCastArt.src = clientAsset('/assets/talents/cast-effects.png');

const projectileOutlines = new Map<string, HTMLCanvasElement>();

function drawProjectileArt(ctx: DrawingContext, kind: 'arrow' | 'fireball' | 'roots', now: number) {
  const arrow = kind === 'arrow';
  const image = arrow ? pickupArt : effectsArt;

  if (!image.naturalWidth || image.dataset.artReady !== 'true') {
    return false;
  }

  const column = Math.floor(now / 100) % (arrow ? 4 : 3);
  const size = arrow ? 44 : kind === 'roots' ? 24 : 48;
  const key = `${kind}:${column}`;
  let outlined = projectileOutlines.get(key);

  if (!outlined) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = size;
    const spriteContext = sprite.getContext('2d')!;
    spriteContext.imageSmoothingEnabled = false;
    drawArt(
      spriteContext,
      image,
      column,
      arrow ? 0 : kind === 'roots' ? 3 : 2,
      0,
      0,
      size,
      size,
      arrow ? 64 : 128,
    );
    outlined = hitOutline(sprite, '#baffaa', 1);
    const outlineContext = outlined.getContext('2d')!;
    outlineContext.globalCompositeOperation = 'source-over';
    outlineContext.drawImage(sprite, 1, 1);
    projectileOutlines.set(key, outlined);
  }

  ctx.drawImage(outlined, -size / 2 - 1, -size / 2 - 1);

  return true;
}

export function drawClassProjectiles(
  ctx: DrawingContext,
  scene: SceneState,
  now: number,
  near: (x: number, y: number) => { x: number; y: number },
  particles = true,
  preferences: Pick<Preferences, 'abilityEffectTransparency' | 'hideOtherPlayerEffects'> = {
    abilityEffectTransparency: 0,
    hideOtherPlayerEffects: false,
  },
  playerId = '',
) {
  ctx.save();

  for (const shot of scene.playerShots ?? []) {
    const opacity = abilityEffectOpacity(preferences, playerId, shot.ownerId);

    if (opacity === 0) {
      continue;
    }

    ctx.globalAlpha = opacity;
    const p = near(shot.x, shot.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(shot.angle);

    if (drawProjectileArt(ctx, shot.kind, now)) {
      ctx.restore();
      continue;
    }

    if (shot.kind === 'roots') {
      ctx.scale(0.5, 0.5);
    }

    ctx.strokeStyle = '#baffaa';
    ctx.lineWidth = shot.kind === 'roots' ? 2 : 1;

    if (shot.kind === 'arrow') {
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(9, 0);
      ctx.stroke();
      ctx.strokeStyle = '#92d89c';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = '#baffaa';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#edffe7';
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(5, -4);
      ctx.lineTo(5, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = shot.kind === 'roots' ? '#56bc7277' : '#ef722977';
      ctx.beginPath();
      ctx.ellipse(-8, 0, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = shot.kind === 'roots' ? '#79db87' : '#ff9d36';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shot.kind === 'roots' ? '#d5ffd0' : '#fff1a6';
      ctx.beginPath();
      ctx.arc(2, -1, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  for (const explosion of scene.explosions ?? []) {
    const opacity = abilityEffectOpacity(preferences, playerId, explosion.ownerId);

    if (opacity === 0) {
      continue;
    }

    const age = Math.max(0, (now - explosion.at) / (explosion.durationMs ?? 350));

    if (age >= 1) {
      continue;
    }

    const p = near(explosion.x, explosion.y);

    if (explosion.talentClass) {
      const classIndex = ['warrior', 'ranger', 'mage', 'druid'].indexOf(explosion.talentClass);
      const row = Math.max(0, classIndex) * 3 + (explosion.talentColumn ?? 0);

      if (talentCastArt.complete && talentCastArt.naturalWidth > 0) {
        const width = talentCastArt.naturalWidth / 4,
          height = talentCastArt.naturalHeight / 12;
        ctx.globalAlpha = opacity * (1 - age * 0.5);
        ctx.drawImage(
          talentCastArt,
          Math.min(3, Math.floor(age * 4)) * width,
          row * height,
          width,
          height,
          p.x - 100,
          p.y - 100,
          200,
          200,
        );
      }

      const colors = [
        '#ffd18a',
        '#e96060',
        '#9ccfe8',
        '#d3eb97',
        '#9ed966',
        '#b6d8bd',
        '#ffb357',
        '#d3a8f0',
        '#a7e5ff',
        '#c4eaa1',
        '#d8bb83',
        '#82e6b3',
      ];
      ctx.fillStyle = colors[row];
      ctx.globalAlpha = opacity * (1 - age);

      for (let index = 0; particles && index < 10; index++) {
        const angle = (index * Math.PI * 2) / 10 + explosion.id;
        const radius = 20 + age * 110;
        ctx.beginPath();
        ctx.arc(
          p.x + Math.cos(angle) * radius,
          p.y + Math.sin(angle) * radius,
          3 * (1 - age) + 1,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      continue;
    }

    ctx.globalAlpha = opacity * (1 - age);
    ctx.fillStyle = '#ffb53d44';
    ctx.strokeStyle = '#ffcb6b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (explosion.radius ?? 100) * (0.3 + age * 0.7), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
