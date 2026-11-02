import { Box } from '@mui/material';

export function ConnectionStatus({
  status,
  description,
}: {
  status: 'connected' | 'connecting' | 'disconnected' | 'mismatch';
  description?: string;
}) {
  return (
    <Box
      component='span'
      role='status'
      aria-label={status === 'connected' ? 'World server online' : `World server ${status}`}
      title={description}
      sx={{
        display: 'block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor:
          status === 'connected'
            ? 'success.main'
            : status === 'connecting' || status === 'mismatch'
              ? 'warning.main'
              : 'error.main',
      }}
    />
  );
}
