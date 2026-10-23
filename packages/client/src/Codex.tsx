import { clientAsset } from './urls.ts';
import { EnemyKind, EnemyType } from '@emberfall/common/enums';
import { enemyAttributes, enemyTypeMultiplier } from '@emberfall/core';
import { useState } from 'react';
import { ChapterTabs } from '@emberfall/ui';
import { Box } from '@mui/material';
import { statusSrc } from './combat-assets';

function Illustration({ image, caption }: { image: string; caption: string }) {
  return (
    <figure>
      <img src={clientAsset(`/assets/wardrobe-style/${image}.png`)} alt={caption} />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

const chapters = [
  {
    title: 'Controls',
    content: (
      <>
        <Illustration image='warrior-weapon' caption='Ready your weapon' />
        <h4>Move & interact</h4>
        <ul>
          <li>
            <kbd>WASD</kbd> or <kbd>↑ ↓ ← →</kbd> — move.
          </li>
          <li>
            <kbd>E</kbd> — interact near buildings, Marta the Innkeeper, or the blue portal.
          </li>
          <li>
            <kbd>I</kbd> — open or close Inventory and character stats.
          </li>
          <li>
            <kbd>Esc</kbd> — close a window, or open the leave confirmation.
          </li>
        </ul>
        <p>
          Trees, buildings and torch posts block movement. Drag window titles to move them. Movement
          and equipment hotkeys follow physical keys across keyboard layouts.
        </p>
        <h4>Attack & aim</h4>
        <ul>
          <li>
            <kbd>F</kbd> — toggle auto-attack. When off, hold the left mouse button to cast on
            cooldown.
          </li>
          <li>
            <kbd>G</kbd> — toggle auto-target, which selects the nearest enemy.
          </li>
        </ul>
        <p>
          Both start enabled. With auto-target off, aim with the cursor: spells fly straight up to
          1000 units and hit enemies in their path. A transparent circle shows spell range when the
          cursor is beyond it.
        </p>
      </>
    ),
  },
  {
    title: 'Worlds & party',
    content: (
      <>
        <figure>
          <Box className='codex-innkeeper'>
            <img
              src={clientAsset('/assets/wardrobe-style/innkeeper.png')}
              alt='Marta the Innkeeper'
            />
          </Box>
          <figcaption>Marta welcomes your party to the village</figcaption>
        </figure>
        <h4>Find a world</h4>
        <p>
          Playtest Default is always open to everyone, with room for 32 players. World creation is
          disabled. Other worlds disappear when everyone leaves. Your character is saved on the
          server and linked to your Steam account.
        </p>
        <h4>Depart together</h4>
        <p>
          A portal creates a Forest / Easy scene on the server. Vote inside the portal window.
          Everyone must be ready. Retract your vote to cancel the five-second countdown.
        </p>
        <h4>Join & return</h4>
        <p>
          You can join a world during combat, then use its village portal to join or rejoin the
          running scene until the boss dies and return portals open. After that, everyone must
          return before creating a new scene. Party members in another dimension appear dimmed.
        </p>
      </>
    ),
  },
  {
    title: 'Combat',
    content: (
      <>
        <Illustration image='burn' caption='Watch for burning and other ailments' />
        <h4>Know the battlefield</h4>
        <p>
          The forest wraps at every edge. Attacks are automatic. Starter weapons have a 5% chance to
          critically hit for 150% power. Warrior damage is physical, Mage fire, Ranger poison and
          Druid nature. Damage numbers use those colors; critical hits appear white with a thick red
          outline. Equipped gear determines offense and defense; inspect its totals in Inventory.
        </p>
        <h4>Weapons & projectiles</h4>
        <p>
          Warrior slashes for 5 damage; ranger arrows deal 5 damage and pierce all targets for 1000
          units. Ranger and mage fire two projectiles, 3° either side of the aim direction, with 6°
          between them. Mage fireballs travel up to 250 units with auto-target enabled, deal 3
          damage to the direct target, and explode within 100 units for 1 damage to other enemies.
        </p>
        <h4>Ailments</h4>
        <p>
          Each hit has a 10% chance to cause bleeding, poison, or burning respectively. Each stack
          deals 1 damage per second for 5 seconds. Stacks have no limit and new stacks refresh the
          shared timer. Icons above enemy health bars show active ailments and stacks.
        </p>
        <h4>Enemy variants</h4>
        <p>
          Skeletons have {enemyAttributes(EnemyKind.Skeleton).hitPoints} HP and deal{' '}
          {enemyAttributes(EnemyKind.Skeleton).damage} damage before armor. Each spawn has a 10%
          chance to be a big, slow enemy with triple HP, and a 10% chance to be ranged with 70% HP.
          Each spawn independently has a 5% chance to be elite, multiplying both HP and damage by{' '}
          {enemyTypeMultiplier(EnemyType.Elite)}.
        </p>
        <h4>Party scaling</h4>
        <p>
          Each additional player in the forest multiplies enemy HP by 1.75 and dropped XP by 1.2.
          Three players mean 3.0625 times HP and 1.44 times dropped XP. Red areas warn of spawns and
          enemy attacks. Dodge filled circles and red projectiles.
        </p>
        <p>
          <img className='combat-icon' src={statusSrc('bleed')} alt='Bleeding' /> Bleeding ·{' '}
          <img className='combat-icon' src={statusSrc('poison')} alt='Poison' /> Poison ·{' '}
          <img className='combat-icon' src={statusSrc('burn')} alt='Burning' /> Burning ·{' '}
          <img className='combat-icon' src={statusSrc('roots')} alt='Roots' /> Roots. Compact icons
          above enemy health bars show stacks; roots have no ground decoration.
        </p>
      </>
    ),
  },
  {
    title: 'The Warden',
    content: (
      <>
        <figure>
          <Box className='codex-warden'>
            <img src={clientAsset('/assets/wardrobe-style/warden.png')} alt='The Hollow Warden' />
          </Box>
          <figcaption>The Hollow Warden</figcaption>
        </figure>
        <h4>Face the boss</h4>
        <p>
          When time runs out, the Warden arrives with{' '}
          {enemyAttributes(EnemyKind.Brute, EnemyType.Boss).hitPoints} base HP and{' '}
          {enemyAttributes(EnemyKind.Brute, EnemyType.Boss).damage} damage on Easy before armor and
          party HP scaling. Enemies keep spawning until it falls.
        </p>
        <h4>Victory & return</h4>
        <p>
          Defeat it to clear the remaining enemies and open blue return portals near every player.
        </p>
        <h4>If you fall</h4>
        <p>
          Death lets you return immediately while your party continues. Returning restores health.
          Players joining during a run wait in the village. A new scene can be created once everyone
          has returned.
        </p>
      </>
    ),
  },
  {
    title: 'Your character',
    content: (
      <>
        <Illustration image='warrior-portrait' caption='Your adventurer, saved to your account' />
        <h4>Combat feedback</h4>
        <p>
          Damage briefly outlines targets in red and tints them white, including training dummies
          and companions. Other players do not flash. Your screen flashes red when you are hit. Your
          movement and attack animation respond locally; the server validates movement and decides
          damage.
        </p>
        <h4>Preferences & account</h4>
        <p>
          Settings control floating damage numbers, FPS, vignette, graphics, music and sound
          effects. Your preferences stay in this browser. Your nickname belongs to your Steam
          account; change it in Settings → Account.
        </p>
        <h4>Saved progress</h4>
        <p>
          Server saves include XP, health and playtime. Sign in through the same Steam account to
          recover your character on another browser. No offline mode.
        </p>
      </>
    ),
  },
  {
    title: 'Classes',
    content: (
      <>
        <Box className='codex-classes'>
          <Illustration image='warrior-portrait' caption='Warrior' />
          <Illustration image='ranger-portrait' caption='Ranger' />
          <Illustration image='mage-portrait' caption='Mage' />
          <Illustration image='druid-portrait' caption='Druid' />
        </Box>
        <h4>Choose your class</h4>
        <p>
          Visit the wardrobe opposite the blue portal in the village and press E. Choose Warrior,
          Ranger, Mage, or Druid before the departure countdown begins. Each uses a different
          character and weapon.
        </p>
        <h4>Druid roots</h4>
        <p>
          Druid aims root projectiles at the nearest enemy within 250 units when auto-target is
          enabled. One projectile bounces up to three times to the nearest unhit living enemy within
          250 units of each impact. All hits deal full power and apply one root stack, slowing
          ordinary enemies by 10% for five seconds. Further hits refresh the duration. Roots cause
          no damage over time and do not affect bosses.
        </p>
        <h4>Your bear companion</h4>
        <p>
          Bear has 1.5 times your maximum HP, strikes with physical claws reaching 250 units,
          inherits your power, attack speed, critical stats and armor, and has a 10% chance per hit
          to inflict bleed. It revives five seconds after death and moves at your speed. It chases
          the nearest enemy within 200 units of you, returns when more than 200 units away from you,
          and resumes hunting once back at your side. Bear keeps an 80-unit gap for claw attacks,
          backs away from close enemies, and tries to dodge attack warnings and incoming
          projectiles.
        </p>
        <h4>Per-class progress</h4>
        <p>
          Level, experience, health, and playtime are saved separately for each class under your
          existing character identity. Existing progress belongs to Warrior. Talents are planned for
          later.
        </p>
      </>
    ),
  },
  {
    title: 'Credits',
    content: (
      <>
        <Illustration
          image='druid-weapon'
          caption='Made with Emberfall art and credited community assets'
        />
        <h4>Emberfall artwork</h4>
        <p>
          New-client sprites and animations were generated for Emberfall using the approved
          wardrobe-style concepts. The wardrobe reference is LPC Wooden Furniture; its credits and
          CC BY-SA 3.0 license are preserved. The original imported art remains bundled for
          provenance.
        </p>
        <h4>Original art</h4>
        <p>Original art and characters: Ninja Adventure asset pack by Pixel-boy & AAA.</p>
        <a
          href='https://pixel-boy.itch.io/ninja-adventure-asset-pack'
          target='_blank'
          rel='noreferrer'
        >
          Art: Pixel-boy & AAA ↗
        </a>
        <h4>Music & sound</h4>
        <p>Music by TimberwolfGames. Audio credits and licenses are included with the game.</p>
        <h4>Village props</h4>
        <p>
          Original village lamp posts:{' '}
          <a href='https://karsiori.itch.io/free-pixel-art-lantern-pack'>Karsiori</a>,{' '}
          <a href='https://creativecommons.org/publicdomain/zero/1.0/'>CC0</a>. Bronze post and
          orange lantern from the FREE Pixel Art Lantern Pack.
        </p>
        <p>
          Wardrobe:{' '}
          <a href='https://opengameart.org/content/lpc-wooden-furniture'>LPC Wooden Furniture</a> by
          bluecarrot16, Baŝto, Lanea Zimmerman (Sharm), William Thompson, Tuomo Untinen (Reemax),
          and Janna/Lilius/Jannax. Original crop used as the reference for the regenerated wardrobe;{' '}
          <a href='https://creativecommons.org/licenses/by-sa/3.0/'>CC BY-SA 3.0</a>.{' '}
          <a href={clientAsset('/assets/LPC-CREDITS.txt')}>Full credits</a> and{' '}
          <a href={clientAsset('/assets/LPC-LICENSE.txt')}>license</a>.
        </p>
        <h4>Weapons</h4>
        <p>
          Original weapons:{' '}
          <a href='https://kyrise.itch.io/kyrises-free-16x16-rpg-icon-pack'>Kyrise</a>,{' '}
          <a href='https://creativecommons.org/licenses/by/4.0/'>CC BY 4.0</a>. Unmodified sprites
          from Kyrise's Free 16x16 RPG Icon Pack.
        </p>
        <h4>Status & spell icons</h4>
        <p>
          Original status and spell icons:{' '}
          <a href='https://game-icons.net/'>Lorc and Delapouite / Game-icons.net</a>,{' '}
          <a href='https://creativecommons.org/licenses/by/3.0/'>CC BY 3.0</a>. Colors adapted for
          Emberfall.
        </p>
      </>
    ),
  },
];

export function Codex() {
  const [chapter, setChapter] = useState('Controls');
  return (
    <Box
      sx={{
        color: 'text.secondary',
        '& h4': { typography: 'subtitle1', fontWeight: 700, color: 'primary.main', mt: 2, mb: 1 },
        '& p, & ul': { typography: 'body1', mt: 0, mb: 1.5 },
        '& ul': { pl: 3 },
        '& li': { mb: 1 },
        '& kbd': {
          font: 'inherit',
          color: 'primary.light',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          px: 0.5,
        },
        '& figure': { m: 0, mb: 2, display: 'flex', alignItems: 'center', gap: 2 },
        '& figure img': { width: 72, height: 72, objectFit: 'contain', flexShrink: 0 },
        '& figcaption': { typography: 'body2', fontStyle: 'italic' },
        '& .codex-classes': {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: 1,
          '& figure': { flexDirection: 'column', gap: 0.5, textAlign: 'center' },
        },
        '& .codex-warden': { width: 112, height: 104, overflow: 'hidden', flexShrink: 0 },
        // First standing frame of the existing four-column Warden sheet.
        '& .codex-warden img': { width: 448, height: 'auto', maxWidth: 'none' },
        '& .codex-innkeeper': { width: 72, height: 72, overflow: 'hidden', flexShrink: 0 },
        // The Innkeeper source is a horizontal strip of four square frames.
        '& .codex-innkeeper img': { width: 288, height: 72, maxWidth: 'none' },
        '& a': { color: 'primary.main' },
      }}
    >
      <ChapterTabs
        label='Codex chapters'
        value={chapter}
        onChange={setChapter}
        chapters={chapters.map((entry) => ({ ...entry, id: entry.title }))}
      />
    </Box>
  );
}
