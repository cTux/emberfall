import { PERCENT } from '@emberfall/common';

import { clientAsset } from './urls';
import { Box } from '@mui/material';

// The supplied talent sheets have five columns in a 1145×1374 native image; percentages use 100 units.
const TALENT_SHEET = { columns: 5, width: 1145, height: 1374 };

// Generated frames are unevenly spaced in the native 1145 × 1374 sheets.
const frames: Record<string, { x: number[]; y: number[] }> = {
  warrior: { x: [0, 233, 460, 687, 914, 1145], y: [0, 225, 455, 683, 903, 1123, 1374] },
  ranger: { x: [0, 246, 468, 691, 913, 1145], y: [0, 224, 446, 669, 894, 1117, 1374] },
  mage: { x: [0, 230, 460, 688, 917, 1145], y: [0, 224, 447, 671, 894, 1118, 1374] },
  druid: { x: [0, 247, 466, 690, 916, 1145], y: [0, 224, 448, 671, 895, 1116, 1374] },
};

export function TalentIcon({ index, classId }: { index: number; classId: string }) {
  const { x, y } = frames[classId];
  const column = index % TALENT_SHEET.columns;
  const row = Math.floor(index / TALENT_SHEET.columns);
  const width = x[column + 1] - x[column];
  const height = y[row + 1] - y[row];

  return (
    <Box
      component='span'
      aria-hidden='true'
      sx={{
        display: 'block',
        width: '100%',
        height: '100%',
        backgroundImage: `url("${clientAsset(`/assets/talents/${classId}-icons.png`)}")`,
        backgroundSize: `${(TALENT_SHEET.width / width) * PERCENT}% ${(TALENT_SHEET.height / height) * PERCENT}%`,
        backgroundPosition: `${(x[column] / (TALENT_SHEET.width - width)) * PERCENT}% ${(y[row] / (TALENT_SHEET.height - height)) * PERCENT}%`,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}
