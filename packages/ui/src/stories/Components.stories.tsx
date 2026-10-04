import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Stack, Typography } from "@mui/material";
import { faBookOpen } from "@fortawesome/free-solid-svg-icons/faBookOpen";
import { faGear } from "@fortawesome/free-solid-svg-icons/faGear";
import {
  GameWindow,
  StatusMeter,
  PartyCard,
  WorldList,
  ChoiceCard,
  SettingToggle,
  VolumeControl,
  ChapterTabs,
  ConnectionStatus,
  HudActions,
  BossHealth,
  InteractionPrompt,
  SceneStatus,
  PortalVote,
  PerformanceMonitor,
} from "../index";

const meta = { title: "Components/Game patterns", tags: ["autodocs"] } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Meter: Story = {
  render: () => (
    <Stack spacing={2}>
      <StatusMeter label="Health" value={75} max={100} />
      <StatusMeter label="Mana" value={20} max={50} color="info" />
      <StatusMeter label="Empty" value={0} max={100} />
      <StatusMeter label="Invalid maximum" value={50} max={0} />
      <StatusMeter label="Fractional" value={75.6} max={100.4} />
    </Stack>
  ),
};
export const Party: Story = {
  render: () => (
    <Stack spacing={1}>
      <PartyCard name="Astrid" level={1} health={75} maxHealth={100} host local />
      <PartyCard name="Bjorn" level={1} health={0} maxHealth={100} away />
      <PartyCard name="Bear companion" level={1} health={150} maxHealth={150} />
    </Stack>
  ),
};
export const Worlds: Story = {
  render: function Worlds() {
    const [selectedId, select] = useState<string>();
    return (
      <WorldList
        worlds={[
          { id: "1", name: "Playtest Default", players: 1, capacity: 32 },
          { id: "2", name: "The northern grove", players: 3, capacity: 8, locked: true },
          { id: "3", name: "Full world", players: 8, capacity: 8 },
        ]}
        selectedId={selectedId}
        onJoin={(world) => select(world.id)}
        latency={42}
      />
    );
  },
};
export const EmptyWorlds: Story = {
  render: () => <WorldList worlds={[]} onJoin={() => {}} latency={42} />,
};
export const Choices: Story = {
  render: function Choices() {
    const [selected, select] = useState("Warrior");
    return (
      <Stack spacing={1}>
        {["Warrior", "Ranger", "Mage", "Druid"].map((name) => (
          <ChoiceCard
            key={name}
            title={name}
            description={
              name === "Druid" ? "Roots · Bear companion" : "A distinct weapon and ability"
            }
            selected={selected === name}
            onSelect={() => select(name)}
          />
        ))}
      </Stack>
    );
  },
};
export const Settings: Story = {
  render: function Settings() {
    const [checked, toggle] = useState(true);
    const [volume, setVolume] = useState(0.6);
    return (
      <Stack spacing={2}>
        <SettingToggle label="Sound effects" checked={checked} onChange={toggle} />
        <VolumeControl
          label="Effects volume"
          value={volume}
          onChange={setVolume}
          disabled={!checked}
        />
        <SettingToggle label="Unavailable setting" checked={false} disabled onChange={() => {}} />
      </Stack>
    );
  },
};
export const Chapters: Story = {
  render: function Chapters() {
    const [value, select] = useState("controls");
    return (
      <ChapterTabs
        label="Codex chapters"
        value={value}
        onChange={select}
        chapters={[
          {
            id: "controls",
            title: "Controls",
            content: <Typography>Move with WASD or arrows. Press E to interact.</Typography>,
          },
          {
            id: "combat",
            title: "Combat",
            content: <Typography>Attacks are automatic. Stay outside enemy warnings.</Typography>,
          },
        ]}
      />
    );
  },
};
export const Connection: Story = {
  render: () => (
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
      {(["connected", "connecting", "disconnected"] as const).map((status) => (
        <ConnectionStatus key={status} status={status} />
      ))}
    </Stack>
  ),
};
export const Actions: Story = {
  render: () => (
    <HudActions
      actions={[
        { id: "codex", label: "Codex", icon: faBookOpen, onClick() {} },
        { id: "settings", label: "Settings", icon: faGear, onClick() {} },
      ]}
    />
  ),
};
export const Boss: Story = {
  render: () => <BossHealth name="The Hollow Warden" health={135} maxHealth={200} />,
};
export const Prompt: Story = { render: () => <InteractionPrompt action="Enter forest portal" /> };
export const Scene: Story = {
  render: () => (
    <Stack spacing={2}>
      <SceneStatus label="Forest" seconds={95} />
      <SceneStatus label="Scene complete · Return portal open" />
    </Stack>
  ),
};
export const Vote: Story = {
  render: function Vote() {
    const [voted, vote] = useState(false);
    return (
      <PortalVote
        scene="Forest"
        difficulty="Easy"
        ready={voted ? 2 : 1}
        total={2}
        voted={voted}
        onVote={() => vote(!voted)}
      />
    );
  },
};
export const Countdown: Story = {
  render: () => (
    <PortalVote
      scene="Forest"
      difficulty="Easy"
      ready={2}
      total={2}
      voted
      countdown={5}
      onVote={() => {}}
    />
  ),
};
export const Performance: Story = {
  render: () => (
    <PerformanceMonitor
      samples={[
        { fps: 60, latency: 30 },
        { fps: 58, latency: 40 },
        { fps: null, latency: null },
        { fps: 59, latency: 35 },
        { fps: 60.4, latency: 32.6 },
      ]}
    />
  ),
};
export const Window: Story = {
  render: function Window() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Open window
        </Button>
        <GameWindow title="Forest portal" open={open} onClose={() => setOpen(false)}>
          <Typography>Drag the title to move this window. Escape closes it.</Typography>
          <Button onClick={() => setOpen(false)}>Continue</Button>
        </GameWindow>
      </>
    );
  },
};
export const Panel: Story = {
  render: () => (
    <GameWindow title="Emberfall" modal={false} onClose={() => {}}>
      <Typography>A nonmodal panel for the world browser and death options.</Typography>
    </GameWindow>
  ),
};
