import { PROJECTILE_STYLE as STYLE } from './projectile-style.ts';
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

  const column = Math.floor(now / STYLE.frameMs) % (arrow ? STYLE.arrowFrames : STYLE.effectFrames);
  const size = arrow
    ? STYLE.arrowPixels
    : kind === 'roots'
      ? STYLE.rootsPixels
      : STYLE.fireballPixels;
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
      arrow ? 0 : kind === 'roots' ? STYLE.rootsRow : STYLE.fireballRow,
      0,
      0,
      size,
      size,
      arrow ? STYLE.pickupCell : STYLE.effectCell,
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

    // Legacy fallback projectile geometry is authored in game pixels.
    if (shot.kind === 'roots') {
      ctx.scale(0.5, 0.5);
    }

    ctx.strokeStyle = '#baffaa';
    ctx.lineWidth = shot.kind === 'roots' ? STYLE.rootsStroke : 1;

    if (shot.kind === 'arrow') {
      ctx.lineWidth = STYLE.arrowOutlineStroke;
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(9, 0);
      ctx.stroke();
      ctx.strokeStyle = '#92d89c';
      ctx.lineWidth = STYLE.arrowShaftStroke;
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

    const age = Math.max(
      0,
      (now - explosion.at) / (explosion.durationMs ?? STYLE.explosionDurationMs),
    );

    if (age >= 1) {
      continue;
    }

    const p = near(explosion.x, explosion.y);

    if (explosion.talentClass) {
      const classIndex = ['warrior', 'ranger', 'mage', 'druid'].indexOf(explosion.talentClass);
      const row = Math.max(0, classIndex) * STYLE.talentColumns + (explosion.talentColumn ?? 0);

      if (talentCastArt.complete && talentCastArt.naturalWidth > 0) {
        const width = talentCastArt.naturalWidth / STYLE.talentFrames,
          height = talentCastArt.naturalHeight / STYLE.talentRows;
        ctx.globalAlpha = opacity * (1 - age * 0.5);
        ctx.drawImage(
          talentCastArt,
          Math.min(STYLE.talentLastFrame, Math.floor(age * STYLE.talentFrames)) * width,
          row * height,
          width,
          height,
          p.x - STYLE.talentPixels / 2,
          p.y - STYLE.talentPixels / 2,
          STYLE.talentPixels,
          STYLE.talentPixels,
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

      for (let index = 0; particles && index < STYLE.talentParticles; index++) {
        const angle = (index * Math.PI * 2) / STYLE.talentParticles + explosion.id;
        const radius = STYLE.talentStartRadius + age * STYLE.talentRadiusGrowth;
        ctx.beginPath();
        ctx.arc(
          p.x + Math.cos(angle) * radius,
          p.y + Math.sin(angle) * radius,
          STYLE.talentParticleRadius * (1 - age) + 1,
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
    ctx.lineWidth = STYLE.explosionStroke;
    ctx.beginPath();
    ctx.arc(
      p.x,
      p.y,
      (explosion.radius ?? STYLE.explosionRadius) *
        (STYLE.explosionStartScale + age * STYLE.explosionGrowth),
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
