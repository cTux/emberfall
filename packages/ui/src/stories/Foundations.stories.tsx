import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";

const meta = { title: "Foundations/Theme", tags: ["autodocs"] } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Tokens: Story = {
  render: function Tokens() {
    const theme = useTheme();
    return (
      <Stack spacing={3}>
        <Typography variant="h1">Emberfall UI</Typography>
        <Typography color="text.secondary">
          Quiet forest surfaces. Warm ember actions. Readable parchment text.
        </Typography>
        <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
          {(["primary", "secondary", "success", "info", "warning", "error"] as const).map(
            (name) => (
              <Paper key={name} sx={{ p: 2 }}>
                <Box sx={{ bgcolor: `${name}.main`, height: 48, mb: 1, borderRadius: 1 }} />
                <Typography>{name}</Typography>
                <Typography variant="caption">{theme.palette[name].main}</Typography>
              </Paper>
            ),
          )}
        </Stack>
        <Typography variant="h2">Section heading</Typography>
        <Typography variant="h3">Panel heading</Typography>
        <Typography>Body copy · Alegreya Sans · 8px spacing scale · 5px corners</Typography>
        <Typography variant="caption">
          Supporting text stays readable without decorative frames.
        </Typography>
      </Stack>
    );
  },
};
export const Controls: Story = {
  render: () => (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
        <Button variant="contained">Light the ember</Button>
        <Button variant="outlined">Cancel</Button>
        <Button>Learn more</Button>
        <Button disabled>Unavailable</Button>
        <Button loading variant="contained">
          Joining
        </Button>
      </Stack>
      <TextField label="Adventurer name" placeholder="Your name" helperText="Up to 24 characters" />
      <TextField label="World password" type="password" />
      <TextField label="Invalid world name" error helperText="Enter a world name" />
      <TextField select label="Render resolution" defaultValue="1">
        <MenuItem value="0.75">75% · Performance</MenuItem>
        <MenuItem value="1">100% · Native</MenuItem>
        <MenuItem value="1.5">150% · Supersampling</MenuItem>
      </TextField>
      <FormControlLabel label="Floating damage numbers" control={<Checkbox defaultChecked />} />
      <Divider />
      <Stack direction="row" spacing={1}>
        <Chip label="Easy" />
        <Chip label="Host" variant="outlined" />
      </Stack>
      <Alert severity="error">Unable to join this world. Check its password.</Alert>
      <Alert severity="info">Worlds fade when the last adventurer leaves.</Alert>
      <Alert severity="success">Your party is ready.</Alert>
      <Alert severity="warning">Connection interrupted. Reconnecting…</Alert>
    </Stack>
  ),
};
