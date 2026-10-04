import { test } from "node:test";
import assert from "node:assert/strict";
import { FOREST, ENEMY_STATS, type Player, type SceneState } from "@emberfall/common-new";
import { INITIAL_PROGRESS } from "../../common-new/src/definitions/entities/players.ts";
import { enemyHitbox } from "../../common-new/src/hitboxes.ts";
import { tickPlayerShots } from "../../common-new/src/class-combat.ts";

test("projectiles hit heads and feet of every model in forest and training, across both seams", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  for (const training of [false, true])
    for (const archetype of Object.keys(ENEMY_STATS) as (keyof typeof ENEMY_STATS)[])
      for (const kind of ["arrow", "fireball", "roots"] as const)
        for (const wrapped of [false, true])
          for (const edge of [-1, 1])
            for (const outside of [false, true]) {
              const target = {
                id: 1,
                x: wrapped ? 1 : 2400,
                y: wrapped ? 1 : 1280,
                archetype,
                hitpoints: 100,
                angle: 0,
              };
              const body = enemyHitbox(target);
              const owner: Player = {
                ...INITIAL_PROGRESS,
                id: "p",
                name: "Hero",
                color: 0,
                x: 2400,
                y: 1280,
                classId: kind === "arrow" ? "ranger" : kind === "roots" ? "druid" : "mage",
                scene: training ? undefined : "forest",
              };
              const scene: SceneState = {
                id: "models",
                type: "Forest",
                difficulty: "Easy",
                phase: "active",
                ready: [],
                countdownAt: null,
                endsAt: 1e9,
                nextSpawn: 1e9,
                sequence: 10,
                damage: [],
                portals: [],
                training,
                enemies: [target],
                playerShots: [
                  {
                    id: 2,
                    ownerId: "p",
                    kind,
                    x: wrapped ? body.x + FOREST.width : body.x,
                    y:
                      body.y +
                      edge * (body.radius + 4 + (outside ? 0.1 : -0.1)) +
                      (wrapped ? FOREST.height : 0),
                    angle: 0,
                    remaining: 100,
                    hitIds: [],
                  },
                ],
              };
              tickPlayerShots(scene, [owner], 10000, 0);
              assert.equal(
                target.hitpoints < 100,
                !outside,
                `${training}/${archetype}/${kind}/${wrapped}/${edge}/${outside}`,
              );
              if (!outside) {
                const hp = target.hitpoints;
                tickPlayerShots(scene, [owner], 10050, 0);
                assert.equal(
                  target.hitpoints,
                  hp,
                  "one projectile cannot damage the same enemy twice",
                );
                assert.equal(owner.experience, 0);
              }
            }
});
