import { clientAsset } from './urls';
import { Box } from '@mui/material';
export function TalentIcon({ index, classId }: { index: number; classId: string }) {
  return (
    <Box
      component='span'
      aria-hidden='true'
      sx={{
        display: 'block',
        width: '100%',
        height: '100%',
        backgroundImage: `url("${clientAsset(`/assets/talents/${classId}-icons.png`)}")`,
        backgroundSize: '500% 600%',
        backgroundPosition: `${(index % 5) * 25}% ${Math.floor(index / 5) * 20}%`,
      }}
    />
  );
}
