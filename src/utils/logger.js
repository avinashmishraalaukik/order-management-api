// ─── Logger ───────────────────────────────────────────────────────────────────
// Lightweight, leveled console logger.
// Set LOG_LEVEL in .env to control verbosity: error | warn | info | debug

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const ACTIVE_LEVEL =
  LOG_LEVELS[process.env.LOG_LEVEL] ??
  (process.env.NODE_ENV === 'production' ? LOG_LEVELS.warn : LOG_LEVELS.debug);

const COLORS = {
  reset:  '\x1b[0m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};

/**
 * Write a leveled log line to stdout / stderr.
 * @param {'error'|'warn'|'info'|'debug'} level
 * @param {string} color  - ANSI escape code
 * @param {...unknown} args - Values to log
 */
const write = (level, color, ...args) => {
  if (LOG_LEVELS[level] > ACTIVE_LEVEL) return;

  const timestamp = new Date().toISOString();
  const prefix    = `${color}[${timestamp}] [${level.toUpperCase()}]${COLORS.reset}`;
  const output    = level === 'error' ? console.error : console.log;

  output(prefix, ...args);
};

export const logger = {
  error: (...args) => write('error', COLORS.red,    ...args),
  warn:  (...args) => write('warn',  COLORS.yellow, ...args),
  info:  (...args) => write('info',  COLORS.cyan,   ...args),
  debug: (...args) => write('debug', COLORS.gray,   ...args),
};
