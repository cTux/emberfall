import { Illustration } from './Illustration';

export const characterChapter = {
  title: 'Your character',
  content: (
    <>
      <Illustration image='warrior-portrait' caption='Your adventurer, saved to your account' />
      <h4>Combat feedback</h4>
      <p>
        Damage briefly outlines targets in red and tints them white, including training dummies and
        companions. Other players do not flash. Your screen flashes red when you are hit. Your
        movement and attack animation respond locally; the server validates movement and decides
        damage.
      </p>
      <h4>Preferences & account</h4>
      <p>
        Settings control floating damage numbers, FPS, vignette, graphics, music and sound effects.
        Your preferences stay in this browser. Your nickname belongs to your Steam account; change
        it in Settings → Account.
      </p>
      <h4>Saved progress</h4>
      <p>
        Server saves include XP, health and playtime. Sign in through the same Steam account to
        recover your character on another browser. No offline mode.
      </p>
    </>
  ),
};
