const normalize = (s) => (s || '').toString().trim().toLowerCase();

/**
 * Returns a list of allergen violations (safety critical).
 * Expects recipe.allergens to be an array of allergen ids (e.g., "dairy", "peanuts").
 * Expects userProfile.allergies to be an array of allergen ids.
 */
export const checkAllergyViolations = (recipe, userProfile) => {
  const userAllergies = (userProfile?.allergies || []).map(normalize).filter(Boolean);
  const recipeAllergens = (recipe?.allergens || []).map(normalize).filter(Boolean);

  if (userAllergies.length === 0 || recipeAllergens.length === 0) return [];

  const hits = recipeAllergens.filter((a) => userAllergies.includes(a));
  if (hits.length === 0) return [];

  return hits.map((allergenId) => ({
    type: 'allergy',
    severity: 'block',
    code: `allergy:${allergenId}`,
    message: `Contains allergen: ${allergenId}`,
  }));
};

