import { test, expect } from "@playwright/test";

test("combined performance graph plots FPS and latency, preserves toggles and stays top left", async ({
  page,
}) => {
  await page.routeWebSocket("**/ws", (client) => {
    const server = client.connectToServer();
    client.onMessage((message) => server.send(message));
    server.onMessage((message) => {
      if (JSON.parse(String(message)).type === "pong") setTimeout(() => client.send(message), 150);
      else client.send(message);
    });
  });
  await page.goto("/");
  await expect(page.getByLabel("Server latency", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Frame rate", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Latency graph", { exact: true })).toBeChecked();
  await expect(page.getByLabel("FPS graph", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: /^Close / }).click();
  const latency = page.getByLabel("Server latency", { exact: true }),
    fps = page.getByLabel("Frame rate", { exact: true });
  await expect(latency).toHaveText(/\d+ ms/);

  await expect(page.getByLabel("Input acknowledgement delay", { exact: true })).toHaveCount(1);
  await expect(page.getByLabel("Snapshot age since receipt", { exact: true })).toHaveCount(1);
  await expect
    .poll(async () =>
      Number(await page.locator('[data-series="latency"]').getAttribute("data-value")),
    )
    .toBeGreaterThanOrEqual(140);
  await expect(page.locator(".performance-stats")).not.toContainText(
    /Input ack:|Snapshot age \(local\):/,
  );
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  for (const series of ["inputDelay", "snapshotAge"]) {
    await expect(page.locator(`[data-series="${series}"]`)).toHaveAttribute("d", /L/);
    await expect(page.locator(`[data-series="${series}"]`)).toHaveAttribute("data-value", /\d/);
  }
  await expect(page.locator(".performance-values")).toHaveCount(0);
  const a = await fps.boundingBox(),
    b = await latency.boundingBox();
  expect(b!.y).toBe(a!.y);
  expect(b!.x).toBeGreaterThan(a!.x + a!.width);
  const graph = page.getByRole("img", { name: "Performance history over the last 30 seconds" });
  await expect(graph).toBeVisible();
  await expect(page.locator('[data-series="fps"]')).toHaveAttribute("d", /L/);
  await expect(page.locator('[data-series="latency"]')).toHaveAttribute("d", /L/);
  expect((await page.locator(".performance-stats").boundingBox())!.x).toBe(14);

  await page.screenshot({ path: "test-results/performance-graph.png" });
  await page.reload();
  await expect(latency).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Latency graph", { exact: true })).toBeChecked();
  await page.getByLabel("FPS graph", { exact: true }).uncheck();
  await page.getByRole("button", { name: /^Close / }).click();
  await expect(fps).toBeHidden();
  await expect(latency).toBeVisible();
  expect((await page.locator(".performance-stats").boundingBox())!.x).toBe(14);
  await expect(page.locator('[data-series="fps"]')).toHaveCount(0);
  await expect(page.locator('[data-series="latency"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Latency graph", { exact: true }).uncheck();
  await page.getByRole("button", { name: /^Close / }).click();
  await expect(page.locator(".performance-stats")).toBeHidden();
});

test("network lines grow during stale snapshots even when ping stays low", async ({ page }) => {
  let blocked = false;
  await page.routeWebSocket("**/ws", (client) => {
    const server = client.connectToServer();
    client.onMessage((message) => server.send(message));
    server.onMessage((raw) => {
      if (blocked && JSON.parse(String(raw)).type === "state") return;
      client.send(raw);
    });
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Create a world" }).click();
  await page.getByRole("button", { name: "Light the ember" }).click();
  const input = page.locator('[data-series="inputDelay"]');
  const age = page.locator('[data-series="snapshotAge"]');
  await expect(input).toHaveAttribute("data-value", /\d/);
  blocked = true;
  await page.keyboard.down("d");
  await expect
    .poll(async () => Number(await input.getAttribute("data-value")))
    .toBeGreaterThan(800);
  await page.keyboard.up("d");
  await expect.poll(async () => Number(await age.getAttribute("data-value"))).toBeGreaterThan(800);
  expect(
    Number(await page.locator('[data-series="latency"]').getAttribute("data-value")),
  ).toBeLessThan(Number(await age.getAttribute("data-value")) / 2);
  const max = Number(
    (await page.getByLabel("Network scale", { exact: true }).textContent())?.match(/0.(\d+)/)?.[1],
  );
  expect(max).toBeGreaterThanOrEqual(Number(await age.getAttribute("data-value")));
  for (const line of [input, age]) {
    await expect(line).toHaveAttribute("d", /L/);
    const ys = (await line.getAttribute("d"))!
      .split(/\s+/)
      .filter(Boolean)
      .map((point) => Number(point.split(",")[1]));
    expect(ys.every((y) => y >= 10 && y <= 70)).toBe(true);
  }
  await page.screenshot({ path: "test-results/stale-network-graph.png" });
});
