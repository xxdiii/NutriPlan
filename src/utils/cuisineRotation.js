/**
 * Cuisine Rotation Fairness Utility
 *
 * Tracks how recently each cuisine has been used across the week's meal plan.
 * Provides a penalty score that is fed into the recipe scoring algorithm to
 * discourage the same cuisine from appearing more than twice consecutively.
 *
 * Design decisions:
 *  - Penalty decays linearly over time so that a cuisine used 3 days ago has
 *    a smaller penalty than one used yesterday.
 *  - The penalty is normalised to [0, 1] so it can be blended into the
 *    existing protein + calorie score without overwhelming them.
 *  - "Same-day cuisine" (used in another slot on the same day) gets a moderate
 *    penalty to promote within-day variety (e.g. not having Indian at breakfast
 *    AND lunch AND dinner on the same day).
 */

/** Maximum number of recent cuisine appearances to remember per slot. */
const MAX_HISTORY = 7;

/**
 * Creates and returns a fresh cuisine usage state object.
 * Call this once before the weekly generation loop and pass it through.
 *
 * @returns {{ history: string[], dayCuisines: string[] }}
 *   history      – flat ordered list of cuisines used (oldest first)
 *   dayCuisines  – cuisines already committed for the current day being planned
 */
export const createCuisineState = () => ({
  history: [],          // across the whole week
  dayCuisines: [],      // reset each day
});

/**
 * Resets the within-day cuisine tracking. Call this at the start of each day.
 *
 * @param {{ dayCuisines: string[] }} cuisineState
 */
export const resetDayCuisines = (cuisineState) => {
  cuisineState.dayCuisines = [];
};

/**
 * Records that a cuisine was used in a meal slot.
 * Updates both the weekly history and the within-day tracker.
 *
 * @param {{ history: string[], dayCuisines: string[] }} cuisineState
 * @param {string} cuisine - The cuisine value from the recipe object.
 */
export const recordCuisineUsed = (cuisineState, cuisine) => {
  if (!cuisine) return;

  // Weekly history (bounded)
  cuisineState.history.push(cuisine);
  if (cuisineState.history.length > MAX_HISTORY) {
    cuisineState.history.shift();
  }

  // Within-day (only unique)
  if (!cuisineState.dayCuisines.includes(cuisine)) {
    cuisineState.dayCuisines.push(cuisine);
  }
};

/**
 * Calculates a cuisine penalty for a given recipe.
 * Returns a value in [0, 1]:
 *   0   = cuisine not seen recently, great choice
 *   ~0.5 = used once in the past few days, mild discourage
 *   1   = used very recently AND also today, strong discourage
 *
 * @param {{ history: string[], dayCuisines: string[] }} cuisineState
 * @param {string} cuisine - The cuisine of the candidate recipe.
 * @returns {number} penalty in [0, 1]
 */
export const getCuisinePenalty = (cuisineState, cuisine) => {
  if (!cuisine) return 0;

  const history = cuisineState.history;
  let penalty = 0;

  // ── Weekly recency penalty ─────────────────────────────────────────
  // Scan history from newest to oldest. Each match adds a decaying penalty.
  //   Most recent match → strongest penalty (weight = 1.0)
  //   Oldest match      → weakest penalty (weight ≈ 1/MAX_HISTORY)
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] === cuisine) {
      const recency = (i + 1) / history.length; // 1 = newest, small = oldest
      penalty += recency * 0.35;                 // weight each hit
    }
  }

  // ── Same-day penalty ───────────────────────────────────────────────
  // If this cuisine already appears in another slot today, add a flat penalty.
  if (cuisineState.dayCuisines.includes(cuisine)) {
    penalty += 0.4;
  }

  // Clamp to [0, 1]
  return Math.min(penalty, 1);
};
