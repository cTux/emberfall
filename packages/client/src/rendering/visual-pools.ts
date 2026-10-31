import { Container, Sprite, Graphics, Text, BlurFilter, type Texture, type Matrix } from 'pixi.js';
import { World } from 'miniplex';

export type Visual = {
  object: Container;
  kind: 'sprite' | 'graphics' | 'text';
  active: boolean;
  blur?: BlurFilter;
  styleKey?: string;
  frameTexture?: Texture;
};

type VisualStyle = {
  globalAlpha: number;
  matrix: Matrix;
  globalCompositeOperation: string;
  mask: Graphics | null;
};

const blendModes: Readonly<Record<string, Container['blendMode']>> = {
  'source-over': 'normal',
  lighter: 'add',
  screen: 'screen',
  multiply: 'multiply',
  'soft-light': 'soft-light',
};

export class VisualPools {
  readonly stage = new Container();
  readonly ecs = new World<Visual>();
  private pools: Record<Visual['kind'], Visual[]> = { sprite: [], graphics: [], text: [] };
  private cursors = { sprite: 0, graphics: 0, text: 0 };
  private childCursors = new Map<Container, number>();
  private maskGroups: Container[] = [];
  private maskCursor = 0;
  private currentMask: Graphics | null = null;
  private currentGroup?: Container;

  constructor() {
    this.stage.eventMode = 'none';
  }

  begin() {
    this.childCursors.clear();
    this.childCursors.set(this.stage, 0);
    // Release previous clip ownership before pooled graphics take new roles.
    for (const group of this.maskGroups) group.mask = null;
    this.maskCursor = 0;
    this.currentMask = null;
    this.currentGroup = undefined;
    this.cursors = { sprite: 0, graphics: 0, text: 0 };
  }

  finish() {
    for (const [parent, count] of this.childCursors)
      if (parent.children.length > count) parent.removeChildren(count);
  }

  trim() {
    for (const kind of ['sprite', 'graphics', 'text'] as const) {
      const pool = this.pools[kind];
      const keep = Math.max(this.cursors[kind] + 32, Math.ceil(pool.length * 0.75));
      while (pool.length > keep) {
        const entry = pool.pop()!;
        this.ecs.remove(entry);
        entry.frameTexture?.destroy();
        entry.blur?.destroy();
        entry.object.destroy();
      }
    }
  }

  get active() {
    return { ...this.cursors };
  }

  destroy() {
    for (const entry of this.ecs) {
      entry.frameTexture?.destroy();
      entry.blur?.destroy();
      entry.object.destroy();
    }

    for (const group of this.maskGroups) group.destroy();
    this.stage.destroy();
    this.childCursors.clear();
  }

  visual(
    kind: Visual['kind'],
    state: VisualStyle,
    shadowPass: boolean,
    shadowStrength: number,
  ): Visual {
    const index = this.cursors[kind]++;
    let entity = this.pools[kind][index];
    if (!entity) {
      const object =
        kind === 'sprite'
          ? new Sprite()
          : kind === 'graphics'
            ? new Graphics()
            : new Text({ text: '', resolution: 4, textureStyle: { scaleMode: 'linear' } });
      object.eventMode = 'none';
      entity = this.ecs.add({ object, kind, active: true });
      this.pools[kind].push(entity);
    }

    const object = entity.object;
    entity.active = true;
    object.visible = true;
    object.alpha = state.globalAlpha;
    // Sprites and text receive their final transform at the draw call below.
    if (kind === 'graphics') object.setFromMatrix(state.matrix);
    object.blendMode = blendModes[state.globalCompositeOperation] ?? 'normal';
    object.mask = null;
    if (shadowPass && shadowStrength > 0) {
      entity.blur ??= new BlurFilter({ quality: 2, resolution: 0.5 });
      entity.blur.strength = shadowStrength;
      if (object.filters?.[0] !== entity.blur) object.filters = [entity.blur];
    } else if (object.filters?.length) object.filters = null;
    if (state.mask) {
      // One clip for a contiguous group, not one stencil pass for every portal
      // pixel or particle. Children remain eligible for normal sprite batching.
      if (this.currentMask !== state.mask || !this.currentGroup) {
        const group = (this.maskGroups[this.maskCursor] ??= new Container());
        this.maskCursor++;
        group.mask = state.mask;
        this.place(this.stage, group);
        this.childCursors.set(group, 0);
        this.currentMask = state.mask;
        this.currentGroup = group;
      }

      this.place(this.currentGroup, object);
    } else {
      this.currentMask = null;
      this.currentGroup = undefined;
      this.place(this.stage, object);
    }

    return entity;
  }

  place(parent: Container, object: Container) {
    const index = this.childCursors.get(parent) ?? 0;
    if (parent.children[index] !== object) parent.addChildAt(object, index);
    this.childCursors.set(parent, index + 1);
  }
}
