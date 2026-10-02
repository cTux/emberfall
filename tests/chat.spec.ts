import { test, expect } from "@playwright/test";
import type { ClientMessage } from "../packages/common/src/index";

test("chat shows only whole messages and reveals its background and scrollbar on hover", async ({
  page,
}) => {
  await page.routeWebSocket("**/ws", (client) => {
    const server = client.connectToServer();
    server.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.world) {
        message.world.chat = Array.from({ length: 30 }, (_, id) => ({
          id: String(id),
          playerId: "p",
          name: "Alice",
          text: id % 2 ? "A wrapped message with several words. ".repeat(3) : `Message ${id}`,
          at: id,
        }));
      }
      client.send(JSON.stringify(message));
    });
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  const chat = page.getByRole("complementary", { name: "World chat", exact: true });
  const log = page.getByRole("log");
  await expect(log.locator(":scope > div")).toHaveCount(30);
  await page.mouse.move(900, 600);
  await expect(chat).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(log).toHaveCSS("scrollbar-color", "rgba(0, 0, 0, 0) rgba(0, 0, 0, 0)");
  await chat.hover();
  await expect(chat).toHaveCSS("background-color", "rgba(16, 28, 23, 0.85)");
  await expect(log).toHaveCSS("scrollbar-color", "auto");
  const wholeMessagesOnly = async () => {
    await expect
      .poll(() =>
        log.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const rows = Array.from(element.children);
          const visible = rows.filter((row) => getComputedStyle(row).visibility === "visible");
          return (
            visible.length > 0 &&
            visible.every((row) => {
              const rect = row.getBoundingClientRect();
              return rect.top >= bounds.top && rect.bottom <= bounds.bottom;
            })
          );
        }),
      )
      .toBe(true);
  };
  await wholeMessagesOnly();
  await chat.screenshot({ path: "test-results/chat-hover.png" });
  await log.evaluate((element) => {
    element.scrollTop = 5;
  });
  await expect(log.locator(":scope > div").first()).toHaveCSS("visibility", "hidden");
  await wholeMessagesOnly();
  await log.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(log.locator(":scope > div").first()).toBeVisible();
  await page.setViewportSize({ width: 800, height: 600 });
  await wholeMessagesOnly();
  await chat.hover();
  await chat.getByRole("textbox", { name: "Chat message" }).click();
  await page.mouse.move(700, 400);
  await expect(chat).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(log).toHaveCSS("scrollbar-color", "rgba(0, 0, 0, 0) rgba(0, 0, 0, 0)");
  await expect(chat.getByRole("textbox", { name: "Chat message" })).toBeVisible();
  await chat.getByRole("textbox", { name: "Chat message" }).press("Escape");
  await chat.screenshot({ path: "test-results/chat-idle.png" });
});

