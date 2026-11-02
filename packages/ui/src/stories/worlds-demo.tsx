import { useState } from 'react';
import { WorldList } from '../index';

export function WorldsDemo() {
  const [selectedId, select] = useState<string>();

  return (
    <WorldList
      worlds={[
        { id: '1', name: 'Playtest Default', players: 1, capacity: 32 },
        { id: '2', name: 'The northern grove', players: 3, capacity: 8, locked: true },
        { id: '3', name: 'Full world', players: 8, capacity: 8 },
      ]}
      selectedId={selectedId}
      onJoin={(world) => {
        return select(world.id);
      }}
      latency={42}
    />
  );
}
