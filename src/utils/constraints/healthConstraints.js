const normalize = (s) => (s || '').toString().trim().toLowerCase();

const ingredientHasAny = (ingredients, keywords) => {
  const list = (ingredients || []).map(normalize);
  return keywords.some((kw) => list.some((i) => i.includes(kw)));
};

/**
 * Health condition and safety constraints (non-allergy).
 * Returns warnings and blocks. Blocks should be rare and safety-related.
 */
export const getHealthConstraintFindings = (recipe, userProfile) => {
  const conditions = (userProfile?.healthConditions || []).map(normalize);
  const tags = (recipe?.tags || []).map(normalize);
  const ingredients = recipe?.ingredients || [];

  const findings = [];

  // Pregnancy / breastfeeding: warnings for common high-risk items.
  if (userProfile?.isPregnant || userProfile?.isBreastfeeding) {
    // Very conservative keyword checks; dataset likely doesn't include "raw fish" etc.
    const highRisk = [
      { kw: 'sushi', msg: 'Pregnancy/breastfeeding caution: raw fish can be risky. Prefer fully cooked options.' },
      { kw: 'raw egg', msg: 'Pregnancy/breastfeeding caution: avoid raw/undercooked eggs.' },
      { kw: 'unpasteurized', msg: 'Pregnancy/breastfeeding caution: avoid unpasteurized dairy/juices.' },
      { kw: 'tuna', msg: 'Pregnancy/breastfeeding caution: limit high-mercury fish. Confirm safe portions with clinician.' },
    ];
    const textBlob = `${(recipe?.name || '')} ${(ingredients || []).join(' ')} ${(tags || []).join(' ')}`.toLowerCase();
    highRisk.forEach(({ kw, msg }) => {
      if (textBlob.includes(kw)) {
        findings.push({ type: 'pregnancy', severity: 'warn', code: `preg:${kw}`, message: msg });
      }
    });
  }

  // PCOS: nudge toward low-GI / higher fiber; warning if clearly "high sugar".
  if (conditions.includes('pcos')) {
    const highSugarSignals = ['sugar', 'sweetened', 'syrup', 'chocolate', 'cookies', 'cake'];
    if (ingredientHasAny(ingredients, highSugarSignals) || tags.includes('dessert')) {
      findings.push({
        type: 'pcos',
        severity: 'warn',
        code: 'pcos:high_sugar',
        message: 'PCOS consideration: prefer lower added sugar and lower-GI meals when possible.',
      });
    }
  }

  // Diabetes: similar low-GI warning
  if (conditions.includes('diabetes_t1') || conditions.includes('diabetes_t2')) {
    const highCarbSignals = ['sugar', 'white bread', 'maida', 'syrup'];
    if (ingredientHasAny(ingredients, highCarbSignals)) {
      findings.push({
        type: 'diabetes',
        severity: 'warn',
        code: 'dm:refined_carbs',
        message: 'Diabetes consideration: refined carbs/added sugar may spike glucose. Consider swaps or portioning.',
      });
    }
  }

  // Hypertension: sodium warning based on common signals
  if (conditions.includes('hypertension')) {
    const sodiumSignals = ['pickle', 'chips', 'soy sauce', 'processed', 'instant'];
    if (ingredientHasAny(ingredients, sodiumSignals)) {
      findings.push({
        type: 'hypertension',
        severity: 'warn',
        code: 'htn:sodium',
        message: 'Hypertension consideration: watch sodium. Prefer fresh, minimally processed foods.',
      });
    }
  }

  // Thyroid hypo: goitrogen caution (warning only)
  if (conditions.includes('thyroid_hypo')) {
    const goitrogens = ['cabbage', 'cauliflower', 'broccoli', 'kale'];
    if (ingredientHasAny(ingredients, goitrogens)) {
      findings.push({
        type: 'thyroid',
        severity: 'warn',
        code: 'thyroid:goitrogen',
        message: 'Hypothyroidism consideration: cruciferous vegetables are fine cooked for most people; avoid excess raw if sensitive.',
      });
    }
  }

  // Hyperthyroid: caffeine warning (very coarse)
  if (conditions.includes('thyroid_hyper')) {
    const caffeine = ['coffee', 'caffeine', 'energy drink'];
    if (ingredientHasAny(ingredients, caffeine)) {
      findings.push({
        type: 'thyroid',
        severity: 'warn',
        code: 'thyroid:caffeine',
        message: 'Hyperthyroidism consideration: limit excessive caffeine if it worsens symptoms.',
      });
    }
  }

  // Anemia: encourage iron + vitamin C (warning only, since we can’t compute micronutrients from current recipes)
  if (conditions.includes('anemia')) {
    const ironRich = ['spinach', 'lentil', 'chickpea', 'rajma', 'beans', 'red meat'];
    if (!ingredientHasAny(ingredients, ironRich)) {
      findings.push({
        type: 'anemia',
        severity: 'warn',
        code: 'anemia:iron',
        message: 'Anemia consideration: include iron-rich foods + vitamin C sources across the day.',
      });
    }
  }

  return findings;
};

