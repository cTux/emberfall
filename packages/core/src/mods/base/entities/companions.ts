import type { CompanionDefinition } from '../../../content/contracts.ts';
// Existing Bear balance: 1.5-times owner health, short melee range and five seconds before resurrection.
// Hunt/return/teleport distances and one-second decisions preserve the calibrated follow behavior.
export const BEAR_DEFINITION = {
  id: 'bear',
  name: 'Bear',
  sprite: '/assets/companion-boar.png',
  healthMultiplier: 1.5,
  damageType: 'physical',
  range: 75,
  huntRadius: 200,
  spacing: 80,
  returnRadius: 20,
  teleportRadius: 500,
  decisionMs: 1000,
  resurrectionMs: 5000,
  attack: 'slash',
} as const satisfies CompanionDefinition;
