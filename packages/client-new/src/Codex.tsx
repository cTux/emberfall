import { useState } from "react";
import { ChapterTabs } from "@emberfall/ui";
import { Box } from "@mui/material";
import { statusSrc } from "./combat-assets";

const chapters = [
  {
    title: "Controls",
    content: (
      <>
        {" "}
        <p>
          Move with WASD or arrow keys. F toggles auto-attack; G toggles auto-target. Both start
          enabled. With auto-attack off, hold LMB to cast on cooldown. With auto-target off, aim
          with the cursor; spells fly straight up to 1000 units and hit enemies in their path.
          Auto-target selects only the nearest enemy. A transparent circle shows spell range when
          the cursor is beyond it. Press E near a building or blue portal to interact. Trees,
          buildings and torch posts block movement. Escape opens a leave confirmation; Escape inside
          a window closes it. Drag window titles to move them. Press I to inspect equipment and
          character stats, or press it again to close the window. Movement and equipment hotkeys
          follow physical keys across keybeard layouts.
        </p>{" "}
      </>
    ),
  },
  {
    title: "Worlds & party",
    content: (
      <>
        {" "}
        <p>
          Playtest Default is always open to everyone, with room for 32 players. World creation is
          disabled. Other worlds disappear when everyone leaves. Your character is saved on the
          server and linked to your Steam account. A portal creates a Forest / Easy scene on the
          server. Vote inside the portal window. Everyone must be ready. Retract your vote to cancel
          the five-second countdown. You can join a world during combat, then use its village portal
          to join or rejoin the running scene until the boss dies and return portals open. After
          that, everyone must return before creating a new scene. Party members in another dimension
          appear dimmed.
        </p>{" "}
      </>
    ),
  },
  {
    title: "Combat",
    content: (
      <>
        {" "}
        <p>
          The forest wraps at every edge. Attacks are automatic. Starter weapons have a 5% chance to
          critically hit for 150% power. Warrior damage is physical, Mage fire, Ranger poison and
          Druid nature. Damage numbers use those colors; critical hits appear white with a thick red
          outline. Equipped gear determines offense and defense; inspect its totals in Equipment.
          Warrior slashes for 5 damage; ranger arrows deal 5 damage and pierce all targets for 1000
          units. Ranger and mage fire two projectiles, 3° either side of the aim direction, with 6°
          between them. Mage fireballs travel up to 250 units with auto-target enabled, deal 3
          damage to the direct target, and explode within 100 units for 1 damage to other enemies.
          Each hit has a 10% chance to cause bleeding, poison, or burning respectively. Each stack
          deals 1 damage per second for 5 seconds. Stacks have no limit and new stacks refresh the
          shared timer. Icons above enemy health bars show active ailments and stacks. Skeletons
          have 10 HP. Each spawn has a 10% chance to be a big, slow enemy with triple HP, and a 10%
          chance to be ranged with 70% HP. Every tenth spawn is elite with five times normal HP; big
          and ranged modifiers also apply to elites. Each additional player in the forest multiplies
          enemy HP by 1.75 and dropped XP by 1.2. Three players mean 3.0625 times HP and 1.44 times
          dropped XP. Red areas warn of spawns and enemy attacks. Dodge filled circles and red
          projectiles.
        </p>{" "}
        <p>
          <img className="combat-icon" src={statusSrc("bleed")} alt="Bleeding" /> Bleeding ·{" "}
          <img className="combat-icon" src={statusSrc("poison")} alt="Poison" /> Poison ·{" "}
          <img className="combat-icon" src={statusSrc("burn")} alt="Burning" /> Burning ·{" "}
          <img className="combat-icon" src={statusSrc("roots")} alt="Roots" /> Roots. Compact icons
          above enemy health bars show stacks; roots have no ground decoration.
        </p>
      </>
    ),
  },
  {
    title: "The Warden",
    content: (
      <>
        {" "}
        <p>
          When time runs out, a boss with 200 HP and a purple health bar arrives. Enemies keep
          spawning until it falls. Defeat it to clear the remaining enemies and open blue return
          portals near every player. Death lets you return immediately while your party continues.
          Returning restores health. Players joining during a run wait in the village. A new scene
          can be created once everyone has returned.
        </p>{" "}
      </>
    ),
  },
  {
    title: "Your character",
    content: (
      <>
        {" "}
        <p>
          Damage briefly outlines targets in red and tints them white, including training dummies
          and companions. Other players do not flash. Your screen flashes red when you are hit. Your
          movement and attack animation respond locally; the server validates movement and decides
          damage. Settings control floating damage numbers, FPS, vignette, graphics, music and sound
          effects. Your preferences stay in this browser. Your nickname belongs to your Steam
          account; change it in Settings → Account. Server saves include XP, health and playtime.
          Sign in through the same Steam account to recover your character on another browser. No
          offline mode.
        </p>{" "}
      </>
    ),
  },
  {
    title: "Classes",
    content: (
      <>
        <p>
          Visit the wardrobe opposite the blue portal in the village and press E. Choose Warrior,
          Ranger, Mage, or Druid before the departure countdown begins. Each uses a different
          character and weapon.
        </p>
        <p>
          Druid aims root projectiles at the nearest enemy within 250 units when auto-target is
          enabled. One projectile bounces up to three times to the nearest unhit living enemy within
          250 units of each impact. All hits deal full power and apply one root stack, slowing
          ordinary enemies by 10% for five seconds. Further hits refresh the duration. Roots cause
          no damage over time and do not affect bosses. Bear has 1.5 times your maximum HP, strikes
          with physical claws reaching 250 units, inherits your power, attack speed, critical stats
          and armor, and has a 10% chance per hit to inflict bleed. It revives five seconds after
          death and moves at your speed. It chases the nearest enemy within 200 units of you,
          returns when more than 200 units away from you, and resumes hunting once back at your
          side. Bear keeps an 80-unit gap for claw attacks, backs away from close enemies, and tries
          to dodge attack warnings and incoming projectiles.
        </p>
        <p>
          Level, experience, health, and playtime are saved separately for each class under your
          existing character identity. Existing progress belongs to Warrior. Talents are planned for
          later.
        </p>
      </>
    ),
  },
  {
    title: "Credits",
    content: (
      <>
        <p>
          New-client sprites and animations were generated for Emberfall using the approved
          wardrobe-style concepts. The wardrobe reference is LPC Wooden Furniture; its credits and
          CC BY-SA 3.0 license are preserved. The original imported art remains bundled for
          provenance.
        </p>
        <p>Original art and characters: Ninja Adventure asset pack by Pixel-boy & AAA.</p>
        <a
          href="https://pixel-boy.itch.io/ninja-adventure-asset-pack"
          target="_blank"
          rel="noreferrer"
        >
          Art: Pixel-boy & AAA ↗
        </a>
        <p>Music by TimberwolfGames. Audio credits and licenses are included with the game.</p>
        <p>
          Original village lamp posts:{" "}
          <a href="https://karsiori.itch.io/free-pixel-art-lantern-pack">Karsiori</a>,{" "}
          <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>. Bronze post and
          orange lantern from the FREE Pixel Art Lantern Pack.
        </p>
        <p>
          Wardrobe:{" "}
          <a href="https://opengameart.org/content/lpc-wooden-furniture">LPC Wooden Furniture</a> by
          bluecarrot16, Baŝto, Lanea Zimmerman (Sharm), William Thompson, Tuomo Untinen (Reemax),
          and Janna/Lilius/Jannax. Original crop used as the reference for the regenerated wardrobe;{" "}
          <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>.{" "}
          <a href="/assets/LPC-CREDITS.txt">Full credits</a> and{" "}
          <a href="/assets/LPC-LICENSE.txt">license</a>.
        </p>
        <p>
          Original weapons:{" "}
          <a href="https://kyrise.itch.io/kyrises-free-16x16-rpg-icon-pack">Kyrise</a>,{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Unmodified sprites
          from Kyrise's Free 16x16 RPG Icon Pack.
        </p>
        <p>
          Original status and spell icons:{" "}
          <a href="https://game-icons.net/">Lorc and Delapouite / Game-icons.net</a>,{" "}
          <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>. Colors adapted for
          Emberfall.
        </p>
      </>
    ),
  },
];

export function Codex() {
  const [chapter, setChapter] = useState("Controls");
  return (
    <Box
      sx={{
        "& p": { typography: "body1", color: "text.secondary" },
        "& a": { color: "primary.main" },
      }}
    >
      <ChapterTabs
        label="Codex chapters"
        value={chapter}
        onChange={setChapter}
        chapters={chapters.map((entry) => ({ ...entry, id: entry.title }))}
      />
    </Box>
  );
}
