import { classSprite } from "./characters";
import { weaponSrc, statusSrc, classAbility } from "./combat-assets";
import { Codex } from "./Codex";
import { ENEMY_HP, CLASS_IDS, CLASS_LABELS, hasLivingScenePlayers } from "@emberfall/common";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ClientMessage, ServerMessage, WorldState, WorldSummary } from "@emberfall/common";
import type { Interaction } from "./effects";
import { GameWindow } from "./Window";
import { loadPreferences } from "./preferences";
import { Arena } from "./Arena";
import { GRAPHICS_PRESETS, GRAPHICS_LABELS, loadGraphics } from "./graphics";
import "./style.scss";

function App() {
  const socket = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState("Connecting");
  const [latency, setLatency] = useState<number | null>(null);
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const interaction = useRef<Interaction | null>(null);
  const [displayedHp, setDisplayedHp] = useState<Record<string, number>>({});
  const [world, setWorld] = useState<WorldState | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem("emberfall.nickname")?.slice(0, 24) || "Wanderer";
    } catch {
      return "Wanderer";
    }
  });
  const [menu, setMenu] = useState<
    "codex" | "settings" | "portal" | "building" | "wardrobe" | "exit" | null
  >(null);
  const [building, setBuilding] = useState("");
  const [settingsTab, setSettingsTab] = useState<"gameplay" | "graphics" | "sound">("gameplay");
  const [browserOpen, setBrowserOpen] = useState(true);
  const [deathWindow, setDeathWindow] = useState(true);
  const [preferences, setPreferences] = useState(loadPreferences);
  useEffect(() => {
    try {
      localStorage.setItem("emberfall.preferences", JSON.stringify(preferences));
    } catch {
      /* Session preferences still apply. */
    }
  }, [preferences]);
  const [graphics, setGraphics] = useState(loadGraphics);
  const characterToken = useRef<string | undefined>(undefined);
  useEffect(() => {
    try {
      characterToken.current = localStorage.getItem("emberfall.character") ?? undefined;
    } catch {
      /* Keep the key in memory for this session. */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("emberfall.graphics", JSON.stringify(graphics));
    } catch {
      /* Settings still apply to this session. */
    }
  }, [graphics]);
  useEffect(() => {
    try {
      localStorage.setItem("emberfall.nickname", name);
    } catch {
      /* Storage may be disabled. */
    }
  }, [name]);
  const [worldName, setWorldName] = useState("The quiet grove");
  const [password, setPassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [selected, setSelected] = useState<WorldSummary | null>(null);
  const [tab, setTab] = useState<"browse" | "create">("browse");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(0);
  const previousWorld = useRef<string | null>(null);
  const failedConnections = useRef(0);
  useEffect(() => {
    const url =
      import.meta.env.VITE_SERVER_URL ||
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
    setStatus(previousWorld.current ? "Reconnecting" : "Connecting");
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let resuming = false;
    const ws = new WebSocket(url);
    socket.current = ws;
    let joinedId = "";
    let previousScene: string | undefined;
    let voteScene: string | undefined;
    let probeId = 0;
    let pendingProbe: { id: number; at: number } | null = null;
    const ping = () => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const now = performance.now();
      if (pendingProbe && now - pendingProbe.at < 5000) return;
      if (pendingProbe) setLatency(null);
      pendingProbe = { id: ++probeId, at: now };
      ws.send(JSON.stringify({ type: "ping", id: probeId }));
    };
    const pingTimer = setInterval(ping, 2000);
    ws.onopen = () => {
      failedConnections.current = 0;
      setError("");
      resuming = !!previousWorld.current && !!characterToken.current;
      if (resuming) {
        setPending(true);
        ws.send(
          JSON.stringify({
            type: "resume",
            worldId: previousWorld.current,
            characterToken: characterToken.current,
          }),
        );
      } else setStatus("Connected");
      ping();
    };
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      if (message.type === "pong" && pendingProbe?.id === message.id) {
        setLatency(Math.max(0, Math.round(performance.now() - pendingProbe.at)));
        pendingProbe = null;
      }
      if (message.type === "worlds") setWorlds(message.worlds);
      if (message.type === "joined") {
        previousWorld.current = message.world.id;
        resuming = false;
        setStatus("Connected");
        setMenu(null);
        joinedId = message.playerId;
        previousScene = undefined;
        characterToken.current = message.characterToken;
        try {
          localStorage.setItem("emberfall.character", message.characterToken);
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
        previousWorld.current = null;
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
          previousWorld.current = null;
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
      clearInterval(pingTimer);
      setLatency(null);
      setStatus("Reconnecting");
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
      clearInterval(pingTimer);
      clearTimeout(reconnectTimer);
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      ws.close();
    };
  }, [retry]);
  const send = (message: ClientMessage) => {
    if (status === "Connected" && socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify(message));
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
      if (event.key === "Escape") {
        if (document.querySelector("dialog[open]")) return;
        if (world) {
          event.preventDefault();
          setMenu("exit");
        }
      }
      if (
        event.code === "KeyE" &&
        !document.querySelector("dialog[open]") &&
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
        <nav className="controls" aria-label="Game controls">
          {scene && ["voting", "countdown"].includes(scene.phase) && (
            <button aria-label="Portal vote" title="Portal vote" onClick={() => setMenu("portal")}>
              ◇
            </button>
          )}
          <button aria-label="Codex" title="Codex" onClick={() => setMenu("codex")}>
            ?
          </button>
          <button aria-label="Settings" title="Settings" onClick={() => setMenu("settings")}>
            ⚙
          </button>
          {world && (
            <button
              aria-label="Leave world"
              title="Exit world"
              disabled={unavailable}
              onClick={() => setMenu("exit")}
            >
              ↪
            </button>
          )}
          {!world && !browserOpen && (
            <button aria-label="World browser" onClick={() => setBrowserOpen(true)}>
              ⌂
            </button>
          )}
        </nav>
        <span
          role="status"
          aria-label={
            status === "Connected" ? "World server online" : `World server ${status.toLowerCase()}`
          }
          title={status === "Connected" ? "World server online" : status}
          className={`connection ${status.toLowerCase()}`}
        />
        {world ? (
          <aside
            className="party"
            aria-label={`${world.name}: ${world.players.length}/8 adventurers`}
          >
            <ul>
              {world.players.map((p) => (
                <li
                  className={`party-member${p.scene !== me?.scene ? " other-dimension" : ""}`}
                  title={p.scene !== me?.scene ? "In another dimension" : undefined}
                  key={p.id}
                >
                  <span
                    className="portrait"
                    style={{ backgroundImage: `url(${classSprite(p.classId)})` }}
                    aria-hidden="true"
                  />
                  <div className="member-info">
                    <div className="member-name">
                      <strong>
                        {p.name}
                        {p.id === playerId ? " (you)" : ""}
                      </strong>
                      <span>Lv. {p.level}</span>
                      {p.id === world.hostId && (
                        <span className="host" title="Host" aria-label="Host">
                          ♔
                        </span>
                      )}
                    </div>
                    <div
                      className="stat hp"
                      role="progressbar"
                      aria-label={`${p.name} hitpoints`}
                      aria-valuenow={displayedHp[p.id] ?? p.hitpoints}
                      aria-valuemin={0}
                      aria-valuemax={p.maxHitpoints}
                    >
                      <span
                        style={{
                          width: `${(100 * (displayedHp[p.id] ?? p.hitpoints)) / p.maxHitpoints}%`,
                        }}
                      />
                      <small>
                        HP {displayedHp[p.id] ?? p.hitpoints}/{p.maxHitpoints}
                      </small>
                    </div>
                    <div
                      className="stat mp"
                      role="progressbar"
                      aria-label={`${p.name} manapoints`}
                      aria-valuenow={p.manapoints}
                      aria-valuemin={0}
                      aria-valuemax={p.maxManapoints}
                    >
                      <span style={{ width: `${(100 * p.manapoints) / p.maxManapoints}%` }} />
                      <small>
                        MP {p.manapoints}/{p.maxManapoints}
                      </small>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        ) : browserOpen ? (
          <GameWindow title="Emberfall" modal={false} onClose={() => setBrowserOpen(false)}>
            <label className="identity">
              Your adventurer name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                required
                placeholder="Your name"
                autoComplete="nickname"
              />
            </label>
            <div className="tabs" role="tablist" aria-label="World actions">
              <button
                role="tab"
                aria-selected={tab === "browse"}
                onClick={() => {
                  setTab("browse");
                  setError("");
                }}
              >
                Join a world <span>{worlds.length}</span>
              </button>
              <button
                role="tab"
                aria-selected={tab === "create"}
                onClick={() => {
                  setTab("create");
                  setError("");
                }}
              >
                Create a world
              </button>
            </div>
            {tab === "create" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim())
                    act({ type: "create", name: worldName, playerName: name, password });
                }}
              >
                <label>
                  World name
                  <input
                    required
                    maxLength={24}
                    value={worldName}
                    onChange={(e) => setWorldName(e.target.value)}
                  />
                </label>
                <label>
                  Password <small>optional</small>
                  <input
                    type="password"
                    maxLength={64}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave empty for an open world"
                    autoComplete="new-password"
                  />
                </label>
                <button
                  className="primary"
                  disabled={unavailable || !name.trim() || !worldName.trim()}
                >
                  {pending ? "Opening world…" : "Light the ember"} <span>↗</span>
                </button>
              </form>
            ) : (
              <div className="world-browser">
                {!worlds.length ? (
                  <div className="empty">
                    <span>◇</span>
                    <strong>The grove is quiet.</strong>
                    <small>No open worlds yet. Be the first to light an ember.</small>
                    <button className="text-button" onClick={() => setTab("create")}>
                      Create the first world →
                    </button>
                  </div>
                ) : (
                  <div className="world-list">
                    {worlds.map((w) => (
                      <button
                        key={w.id}
                        className={`world-row ${selected?.id === w.id ? "selected" : ""}`}
                        disabled={unavailable || w.players >= w.capacity || !name.trim()}
                        onClick={() => {
                          if (w.locked) {
                            setSelected(w);
                            setJoinPassword("");
                            setError("");
                          } else
                            act({ type: "join", worldId: w.id, playerName: name, password: "" });
                        }}
                      >
                        <span className="world-icon">{w.locked ? "▣" : "◇"}</span>
                        <span>
                          <strong>{w.name}</strong>
                          <small>{w.locked ? "Password protected" : "Open to everyone"}</small>
                        </span>
                        <span className="count">
                          {w.players}/{w.capacity} ↗
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {selected && (
                  <form
                    className="join-form"
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
                    <label>
                      Password for {selected.name}
                      <input
                        type="password"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                        maxLength={64}
                        autoComplete="current-password"
                      />
                    </label>
                    <button className="primary" disabled={unavailable || !name.trim()}>
                      {pending ? "Joining…" : "Join world"} →
                    </button>
                  </form>
                )}
              </div>
            )}
            <div className="lobby-note">◷ Worlds fade when the last adventurer leaves.</div>
          </GameWindow>
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
          <aside className="boss-hud" aria-label="Boss health">
            <strong>{boss.name ?? "The Hollow Warden"}</strong>
            <div
              className="boss-health"
              role="progressbar"
              aria-label={`${boss.name ?? "The Hollow Warden"} hitpoints`}
              aria-valuemin={0}
              aria-valuemax={ENEMY_HP.boss}
              aria-valuenow={boss.hitpoints}
            >
              <span
                style={{
                  width: `${Math.min(100, Math.max(0, (boss.hitpoints / ENEMY_HP.boss) * 100))}%`,
                }}
              />
              <small>
                {boss.hitpoints} / {ENEMY_HP.boss} HP
              </small>
            </div>
          </aside>
        )}
        {me?.scene === "forest" && !boss && (
          <div className="scene-clock" role="status">
            {scene?.phase === "ended"
              ? "Scene complete · Return portal open"
              : scene?.bossId !== undefined
                ? "Defeat the boss"
                : `Forest · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
          </div>
        )}
        {me?.scene === "forest" &&
          (displayedHp[playerId] ?? me.hitpoints) <= 0 &&
          (deathWindow ? (
            <GameWindow
              title="You have fallen"
              modal={false}
              className="death-panel"
              onClose={() => setDeathWindow(false)}
            >
              <p>Your party can continue fighting.</p>
              <button className="primary" onClick={() => send({ type: "returnLobby" })}>
                Return to lobby
              </button>
            </GameWindow>
          ) : (
            <button className="interact" onClick={() => setDeathWindow(true)}>
              You have fallen · Return options
            </button>
          ))}
        {error && (
          <div className="notice" role="alert">
            {error}
            <button className="dismiss" aria-label="Dismiss message" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
      </section>
      {menu && (
        <GameWindow
          key={menu}
          className={menu === "codex" ? "codex-window" : ""}
          title={
            menu === "codex"
              ? "Codex"
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
          {menu === "codex" ? (
            <Codex />
          ) : menu === "settings" ? (
            <>
              <div className="tabs" role="tablist" aria-label="Settings areas">
                {(["gameplay", "graphics", "sound"] as const).map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={settingsTab === tab}
                    onClick={() => setSettingsTab(tab)}
                  >
                    {tab[0].toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              {settingsTab === "gameplay" && (
                <>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={preferences.bloodPuddles}
                      onChange={(e) =>
                        setPreferences((p) => ({ ...p, bloodPuddles: e.target.checked }))
                      }
                    />
                    Blood puddles
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={preferences.damageNumbers}
                      onChange={(e) =>
                        setPreferences((p) => ({ ...p, damageNumbers: e.target.checked }))
                      }
                    />
                    Floating damage numbers
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={preferences.fps}
                      onChange={(e) => setPreferences((p) => ({ ...p, fps: e.target.checked }))}
                    />
                    FPS graph
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={preferences.latency}
                      onChange={(e) => setPreferences((p) => ({ ...p, latency: e.target.checked }))}
                    />
                    Latency graph
                  </label>
                </>
              )}
              {settingsTab === "sound" && (
                <>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={preferences.sound}
                      onChange={(e) => setPreferences((p) => ({ ...p, sound: e.target.checked }))}
                    />
                    Sound effects
                  </label>
                  <label>
                    Effects volume
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={preferences.volume}
                      onChange={(e) =>
                        setPreferences((p) => ({ ...p, volume: Number(e.target.value) }))
                      }
                    />
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={preferences.music}
                      onChange={(e) => setPreferences((p) => ({ ...p, music: e.target.checked }))}
                    />
                    Music
                  </label>
                  <label>
                    Music volume
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={preferences.musicVolume}
                      onChange={(e) =>
                        setPreferences((p) => ({ ...p, musicVolume: Number(e.target.value) }))
                      }
                    />
                  </label>
                  <p>
                    Music: TimberwolfGames · Sound effects: Ninja Adventure.{" "}
                    <a href="/audio/CREDITS.txt" target="_blank" rel="noreferrer">
                      Audio credits
                    </a>
                  </p>
                </>
              )}
              {settingsTab === "graphics" && (
                <div className="graphics-settings">
                  <div className="presets">
                    {Object.entries(GRAPHICS_PRESETS).map(([preset, values]) => (
                      <button
                        key={preset}
                        type="button"
                        aria-pressed={JSON.stringify(graphics) === JSON.stringify(values)}
                        onClick={() => setGraphics({ ...values })}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  {Object.entries(GRAPHICS_LABELS).map(([key, label]) => (
                    <label className="checkbox" key={key}>
                      <input
                        type="checkbox"
                        checked={graphics[key as keyof typeof GRAPHICS_LABELS]}
                        onChange={(e) =>
                          setGraphics((previous) => ({ ...previous, [key]: e.target.checked }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                  <label>
                    Frame rate limit
                    <select
                      value={graphics.frameLimit}
                      onChange={(e) =>
                        setGraphics((p) => ({ ...p, frameLimit: Number(e.target.value) }))
                      }
                    >
                      <option value={0}>Display refresh rate</option>
                      {[30, 60, 120, 144].map((fps) => (
                        <option key={fps} value={fps}>
                          {fps} FPS
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Render resolution
                    <select
                      value={graphics.resolution}
                      onChange={(e) =>
                        setGraphics((previous) => ({
                          ...previous,
                          resolution: Number(e.target.value),
                        }))
                      }
                    >
                      <option value={0.75}>75% · Performance</option>
                      <option value={1}>100% · Native</option>
                      <option value={1.5}>150% · Supersampling</option>
                    </select>
                  </label>
                </div>
              )}
            </>
          ) : menu === "exit" ? (
            <>
              <p>
                {me?.scene === "forest"
                  ? "Are you sure you want to leave the current game? Your party will continue."
                  : "Are you sure you want to leave the lobby?"}
              </p>
              <div className="presets">
                <button onClick={() => setMenu(null)}>Cancel</button>
                <button
                  onClick={() => {
                    if (me?.scene === "forest") send({ type: "leaveScene" });
                    else act({ type: "leave" });
                    setMenu(null);
                  }}
                >
                  Leave
                </button>
              </div>
            </>
          ) : menu === "wardrobe" ? (
            <>
              <p>Choose your class. Each class keeps its own progress.</p>
              <div className="class-choices">
                {CLASS_IDS.map((id) => {
                  const selected = (me?.classId ?? "warrior") === id;
                  const stats = selected ? me : me?.classes?.[id];
                  return (
                    <button
                      key={id}
                      className="class-choice"
                      aria-pressed={selected}
                      disabled={selected || scene?.phase === "countdown"}
                      onClick={() => send({ type: "selectClass", classId: id })}
                    >
                      <span
                        className="portrait"
                        style={{ backgroundImage: `url(${classSprite(id)})` }}
                        aria-hidden="true"
                      />
                      <img className="combat-icon weapon-icon" src={weaponSrc(id)} alt="" />
                      <span>
                        <strong>
                          {CLASS_LABELS[id]}
                          {selected ? " · Selected" : ""}
                        </strong>
                        <small>
                          Level {stats?.level ?? 1} · XP {stats?.experience ?? 0} · HP{" "}
                          {stats?.maxHitpoints ?? 100} · MP {stats?.maxManapoints ?? 50}
                        </small>
                        <small>
                          <img className="combat-icon" src={statusSrc(classAbility[id])} alt="" />{" "}
                          {id === "warrior"
                            ? "Slashing sword · Bleeding"
                            : id === "ranger"
                              ? "Piercing arrows · Poison"
                              : id === "mage"
                                ? "Twin fireballs · Burning"
                                : "Roots · Bear companion"}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="fine-print">
                Switch here before the departure countdown. Talents are coming later.
              </p>
            </>
          ) : menu === "building" ? (
            <p>{building} services are coming in a future update.</p>
          ) : (
            <>
              {world && scene && ["voting", "countdown"].includes(scene.phase) ? (
                <>
                  <p>Scene created. Vote here when you are ready.</p>
                  <aside className="portal-vote" aria-label="Departure vote">
                    <strong>Forest · Easy</strong>
                    <span>
                      {scene.ready.length}/{world.players.length} ready
                    </span>
                    <button
                      className="primary"
                      onClick={() => {
                        const ready = !scene.ready.includes(playerId);
                        send({ type: "ready", ready });
                        if (ready) setMenu(null);
                      }}
                    >
                      {scene.ready.includes(playerId) ? "Retract ready vote" : "I'm ready"}
                    </button>
                  </aside>
                </>
              ) : scene?.phase === "active" && !me?.scene && !scene.portals.length ? (
                <>
                  <p>Your party has a scene in progress. Join before the boss is defeated.</p>
                  <button className="primary" onClick={() => send({ type: "joinScene" })}>
                    Join scene
                  </button>
                  {canRegenerate && (
                    <>
                      <p>No living players remain inside. The scene is paused.</p>
                      <button
                        onClick={() =>
                          send({ type: "createScene", scene: "Forest", difficulty: "Easy" })
                        }
                      >
                        Regenerate scene
                      </button>
                    </>
                  )}
                </>
              ) : scene && !canRegenerate ? (
                <p>
                  {["active", "ended"].includes(scene.phase)
                    ? scene.phase === "ended"
                      ? "Scene complete. Everyone must return before creating a new one."
                      : "You are already in this scene."
                    : "Scene created. Vote here when you are ready."}
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send({ type: "createScene", scene: "Forest", difficulty: "Easy" });
                  }}
                >
                  <label>
                    Scene type
                    <select defaultValue="Forest">
                      <option>Forest</option>
                    </select>
                  </label>
                  <label>
                    Difficulty
                    <select defaultValue="Easy">
                      <option>Easy</option>
                    </select>
                  </label>
                  <div className="presets">
                    <button type="submit">{canRegenerate ? "Regenerate scene" : "Create"}</button>
                    <button type="button" onClick={() => setMenu(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </GameWindow>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
