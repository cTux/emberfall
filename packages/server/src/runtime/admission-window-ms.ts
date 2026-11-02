// Bound expensive admission work to five attempts per ten-second window per connection.
export const ADMISSION_WINDOW_MS = 10_000;
