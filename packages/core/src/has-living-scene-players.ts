export function hasLivingScenePlayers(players: Iterable<{ scene?: string; hitpoints: number }>) {
  return [...players].some((p) => {
    return p.scene === 'forest' && p.hitpoints > 0;
  });
}
