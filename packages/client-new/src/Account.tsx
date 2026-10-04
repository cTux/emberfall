import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { GameWindow } from "@emberfall/ui";
import { nicknameSchema, type AccountView } from "@emberfall/common-new";

function NicknameDialog({
  account,
  onSaved,
  onClose,
}: {
  account: AccountView;
  onSaved(account: AccountView): void;
  onClose(): void;
}) {
  const [value, setValue] = useState(account.nickname ?? account.steamName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const valid = nicknameSchema.safeParse(value).success;
  return (
    <GameWindow
      title={account.nickname === null ? "Choose your nickname" : "Change nickname"}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <Stack
        component="form"
        spacing={2}
        onSubmit={async (event) => {
          event.preventDefault();
          if (!valid || pending) return;
          setPending(true);
          setError("");
          try {
            const response = await fetch("/api/account/nickname", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nickname: value }),
              signal: AbortSignal.timeout(10_000),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error ?? "Could not save nickname.");
            onSaved(result);
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Could not save nickname. Try again.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <TextField
          label="Nickname"
          autoComplete="nickname"
          autoFocus
          required
          value={value}
          disabled={pending}
          onChange={(event) => setValue(event.target.value)}
          error={!valid && value.length > 0}
          helperText="1–24 characters. This is your name in Emberfall."
        />
        {!account.steamName && account.nickname === null && (
          <Alert severity="info">Steam's nickname is unavailable. Enter your nickname here.</Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained" disabled={!valid || pending}>
            {pending ? "Saving…" : "Save nickname"}
          </Button>
          <Button disabled={pending} onClick={onClose}>
            {account.nickname === null ? "Sign out" : "Cancel"}
          </Button>
        </Stack>
      </Stack>
    </GameWindow>
  );
}

export function AccountGate({
  children,
}: {
  children(props: {
    account: AccountView;
    rename(): void;
    logout(): Promise<void>;
    refresh(): Promise<void>;
  }): ReactNode;
}) {
  const [account, setAccount] = useState<AccountView>();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(
    new URLSearchParams(location.search).has("login")
      ? "Steam login was cancelled or could not be verified. Please try again."
      : "",
  );
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/account", {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("Account service unavailable. Please retry.");
      setAccount(await response.json());
    } catch {
      setError("Account service unavailable. Please retry.");
    }
  }, []);
  useEffect(() => {
    const request = fetch("/api/account", {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    void request
      .then(async (response) => {
        if (!response.ok) throw new Error("Account service unavailable");
        setAccount(await response.json());
      })
      .catch(() => setError("Account service unavailable. Please retry."));
    if (new URLSearchParams(location.search).has("login"))
      history.replaceState(null, "", location.pathname);
  }, []);
  const logout = async () => {
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok && response.status !== 401) throw new Error();
      setEditing(false);
      setAccount({ mode: "steam", authenticated: false, nickname: null, steamName: "" });
      try {
        sessionStorage.removeItem("emberfall-new.world");
      } catch {
        /* Optional recovery hint. */
      }
    } catch {
      setError("Could not sign out. Please retry.");
    }
  };
  if (!account || (account.mode === "steam" && !account.authenticated))
    return (
      <main className="lobby">
        <GameWindow title="Emberfall" modal={false} onClose={() => {}}>
          <Stack spacing={2}>
            <Typography>Sign in through Steam to play Emberfall.</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            {account ? (
              <Button variant="contained" href="/auth/steam">
                Sign in through Steam
              </Button>
            ) : (
              <Typography>Loading account…</Typography>
            )}
            {error && (
              <Button
                onClick={() => {
                  setError("");
                  void refresh();
                }}
              >
                Retry
              </Button>
            )}
          </Stack>
        </GameWindow>
      </main>
    );
  return (
    <>
      {(account.mode === "legacy" || account.nickname !== null) &&
        children({ account, rename: () => setEditing(true), logout, refresh })}
      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {account.mode === "steam" && (account.nickname === null || editing) && (
        <NicknameDialog
          account={account}
          onClose={() => {
            if (account.nickname === null) void logout();
            else setEditing(false);
          }}
          onSaved={(updated) => {
            setAccount(updated);
            setEditing(false);
            setError("");
          }}
        />
      )}
    </>
  );
}
