import { Illustration } from './Illustration';
import { clientAsset } from '../urls.ts';

export const creditsChapter = {
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
        wardrobe-style concepts. The wardrobe reference is LPC Wooden Furniture; its credits and CC
        BY-SA 3.0 license are preserved. The original imported art remains bundled for provenance.
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
        <a href='https://creativecommons.org/publicdomain/zero/1.0/'>CC0</a>. Bronze post and orange
        lantern from the FREE Pixel Art Lantern Pack.
      </p>
      <p>
        Wardrobe:{' '}
        <a href='https://opengameart.org/content/lpc-wooden-furniture'>LPC Wooden Furniture</a> by
        bluecarrot16, Baŝto, Lanea Zimmerman (Sharm), William Thompson, Tuomo Untinen (Reemax), and
        Janna/Lilius/Jannax. Original crop used as the reference for the regenerated wardrobe;{' '}
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
};
