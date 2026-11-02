import { Box } from '@mui/material';
import { clientAsset } from '../urls.ts';
import { enemyAttributes } from '@emberfall/core';
import { EnemyKind, EnemyType } from '@emberfall/common/enums';

export const wardenChapter = {
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
};
