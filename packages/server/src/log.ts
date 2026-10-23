type LogDetails = Record<string, string | number | boolean | undefined>;

/** Major operational events only; callers supply IDs, never credentials or payloads. */
export const serverLog = {
  info(message: string, details: LogDetails = {}) {
    console.info(`${new Date().toISOString()} INFO ${message} ${JSON.stringify(details)}`);
  },
  error(message: string, error: unknown) {
    console.error(`${new Date().toISOString()} ERROR ${message}`, error);
  },
};
