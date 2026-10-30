import type { ClientMessage, Player, SceneState } from '@emberfall/common';
import {
  TALENT_RESET_COST,
  availableTalentPoints,
  CLASS_IDS,
  CLASS_LABELS,
  characterStats,
} from '@emberfall/core';
import { Box, Stack, Typography, Button } from '@mui/material';
import { ClassCard, GoldBalance } from '@emberfall/ui';
import { classSprite, weaponSrc, spellSrc } from './class-art';
import { classDetails } from './class-details';
type Actions = { unavailable: boolean; send: (message: ClientMessage) => void };

export function ResetTalentsPanel({
  me,
  unavailable,
  send,
  onClose,
}: Actions & { me: Player; onClose: () => void }) {
  return (
    <>
      <Typography component='div'>
        Do you really want to reset your talent points for{' '}
        <Box
          component='span'
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            verticalAlign: 'middle',
            whiteSpace: 'nowrap',
          }}
        >
          <GoldBalance name='Reset cost' coins={TALENT_RESET_COST} />?
        </Box>
      </Typography>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant='body2'>Currently you have:</Typography>
        <GoldBalance name='Your balance' coins={me.coins ?? 0} />
      </Stack>
      <Stack direction='row' spacing={1}>
        <Button variant='outlined' onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant='contained'
          disabled={
            unavailable ||
            (me.coins ?? 0) < TALENT_RESET_COST ||
            availableTalentPoints(me) >= Math.min(20, me.level) - 1
          }
          onClick={() => {
            send({ type: 'resetTalents', classId: me.classId ?? 'warrior' });
            onClose();
          }}
        >
          Reset talents
        </Button>
      </Stack>
    </>
  );
}

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
            onSelect={() => send({ type: 'selectClass', classId: id })}
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
              maxHitpoints: stats?.maxHitpoints ?? 100,
              power: characterStats({ classId: id, equipment: stats?.equipment }).power,
            }}
          />
        );
      })}
    </Box>
  );
}
