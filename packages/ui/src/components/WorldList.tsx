import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons/faLock';

// Fit the column headings and four-digit latency while leaving the rest for world names.
const SERVER_COLUMN_WIDTH = '5em';
export interface WorldEntry {
  id: string;
  name: string;
  players: number;
  capacity: number;
  locked?: boolean;
}
export interface WorldListProps {
  worlds: WorldEntry[];
  selectedId?: string;
  disabled?: boolean;
  latency?: number | null;
  onJoin: (world: WorldEntry) => void;
}
export function WorldList({ worlds, selectedId, disabled, latency, onJoin }: WorldListProps) {
  return (
    <TableContainer>
      <Table
        aria-label='Available servers'
        size='small'
        sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { px: 1, whiteSpace: 'nowrap' } }}
      >
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell align='center' sx={{ width: SERVER_COLUMN_WIDTH }}>
              Latency
            </TableCell>
            <TableCell align='center' sx={{ width: SERVER_COLUMN_WIDTH }}>
              Players
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {worlds.map((world) => {
            const joinDisabled = disabled || world.players >= world.capacity;

            return (
              <TableRow
                key={world.id}
                selected={world.id === selectedId}
                hover={!joinDisabled}
                onClick={() => {
                  if (!joinDisabled) {
                    onJoin(world);
                  }
                }}
                sx={{
                  cursor: joinDisabled
                    ? 'var(--cursor-default, default)'
                    : 'var(--cursor-pointer, pointer)',
                }}
              >
                <TableCell>
                  <Button
                    disabled={joinDisabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      onJoin(world);
                    }}
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      minWidth: 0,
                      maxWidth: '100%',
                      px: 0,
                      '&:hover': { backgroundColor: 'transparent' },
                    }}
                    aria-label={`Join ${world.name}${world.locked ? ', password protected' : ''}${world.players >= world.capacity ? ', full' : ''}, ${world.players}/${world.capacity}`}
                    startIcon={
                      world.locked ? (
                        <FontAwesomeIcon icon={faLock} aria-hidden='true' />
                      ) : undefined
                    }
                  >
                    <Typography component='span' noWrap sx={{ font: 'inherit' }} title={world.name}>
                      {world.name}
                    </Typography>
                  </Button>
                </TableCell>
                <TableCell align='center'>
                  {latency == null ? '—' : `${Math.round(latency)} ms`}
                </TableCell>
                <TableCell align='center'>
                  {world.players}/{world.capacity}
                </TableCell>
              </TableRow>
            );
          })}
          {!worlds.length && (
            <TableRow>
              <TableCell colSpan={3} align='center' sx={{ py: 4 }}>
                No servers available.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
