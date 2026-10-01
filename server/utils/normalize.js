/**
 * Shared username normalization utility.
 * ALL files must use this function when dealing with usernames.
 *
 * Strategy:
 *   - Trim leading/trailing whitespace
 *   - Lowercase
 *   - Internal spaces are preserved (e.g. "Team Alpha" → "team alpha")
 *
 * This means "Team Alpha", "TEAM ALPHA", "team alpha", "  Team Alpha  "
 * all resolve to "team alpha" for authentication purposes.
 */
const normalizeUsername = (value) => {
  return String(value || '').trim().toLowerCase();
};

module.exports = { normalizeUsername };
