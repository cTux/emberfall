import { test, expect } from "./fixtures";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const lighting = stripTypeScriptTypes(
  readFileSync("packages/client/src/lighting.ts", "utf8"),
).replaceAll("export ", "");
const source = readFileSync("packages/client/src/village-background.ts", "utf8");
const background = stripTypeScriptTypes(source.slice(source.indexOf("const nature"))).replaceAll(
  "export ",
  "",
);

test("cached village shadows and contact shading continue across edges and corners", async ({
  page,
}) => {
  await page.goto("/");
  await page.addScriptTag({
    content: `
    const ARENA = { width: 4800, height: 2560 };
    const TORCH_LIGHTS = [];
    function drawVillagePaths() {}
    ${lighting}
    const mask = document.createElement('canvas');
    mask.width = mask.height = 8;
    mask.getContext('2d').fillRect(0, 0, 8, 8);
    function villageSprites() {
      return [
        { id: 'tree:corner', x: 4785, y: 2545, width: 32, height: 64, mask },
        { id: 'tree:right', x: 4785, y: 500, width: 32, height: 64, mask },
        { id: 'tree:bottom', x: 500, y: 2545, width: 32, height: 64, mask },
        { id: 'tree:ao', x: 1, y: 1, width: 64, height: 64, mask },
      ];
    }
    ${background}
    window.backgroundReady = Promise.all(Object.values(villageImages).map(image => image.decode()));
    window.sampleBackground = (shadows, ambientOcclusion) => {
      const prepared = villageBackground({ grass: false, shadows, ambientOcclusion });
      const ctx = prepared.background.getContext('2d');
      return [[5, 15], [5, 530], [520, 15], [4798, 2558], [4798, 1], [1, 2558]]
        .map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data).slice(0, 3));
    };
  `,
  });
  const samples = await page.evaluate(async () => {
    await Reflect.get(window, "backgroundReady");
    const sample = Reflect.get(window, "sampleBackground");
    return { plain: sample(false, false), shadows: sample(true, false), ao: sample(false, true) };
  });
  for (let index = 0; index < 3; index++) {
    expect(samples.plain[index][1] - samples.shadows[index][1]).toBeGreaterThan(5);
    expect(samples.plain[index + 3][1] - samples.ao[index + 3][1]).toBeGreaterThan(5);
  }
});
