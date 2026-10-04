import { AccountGate } from "./Account";
import type { AccountView } from "@emberfall/common-new";
import { GameConnection } from "./connection";
import { classSprite } from "./characters";
import { AssetGallery } from "./AssetGallery";
import { ClassMovementGallery } from "./ClassMovementGallery";
import { weaponSrc, statusSrc, classAbility } from "./combat-assets";
import { classDetails } from "./class-details";
import { Equipment } from "./equipment-view";
import { Codex } from "./Codex";
import {
  enemyMaxHealth,
  CLASS_IDS,
  CLASS_LABELS,
  hasLivingScenePlayers,
} from "@emberfall/common-new";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ClientMessage, WorldState, WorldSummary } from "@emberfall/common-new";
import type { Interaction } from "./effects";
import {
  GameUiProvider,
  PanelPositionContext,
  GameWindow,
  WorldList,
  ChapterTabs,
  PartyCard,
  HudActions,
  ConnectionStatus,
  BossHealth,
  SceneStatus,
  ClassCard,
  PortalVote,
} from "@emberfall/ui";
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { faBookOpen } from "@fortawesome/free-solid-svg-icons/faBookOpen";
import { faGear } from "@fortawesome/free-solid-svg-icons/faGear";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons/faRightFromBracket";
import { faDoorOpen } from "@fortawesome/free-solid-svg-icons/faDoorOpen";
import { faGlobe } from "@fortawesome/free-solid-svg-icons/faGlobe";
import { faShieldHalved } from "@fortawesome/free-solid-svg-icons/faShieldHalved";
import { Settings } from "./Settings";
import { loadPreferences } from "./preferences";
import { Arena } from "./Arena";
import { Chat } from "./Chat";
import { loadGraphics } from "./graphics";
import "./style.scss";
import { panelPositions } from "./panel-positions";

