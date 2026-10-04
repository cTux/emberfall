import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons/faLock";
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
  onJoin(world: WorldEntry): void;
}
export function WorldList({ worlds, selectedId, disabled, latency, onJoin }: WorldListProps) {
  return (
    <TableContainer>
      <Table aria-label="Available servers" size="small" sx={{ tableLayout: "fixed" }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: "50%" }}>Name</TableCell>
            <TableCell align="right">Latency</TableCell>
            <TableCell align="right">Players</TableCell>
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
                  if (!joinDisabled) onJoin(world);
                }}
                sx={{ cursor: joinDisabled ? "default" : "pointer" }}
              >
                <TableCell sx={{ overflowWrap: "anywhere" }}>
                  <Button
                    disabled={joinDisabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      onJoin(world);
                    }}
                    sx={{ justifyContent: "flex-start", textAlign: "left", minWidth: 0, px: 0 }}
                    aria-label={`Join ${world.name}${world.locked ? ", password protected" : ""}${world.players >= world.capacity ? ", full" : ""}, ${world.players}/${world.capacity}`}
                    startIcon={
                      world.locked ? (
                        <FontAwesomeIcon icon={faLock} aria-hidden="true" />
                      ) : undefined
                    }
                  >
                    {world.name}
                  </Button>
                </TableCell>
                <TableCell align="right">
                  {latency == null ? "—" : `${Math.round(latency)} ms`}
                </TableCell>
                <TableCell align="right">
                  {world.players}/{world.capacity}
                </TableCell>
              </TableRow>
            );
          })}
          {!worlds.length && (
            <TableRow>
              <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                No servers available.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
