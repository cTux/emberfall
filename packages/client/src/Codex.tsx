import { useState } from "react";

const chapters = [
  {
    title: "Controls",
    content: (
      <>
        {" "}
        <p>
          Move with WASD or arrow keys. Press E near a building or blue portal to interact. Trees,
          buildings and torch posts block movement. Escape opens a leave confirmation; Escape inside
          a window closes it. Drag window titles to move them.
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
          New Permanent World is always open to everyone, with room for eight players. Other worlds
          disappear when everyone leaves. Your character is saved on the server and linked to this
          browser. A portal creates a Forest / Easy scene on the server. Vote inside the portal
          window. Everyone must be ready. Retract your vote to cancel the five-second countdown.
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
          The forest wraps at every edge. Attacks are automatic. Warrior slashes for 5 damage;
          ranger arrows deal 5 damage and pierce all targets for 1000 units; mage fires at up to two
          different enemies, each fireball exploding within 100 units for 2 damage. Each hit has a
          10% chance to cause bleeding, poison, or burning respectively. Each stack deals 1 damage
          per second for 5 seconds. Stacks have no limit and new stacks refresh the shared timer.
          Icons above enemy health bars show active ailments and stacks. Skeletons have 10 HP. Each
          spawn has a 10% chance to be a big, slow enemy with triple HP, and a 10% chance to be
          ranged with 70% HP. Every tenth spawn is elite with five times normal HP; big and ranged
          modifiers also apply to elites. Red areas warn of spawns and enemy attacks. Dodge filled
          circles and red projectiles.
        </p>{" "}
      </>
    ),
  },
  {
    title: "The Warden",
    content: (
      <>
        {" "}
        <p>
          When time runs out, a boss with 200 HP and an orange health bar arrives. Enemies keep
          spawning until it falls. Defeat it to clear the remaining enemies and open blue return
          portals near every player. Death lets you return immediately while your party continues.
          Returning restores health and mana. Players joining during a run wait in the village. A
          new scene can be created once everyone has returned.
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
          Damage briefly outlines entities in red and flashes your screen when you are hit. Your
          movement and attack animation respond locally; the server validates movement and decides
          damage. Settings control floating damage numbers, FPS, vignette, graphics, music and sound
          effects. Your preferences and nickname stay in this browser. Server saves include XP,
          health, mana and playtime; clearing browser storage loses the character key. No offline
          mode.
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
          Druid roots one enemy, preferring unrooted targets. Roots last five seconds, stop ordinary
          enemies moving, and deal 2 damage each second. Bosses show roots and take damage but keep
          moving. Bear has 1.5 times your maximum HP, swipes with claws for 2 damage, and revives
          five seconds after death. It chases the nearest enemy within 200 units of you, returns
          when more than 200 units away from you, and resumes hunting once back at your side. Bear
          keeps an 80-unit gap for claw attacks, backs away from close enemies, and tries to dodge
          attack warnings and incoming projectiles.
        </p>
        <p>
          Level, experience, health, mana, and playtime are saved separately for each class under
          your existing character identity. Existing progress belongs to Warrior. Talents are
          planned for later.
        </p>
      </>
    ),
  },
  {
    title: "Credits",
    content: (
      <>
        <p>Art and characters from the Ninja Adventure asset pack by Pixel-boy & AAA.</p>
        <a
          href="https://pixel-boy.itch.io/ninja-adventure-asset-pack"
          target="_blank"
          rel="noreferrer"
        >
          Art: Pixel-boy & AAA ↗
        </a>
        <p>Music by TimberwolfGames. Audio credits and licenses are included with the game.</p>
      </>
    ),
  },
];

export function Codex() {
  const [chapter, setChapter] = useState(0);
  return (
    <div className="codex-book">
      <aside className="codex-index">
        <span className="codex-eyebrow">Emberfall · Field guide</span>
        <h3>The Adventurer’s Codex</h3>
        <p>A companion for the journey beyond the village.</p>
        <div role="tablist" aria-label="Codex chapters" aria-orientation="vertical">
          {chapters.map((entry, index) => (
            <button
              key={entry.title}
              id={`codex-tab-${index}`}
              role="tab"
              aria-selected={chapter === index}
              aria-controls="codex-page"
              tabIndex={chapter === index ? 0 : -1}
              onClick={() => setChapter(index)}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === "ArrowDown") next = (index + 1) % chapters.length;
                else if (event.key === "ArrowUp")
                  next = (index + chapters.length - 1) % chapters.length;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = chapters.length - 1;
                else return;
                event.preventDefault();
                setChapter(next);
                document.getElementById(`codex-tab-${next}`)?.focus();
              }}
            >
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span> {entry.title}
            </button>
          ))}
        </div>
      </aside>
      <article
        id="codex-page"
        className="codex-page"
        role="tabpanel"
        aria-labelledby={`codex-tab-${chapter}`}
        tabIndex={0}
      >
        <span className="codex-eyebrow">Chapter {chapter + 1}</span>
        <h3>{chapters[chapter].title}</h3>
        {chapters[chapter].content}
        <span className="codex-page-number" aria-hidden="true">
          — {chapter + 1} —
        </span>
      </article>
    </div>
  );
}
