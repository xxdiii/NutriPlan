const normalizeText = (s) => (s || '').toString().toLowerCase();

/**
 * Very lightweight medication-food interaction warnings based on keywords in userProfile.medications.
 * This is intentionally conservative: warnings only, not hard blocks.
 */
export const getMedicationFoodWarnings = (recipe, userProfile) => {
  const medsText = normalizeText(userProfile?.medications);
  if (!medsText) return [];

  const ingredients = (recipe?.ingredients || []).map(normalizeText);
  const has = (kw) => ingredients.some((i) => i.includes(kw));

  const warnings = [];

  // Statins + grapefruit (common, easy demo)
  if (/(statin|atorvastatin|simvastatin|rosuvastatin)/.test(medsText) && has('grapefruit')) {
    warnings.push({
      type: 'medication',
      severity: 'warn',
      code: 'med:statin:grapefruit',
      message: 'Grapefruit may interact with some statins. Confirm with your clinician/pharmacist.',
    });
  }

  // Warfarin + high vitamin K foods (spinach/kale)
  if (/(warfarin|coumadin)/.test(medsText) && (has('spinach') || has('kale'))) {
    warnings.push({
      type: 'medication',
      severity: 'warn',
      code: 'med:warfarin:vitk',
      message: 'Vitamin K rich foods can affect warfarin dosing. Keep intake consistent and consult your clinician.',
    });
  }

  // Levothyroxine timing + soy / high fiber (warning only)
  if (/(levothyroxine|thyroxine|eltroxin|synthroid)/.test(medsText) && (has('soy') || has('tofu'))) {
    warnings.push({
      type: 'medication',
      severity: 'warn',
      code: 'med:levothyroxine:soy',
      message: 'Soy may affect levothyroxine absorption. Consider timing separation and consult your clinician.',
    });
  }

  return warnings;
};

