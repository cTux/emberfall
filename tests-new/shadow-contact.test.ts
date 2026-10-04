import { test } from "node:test";
import assert from "node:assert/strict";
import { makeMask, castShadow } from "../packages/client-new/src/lighting.ts";

test("padded scenery shadows meet the visible base under sunlight and nearby lamps", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  const pixels = new Uint8ClampedArray(16 * 16 * 4);
  // Visible building/root edge ends at row 12, leaving four transparent rows.
  pixels[(11 * 16 + 8) * 4 + 3] = 255;
  const maskContext = { drawImage() {}, fillRect() {}, getImageData: () => ({ data: pixels }) };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: () => ({ width: 0, height: 0, getContext: () => maskContext }),
    },
  });
  try {
    const mask = makeMask({ width: 16, height: 16 } as HTMLCanvasElement);
    for (const height of [64, 128])
      for (const light of [undefined, { x: 10, y: 10, height: 180, radius: 300, strength: 1 }]) {
        let tx = 0,
          ty = 0,
          shear = 0,
          sy = 0,
          drawY = 0;
        const context = {
          save() {},
          restore() {},
          translate(x: number, y: number) {
            tx = x;
            ty = y;
          },
          transform(_a: number, _b: number, c: number, d: number) {
            shear = c;
            sy = d;
          },
          drawImage(_mask: unknown, _x: number, y: number) {
            drawY = y;
          },
        } as unknown as CanvasRenderingContext2D;
        castShadow(context, { id: "scenery", x: 50, y: 100, width: 64, height, mask }, light);
        const visibleBottom = drawY + (height * 12) / 16;
        assert.equal(tx + shear * visibleBottom, 50, "contact must not slide sideways");
        assert.equal(
          ty + sy * visibleBottom,
          100 - (height * 4) / 16,
          "shadow and visible base must touch",
        );
      }
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
