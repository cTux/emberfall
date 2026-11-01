import { Box } from '@mui/material';
import { clientAsset } from '../urls.ts';
import { EnemyKind, EnemyType } from '@emberfall/common/enums';
import { enemyAttributes, enemyTypeMultiplier } from '@emberfall/core';
import { statusSrc } from '../class-art';
import { Illustration } from './Illustration';

export const controlsChapter = {
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
          <kbd>E</kbd> or left click — interact with a hovered building, Marta the Innkeeper, Bram
          the Craftsman, or portal while in range. Yellow outlines are always thin. E also works
          nearby without hovering. Gathering takes five seconds. Press E as the white indicator
          crosses the green zone above the resource to save two seconds per hit. There is no
          gathering cooldown. Trees allow five gathers and resources restore after one hour.
        </li>
        <li>
          Hold <kbd>Alt</kbd> for more than 0.5 seconds — show green outlines on all visible
          interactive objects.
        </li>
        <li>
          <kbd>I</kbd> — open or close Inventory and character stats.
        </li>
        <li>
          <kbd>F1</kbd> — open or close Codex.
        </li>
        <li>
          <kbd>Esc</kbd> — close a window, or open Settings. Use the exit control to leave.
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
          <kbd>G</kbd> — toggle auto-target. <kbd>T</kbd> opens Tactics to choose attack and healing
          priorities and companion positioning. Targets default to the nearest enemy.
        </li>
      </ul>
      <p>
        Both start enabled. With auto-target off, aim with the cursor: spells fly straight up to
        1000 units and hit enemies in their path. A transparent circle shows spell range when the
        cursor is beyond it.
      </p>
    </>
  ),
};

export const worldsChapter = {
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
        disabled. Other worlds disappear when everyone leaves. Your character is saved on the server
        and linked to your Steam account.
      </p>
      <h4>Depart together</h4>
      <p>
        The Portal offers Forest, Swamp and Desert with Easy, Medium or Hard difficulty. Swamp has
        1.2× enemy stats and 1.3× loot rarity; Desert has 1.4× and 1.6×. Vote inside the portal
        window. Everyone must be ready. Retract your vote to cancel the five-second countdown.
      </p>
      <h4>Join & return</h4>
      <p>
        You can join a world during combat, then use its village portal to join or rejoin the
        running scene until the boss dies and return portals open. After that, everyone must return
        before creating a new scene. Party members in another dimension appear dimmed.
      </p>
    </>
  ),
};

export const combatChapter = {
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
        Warrior slashes for 5 damage; ranger arrows deal 5 damage and penetrate three targets after
        the first hit for 1000 units. Ranger and mage fire two projectiles, 3° either side of the
        aim direction, with 6° between them. Mage fireballs travel up to 250 units with auto-target
        enabled, deal 3 damage to the direct target, and explode within 100 units for 1 damage to
        other enemies.
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
};
