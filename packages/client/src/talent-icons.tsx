import { clientAsset } from './urls';
import { Box } from '@mui/material';
export function TalentIcon({ index }: { index: number }) {
  return (
    <Box
      component='span'
      aria-hidden='true'
      sx={{
        display: 'block',
        width: '100%',
        height: '100%',
        backgroundImage: `url("${clientAsset('/assets/talent-icons.png')}")`,
        backgroundSize: '500% 400%',
        backgroundPosition: `${(index % 5) * 25}% ${(Math.floor(index / 5) * 100) / 3}%`,
      }}
    />
  );
}
export function talentIconIndex(classId: string, slot: number) {
  return 4 + Math.max(0, ['warrior', 'ranger', 'mage', 'druid'].indexOf(classId)) * 4 + slot;
}