function App({
  account,
  rename,
  logout,
  refresh,
}: {
  account: AccountView;
  rename(): void;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}) {
  const socket = useRef<GameConnection | null>(null);
  const [status, setStatus] = useState("Connecting");
  const [latency, setLatency] = useState<number | null>(null);
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const interaction = useRef<Interaction | null>(null);
  const [displayedHp, setDisplayedHp] = useState<Record<string, number>>({});
  const [world, setWorld] = useState<WorldState | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [legacyName, setName] = useState(() => {
    try {
      return localStorage.getItem("emberfall-new.nickname")?.slice(0, 24) || "Wanderer";
    } catch {
      return "Wanderer";
    }
  });
  const steam = account.mode === "steam";
  const name = steam ? account.nickname! : legacyName;
  const [menu, setMenu] = useState<
    "codex" | "settings" | "portal" | "building" | "wardrobe" | "equipment" | "exit" | null
  >(null);
  const [building, setBuilding] = useState("");
  const [settingsTab, setSettingsTab] = useState("gameplay");
  const [browserOpen, setBrowserOpen] = useState(true);
  const [deathWindow, setDeathWindow] = useState(true);
  const [preferences, setPreferences] = useState(loadPreferences);
  useEffect(() => {
    try {
      localStorage.setItem("emberfall-new.preferences", JSON.stringify(preferences));
    } catch {
      /* Session preferences still apply. */
    }
  }, [preferences]);
  const [graphics, setGraphics] = useState(loadGraphics);
  const previousWorld = useRef<string | null>(null);
  const characterToken = useRef<string | undefined>(undefined);
  useEffect(() => {
    try {
      if (!steam)
        characterToken.current = localStorage.getItem("emberfall-new.character") ?? undefined;
      previousWorld.current = sessionStorage.getItem("emberfall-new.world");
    } catch {
      /* Keep the key in memory for this session. */
    }
  }, [steam]);
  useEffect(() => {
    try {
      localStorage.setItem("emberfall-new.graphics", JSON.stringify(graphics));
    } catch {
      /* Settings still apply to this session. */
    }
  }, [graphics]);
  useEffect(() => {
    try {
      if (!steam) localStorage.setItem("emberfall-new.nickname", name);
    } catch {
      /* Storage may be disabled. */
    }
  }, [name, steam]);
  const [worldName, setWorldName] = useState("The quiet grove");
  const [password, setPassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [selected, setSelected] = useState<WorldSummary | null>(null);
  const [tab, setTab] = useState<"browse" | "create">("browse");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(0);
  const rememberWorld = (id: string | null) => {
    previousWorld.current = id;
    try {
      if (id) sessionStorage.setItem("emberfall-new.world", id);
      else sessionStorage.removeItem("emberfall-new.world");
    } catch {
      /* Recovery within this page still works when storage is unavailable. */
    }
  };
  const failedConnections = useRef(0);
  useEffect(() => {
    const url =
      import.meta.env.VITE_SERVER_URL ||
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
    setStatus(previousWorld.current ? "Reconnecting" : "Connecting");
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const versionRequest = new AbortController();
    let disposed = false;
    let resuming = false;
    const ws = new GameConnection(url, steam);
    socket.current = ws;
    let joinedId = "";
    let previousScene: string | undefined;
    let voteScene: string | undefined;
    let probeId = 0;
    let pendingProbe: { id: number; at: number } | null = null;
    const ping = () => {
      if (ws.readyState !== GameConnection.OPEN) return;
      const now = performance.now();
      if (pendingProbe && now - pendingProbe.at < 5000) return;
      if (pendingProbe) setLatency(null);
      pendingProbe = { id: ++probeId, at: now };
      ws.send({ type: "ping", id: probeId });
    };
    const pingTimer = setInterval(ping, 2000);
    ws.onopen = async () => {
      try {
        const response = await fetch("/version.json", {
          cache: "no-store",
          signal: AbortSignal.any([versionRequest.signal, AbortSignal.timeout(3000)]),
        });
        if (!response.ok) throw new Error("Version check unavailable");
        const { buildId } = await response.json();
        if (typeof buildId !== "string" || !buildId) throw new Error("Invalid build ID");
        if (disposed || ws.readyState !== GameConnection.OPEN) return;
        if (buildId !== __BUILD_ID__) {
          setStatus("Updating");
          location.reload();
          return;
        }
      } catch {
        if (!disposed && ws.readyState === GameConnection.OPEN)
          ws.close(3001, "Retry version check");
        return;
      }
      if (disposed || ws.readyState !== GameConnection.OPEN) return;
      failedConnections.current = 0;
      setError("");
      resuming = !!previousWorld.current && (steam || !!characterToken.current);
      if (resuming) {
        setPending(true);
        ws.send({
          type: "resume",
          worldId: previousWorld.current!,
          characterToken: steam ? "0".repeat(64) : characterToken.current!,
        });
      } else setStatus("Connected");
      ping();
    };
    ws.onmessage = (event) => {
      const message = event.data;
      if (message.type === "pong" && pendingProbe?.id === message.id) {
        setLatency(Math.max(0, Math.round(performance.now() - pendingProbe.at)));
        pendingProbe = null;
      }
      if (message.type === "worlds") setWorlds(message.worlds);
      if (message.type === "joined") {
        rememberWorld(message.world.id);
        resuming = false;
        setStatus("Connected");
        setMenu(null);
        joinedId = message.playerId;
        previousScene = undefined;
        characterToken.current = message.characterToken;
        try {
          if (!steam) localStorage.setItem("emberfall-new.character", message.characterToken);
        } catch {
          setError(
            "Your browser cannot remember this character key. Enable site storage to restore progress next session.",
          );
        }
        setWorld(message.world);
        setPlayerId(message.playerId);
        setPending(false);
        setPassword("");
        setJoinPassword("");
        setSelected(null);
      }
      if (message.type === "state") {
        if (message.world.scene?.phase === "voting" && voteScene !== message.world.scene.id)
          setMenu((current) => current ?? "portal");
        voteScene = message.world.scene?.id;
        const nextScene = message.world.players.find((p) => p.id === joinedId)?.scene;
        if (nextScene !== previousScene) {
          setMenu(null);
          setDeathWindow(true);
        }
        previousScene = nextScene;
        setWorld(message.world);
      }
      if (message.type === "left") {
        rememberWorld(null);
        setMenu(null);
        setBrowserOpen(true);
        setWorld(null);
        setPlayerId("");
        setPending(false);
        setTab("browse");
      }
      if (message.type === "error") {
        if (resuming) {
          resuming = false;
          rememberWorld(null);
          setStatus("Connected");
          setWorld(null);
          setPlayerId("");
          setMenu(null);
          setBrowserOpen(true);
        }
        setError(message.message);
        setPending(false);
      }
    };
    ws.onclose = () => {
      if (steam) void refresh();
      clearInterval(pingTimer);
      setLatency(null);
      setStatus("Reconnecting");
      setWorld(null);
      setPlayerId("");
      setMenu(null);
      setBrowserOpen(true);
      setTab("browse");
      setSelected(null);
      setJoinPassword("");
      setWorlds([]);
      setPending(false);
      setError("Connection lost. Reconnecting automatically…");
      reconnectTimer = setTimeout(
        () => setRetry((value) => value + 1),
        failedConnections.current++ === 0 ? 0 : 1000,
      );
    };
    ws.onerror = () => setError("Cannot reach the world server. Retrying automatically…");
    return () => {
      disposed = true;
      versionRequest.abort();
      clearInterval(pingTimer);
      clearTimeout(reconnectTimer);
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      ws.close();
    };
  }, [retry, steam, refresh]);
  const send = (message: ClientMessage) => {
    if (status === "Connected" && socket.current?.readyState === GameConnection.OPEN)
      socket.current.send(message);
  };
  const act = (message: ClientMessage) => {
    if (status !== "Connected") return;
    setError("");
    setPending(true);
    send(
      message.type === "create" || message.type === "join"
        ? { ...message, characterToken: characterToken.current }
        : message,
    );
  };
  const unavailable = status !== "Connected" || pending;
  const me = world?.players.find((p) => p.id === playerId);
  const scene = world?.scene;
  const interact = () => {
    const source = interaction.current;
    if (!source) return;
    if (source.id === "return") send({ type: "returnLobby" });
    else if (source.id === "wardrobe") setMenu("wardrobe");
    else if (source.id === "portal") setMenu("portal");
    else {
      setBuilding(source.name);
      setMenu("building");
    }
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const typing =
        event.target instanceof Element &&
        !!event.target.closest("input, textarea, select, [contenteditable=true]");
      if (
        event.code === "KeyI" &&
        world &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !typing &&
        (menu === "equipment" ||
          (!menu && !document.querySelector('[role="dialog"][aria-modal="true"]')))
      ) {
        event.preventDefault();
        setMenu(menu === "equipment" ? null : "equipment");
        return;
      }
      if (
        world &&
        !menu &&
        !typing &&
        !document.querySelector('[role="dialog"][aria-modal="true"]')
      ) {
        const option =
          event.code === "KeyF" ? "autoAttack" : event.code === "KeyG" ? "autoTarget" : null;
        if (option) {
          event.preventDefault();
          setPreferences((p) => ({ ...p, [option]: !p[option] }));
        }
      }
      if (event.key === "Escape") {
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
        if (world) {
          event.preventDefault();
          setMenu("exit");
        }
      }
      if (
        event.code === "KeyE" &&
        !document.querySelector('[role="dialog"][aria-modal="true"]') &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLSelectElement)
      )
        interact();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const boss =
    me?.scene === "forest" && scene?.phase === "active"
      ? scene.enemies.find((enemy) => enemy.id === scene.bossId && enemy.hitpoints > 0)
      : undefined;
  const departure = Math.max(
    1,
    Math.ceil(((scene?.countdownAt ?? 0) - (world?.serverNow ?? 0)) / 1000),
  );
  const remaining = Math.max(
    0,
    Math.ceil(((scene?.endsAt ?? 0) - (scene?.pausedAt ?? world?.serverNow ?? 0)) / 1000),
  );
  const canRegenerate =
    !!scene &&
    ["active", "ended"].includes(scene.phase) &&
    !hasLivingScenePlayers(world?.players ?? []);
  return (
    <main>
      <section className={`stage ${world ? "in-world" : ""}`} inert={!!menu}>
        <Arena
          key={`${playerId}:${retry}`}
          world={status === "Connected" ? world : null}
          playerId={playerId}
          send={send}
          graphics={graphics}
          preferences={preferences}
          latency={latency}
          interaction={interaction}
          onHitpoints={setDisplayedHp}
        />
        <Box className="controls">
          <HudActions
            actions={[
              ...(scene && ["voting", "countdown"].includes(scene.phase)
                ? [
                    {
                      id: "portal",
                      label: "Portal vote",
                      icon: faDoorOpen,
                      onClick: () => setMenu("portal"),
                    },
                  ]
                : []),
              { id: "codex", label: "Codex", icon: faBookOpen, onClick: () => setMenu("codex") },
              {
                id: "settings",
                label: "Settings",
                icon: faGear,
                onClick: () => setMenu("settings"),
              },
              ...(world
                ? [
                    {
                      id: "equipment",
                      label: "Equipment (I)",
                      icon: faShieldHalved,
                      onClick: () => setMenu("equipment"),
                    },
                    {
                      id: "leave",
                      label: "Leave world",
                      icon: faRightFromBracket,
                      disabled: unavailable,
                      onClick: () => setMenu("exit"),
                    },
                  ]
                : []),
              ...(!world && !browserOpen
                ? [
                    {
                      id: "browser",
                      label: "World browser",
                      icon: faGlobe,
                      onClick: () => setBrowserOpen(true),
                    },
                  ]
                : []),
            ]}
          />
        </Box>
        <Box className="connection">
          <ConnectionStatus
            status={
              status === "Connected"
                ? "connected"
                : status === "Connecting"
                  ? "connecting"
                  : "disconnected"
            }
          />
        </Box>
        {world && (
          <Chat
            key={world.id}
            messages={(world.chat ?? []).filter((message) => message.excludedPlayerId !== playerId)}
            send={send}
            disabled={status !== "Connected"}
          />
        )}
        {world ? (
          <Stack
            component="aside"
            className="party"
            spacing={1}
            aria-label={`${world.name}: ${world.players.length}/8 adventurers`}
          >
            {world.players.map((p) => (
              <PartyCard
                key={p.id}
                name={p.name}
                level={p.level}
                health={displayedHp[p.id] ?? p.hitpoints}
                maxHealth={p.maxHitpoints}
                mana={p.manapoints}
                maxMana={p.maxManapoints}
                portrait={
                  <span
                    className="portrait"
                    style={{ backgroundImage: `url(${classSprite(p.classId)})` }}
                    aria-hidden="true"
                  />
                }
                local={p.id === playerId}
                host={p.id === world.hostId}
                away={p.scene !== me?.scene}
              />
            ))}
          </Stack>
        ) : browserOpen ? (
          <Box className="lobby">
            <GameWindow title="Emberfall" modal={false} onClose={() => setBrowserOpen(false)}>
              <Stack spacing={3}>
                {steam ? (
                  <Typography>Playing as {name}</Typography>
                ) : (
                  <TextField
                    label="Your adventurer name"
                    value={name}
                    required
                    autoComplete="nickname"
                    onChange={(e) => setName(e.target.value)}
                    slotProps={{ htmlInput: { maxLength: 24 } }}
                  />
                )}
                <ChapterTabs
                  label="World actions"
                  value={tab}
                  showHeading={false}
                  onChange={(next) => {
                    setTab(next === "create" ? "create" : "browse");
                    setError("");
                  }}
                  chapters={[
                    {
                      id: "browse",
                      title: "Join a world",
                      content: (
                        <Stack spacing={2}>
                          <WorldList
                            worlds={worlds}
                            selectedId={selected?.id}
                            disabled={unavailable || !name.trim()}
                            onCreate={() => setTab("create")}
                            onJoin={(w) => {
                              if (w.locked) {
                                setSelected(worlds.find((world) => world.id === w.id)!);
                                setJoinPassword("");
                                setError("");
                              } else
                                act({
                                  type: "join",
                                  worldId: w.id,
                                  playerName: name,
                                  password: "",
                                });
                            }}
                          />
                          {selected && (
                            <Stack
                              component="form"
                              spacing={2}
                              onSubmit={(e) => {
                                e.preventDefault();
                                act({
                                  type: "join",
                                  worldId: selected.id,
                                  playerName: name,
                                  password: joinPassword,
                                });
                              }}
                            >
                              <TextField
                                label={`Password for ${selected.name}`}
                                type="password"
                                autoComplete="current-password"
                                value={joinPassword}
                                onChange={(e) => setJoinPassword(e.target.value)}
                                slotProps={{ htmlInput: { maxLength: 64 } }}
                              />
                              <Button
                                type="submit"
                                variant="contained"
                                disabled={unavailable || !name.trim()}
                              >
                                {pending ? "Joining…" : "Join world"}
                              </Button>
                            </Stack>
                          )}
                        </Stack>
                      ),
                    },
                    {
                      id: "create",
                      title: "Create a world",
                      content: (
                        <Stack
                          component="form"
                          spacing={2}
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (name.trim())
                              act({ type: "create", name: worldName, playerName: name, password });
                          }}
                        >
                          <TextField
                            label="World name"
                            required
                            value={worldName}
                            onChange={(e) => setWorldName(e.target.value)}
                            slotProps={{ htmlInput: { maxLength: 24 } }}
                          />
                          <TextField
                            label="Password (optional)"
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            slotProps={{ htmlInput: { maxLength: 64 } }}
                          />
                          <Button
                            type="submit"
                            variant="contained"
                            disabled={unavailable || !name.trim() || !worldName.trim()}
                          >
                            {pending ? "Opening world…" : "Light the ember"}
                          </Button>
                        </Stack>
                      ),
                    },
                  ]}
                />
              </Stack>
            </GameWindow>
          </Box>
        ) : null}
        {scene?.phase === "countdown" && (
          <div
            className="departure-countdown"
            role="status"
            aria-label={`Departing in ${departure}`}
          >
            <span key={`${scene.id}:${scene.countdownAt}:${departure}`}>{departure}</span>
          </div>
        )}
        {boss && (
          <Box className="boss-hud">
            <BossHealth
              name={boss.name ?? "The Hollow Warden"}
              health={boss.hitpoints}
              maxHealth={enemyMaxHealth(boss)}
            />
          </Box>
        )}
        {me?.scene === "forest" && !boss && (
          <Box className="scene-clock">
            <SceneStatus
              label={
                scene?.phase === "ended"
                  ? "Scene complete · Return portal open"
                  : scene?.bossId !== undefined
                    ? "Defeat the boss"
                    : "Forest"
              }
              seconds={
                scene?.phase === "ended" || scene?.bossId !== undefined ? undefined : remaining
              }
            />
          </Box>
        )}
        {me?.scene === "forest" &&
          (displayedHp[playerId] ?? me.hitpoints) <= 0 &&
          (deathWindow ? (
            <Box className="death-panel">
              <GameWindow
                title="You have fallen"
                modal={false}
                onClose={() => setDeathWindow(false)}
              >
                <Stack spacing={2}>
                  <Typography>Your party can continue fighting.</Typography>
                  <Button
                    variant="contained"
                    disabled={unavailable}
                    onClick={() => send({ type: "returnLobby" })}
                  >
                    Return to lobby
                  </Button>
                </Stack>
              </GameWindow>
            </Box>
          ) : (
            <Button className="interact" onClick={() => setDeathWindow(true)}>
              You have fallen · Return options
            </Button>
          ))}
        {error && !menu && (
          <Box className="notice">
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          </Box>
        )}
      </section>
      {menu && (
        <GameWindow
          key={menu}
          height={menu === "settings" ? 420 : undefined}
          width={menu === "wardrobe" || menu === "equipment" ? 600 : undefined}
          title={
            menu === "codex"
              ? "Codex"
              : menu === "equipment"
                ? "Equipment"
                : menu === "settings"
                  ? "Settings"
                  : menu === "portal"
                    ? "Forest portal"
                    : menu === "wardrobe"
                      ? "Wardrobe"
                      : menu === "exit"
                        ? "Leave?"
                        : building
          }
          onClose={() => setMenu(null)}
        >
          <Stack spacing={2}>
            {error && (
              <Alert severity="error" onClose={() => setError("")}>
                {error}
              </Alert>
            )}
            {menu === "codex" ? (
              <Codex />
            ) : menu === "equipment" && me ? (
              <Equipment player={me} />
            ) : menu === "settings" ? (
              <Settings
                account={account}
                onRename={() => {
                  setMenu(null);
                  rename();
                }}
                onLogout={() => {
                  void logout();
                }}
                tab={settingsTab}
                onTab={setSettingsTab}
                preferences={preferences}
                setPreferences={setPreferences}
                graphics={graphics}
                setGraphics={setGraphics}
              />
            ) : menu === "exit" ? (
              <>
                <Typography>
                  {me?.scene === "forest"
                    ? "Are you sure you want to leave the current game? Your party will continue."
                    : "Are you sure you want to leave the lobby?"}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={() => setMenu(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    disabled={unavailable}
                    onClick={() => {
                      if (me?.scene === "forest") send({ type: "leaveScene" });
                      else act({ type: "leave" });
                      setMenu(null);
                    }}
                  >
                    Leave
                  </Button>
                </Stack>
              </>
            ) : menu === "wardrobe" ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: { xs: 0.5, sm: 1 },
                }}
              >
                {CLASS_IDS.map((id) => {
                  const selected = (me?.classId ?? "warrior") === id;
                  const stats = selected ? me : me?.classes?.[id];
                  const details = classDetails[id];
                  return (
                    <ClassCard
                      key={id}
                      title={CLASS_LABELS[id]}
                      selected={selected}
                      disabled={unavailable || selected || scene?.phase === "countdown"}
                      onSelect={() => send({ type: "selectClass", classId: id })}
                      portrait={<img src={classSprite(id)} alt={`${CLASS_LABELS[id]} portrait`} />}
                      weapon={{
                        name: details.weapon,
                        description: details.weaponDescription,
                        icon: <img src={weaponSrc(id)} alt="" />,
                      }}
                      spell={{
                        name: details.spell,
                        description: details.spellDescription,
                        icon: <img src={statusSrc(classAbility[id])} alt="" />,
                      }}
                      stats={{
                        level: stats?.level ?? 1,
                        experience: stats?.experience ?? 0,
                        maxHitpoints: stats?.maxHitpoints ?? 100,
                        maxManapoints: stats?.maxManapoints ?? 50,
                      }}
                    />
                  );
                })}
              </Box>
            ) : menu === "building" ? (
              <Typography>{building} services are coming in a future update.</Typography>
            ) : (
              <>
                {world && scene && ["voting", "countdown"].includes(scene.phase) ? (
                  <>
                    <Typography>Scene created. Vote here when you are ready.</Typography>
                    <PortalVote
                      scene={scene.type}
                      difficulty={scene.difficulty}
                      ready={scene.ready.length}
                      total={world.players.length}
                      voted={scene.ready.includes(playerId)}
                      countdown={scene.phase === "countdown" ? departure : undefined}
                      disabled={unavailable}
                      onVote={() => {
                        const ready = !scene.ready.includes(playerId);
                        send({ type: "ready", ready });
                        if (ready) setMenu(null);
                      }}
                    />
                  </>
                ) : scene?.phase === "active" && !me?.scene && !scene.portals.length ? (
                  <>
                    <Typography>
                      Your party has a scene in progress. Join before the boss is defeated.
                    </Typography>
                    <Button
                      variant="contained"
                      disabled={unavailable}
                      onClick={() => send({ type: "joinScene" })}
                    >
                      Join scene
                    </Button>
                    {canRegenerate && (
                      <>
                        <Typography>
                          No living players remain inside. The scene is paused.
                        </Typography>
                        <Button
                          disabled={unavailable}
                          onClick={() =>
                            send({ type: "createScene", scene: "Forest", difficulty: "Easy" })
                          }
                        >
                          Regenerate scene
                        </Button>
                      </>
                    )}
                  </>
                ) : scene && !canRegenerate ? (
                  <Typography>
                    {["active", "ended"].includes(scene.phase)
                      ? scene.phase === "ended"
                        ? "Scene complete. Everyone must return before creating a new one."
                        : "You are already in this scene."
                      : "Scene created. Vote here when you are ready."}
                  </Typography>
                ) : (
                  <Stack
                    component="form"
                    spacing={2}
                    onSubmit={(e) => {
                      e.preventDefault();
                      send({ type: "createScene", scene: "Forest", difficulty: "Easy" });
                    }}
                  >
                    <TextField select label="Scene type" defaultValue="Forest">
                      <MenuItem value="Forest">Forest</MenuItem>
                    </TextField>
                    <TextField select label="Difficulty" defaultValue="Easy">
                      <MenuItem value="Easy">Easy</MenuItem>
                    </TextField>
                    <Stack direction="row" spacing={1}>
                      <Button type="submit" variant="contained" disabled={unavailable}>
                        {canRegenerate ? "Regenerate scene" : "Create"}
                      </Button>
                      <Button onClick={() => setMenu(null)}>Cancel</Button>
                    </Stack>
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </GameWindow>
      )}
    </main>
  );
}
window.addEventListener("contextmenu", (event) => event.preventDefault(), { capture: true });

createRoot(document.getElementById("root")!).render(
  <GameUiProvider>
    <PanelPositionContext value={panelPositions}>
      {new URLSearchParams(location.search).has("class-movement") ? (
        <ClassMovementGallery />
      ) : new URLSearchParams(location.search).has("art-gallery") ? (
        <AssetGallery />
      ) : (
        <AccountGate>{(props) => <App {...props} />}</AccountGate>
      )}
    </PanelPositionContext>
  </GameUiProvider>,
);
