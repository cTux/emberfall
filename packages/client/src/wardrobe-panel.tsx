import type { Actions } from './CharacterPanels-actions.tsx';
import type { Player, SceneState } from '@emberfall/common';
import { Box } from '@mui/material';
import { CLASS_IDS, CLASS_LABELS, characterStats } from '@emberfall/core';
import { classDetails } from './class-details';

// Preserve the class-card placeholder while saved progress is unavailable; it is presentation-only.
import { ClassCard } from '@emberfall/ui';
import { classSprite, weaponSrc, spellSrc } from './class-art';

// Preserve the class-card placeholder while saved progress is unavailable; it is presentation-only.
const CLASS_PREVIEW_MAX_HEALTH = 100;

export function WardrobePanel({
  me,
  unavailable,
  send,
  scene,
}: Actions & { me?: Player; scene?: SceneState }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: { xs: 0.5, sm: 1 },
      }}
    >
      {CLASS_IDS.map((id) => {
        const selected = (me?.classId ?? 'warrior') === id;
        const stats = selected ? me : me?.classes?.[id];
        const details = classDetails[id];

        return (
          <ClassCard
            key={id}
            title={CLASS_LABELS[id]}
            selected={selected}
            disabled={unavailable || selected || scene?.phase === 'countdown'}
            onSelect={() => {
              return send({ type: 'selectClass', classId: id });
            }}
            portrait={<img src={classSprite(id)} alt={`${CLASS_LABELS[id]} portrait`} />}
            weapon={{
              name: details.weapon,
              description: details.weaponDescription,
              icon: <img src={weaponSrc(id)} alt='' />,
            }}
            spell={{
              name: details.spell,
              description: details.spellDescription,
              icon: <img src={spellSrc(id)} alt='' />,
            }}
            stats={{
              level: stats?.level ?? 1,
              experience: stats?.experience ?? 0,
              maxHitpoints: stats?.maxHitpoints ?? CLASS_PREVIEW_MAX_HEALTH,
              power: characterStats({ classId: id, equipment: stats?.equipment }).power,
            }}
          />
        );
      })}
    </Box>
  );
}
