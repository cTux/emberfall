import { BossHealthStyled } from './styles';

// A minute contains sixty seconds; pad seconds to two digits for the mm:ss timer.
import { Typography } from '@mui/material';
import { StatusMeter } from './StatusMeter';

export function BossHealth({
  name,
  health,
  maxHealth,
}: {
  name: string;
  health: number;
  maxHealth: number;
}) {
  return (
    <BossHealthStyled as='aside' aria-label='Boss health'>
      <Typography variant='h3' component='h3' gutterBottom>
        {name}
      </Typography>
      <StatusMeter label={`${name} HP`} value={health} max={maxHealth} color='boss' centered />
    </BossHealthStyled>
  );
}
