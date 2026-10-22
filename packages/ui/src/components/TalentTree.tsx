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
  size?: number;
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
  const width = Math.max(640, ...nodes.map((node) => node.x + 48));
  const height = Math.max(640, ...nodes.map((node) => node.y + 48));
  const origin = nodes.find((node) => node.previous === null);
  const originX = origin?.x ?? width / 2;
  const originY = origin?.y ?? height / 2;
  useLayoutEffect(() => {
    const element = scroll.current;
    if (!element) return;
    const center = () => {
      element.scrollTop = Math.max(0, originY - element.clientHeight / 2);
      element.scrollLeft = Math.max(0, originX - element.clientWidth / 2);
    };
    center();
    const observer = new ResizeObserver(center);
    observer.observe(element);
    return () => observer.disconnect();
  }, [originX, originY]);
  return (
    <Stack spacing={1}>
      <Typography role='status'>
        {points} talent {points === 1 ? 'point' : 'points'} available
      </Typography>
      <Box
        ref={scroll}
        data-talent-scroll
        sx={{
          overflow: 'auto',
          maxHeight: 340,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Box data-talent-map sx={{ position: 'relative', width, height }}>
          <svg
            width={width}
            height={height}
            aria-hidden='true'
            style={{ position: 'absolute', inset: 0 }}
          >
            {nodes.map((node, index) => {
              const parent = nodes.find((entry) => entry.id === node.previous);
              if (!parent) return null;
              const dx = node.x - parent.x;
              const dy = node.y - parent.y;
              const length = Math.hypot(dx, dy) || 1;
              const direction = index % 2 ? 1 : -1;
              const bend = Math.min(36, length * 0.24) * direction;
              const controlX = (parent.x + node.x) / 2 - (dy / length) * bend;
              const controlY = (parent.y + node.y) / 2 + (dx / length) * bend;
              return (
                <path
                  key={node.id}
                  d={`M ${parent.x} ${parent.y} Q ${controlX} ${controlY} ${node.x} ${node.y}`}
                  fill='none'
                  strokeLinecap='round'
                  stroke={node.learned ? '#e7ad65' : parent.learned ? '#8daba5' : '#384c41'}
                  strokeWidth={node.learned ? 3 : 2}
                />
              );
            })}
          </svg>
          {nodes.map((node) => (
            <Tooltip
              describeChild
              key={node.id}
              title={
                <>
                  <strong>{node.name}</strong>
                  {node.description !== node.name && (
                    <>
                      <br />
                      {node.description}
                    </>
                  )}
                  {(node.learned || node.available) && (
                    <>
                      <br />
                      {node.learned ? 'Learned' : 'Learn for 1 talent point'}
                    </>
                  )}
                </>
              }
              enterTouchDelay={0}
            >
              <ButtonBase
                data-talent-node={node.id}
                aria-label={`${node.name}: ${node.learned ? 'Learned' : node.available ? 'Available' : 'Locked'}`}
                aria-disabled={!node.available}
                onClick={() => {
                  if (node.available) onLearn(node.id);
                }}
                sx={{
                  position: 'absolute',
                  left: node.x - (node.size ?? 46) / 2,
                  top: node.y - (node.size ?? 46) / 2,
                  width: node.size ?? 46,
                  height: node.size ?? 46,
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
    </Stack>
  );
}