test("hover reveals chat, click focuses, typing stops movement, and both players see messages", async ({
  page,
  browser,
}) => {
  test.setTimeout(45000);
  let movement = { x: 0, y: 0 };
  let positionX = 0;
  await page.routeWebSocket("**/ws", (client) => {
    const server = client.connectToServer();
    client.onMessage((raw) => {
      const message: ClientMessage = JSON.parse(String(raw));
      if (message.type === "move") movement = { x: message.x, y: message.y };
      server.send(raw);
    });
    server.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "state")
        positionX = message.world.players.find((p: { name: string }) => p.name === "Alice")?.x ?? 0;
      client.send(raw);
    });
  });
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      if (text.startsWith("Hello party") || text.startsWith("Newest message")) {
        (window as typeof window & { chatDrawn?: string }).chatDrawn = text;
      }
      original.call(this, text, ...args);
    };
  });
  const otherContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const other = await otherContext.newPage();
  try {
    await page.goto("/");
    await page.getByRole("textbox", { name: "Your adventurer name" }).fill("Alice");
    await page.getByRole("tab", { name: "Create a world" }).click();
    await page.getByRole("textbox", { name: "World name", exact: true }).fill("Chat browser test");
    await page.getByRole("button", { name: "Light the ember" }).click();
    await expect(page.getByRole("button", { name: "Leave world" })).toBeVisible();
    await other.goto("/");
    await other.getByRole("textbox", { name: "Your adventurer name" }).fill("Bob");
    await other.getByRole("button", { name: /Join Chat browser test/ }).click();
    await expect(other.getByRole("button", { name: "Leave world" })).toBeVisible();
    await expect(page.getByRole("log")).toContainText("System: Bob joined.");
    await expect(other.getByRole("log")).toContainText("System: Alice joined.");
    const input = page.getByRole("textbox", { name: "Chat message" });
    const chat = page.getByRole("complementary", { name: "World chat", exact: true });
    await page.mouse.move(900, 600);
    await expect(input).toBeHidden();
    await chat.hover();
    await expect(input).toBeVisible();
    await expect(input).not.toBeFocused();
    await page.keyboard.down("d");
    await expect.poll(() => movement.x).toBe(1);
    await input.click();
    await expect(input).toBeFocused();
    await expect.poll(() => movement).toEqual({ x: 0, y: 0 });
    await page.keyboard.up("d");
    await page.mouse.move(900, 600);
    await expect(input).toBeVisible();
    await input.pressSequentially("Hello party wasd");
    expect(movement).toEqual({ x: 0, y: 0 });
    await input.press("Enter");
    await expect(page.getByRole("log")).toContainText("Alice: Hello party wasd");
    await expect(other.getByRole("log")).toContainText("Alice: Hello party wasd");
    await expect
      .poll(() => page.evaluate(() => (window as typeof window & { chatDrawn?: string }).chatDrawn))
      .toBe("Hello party wasd");
    await page.waitForTimeout(510);
    await input.fill("Newest message");
    await input.press("Enter");
    await expect(other.getByRole("log")).toContainText("Newest message");
    await expect
      .poll(() => page.evaluate(() => (window as typeof window & { chatDrawn?: string }).chatDrawn))
      .toBe("Newest message");
    await input.press("Escape");
    await expect(
      page.getByRole("textbox", { name: "Chat message", includeHidden: true }),
    ).not.toBeFocused();
    await expect(input).toBeHidden();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.screenshot({ path: "test-results/chat.png" });
    await page.keyboard.down("d");
    await expect.poll(() => positionX).toBeGreaterThan(500);
    await page.keyboard.up("d");
    await page.keyboard.press("e");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await page.getByRole("button", { name: "I'm ready" }).click();
    await other.getByRole("button", { name: "I'm ready" }).click();
    await expect(page.getByLabel("Forest combat scene.")).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("log")).toContainText(
      "Alice joined the scene. Everyone became stronger.",
    );
    await expect(other.getByRole("log")).toContainText(
      "Bob joined the scene. Everyone became stronger.",
    );
    await page.evaluate(() => {
      (window as typeof window & { chatDrawn?: string }).chatDrawn = undefined;
    });
    await expect
      .poll(() => page.evaluate(() => (window as typeof window & { chatDrawn?: string }).chatDrawn))
      .toBe("Newest message");
    await other.keyboard.press("Escape");
    await other.getByRole("button", { name: "Leave", exact: true }).click();
    await expect(other.getByLabel("Shared village. Move with WASD or arrow keys.")).toBeVisible();
    await expect(page.getByRole("log")).toContainText(
      "Bob left the scene. Everyone became weaker.",
    );
    await chat.hover();
    await input.fill("Hello party from forest");
    await input.press("Enter");
    await expect(other.getByRole("log")).toContainText("Hello party from forest");
    await expect
      .poll(() => page.evaluate(() => (window as typeof window & { chatDrawn?: string }).chatDrawn))
      .toBe("Hello party from forest");
    await page.screenshot({ path: "test-results/chat-forest.png" });
    await page.close();
    await expect(other.getByRole("log")).toContainText("Alice disconnected.");
    await expect(other.getByRole("log")).toContainText(
      "Alice left the scene. Everyone became weaker.",
    );
  } finally {
    await otherContext.close();
  }
});
