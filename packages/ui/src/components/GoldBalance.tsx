import { Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins } from "@fortawesome/free-solid-svg-icons/faCoins";

const coinFormat = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export function GoldBalance({ name, coins }: { name: string; coins: number }) {
  return (
    <Typography
      variant="caption"
      aria-label={`${name}: ${coins} coins`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        whiteSpace: "nowrap",
        color: "primary.main",
      }}
    >
      <FontAwesomeIcon icon={faCoins} aria-hidden="true" />
      {coinFormat.format(coins).toLowerCase()}
    </Typography>
  );
}
