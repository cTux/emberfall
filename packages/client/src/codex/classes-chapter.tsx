import { Box } from '@mui/material';
import { Illustration } from './Illustration';

export const classesChapter = {
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
        ordinary enemies by 10% for five seconds. Further hits refresh the duration. Roots cause no
        damage over time and do not affect bosses.
      </p>
      <h4>Your bear companion</h4>
      <p>
        Bear has 1.5 times your maximum HP, strikes with physical claws reaching 250 units, inherits
        your power, attack speed, critical stats and armor, and has a 10% chance per hit to inflict
        bleed. It revives five seconds after death and moves at your speed. It chases nearby enemies
        within 200 units of you by default, returns when outside its combat radius, and resumes
        hunting once back at your side. Bear keeps an 80-unit gap for claw attacks, backs away from
        close enemies, and tries to dodge attack warnings and incoming projectiles. Tactics (T)
        configures its stance, distance, target preferences and hazard avoidance; the 500-unit
        teleport tether always applies.
      </p>
      <h4>Per-class progress</h4>
      <p>
        Level, experience, health, and playtime are saved separately for each class under your
        existing character identity. Existing progress belongs to Warrior. Talents are planned for
        later.
      </p>
    </>
  ),
};
