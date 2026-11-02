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
