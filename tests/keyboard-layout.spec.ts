import { test, expect } from "./fixtures";
import type { ClientMessage } from "../packages/common/src/index";

test("movement follows physical keys across layouts and layout changes", async ({ page }) => {
  let movement = { x: 0, y: 0 };
  await page.routeWebSocket("**/ws", (client) => {
    const server = client.connectToServer();
    client.onMessage((raw) => {
      const message: ClientMessage = JSON.parse(String(raw));
      if (message.type === "move") movement = { x: message.x, y: message.y };
      server.send(raw);
    });
    server.onMessage((raw) => client.send(raw));
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();

  const sendKey = (type: string, code: string, key: string) =>
    page.evaluate(
      (event) => window.dispatchEvent(new KeyboardEvent(event.type, { ...event, bubbles: true })),
      { type, code, key },
    );
  const codes = ["KeyW", "KeyA", "KeyS", "KeyD"];
  const directions = [
    { x: 0, y: -1 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 0 },
  ];
  for (const keys of [
    ["w", "a", "s", "d"],
    ["ц", "ф", "і", "в"],
    ["ц", "ф", "ы", "в"],
    ["z", "q", "s", "d"],
    [",", "a", "o", "e"],
  ]) {
    for (const [index, code] of codes.entries()) {
      await sendKey("keydown", code, keys[index]);
      await expect.poll(() => movement).toEqual(directions[index]);
      // Releasing after a layout switch must still stop the same physical key.
      await sendKey("keyup", code, codes[index].slice(3).toUpperCase());
      await expect.poll(() => movement).toEqual({ x: 0, y: 0 });
    }
  }
  for (const [index, code] of ["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].entries()) {
    await sendKey("keydown", code, code);
    await expect.poll(() => movement).toEqual(directions[index]);
    await sendKey("keyup", code, code);
    await expect.poll(() => movement).toEqual({ x: 0, y: 0 });
  }
  await sendKey("keydown", "KeyD", "в");
  await sendKey("keydown", "ArrowRight", "ArrowRight");
  await sendKey("keyup", "KeyD", "d");
  await expect.poll(() => movement).toEqual({ x: 1, y: 0 });
  await sendKey("keyup", "ArrowRight", "ArrowRight");
  await expect.poll(() => movement).toEqual({ x: 0, y: 0 });
  await sendKey("keydown", "KeyD", "d");
  await expect.poll(() => movement).toEqual({ x: 1, y: 0 });
  const settings = page.getByRole("button", { name: "Settings", exact: true });
  await settings.click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await expect.poll(() => movement).toEqual({ x: 0, y: 0 });
  await sendKey("keydown", "ArrowRight", "ArrowRight");
  await page.waitForTimeout(150);
  expect(movement).toEqual({ x: 0, y: 0 });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(settings).toBeFocused();
  await sendKey("keyup", "KeyD", "d");
  await sendKey("keyup", "ArrowRight", "ArrowRight");
  await sendKey("keydown", "KeyD", "d");
  await expect.poll(() => movement).toEqual({ x: 1, y: 0 });
  await sendKey("keyup", "KeyD", "d");
});
