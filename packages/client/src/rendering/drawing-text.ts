import type { TextStyleOptions, Text } from 'pixi.js';
import type { Visual } from './visual-pools';

type TextSettings = { font: string; textAlign: CanvasTextAlign; textBaseline: CanvasTextBaseline };

export function updateText(
  entity: Visual,
  value: string,
  settings: TextSettings,
  fill: TextStyleOptions['fill'],
  stroke: TextStyleOptions['stroke'],
) {
  const text = entity.object as Text;
  const match = settings.font.match(/(?:(bold|[1-9]00)\s+)?([\d.]+)px\s+(.+)/);
  const style = {
    fontFamily: match?.[3] ?? 'sans-serif',
    fontSize: Number(match?.[2] ?? 10),
    fontWeight: (match?.[1] ?? 'normal') as 'normal' | 'bold',
    fill,
    stroke,
  };
  const key = JSON.stringify(style);
  if (entity.styleKey !== key) {
    text.style = style;
    entity.styleKey = key;
  }

  if (text.text !== value) {
    text.text = value;
  }

  text.anchor.set(
    settings.textAlign === 'center' ? 0.5 : ['right', 'end'].includes(settings.textAlign) ? 1 : 0,
    settings.textBaseline === 'middle'
      ? 0.5
      : ['top', 'hanging'].includes(settings.textBaseline)
        ? 0
        : settings.textBaseline === 'alphabetic'
          ? 0.8
          : 1,
  );
}
