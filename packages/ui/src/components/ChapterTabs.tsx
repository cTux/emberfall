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
  onRename?: () => void;
  drop?: InventoryDrop;
}
export interface ChapterTabsProps {
  label: string;
  chapters: Chapter[];
  value: string;
  showHeading?: boolean;
  keepMounted?: boolean;
  onChange: (id: string) => void;
}
export function ChapterTabs({
  label,
  chapters,
  value,
  showHeading = true,
  keepMounted = false,
  onChange,
}: ChapterTabsProps) {
  const id = useId();
  const windowTabs = useContext(WindowTabsContext);
  const active = chapters.find((chapter) => {
    return chapter.id === value && !chapter.disabled;
  });
  const tabs = (
    <Tabs
      orientation='vertical'
      aria-label={label}
      value={active ? value : false}
      onChange={(_, next: string) => {
        return onChange(next);
      }}
    >
      {chapters.map((chapter) => {
        return (
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
            title={chapter.onRename ? `${chapter.title} · Rename (F2)` : chapter.title}
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
        );
      })}
    </Tabs>
  );

  return (
    <Stack direction='row' spacing={1} useFlexGap sx={{ minWidth: 0 }}>
      {windowTabs ? createPortal(tabs, windowTabs) : tabs}
      <Box sx={{ minWidth: 0, flex: 1, display: keepMounted ? 'grid' : undefined }}>
        {chapters.map((chapter) => {
          return (
            <Box
              key={chapter.id}
              role='tabpanel'
              hidden={!keepMounted && (value !== chapter.id || chapter.disabled)}
              inert={value !== chapter.id || chapter.disabled}
              aria-hidden={value !== chapter.id || chapter.disabled}
              sx={
                keepMounted
                  ? {
                      gridArea: '1 / 1',
                      visibility: value === chapter.id && !chapter.disabled ? 'visible' : 'hidden',
                      minWidth: 0,
                    }
                  : undefined
              }
              id={`${id}-panel-${chapter.id}`}
              aria-labelledby={`${id}-${chapter.id}`}
              tabIndex={0}
            >
              {(keepMounted || value === chapter.id) && !chapter.disabled && (
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
          );
        })}
      </Box>
    </Stack>
  );
}
