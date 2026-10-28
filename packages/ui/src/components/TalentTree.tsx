import { Box, ButtonBase, Stack, Tooltip, Typography } from '@mui/material';
import type { ReactNode } from 'react';
export interface TalentNodeView {
  id: string;
  name: string;
  description: string;
  icon?: ReactNode;
  learned: boolean;
  available: boolean;
  rank: number;
  level: number;
  column: number;
  row: number;
}
export interface TalentTreeProps {
  nodes: readonly TalentNodeView[];
  points: number;
  columns?: readonly string[];
  onLearn: (id: string) => void;
}
export function TalentTree({ nodes, points, columns = [], onLearn }: TalentTreeProps) {
  return (
    <Stack spacing={2}>
      <Typography role='status'>
        {points} talent {points === 1 ? 'point' : 'points'} available
      </Typography>
      <Box data-talent-scroll sx={{ overflow: 'auto', maxHeight: '65vh' }}>
        <Box
          data-talent-map
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(150px, 1fr))',
            gap: 1,
            minWidth: 480,
          }}
        >
          {columns.map((name) => (
            <Typography key={name} sx={{ textAlign: 'center', fontWeight: 700 }}>
              {name}
            </Typography>
          ))}
          {[...nodes]
            .sort((a, b) => a.row - b.row || a.column - b.column)
            .map((node) => (
              <Tooltip
                key={node.id}
                describeChild
                placement='top'
                enterTouchDelay={0}
                title={
                  <Stack spacing={1}>
                    <Typography sx={{ fontWeight: 700 }}>
                      {node.name} · {node.rank}/2
                    </Typography>
                    <Typography variant='body2'>{node.description}</Typography>
                    <Typography variant='body2'>
                      Requires level {node.level}. No prerequisite talents.
                    </Typography>
                    <Typography variant='body2'>
                      {node.available
                        ? 'Learn the next rank for 1 point.'
                        : node.rank >= 2
                          ? 'Fully learned.'
                          : 'Requires the indicated level and an available point.'}
                    </Typography>
                  </Stack>
                }
              >
                <ButtonBase
                  data-talent-node={node.id}
                  aria-label={`${node.name}: rank ${node.rank} of 2, ${node.available ? 'Available' : 'Locked'}`}
                  aria-disabled={!node.available}
                  onClick={() => {
                    if (node.available) onLearn(node.id);
                  }}
                  sx={{
                    p: 1,
                    gap: 1,
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    border: 1,
                    borderColor: node.learned ? 'primary.main' : 'divider',
                    bgcolor: 'background.paper',
                    opacity: node.learned || node.available ? 1 : 0.5,
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'info.main' },
                  }}
                >
                  <Box sx={{ width: 40, height: 40, flexShrink: 0 }}>{node.icon}</Box>
                  <Stack>
                    <Typography variant='body2'>{node.name}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Lv {node.level} · {node.rank}/2
                    </Typography>
                  </Stack>
                </ButtonBase>
              </Tooltip>
            ))}
        </Box>
      </Box>
    </Stack>
  );
}
