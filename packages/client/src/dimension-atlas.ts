// Each large source sheet uses three equal columns; scenery has intact/depleted rows.
export const DIMENSION_ATLAS = {
  columns: 3,
  sceneryRows: 2,
  enemyRows: 5,
  actorCell: 64,
  backing: 2,
  // Normalized source frames place feet at pixel 464 of each 512px cell.
  footAnchor: 464 / 512,
} as const;
