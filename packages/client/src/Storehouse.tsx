import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { Backpack, ChapterTabs } from '@emberfall/ui';
import {
  STORAGE_SLOTS,
  storageNameSchema,
  type Player,
  type ClientMessage,
} from '@emberfall/common';
import { backpackViews } from './equipment-view';

export function Storehouse({
  player,
  send,
}: {
  player: Player;
  send(message: ClientMessage): void;
}) {
  const [tab, setTab] = useState('0');
  const [renaming, setRenaming] = useState<number | null>(null);
  const [name, setName] = useState('');
  const validName = storageNameSchema.safeParse(name);
  return (
    <>
      <ChapterTabs
        label='Storehouse storages'
        value={tab}
        onChange={setTab}
        showHeading={false}
        chapters={(player.storages ?? []).map((storage, index) => ({
          id: String(index),
          title: storage.name,
          onRename: () => {
            setRenaming(index);
            setName(storage.name);
          },
          content: (
            <>
              <Typography variant='body2' color='text.secondary'>
                Right-click a tab to rename. Right-click an item to transfer its stack.
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                  gap: 1.5,
                }}
              >
                <Backpack
                  label={storage.name}
                  slots={STORAGE_SLOTS}
                  items={backpackViews(storage.items)}
                  action='Withdraw'
                  onUse={(id) => send({ type: 'storeItem', tab: index, id, depositing: false })}
                />
                <Backpack
                  label='Your backpack'
                  items={backpackViews(player.backpack ?? [])}
                  coins={player.coins ?? 0}
                  action='Deposit'
                  onUse={(id) => send({ type: 'storeItem', tab: index, id, depositing: true })}
                />
              </Box>
            </>
          ),
        }))}
      />
      <Dialog
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        aria-labelledby='rename-storage-title'
      >
        <Box
          component='form'
          onSubmit={(event) => {
            event.preventDefault();
            if (renaming === null || !validName.success) return;
            send({ type: 'renameStorage', tab: renaming, name: validName.data });
            setRenaming(null);
          }}
        >
          <DialogTitle id='rename-storage-title'>Rename storage</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              label='Storage name'
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={!validName.success}
              helperText='1–24 characters'
              slotProps={{ htmlInput: { maxLength: 24 } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRenaming(null)}>Cancel</Button>
            <Button type='submit' disabled={!validName.success}>
              Save
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}
