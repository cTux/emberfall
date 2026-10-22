import { Box, ButtonBase, Stack, Tooltip, Typography } from '@mui/material';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
export interface TalentNodeView {
  id: string;
  previous: string | null;
  x: number;
  y: number;
  name: string;
  description: string;
  icon?: ReactNode;
  learned: boolean;
  available: boolean;
}
export interface TalentTreeProps {
  nodes: readonly TalentNodeView[];
  points: number;
  onLearn: (id: string) => void;
}
export function TalentTree({ nodes, points, onLearn }: TalentTreeProps) {
  const scroll = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (scroll.current) {
      scroll.current.scrollTop = 150;
      scroll.current.scrollLeft = Math.max(0, (640 - scroll.current.clientWidth) / 2);
    }
  }, []);
  return (
    <Stack spacing={1}>
      <Typography role='status'>
        {points} talent {points === 1 ? 'point' : 'points'} available
      </Typography>
      <Typography variant='body2' color='text.secondary'>
        Follow the paths from the center. Each node costs 1 point. Scroll to explore.
      </Typography>
      <Box
        ref={scroll}
        sx={{
          overflow: 'auto',
          maxHeight: 340,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ position: 'relative', width: 640, height: 640 }}>
          <svg
            width='640'
            height='640'
            aria-hidden='true'
            style={{ position: 'absolute', inset: 0 }}
          >
            {nodes.map((node) => {
              const parent = nodes.find((entry) => entry.id === node.previous);
              return parent ? (
                <line
                  key={node.id}
                  x1={parent.x}
                  y1={parent.y}
                  x2={node.x}
                  y2={node.y}
                  stroke={node.learned ? '#e7ad65' : parent.learned ? '#8daba5' : '#384c41'}
                  strokeWidth={node.learned ? 3 : 2}
                />
              ) : null;
            })}
          </svg>
          {nodes.map((node) => (
            <Tooltip
              describeChild
              key={node.id}
              title={
                <>
                  <strong>{node.name}</strong>
                  <br />
                  {node.description}
                  <br />
                  {node.learned
                    ? 'Learned'
                    : node.available
                      ? 'Learn for 1 talent point'
                      : 'Learn the previous node and earn a point'}
                </>
              }
              enterTouchDelay={0}
            >
              <ButtonBase
                aria-label={`${node.name}: ${node.learned ? 'Learned' : node.available ? 'Available' : 'Locked'}`}
                aria-disabled={!node.available}
                onClick={() => {
                  if (node.available) onLearn(node.id);
                }}
                sx={{
                  position: 'absolute',
                  left: node.x - 23,
                  top: node.y - 23,
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: node.learned ? 3 : 2,
                  borderColor: node.learned
                    ? 'primary.main'
                    : node.available
                      ? 'info.main'
                      : 'divider',
                  bgcolor: 'background.paper',
                  opacity: node.learned || node.available ? 1 : 0.45,
                  '&:focus-visible': {
                    outline: '3px solid',
                    outlineColor: 'text.primary',
                    outlineOffset: 3,
                  },
                }}
              >
                {node.icon}
              </ButtonBase>
            </Tooltip>
          ))}
        </Box>
      </Box>
      <Typography variant='caption' color='text.secondary'>
        Gold: learned · Blue: available · Dim: locked. Abilities use slots 1–4.
      </Typography>
    </Stack>
  );
}
