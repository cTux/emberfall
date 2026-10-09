import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUILDINGS,
  PATHS,
  TORCHES,
  WARDROBE,
  INNKEEPER,
  INTERACTION_RADIUS,
  ARENA,
  moveActor,
  nearbyInteraction,
} from "@emberfall/common-new";
import { shadowProjection, SUN } from "../../client-new/src/lighting.ts";

test("distant sun is directional; nearby lights cast opposite shadows with bounded reach", async () => {
  const body = { x: 400, y: 350, height: 48 };
  assert(SUN.x < -1000 && SUN.y < -1000);
  assert.deepEqual(shadowProjection(body), shadowProjection({ ...body, x: 800, y: 100 }));
  const left = shadowProjection(body, { x: 350, y: 350, height: 85, radius: 145, strength: 0.24 });
  const right = shadowProjection(body, { x: 450, y: 350, height: 85, radius: 145, strength: 0.24 });
  assert(left && right && left.x > 0 && right.x < 0);
  assert.equal(left.y, 0);
  assert.equal(right.y, 0);
  assert.equal(
    shadowProjection(body, { x: 0, y: 350, height: 28, radius: 110, strength: 0.18 }),
    null,
  );
  const low = shadowProjection(body, { x: 350, y: 350, height: 28, radius: 110, strength: 0.18 });
  assert(low && Number.isFinite(low.x) && Math.abs(low.x) <= 88);
});

test("village paths and door approaches are walkable while buildings and torch posts are solid", async () => {
  for (const building of BUILDINGS) {
    const result = moveActor({ x: building.doorX, y: building.y + 30 }, 0, -80, 12);
    assert(result.y >= building.y + 12);
    assert(result.y < building.y + 30);
    if (building.id === "inn") continue;
    assert.deepEqual(nearbyInteraction({ x: building.doorX, y: building.y + 30, hitpoints: 100 }), {
      id: building.id,
      name: building.name,
      x: building.doorX,
      y: building.y,
    });
  }
  for (const torch of TORCHES) {
    const result = moveActor({ x: torch.x - 30, y: torch.y }, 60, 0, 12);
    assert(result.x <= torch.x - 17);
  }
  for (const path of PATHS)
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i],
        b = path[i + 1];
      for (let step = 0; step <= 20; step++) {
        const point = { x: a.x + ((b.x - a.x) * step) / 20, y: a.y + ((b.y - a.y) * step) / 20 };
        // Dirt extends under each threshold, where the building itself remains solid.
        if (
          BUILDINGS.some(
            (building) =>
              Math.abs(point.x - building.doorX) < 24 &&
              point.y <= building.y + 12 &&
              point.y >= building.y - 24,
          ) ||
          Math.hypot(point.x - WARDROBE.x, point.y - WARDROBE.y) < 30
        )
          continue;
        const result = moveActor(point, 0, 1, 12);
        assert.equal(result.y, point.y + 1, `Blocked path at ${point.x},${point.y}`);
      }
    }
});

test("Marta replaces the Inn interaction with living village-only wrapped proximity", () => {
  const player = { x: INNKEEPER.x, y: INNKEEPER.y - 15, hitpoints: 100 };
  assert.deepEqual(nearbyInteraction(player), INNKEEPER);
  assert.deepEqual(nearbyInteraction({ ...player, x: player.x + ARENA.width }), INNKEEPER);
  assert.equal(nearbyInteraction({ ...player, hitpoints: 0 }), null);
  assert.equal(nearbyInteraction({ ...player, scene: "forest" }), null);
  assert.equal(nearbyInteraction({ ...player, x: player.x + INTERACTION_RADIUS }), null);
  const inn = BUILDINGS.find((b) => b.id === "inn")!;
  assert.equal(nearbyInteraction({ ...player, x: inn.doorX, y: inn.y + 9 }), null);
});
