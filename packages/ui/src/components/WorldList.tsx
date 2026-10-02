import {
  Button,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
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
  onJoin(world: WorldEntry): void;
  onCreate(): void;
}

export function WorldList({ worlds, selectedId, disabled, onJoin, onCreate }: WorldListProps) {
  if (!worlds.length)
    return (
      <Stack spacing={2} sx={{ alignItems: "center", py: 4 }}>
        <Typography variant="h3" component="h3">
          The grove is quiet.
        </Typography>
        <Typography color="text.secondary">No open worlds yet. Light the first ember.</Typography>
        <Button onClick={onCreate}>Create a world</Button>
      </Stack>
    );
  return (
    <List aria-label="Available worlds" disablePadding>
      {worlds.map((world) => (
        <ListItem key={world.id} disablePadding>
          <ListItemButton
            selected={world.id === selectedId}
            disabled={disabled || world.players >= world.capacity}
            onClick={() => onJoin(world)}
            aria-label={`Join ${world.name}${world.locked ? ", password protected" : ""}${world.players >= world.capacity ? ", full" : ""}, ${world.players}/${world.capacity}`}
          >
            <ListItemText
              primary={world.name}
              secondary={world.locked ? "Password protected" : "Open to everyone"}
            />
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              {world.locked && <FontAwesomeIcon icon={faLock} aria-hidden="true" />}
              <Chip size="small" label={`${world.players}/${world.capacity}`} />
            </Stack>
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}
