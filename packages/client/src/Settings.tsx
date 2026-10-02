import type { Dispatch, SetStateAction } from "react";
import { ChapterTabs, SettingToggle, VolumeControl } from "@emberfall/ui";
import { Button, Link, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { Preferences } from "./preferences";
import { GRAPHICS_LABELS, GRAPHICS_PRESETS, type GraphicsSettings } from "./graphics";

export function Settings({
  tab,
  onTab,
  preferences,
  setPreferences,
  graphics,
  setGraphics,
}: {
  tab: string;
  onTab(tab: string): void;
  preferences: Preferences;
  setPreferences: Dispatch<SetStateAction<Preferences>>;
  graphics: GraphicsSettings;
  setGraphics: Dispatch<SetStateAction<GraphicsSettings>>;
}) {
  const toggle = (
    key:
      | "autoAttack"
      | "autoTarget"
      | "bloodPuddles"
      | "damageNumbers"
      | "fps"
      | "latency"
      | "sound"
      | "music",
    label: string,
  ) => (
    <SettingToggle
      key={key}
      label={label}
      checked={preferences[key]}
      onChange={(checked) => setPreferences((p) => ({ ...p, [key]: checked }))}
    />
  );
  return (
    <ChapterTabs
      label="Settings areas"
      value={tab}
      onChange={onTab}
      showHeading={false}
      chapters={[
        {
          id: "gameplay",
          title: "Gameplay",
          content: (
            <Stack>
              {toggle("autoAttack", "Auto-attack (F)")}
              {toggle("autoTarget", "Auto-target (G)")}
              {toggle("bloodPuddles", "Blood puddles")}
              {toggle("damageNumbers", "Floating damage numbers")}
              {toggle("fps", "FPS graph")}
              {toggle("latency", "Latency graph")}
            </Stack>
          ),
        },
        {
          id: "graphics",
          title: "Graphics",
          content: (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1}>
                {Object.entries(GRAPHICS_PRESETS).map(([preset, values]) => (
                  <Button
                    key={preset}
                    variant={
                      JSON.stringify(graphics) === JSON.stringify(values) ? "contained" : "outlined"
                    }
                    aria-pressed={JSON.stringify(graphics) === JSON.stringify(values)}
                    onClick={() => setGraphics({ ...values })}
                  >
                    {preset}
                  </Button>
                ))}
              </Stack>
              <Stack>
                {Object.entries(GRAPHICS_LABELS).map(([key, label]) => (
                  <SettingToggle
                    key={key}
                    label={label}
                    checked={graphics[key as keyof typeof GRAPHICS_LABELS]}
                    onChange={(checked) => setGraphics((p) => ({ ...p, [key]: checked }))}
                  />
                ))}
              </Stack>
              <TextField
                select
                label="Frame rate limit"
                value={graphics.frameLimit}
                onChange={(e) => setGraphics((p) => ({ ...p, frameLimit: Number(e.target.value) }))}
              >
                <MenuItem value={0}>Display refresh rate</MenuItem>
                {[30, 60, 120, 144].map((fps) => (
                  <MenuItem key={fps} value={fps}>
                    {fps} FPS
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Render resolution"
                value={graphics.resolution}
                onChange={(e) => setGraphics((p) => ({ ...p, resolution: Number(e.target.value) }))}
              >
                <MenuItem value={0.75}>75% · Performance</MenuItem>
                <MenuItem value={1}>100% · Native</MenuItem>
                <MenuItem value={1.5}>150% · Supersampling</MenuItem>
              </TextField>
            </Stack>
          ),
        },
        {
          id: "sound",
          title: "Sound",
          content: (
            <Stack spacing={2}>
              {toggle("sound", "Sound effects")}
              <VolumeControl
                label="Effects volume"
                value={preferences.volume}
                disabled={!preferences.sound}
                onChange={(volume) => setPreferences((p) => ({ ...p, volume }))}
              />
              {toggle("music", "Music")}
              <VolumeControl
                label="Music volume"
                value={preferences.musicVolume}
                disabled={!preferences.music}
                onChange={(musicVolume) => setPreferences((p) => ({ ...p, musicVolume }))}
              />
              <Typography variant="caption" color="text.secondary">
                Music: TimberwolfGames · Sound effects: Ninja Adventure.{" "}
                <Link href="/audio/CREDITS.txt" target="_blank" rel="noreferrer">
                  Audio credits
                </Link>
              </Typography>
            </Stack>
          ),
        },
      ]}
    />
  );
}
