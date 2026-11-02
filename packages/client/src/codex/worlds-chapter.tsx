import { Box } from '@mui/material';
import { clientAsset } from '../urls.ts';

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
