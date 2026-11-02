import { Chip } from '@mui/material';

export function InteractionPrompt({ action, keys = 'E' }: { action: string; keys?: string }) {
  return <Chip role='status' variant='outlined' label={`${keys} · ${action}`} />;
}
