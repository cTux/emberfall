import { Illustration } from './Illustration';
import { enemyAttributes, enemyTypeMultiplier } from '@emberfall/core';
import { EnemyKind, EnemyType } from '@emberfall/common/enums';
import { statusSrc } from '../class-art';

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
