import type { DrawingContext } from './rendering/drawing-context';
import { wrappedDelta } from '@emberfall/common';
import { FOREST, LOBBY_PORTAL } from '@emberfall/core';
import type { WorldState } from '@emberfall/common';

// Preserve the existing edge-arrow clearance and compact one-line label layout in CSS pixels.
const NAVIGATION_LAYOUT = {
  edgeInset: 28,
  stroke: 3,
  maxLabelLength: 20,
  truncatedLength: 19,
  textPadding: 12,
  labelBackgroundTop: 12,
  labelHalfHeight: 8.5,
  arrowLabelGap: 20,
  horizontalInset: 5,
  labelTop: 20,
  labelBottom: 10,
  baselineOffset: 3.5,
};

export function edgeArrow(x: number, y: number, width: number, height: number) {
  if (x >= 0 && x <= width && y >= 0 && y <= height) {
    return null;
  }

  const dx = x - width / 2,
    dy = y - height / 2;
  const ratio = Math.min(
    (width / 2 - NAVIGATION_LAYOUT.edgeInset) / Math.abs(dx),
    (height / 2 - NAVIGATION_LAYOUT.edgeInset) / Math.abs(dy),
  );

  return { x: width / 2 + dx * ratio, y: height / 2 + dy * ratio, angle: Math.atan2(dy, dx) };
}

export function drawNavigation(ctx: DrawingContext, world: WorldState, id: string) {
  const me = world.players.find((p) => {
    return p.id === id;
  });

  if (!me) {
    return;
  }

  const targets = world.players
    .filter((p) => {
      return (
        p.id !== id &&
        !!me.partyId &&
        p.partyId === me.partyId &&
        p.scene === me.scene &&
        p.runId === me.runId &&
        p.hitpoints > 0
      );
    })
    .map((p) => {
      return { x: p.x, y: p.y, name: p.name, color: '#89e5c5' };
    });

  if (me.scene !== 'forest') {
    targets.push({ ...LOBBY_PORTAL, name: 'Portal', color: '#70d8ff' });
  }

  if (me.scene === 'forest') {
    const boss = world.scene?.enemies.find((e) => {
      return e.kind === 'boss' && e.hitpoints > 0;
    });

    if (boss) {
      targets.push({
        x: boss.x,
        y: boss.y,
        name: boss.name ?? 'The Hollow Warden',
        color: '#ffae58',
      });
    }

    if (world.scene?.phase === 'ended') {
      for (const portal of world.scene.portals) {
        targets.push({ ...portal, name: 'Return portal', color: '#70d8ff' });
      }
    }
  }

  const matrix = ctx.getTransform();
  const width = ctx.canvas.clientWidth,
    height = ctx.canvas.clientHeight;
  const sx = ctx.canvas.width / width,
    sy = ctx.canvas.height / height;
  ctx.save();
  ctx.setTransform(sx, 0, 0, sy, 0, 0);

  for (const target of targets) {
    const x = me.x + wrappedDelta(target.x, me.x, FOREST.width);
    const y = me.y + wrappedDelta(target.y, me.y, FOREST.height);
    const point = new DOMPoint(x, y).matrixTransform(matrix);
    const arrow = edgeArrow(point.x / sx, point.y / sy, width, height);

    if (!arrow) {
      continue;
    }

    ctx.save();
    ctx.translate(arrow.x, arrow.y);
    ctx.rotate(arrow.angle);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-7, -7);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fillStyle = target.color;
    ctx.strokeStyle = '#101817';
    ctx.lineWidth = NAVIGATION_LAYOUT.stroke;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
    ctx.font = 'bold 11px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'center';
    const label =
      target.name.length > NAVIGATION_LAYOUT.maxLabelLength
        ? target.name.slice(0, NAVIGATION_LAYOUT.truncatedLength) + '…'
        : target.name;
    const box = ctx.measureText(label).width + NAVIGATION_LAYOUT.textPadding;
    const offset =
      (Math.abs(Math.cos(arrow.angle)) * box) / 2 +
      Math.abs(Math.sin(arrow.angle)) * NAVIGATION_LAYOUT.labelHalfHeight +
      NAVIGATION_LAYOUT.arrowLabelGap;
    const lx = Math.max(
      box / 2 + NAVIGATION_LAYOUT.horizontalInset,
      Math.min(
        width - box / 2 - NAVIGATION_LAYOUT.horizontalInset,
        arrow.x - Math.cos(arrow.angle) * offset,
      ),
    );
    const ly = Math.max(
      NAVIGATION_LAYOUT.labelTop,
      Math.min(
        height - NAVIGATION_LAYOUT.labelBottom,
        arrow.y - Math.sin(arrow.angle) * offset + NAVIGATION_LAYOUT.baselineOffset,
      ),
    );
    ctx.fillStyle = '#101817dd';
    ctx.fillRect(lx - box / 2, ly - NAVIGATION_LAYOUT.labelBackgroundTop, box, 17);
    ctx.fillStyle = target.color;
    ctx.fillText(label, lx, ly);
  }

  ctx.restore();
}
