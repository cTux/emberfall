import { test, expect } from "@playwright/test";
import type { WorldState } from "../packages/common/src/index";

test("a one-pixel server correction is visually ignored without walking animation", async ({
  page,
}) => {
  let correct = false;
  await page.routeWebSocket("**/ws", (client) => {
    const server = client.connectToServer();
    client.onMessage((message) => server.send(message));
    server.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (correct && message.type === "state") message.world.players[0].x -= 1;
      client.send(JSON.stringify(message));
    });
  });
  await page.addInitScript(() => {
    const capture = { positions: [] as number[], rows: [] as number[] };
    (window as unknown as { correctionCapture: typeof capture }).correctionCapture = capture;
    const text = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (value, x, y) {
      if (value === "Smooth" && this.font === "12px system-ui") capture.positions.push(x);
      text.call(this, value, x, y);
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = new Proxy(draw, {
      apply(target, context, args) {
        if (args[0] instanceof HTMLImageElement && args[0].src.endsWith("/knight.png"))
          capture.rows.push(args[2]);
        return Reflect.apply(target, context, args);
      },
    });
  });
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Smooth");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const capture = (
      window as unknown as { correctionCapture: { positions: number[]; rows: number[] } }
    ).correctionCapture;
    capture.positions = [];
    capture.rows = [];
  });
  correct = true;
  await page.waitForTimeout(350);
  const capture = await page.evaluate(
    () =>
      (window as unknown as { correctionCapture: { positions: number[]; rows: number[] } })
        .correctionCapture,
  );
  expect(capture.positions.every((x) => Math.abs(x - 420) < 0.01)).toBe(true);
  expect(capture.positions.at(-1)).toBeCloseTo(420, 3);
  expect(
    Math.max(...capture.positions.slice(1).map((x, i) => Math.abs(x - capture.positions[i]))),
  ).toBeLessThan(0.6);
  expect([...new Set(capture.rows)]).toEqual([0]);
});

test("local movement is instant during delayed snapshots and reconciles after delivery resumes", async ({
  page,
}) => {
  let blocked = false,
    held: string | undefined,
    delivered = 0,
    latest: WorldState | undefined;
  let release: () => void = () => {};
  await page.routeWebSocket("**/ws", (client) => {
    const server = client.connectToServer();
    client.onMessage((message) => server.send(message));
    release = () => {
      if (held) {
        client.send(held);
        held = undefined;
      }
    };
    server.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "state") {
        latest = message.world;
        if (blocked) {
          held = String(raw);
          return;
        }
        delivered++;
      }
      client.send(raw);
    });
  });
  await page.addInitScript(() => {
    (window as unknown as { heroX: number }).heroX = 0;
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (text === "Buffered" && this.font === "12px system-ui")
        (window as unknown as { heroX: number }).heroX = x;
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto("/");
  await page.getByLabel("Your adventurer name").fill("Buffered");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  await expect.poll(() => latest?.players[0].inputSeq ?? 0).toBeGreaterThan(2);
  blocked = true;
  const received = delivered;
  const start = await page.evaluate(() => (window as unknown as { heroX: number }).heroX);
  await page.keyboard.down("d");
  await page.waitForTimeout(180);
  await page.keyboard.up("d");
  const predicted = await page.evaluate(() => (window as unknown as { heroX: number }).heroX);
  expect(predicted - start).toBeGreaterThan(18);
  expect(delivered).toBe(received);
  blocked = false;
  release();
  await expect
    .poll(async () => {
      const rendered = await page.evaluate(() => (window as unknown as { heroX: number }).heroX);
      return Math.abs(rendered - latest!.players[0].x);
    })
    .toBeLessThan(1);
  await expect(page.getByRole("status", { name: "World server online" })).toBeVisible();
});
