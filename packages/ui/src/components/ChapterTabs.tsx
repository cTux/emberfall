import { useId, type ReactNode } from "react";
import { Box, Stack, Tab, Tabs, Typography } from "@mui/material";

export interface Chapter {
  id: string;
  title: string;
  content: ReactNode;
}
export interface ChapterTabsProps {
  label: string;
  chapters: Chapter[];
  value: string;
  onChange(id: string): void;
}
export function ChapterTabs({ label, chapters, value, onChange }: ChapterTabsProps) {
  const id = useId();
  const active = chapters.find((chapter) => chapter.id === value);
  return (
    <Stack spacing={2}>
      <Tabs
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
            label={chapter.title}
          />
        ))}
      </Tabs>
      {chapters.map((chapter) => (
        <Box
          key={chapter.id}
          role="tabpanel"
          hidden={value !== chapter.id}
          id={`${id}-panel-${chapter.id}`}
          aria-labelledby={`${id}-${chapter.id}`}
          tabIndex={0}
        >
          {value === chapter.id && (
            <>
              <Typography component="h3" variant="h3" gutterBottom>
                {chapter.title}
              </Typography>
              {chapter.content}
            </>
          )}
        </Box>
      ))}
    </Stack>
  );
}
