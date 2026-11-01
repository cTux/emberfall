import { memo, useState } from 'react';
import { ChapterTabs } from '@emberfall/ui';
import { Box } from '@mui/material';
import { CODEX_CHAPTERS } from './codex/chapters';

function CodexView() {
  const [chapter, setChapter] = useState('Controls');

  return (
    <Box
      sx={{
        color: 'text.secondary',
        '& h4': { typography: 'subtitle1', fontWeight: 700, color: 'primary.main', mt: 2, mb: 1 },
        '& p, & ul': { typography: 'body1', mt: 0, mb: 1.5 },
        '& ul': { pl: 3 },
        '& li': { mb: 1 },
        '& kbd': {
          font: 'inherit',
          color: 'primary.light',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          px: 0.5,
        },
        '& figure': { m: 0, mb: 2, display: 'flex', alignItems: 'center', gap: 2 },
        '& figure img': { width: 72, height: 72, objectFit: 'contain', flexShrink: 0 },
        '& figcaption': { typography: 'body2', fontStyle: 'italic' },
        '& .codex-classes': {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: 1,
          '& figure': { flexDirection: 'column', gap: 0.5, textAlign: 'center' },
        },
        '& .codex-warden': { width: 112, height: 104, overflow: 'hidden', flexShrink: 0 },
        // First standing frame of the existing four-column Warden sheet.
        '& .codex-warden img': { width: 448, height: 'auto', maxWidth: 'none' },
        '& .codex-innkeeper': { width: 72, height: 72, overflow: 'hidden', flexShrink: 0 },
        // The Innkeeper source is a horizontal strip of four square frames.
        '& .codex-innkeeper img': { width: 288, height: 72, maxWidth: 'none' },
        '& a': { color: 'primary.main' },
      }}
    >
      <ChapterTabs
        label='Codex chapters'
        value={chapter}
        onChange={setChapter}
        chapters={CODEX_CHAPTERS.map((entry) => {
          return { ...entry, id: entry.title };
        })}
      />
    </Box>
  );
}

export const Codex = memo(CodexView);
