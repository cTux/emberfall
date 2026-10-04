import { test, expect } from "./fixtures";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const lighting = stripTypeScriptTypes(
  readFileSync("packages/client/src/lighting.ts", "utf8"),
).replaceAll("export ", "");
const source = readFileSync("packages/client/src/critters.ts", "utf8");
const critters = stripTypeScriptTypes(source.slice(source.indexOf("const images"))).replaceAll(
  "export ",
  "",
);

test("critter shadows start at the visible feet in every frame and direction", async ({ page }) => {
  await page.goto("/");
  await page.setContent('<canvas width="600" height="200"></canvas>');
  await page.addScriptTag({ content: `${lighting}\n${critters}` });
  const samples = await page.evaluate(async () => {
    const ctx = document.querySelector("canvas")!.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#708050";
    ctx.fillRect(0, 0, 600, 200);
    const samples = [];
    for (const kind of ["cat", "raccoon", "chicken"])
      for (const frame of [0, 1])
        for (const left of [false, true]) {
          const image = Reflect.get(window, "critterImage")(kind) as HTMLImageElement;
          await image.decode();
          const critter: { kind: string; frame: number; left: boolean; x: number; y: number } = {
            kind,
            frame,
            left,
            x: 25 + samples.length * 48,
            y: 70,
          };
          const caster: { mask: HTMLCanvasElement; y: number; height: number } = Reflect.get(
            window,
            "critterCaster",
          )(critter);
          const mask = caster.mask as HTMLCanvasElement;
          const bottom = mask.getContext("2d")!.getImageData(0, mask.height - 1, 16, 1).data;
          samples.push({
            kind,
            frame,
            left,
            feet: bottom.some((alpha, i) => i % 4 === 3 && alpha > 0),
            top: caster.y - caster.height,
            height: mask.height,
            cached: Reflect.get(window, "critterCaster")(critter).mask === mask,
            untrimmed: Reflect.get(window, "spriteMask")(image, frame, 0, left).height,
          });
          Reflect.get(window, "castShadow")(ctx, caster);
          Reflect.get(window, "drawCritter")(ctx, critter, true);
          ctx.fillStyle = "#fff";
          ctx.fillText(`${kind} ${frame} ${left ? "L" : "R"}`, critter.x - 20, 100);
          Reflect.get(window, "castShadow")(
            ctx,
            { ...caster, y: caster.y + 90 },
            {
              x: critter.x - 50,
              y: 80,
              height: 85,
              radius: 200,
              strength: 1,
            },
          );
          Reflect.get(window, "drawCritter")(ctx, { ...critter, y: 160 }, true);
        }
    return samples;
  });
  for (const sample of samples) {
    expect(sample.feet, JSON.stringify(sample)).toBe(true);
    expect(sample.top).toBe(46);
    expect(sample.height).toBe(sample.kind === "chicken" ? 16 : sample.frame ? 11 : 13);
    expect(sample.cached).toBe(true);
    expect(sample.untrimmed).toBe(16);
  }
  await page.locator("canvas").screenshot({ path: "test-results/critter-shadow-feet.png" });
});
