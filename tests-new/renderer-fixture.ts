import { PixiContext } from "../packages/client-new/src/rendering/pixi-context";
import { drawVignette, drawAtmosphere } from "../packages/client-new/src/effects";
import { drawDebuffs } from "../packages/client-new/src/combat-effects";
import { statusImages } from "../packages/client-new/src/combat-assets";
import { drawFog } from "../packages/client-new/src/forest";

export async function compare() {
  await Promise.all(Object.values(statusImages).map((image) => image.decode()));
  const gpu = document.createElement("canvas"),
    reference = document.createElement("canvas");
  document.body.append(gpu, reference);
  reference.width = reference.height = 256;
  const pixi = new PixiContext(gpu);
  pixi.resize(256, 256);
  await pixi.ready;
  const canvas = reference.getContext("2d")!;
  const results: Record<string, { actual: number[]; expected: number[] }> = {};
  const icons: Record<string, number> = {};
  const compare = (
    name: string,
    draw: (ctx: CanvasRenderingContext2D) => void,
    x: number,
    y: number,
  ) => {
    pixi.begin();
    canvas.reset();
    for (const ctx of [pixi as unknown as CanvasRenderingContext2D, canvas]) {
      ctx.fillStyle = "#809060";
      ctx.fillRect(0, 0, 256, 256);
      draw(ctx);
    }
    pixi.present();
    const capture = document.createElement("canvas");
    capture.width = capture.height = 256;
    const ctx = capture.getContext("2d")!;
    ctx.drawImage(gpu, 0, 0);
    results[name] = {
      actual: [...ctx.getImageData(x, y, 1, 1).data],
      expected: [...canvas.getImageData(x, y, 1, 1).data],
    };
    if (name in statusImages) {
      // Exclude the stack numeral and count colored glyph pixels, allowing the
      // small antialiasing differences between SVG scaling and nearest textures.
      const pixels = ctx.getImageData(80, 88, 12, 6).data;
      icons[name] = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const channels = [pixels[i], pixels[i + 1], pixels[i + 2]];
        if (Math.max(...channels) - Math.min(...channels) > 40) icons[name]++;
      }
      delete results[name];
    }
  };
  compare("vignette center", (ctx) => drawVignette(ctx, 0, 0, 256, 256), 128, 128);
  compare("fog blending", (ctx) => drawFog(ctx, 0, 0, 256, 256, 1000), 128, 128);
  compare("vignette edge", (ctx) => drawVignette(ctx, 0, 0, 256, 256), 5, 128);
  compare(
    "translated vignette",
    (ctx) => {
      ctx.translate(-500, -200);
      drawVignette(ctx, 500, 200, 256, 256);
    },
    128,
    128,
  );
  compare(
    "color grading",
    (ctx) => drawAtmosphere(ctx, 0, 0, 256, 256, 0, { colorGrading: true, lightShafts: false }),
    128,
    128,
  );
  compare(
    "light shafts",
    (ctx) => drawAtmosphere(ctx, 0, 0, 256, 256, 0, { colorGrading: false, lightShafts: true }),
    10,
    5,
  );
  for (const shade of ["#101817", "#b4cfdc"]) {
    compare(
      `grading ${shade}`,
      (ctx) => {
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, 256, 256);
        drawAtmosphere(ctx, 0, 0, 256, 256, 0, { colorGrading: true, lightShafts: false });
      },
      128,
      128,
    );
  }
  for (const kind of ["bleed", "poison", "burn", "roots"] as const) {
    compare(
      kind,
      (ctx) =>
        drawDebuffs(
          ctx,
          {
            id: 1,
            x: 0,
            y: 0,
            angle: 0,
            hitpoints: 100,
            debuffs: [{ kind, stacks: 1, expiresAt: 1000, nextTick: 1000, ownerId: "p" }],
          },
          80,
          100,
          0,
        ),
      81,
      89,
    );
  }
  // Leave both renderers showing the same composited scene for visual inspection.
  compare(
    "composite",
    (ctx) => {
      for (const [i, image] of Object.values(statusImages).entries())
        ctx.drawImage(image, 20 + i * 55, 100, 40, 40);
      drawVignette(ctx, 0, 0, 256, 256);
    },
    128,
    128,
  );
  return { results, icons };
}
