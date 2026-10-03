import { test, expect } from "@playwright/test";
import { ARENA, tickTraining } from "../packages/common/src/index";
import type { WorldState } from "../packages/common/src/index";

for (const [label, x, y] of [
  ["single dummy", 140, 300],
  ["group dummies", 820, 300],
  ["left seam", 2, 355],
  ["right seam", ARENA.width - 2, 355],
  ["top seam", 480, 2],
  ["bottom seam", 480, ARENA.height - 2],
  ["inn corner seam", 85, 80],
] as const) {
  test(`lobby centers the character and fills the viewport at ${label}`, async ({ page }) => {
    const world: WorldState = {
      id: "fixture",
      name: "Lobby camera",
      hostId: "p",
      serverNow: 10000,
      players: [
        {
          id: "p",
          name: "Hero",
          x,
          y,
          color: 0,
          hitpoints: 100,
          maxHitpoints: 100,
          manapoints: 50,
          maxManapoints: 50,
          level: 1,
          experience: 0,
          playtimeSeconds: 0,
        },
      ],
    };
    world.training = tickTraining(undefined, world.players, 10000, 0);
    await page.routeWebSocket("**/ws", (socket) => {
      socket.onMessage((raw) => {
        if (JSON.parse(String(raw)).type === "create")
          socket.send(
            JSON.stringify({
              type: "joined",
              playerId: "p",
              world,
              characterToken: "a".repeat(64),
            }),
          );
      });
    });
    await page.addInitScript(() => {
      const capture = { center: [] as number[], view: [] as number[], tiles: [] as number[][] };
      (window as unknown as { lobbyCapture: typeof capture }).lobbyCapture = capture;
      const ellipse = CanvasRenderingContext2D.prototype.ellipse;
      CanvasRenderingContext2D.prototype.ellipse = function (...args: Parameters<typeof ellipse>) {
        if (args[2] === 18 && args[3] === 8 && this.strokeStyle === "#efd086") {
          const point = new DOMPoint(args[0], args[1] - 15).matrixTransform(this.getTransform());
          capture.center = [point.x / this.canvas.width, point.y / this.canvas.height];
          capture.view = [
            this.canvas.width / this.getTransform().a,
            this.canvas.height / this.getTransform().d,
          ];
        }
        return ellipse.apply(this, args);
      };
      const drawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (
        this: CanvasRenderingContext2D,
        ...args: Parameters<typeof drawImage>
      ) {
        const source = args[0];
        if (
          source instanceof HTMLCanvasElement &&
          source.width === 4800 &&
          source.height === 2560
        ) {
          const matrix = this.getTransform();
          const cropped = args.length === 9;
          const dx = Number(args[cropped ? 5 : 1]);
          const dy = Number(args[cropped ? 6 : 2]);
          const width = cropped ? Number(args[7]) : source.width;
          const height = cropped ? Number(args[8]) : source.height;
          const a = new DOMPoint(dx, dy).matrixTransform(matrix);
          const b = new DOMPoint(dx + width, dy + height).matrixTransform(matrix);
          capture.tiles.push([a.x, a.y, b.x, b.y, this.canvas.width, this.canvas.height]);
          if (capture.tiles.length > 4) capture.tiles.shift();
        }
        return drawImage.apply(this, args);
      } as typeof drawImage;
    });
    await page.goto("/");
    await page.getByRole("tab", { name: "Create a world" }).click();
    await page.getByRole("textbox", { name: "World name", exact: true }).fill("Lobby camera");
    await page.getByRole("button", { name: "Light the ember" }).click();
    for (const size of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      // Resizing changes framing, while map expansion must not change the zoom.
      const scale = Math.max(size.width / 960, size.height / 640);
      await expect
        .poll(() =>
          page.evaluate(
            (expected) => {
              const view = (window as unknown as { lobbyCapture: { view: number[] } }).lobbyCapture
                .view;
              return (
                view.length === 2 &&
                view.every((value, index) => Math.abs(value - expected[index]) < 1)
              );
            },
            [size.width / scale, size.height / scale],
          ),
        )
        .toBe(true);
      await expect
        .poll(() =>
          page.evaluate(() => {
            const capture = (
              window as unknown as { lobbyCapture: { center: number[]; tiles: number[][] } }
            ).lobbyCapture;
            const centered =
              capture.center.every((value) => Math.abs(value - 0.5) < 0.001) &&
              capture.center.length === 2;
            const covered = [
              [0, 0],
              [1, 0],
              [0, 1],
              [1, 1],
            ].every(([x, y]) =>
              capture.tiles.some(
                ([l, t, r, b, w, h]) =>
                  x * w >= l - 0.01 && x * w <= r + 0.01 && y * h >= t - 0.01 && y * h <= b + 0.01,
              ),
            );
            return centered && covered;
          }),
        )
        .toBe(true);
      if (label === "inn corner seam")
        await page.screenshot({ path: `test-results/lobby-inn-seam-${size.width}.png` });
    }
    await page.screenshot({ path: `test-results/lobby-camera-${label.replaceAll(" ", "-")}.png` });
  });
}
