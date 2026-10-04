import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { faBookOpen } from "@fortawesome/free-solid-svg-icons/faBookOpen";
import { faGear } from "@fortawesome/free-solid-svg-icons/faGear";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons/faRightFromBracket";
import {
  GameWindow,
  WorldList,
  ChapterTabs,
  SettingToggle,
  VolumeControl,
  ClassCard,
  PartyCard,
  HudActions,
  ConnectionStatus,
  BossHealth,
  SceneStatus,
  InteractionPrompt,
  PortalVote,
  PerformanceMonitor,
} from "../index";

const meta = { title: "Screens/Compositions", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const stage = { p: { xs: 2, sm: 4 }, minHeight: "100dvh", bgcolor: "background.default" };
const panel = { width: "100%", maxWidth: 480, mx: "auto" };

export const Lobby: Story = {
  render: function Lobby() {
    const [tab, setTab] = useState("join");
    const [name, setName] = useState("");
    const [selected, select] = useState<string>();
    const [password, setPassword] = useState("");
    const [notice, setNotice] = useState("");
    const [open, setOpen] = useState(true);
    const join = (
      <Stack spacing={2}>
        <WorldList
          disabled={!name.trim()}
          selectedId={selected}
          worlds={[
            { id: "open", name: "Playtest Default", players: 1, capacity: 32 },
            { id: "locked", name: "Northern grove", players: 3, capacity: 8, locked: true },
            { id: "full", name: "Full world", players: 8, capacity: 8 },
          ]}
          latency={42}
          onJoin={(world) => {
            select(world.id);
            setNotice(world.locked ? "" : `Preview: join ${world.name}`);
          }}
        />
        {selected === "locked" && (
          <Stack
            component="form"
            spacing={2}
            onSubmit={(event) => {
              event.preventDefault();
              setNotice("Preview: password submitted to the host application");
            }}
          >
            <TextField
              label="Password for Northern grove"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" variant="contained" disabled={!name.trim()}>
              Join world
            </Button>
          </Stack>
        )}
      </Stack>
    );
    return (
      <Box sx={stage}>
        <Box sx={panel}>
          {open ? (
            <GameWindow title="Emberfall" modal={false} onClose={() => setOpen(false)}>
              <Stack spacing={3}>
                <TextField
                  label="Your adventurer name"
                  autoComplete="nickname"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  slotProps={{ htmlInput: { maxLength: 24 } }}
                />
                <ChapterTabs
                  label="World actions"
                  showHeading={false}
                  value={tab}
                  onChange={setTab}
                  chapters={[
                    { id: "join", title: "Join a world", content: join },
                    { id: "create", title: "Create a world", disabled: true, content: null },
                  ]}
                />
                {notice && (
                  <Alert severity="info" onClose={() => setNotice("")}>
                    {notice}
                  </Alert>
                )}
              </Stack>
            </GameWindow>
          ) : (
            <Button onClick={() => setOpen(true)}>Open world browser</Button>
          )}
        </Box>
      </Box>
    );
  },
};

export const Settings: Story = {
  render: function Settings() {
    const [tab, setTab] = useState("gameplay");
    const [values, setValues] = useState<Record<string, boolean>>({
      "Floating damage numbers": true,
      "Sound effects": true,
      Music: true,
    });
    const [volume, setVolume] = useState(0.6);
    const [musicVolume, setMusicVolume] = useState(0.4);
    const [preset, setPreset] = useState("High");
    const toggles = (labels: string[]) =>
      labels.map((label) => (
        <SettingToggle
          key={label}
          label={label}
          checked={!!values[label]}
          onChange={(checked) => setValues({ ...values, [label]: checked })}
        />
      ));
    return (
      <Box sx={stage}>
        <Box sx={panel}>
          <GameWindow title="Settings" modal={false} height={420} onClose={() => {}}>
            <ChapterTabs
              label="Settings areas"
              value={tab}
              onChange={setTab}
              chapters={[
                {
                  id: "gameplay",
                  title: "Gameplay",
                  content: (
                    <Stack>
                      {toggles([
                        "Blood puddles",
                        "Floating damage numbers",
                        "FPS graph",
                        "Latency graph",
                      ])}
                    </Stack>
                  ),
                },
                {
                  id: "graphics",
                  title: "Graphics",
                  content: (
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1}>
                        {["Low", "Balanced", "High"].map((name) => (
                          <Button
                            key={name}
                            variant={preset === name ? "contained" : "outlined"}
                            aria-pressed={preset === name}
                            onClick={() => {
                              setPreset(name);
                              setValues({
                                ...values,
                                "Soft shadows": name !== "Low",
                                Bloom: name === "High",
                                "Ambient particles": name !== "Low",
                                Fog: name !== "Low",
                              });
                            }}
                          >
                            {name}
                          </Button>
                        ))}
                      </Stack>
                      {toggles(["Soft shadows", "Bloom", "Ambient particles", "Fog"])}
                      <TextField select label="Frame rate limit" defaultValue="0">
                        {[0, 30, 60, 120, 144].map((fps) => (
                          <MenuItem key={fps} value={String(fps)}>
                            {fps ? `${fps} FPS` : "Display refresh rate"}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField select label="Render resolution" defaultValue="1">
                        <MenuItem value="0.75">75% · Performance</MenuItem>
                        <MenuItem value="1">100% · Native</MenuItem>
                        <MenuItem value="1.5">150% · Supersampling</MenuItem>
                      </TextField>
                    </Stack>
                  ),
                },
                {
                  id: "sound",
                  title: "Sound",
                  content: (
                    <Stack spacing={2}>
                      {toggles(["Sound effects"])}
                      <VolumeControl
                        label="Effects volume"
                        value={volume}
                        onChange={setVolume}
                        disabled={!values["Sound effects"]}
                      />
                      {toggles(["Music"])}
                      <VolumeControl
                        label="Music volume"
                        value={musicVolume}
                        onChange={setMusicVolume}
                        disabled={!values.Music}
                      />
                    </Stack>
                  ),
                },
              ]}
            />
          </GameWindow>
        </Box>
      </Box>
    );
  },
};

export const Wardrobe: Story = {
  render: function Wardrobe() {
    const [selected, select] = useState("Warrior");
    return (
      <Box sx={stage}>
        <Box sx={{ ...panel, maxWidth: 600 }}>
          <GameWindow title="Wardrobe" width={600} modal={false} onClose={() => {}}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: { xs: 0.5, sm: 1 },
              }}
            >
              {Object.entries({
                Warrior: "Slashing sword · Bleeding",
                Ranger: "Piercing arrows · Poison",
                Mage: "Twin fireballs · Burning",
                Druid: "Roots · Bear companion",
              }).map(([name, description]) => (
                <ClassCard
                  key={name}
                  title={name}
                  portrait={
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "background.paper",
                      }}
                    >
                      <Typography variant="h2">{name[0]}</Typography>
                    </Box>
                  }
                  weapon={{
                    name: name === "Warrior" ? "Sword" : name === "Ranger" ? "Bow" : "Staff",
                    icon: <Typography>W</Typography>,
                    description,
                  }}
                  spell={{
                    name:
                      name === "Warrior"
                        ? "Slash"
                        : name === "Ranger"
                          ? "Piercing arrows"
                          : name === "Mage"
                            ? "Fireball"
                            : "Roots",
                    icon: <Typography>S</Typography>,
                    description: `${description}. Cooldown: 0.7 seconds.`,
                  }}
                  stats={{ level: 1, experience: 0, maxHitpoints: 100, power: 5 }}
                  selected={selected === name}
                  onSelect={() => select(name)}
                />
              ))}
            </Box>
          </GameWindow>
        </Box>
      </Box>
    );
  },
};
export const Codex: Story = {
  render: function Codex() {
    const [value, select] = useState("controls");
    return (
      <Box sx={stage}>
        <Box sx={{ ...panel, maxWidth: 720 }}>
          <GameWindow title="The Adventurer's Codex" modal={false} onClose={() => {}}>
            <ChapterTabs
              label="Codex chapters"
              value={value}
              onChange={select}
              chapters={[
                {
                  id: "controls",
                  title: "Controls",
                  content: (
                    <Typography>
                      WASD or arrow keys to move. E to interact. Escape to close menus or leave.
                    </Typography>
                  ),
                },
                {
                  id: "combat",
                  title: "Combat",
                  content: (
                    <Typography>
                      Attacks are automatic. Avoid enemy windups. Survive the forest timer and
                      defeat the boss.
                    </Typography>
                  ),
                },
                {
                  id: "classes",
                  title: "Classes",
                  content: (
                    <Typography>
                      Warrior, Ranger, Mage and Druid have distinct weapons and abilities.
                    </Typography>
                  ),
                },
                {
                  id: "credits",
                  title: "Credits",
                  content: (
                    <Typography>
                      Game artwork and credits stay with the host. UI font: Alegreya Sans, SIL Open
                      Font License.
                    </Typography>
                  ),
                },
              ]}
            />
          </GameWindow>
        </Box>
      </Box>
    );
  },
};
export const Hud: Story = {
  render: () => (
    <Box sx={stage}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={3}
          sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
        >
          <Stack spacing={1} sx={{ width: "100%", maxWidth: 320 }}>
            <PartyCard name="Astrid" level={1} health={85} maxHealth={100} local host />
            <PartyCard name="Bjorn" level={1} health={100} maxHealth={100} away />
            <PerformanceMonitor
              samples={[
                { fps: 60, latency: 30 },
                { fps: 59, latency: 40 },
                { fps: 60, latency: 34 },
              ]}
            />
          </Stack>
          <HudActions
            actions={[
              { id: "codex", label: "Codex", icon: faBookOpen, onClick() {} },
              { id: "settings", label: "Settings", icon: faGear, onClick() {} },
              { id: "leave", label: "Leave world", icon: faRightFromBracket, onClick() {} },
            ]}
          />
        </Stack>
        <Box sx={{ width: "100%", maxWidth: 600, mx: "auto" }}>
          <BossHealth name="The Hollow Warden" health={140} maxHealth={200} />
        </Box>
        <SceneStatus label="Forest" seconds={94} />
        <Box>
          <InteractionPrompt action="Enter forest portal" />
        </Box>
        <ConnectionStatus status="connected" />
      </Stack>
    </Box>
  ),
};
export const Portal: Story = {
  render: function Portal() {
    const [voted, vote] = useState(false);
    return (
      <Box sx={stage}>
        <Box sx={panel}>
          <GameWindow title="Forest portal" modal={false} onClose={() => {}}>
            <PortalVote
              scene="Forest"
              difficulty="Easy"
              ready={voted ? 2 : 1}
              total={2}
              voted={voted}
              onVote={() => vote(!voted)}
            />
          </GameWindow>
        </Box>
      </Box>
    );
  },
};
export const Confirmation: Story = {
  render: function Confirmation() {
    const [open, setOpen] = useState(true);
    return (
      <Box sx={stage}>
        <Button onClick={() => setOpen(true)}>Leave scene</Button>
        <GameWindow title="Leave the forest?" open={open} onClose={() => setOpen(false)}>
          <Stack spacing={3}>
            <Typography>Your party can continue fighting.</Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button color="error" variant="contained" onClick={() => setOpen(false)}>
                Leave scene
              </Button>
            </Stack>
          </Stack>
        </GameWindow>
      </Box>
    );
  },
};
export const Fallen: Story = {
  render: () => (
    <Box sx={stage}>
      <Box sx={panel}>
        <GameWindow title="You have fallen" modal={false} onClose={() => {}}>
          <Stack spacing={2}>
            <Typography>Your party can continue fighting.</Typography>
            <Button variant="contained">Return to village</Button>
          </Stack>
        </GameWindow>
      </Box>
    </Box>
  ),
};
export const Service: Story = {
  render: () => (
    <Box sx={stage}>
      <Box sx={panel}>
        <GameWindow title="Blacksmith" modal={false} onClose={() => {}}>
          <Alert severity="info">Blacksmith services are coming in a future update.</Alert>
        </GameWindow>
      </Box>
    </Box>
  ),
};
