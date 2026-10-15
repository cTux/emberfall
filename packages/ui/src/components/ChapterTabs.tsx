import { useContext, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { WindowTabsContext } from './GameWindow/WindowTabsContext';
import { inventoryDropProps, type InventoryDrop } from '../inventory-drag';

export interface Chapter {
  id: string;
  title: string;
  content: ReactNode;
  disabled?: boolean;
  onRename?(): void;
  drop?: InventoryDrop;
}
export interface ChapterTabsProps {
  label: string;
  chapters: Chapter[];
  value: string;
  showHeading?: boolean;
  onChange(id: string): void;
}
export function ChapterTabs({
  label,
  chapters,
  value,
  showHeading = true,
  onChange,
}: ChapterTabsProps) {
  const id = useId();
  const windowTabs = useContext(WindowTabsContext);
  const active = chapters.find((chapter) => chapter.id === value && !chapter.disabled);
  const tabs = (
    <Tabs
      orientation='vertical'
      aria-label={label}
      value={active ? value : false}
      onChange={(_, next: string) => onChange(next)}
    >
      {chapters.map((chapter) => (
        <Tab
          key={chapter.id}
          id={`${id}-${chapter.id}`}
          aria-controls={`${id}-panel-${chapter.id}`}
          value={chapter.id}
          label={
            <Typography component='span' variant='inherit' noWrap sx={{ maxWidth: '100%' }}>
              {chapter.title}
            </Typography>
          }
          title={chapter.title}
          disabled={chapter.disabled}
          {...inventoryDropProps(chapter.disabled ? undefined : chapter.drop)}
          onContextMenu={
            chapter.onRename
              ? (event) => {
                  event.preventDefault();
                  chapter.onRename?.();
                }
              : undefined
          }
          onKeyDown={
            chapter.onRename
              ? (event) => {
                  if (event.key === 'F2') {
                    event.preventDefault();
                    chapter.onRename?.();
                  }
                }
              : undefined
          }
        />
      ))}
    </Tabs>
  );
  return (
    <Stack direction='row' spacing={1} useFlexGap sx={{ minWidth: 0 }}>
      {windowTabs ? createPortal(tabs, windowTabs) : tabs}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {chapters.map((chapter) => (
          <Box
            key={chapter.id}
            role='tabpanel'
            hidden={value !== chapter.id || chapter.disabled}
            id={`${id}-panel-${chapter.id}`}
            aria-labelledby={`${id}-${chapter.id}`}
            tabIndex={0}
          >
            {value === chapter.id && !chapter.disabled && (
              <>
                {showHeading && (
                  <Typography component='h3' variant='h3' gutterBottom>
                    {chapter.title}
                  </Typography>
                )}
                {chapter.content}
              </>
            )}
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
