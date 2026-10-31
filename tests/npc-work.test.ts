import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { VillageNpc } from '../packages/common/src/index.ts';
import { VILLAGE_DEFINITION } from '../packages/core/src/definitions/worlds/village.ts';
import { drawNpcWork } from '../packages/client/src/npc-work.ts';

function recorder() {
  const marks: unknown[][] = [];
  const translations: number[][] = [];
  const alphas: number[] = [];
  const ctx = {
    globalAlpha: 0.2,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    save() {
      alphas.push(this.globalAlpha);
    },
    restore() {
      this.globalAlpha = alphas.pop()!;
    },
    translate(...values: number[]) {
      translations.push(values);
    },
    beginPath() {},
    arc(...values: number[]) {
      assert.ok(values.every(Number.isFinite));
      assert.ok(values[2] > 0 && values[2] <= 3);
      assert.ok(this.globalAlpha >= 0 && this.globalAlpha <= 0.2);
      marks.push([...values, this.globalAlpha]);
    },
    fill() {
      marks.push(['fill', this.fillStyle]);
    },
    stroke() {
      marks.push(['stroke', this.strokeStyle]);
    },
  };

  return { ctx: ctx as unknown as CanvasRenderingContext2D, marks, translations };
}

function worker(stationId: string): VillageNpc {
  return {
    id: 'test',
    buildingId: 'inn',
    name: 'Worker',
    x: 0,
    y: 0,
    angle: 0,
    moving: false,
    workstationId: stationId,
    workStartedAt: 0,
    chat: '',
    chatUntil: 0,
    silenced: false,
  };
}

test('every workstation has distinct, bounded, animated particles and preserves scenery opacity', () => {
  const signatures = new Set<string>();
  for (const station of VILLAGE_DEFINITION.workstations) {
    const frames: unknown[] = [];
    for (const time of [0, 720, 960, 1480, 1_000_000]) {
      const { ctx, marks } = recorder();
      drawNpcWork(ctx, worker(station.id), 100, 100, time);
      assert.equal(ctx.globalAlpha, 0.2);
      assert.ok(marks.length <= 16);
      frames.push(marks);
    }

    assert.ok(
      frames.some((frame) => {
        return JSON.stringify(frame) !== '[]';
      }),
      station.id,
    );
    assert.ok(
      new Set(
        frames.map((frame) => {
          return JSON.stringify(frame);
        }),
      ).size > 1,
      station.id,
    );
    signatures.add(JSON.stringify(frames));
  }

  assert.equal(signatures.size, VILLAGE_DEFINITION.workstations.length);
});

test('particle preference, interrupted work and walking suppress all work effects', () => {
  for (const [npc, enabled] of [
    [worker('inn-cooking'), false],
    [{ ...worker('inn-cooking'), moving: true }, true],
    [worker(''), true],
    [worker('unknown'), true],
  ] as const) {
    const { ctx, marks, translations } = recorder();
    drawNpcWork(ctx, npc, 0, 0, 900, enabled);
    assert.deepEqual(marks, []);
    assert.deepEqual(translations, []);
  }
});

test('wrapped projections translate particles without resetting their animation', () => {
  for (const station of VILLAGE_DEFINITION.workstations) {
    const first = recorder(),
      wrapped = recorder();
    drawNpcWork(first.ctx, worker(station.id), 100, 200, 960);
    drawNpcWork(wrapped.ctx, worker(station.id), 4900, 2760, 960);
    assert.deepEqual(first.marks, wrapped.marks);
    assert.deepEqual(wrapped.translations[0], [
      first.translations[0][0] + 4800,
      first.translations[0][1] + 2560,
    ]);
  }
});
