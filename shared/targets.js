// Daily calorie and macro targets. Shared by the server (authoritative, applied when a
// profile is saved) and the browser (live preview in onboarding and the profile page).

const KCAL_PER_KG = 7700;

export const DEFAULT_RATE = { cut: 0.5, bulk: 0.25 };

// Plan Library archetypes and older profiles used other goal names.
const GOAL_ALIASES = { lose: 'cut', gain: 'bulk', cut: 'cut', bulk: 'bulk', maintain: 'maintain' };

export const normaliseGoal = (goal) => GOAL_ALIASES[goal] || 'maintain';

// Protein in g per kg body weight, fat as a share of calories; carbs fill the rest.
export const MACRO_PROFILES = {
    balanced: { label: 'Balanced', protein: { cut: 1.6, maintain: 1.2, bulk: 1.6 }, fatShare: 0.28 },
    high_protein: { label: 'High protein', protein: { cut: 2.0, maintain: 1.8, bulk: 2.0 }, fatShare: 0.25 },
    low_carb: { label: 'Low carb', protein: { cut: 1.8, maintain: 1.6, bulk: 1.8 }, fatShare: 0.40, carbCap: 0.25 },
};

// Lowest daily intake the app will target without medical supervision.
const CALORIE_FLOOR = { male: 1500, female: 1200 };
// Fastest planned weight loss: 1% of body weight per week.
const MAX_WEEKLY_LOSS_SHARE = 0.01;
// Most of the day's calories protein may take.
const PROTEIN_CAP_SHARE = 0.35;
// ICMR-NIN 2020 RDA: extra energy and protein in the 2nd/3rd trimester and while
// breastfeeding (0-6 months).
const PREGNANCY = { kcal: 350, protein: 9.5 };
const BREASTFEEDING = { kcal: 600, protein: 17 };

/** Mifflin-St Jeor */
export const calculateBMR = (weight, height, age, gender) => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);
    if (!w || !h || !a) return 0;
    return 10 * w + 6.25 * h - 5 * a + (gender === 'male' ? 5 : -161);
};

export const calculateTDEE = (weight, height, age, gender, activityLevel) =>
    Math.round(calculateBMR(weight, height, age, gender) * (parseFloat(activityLevel) || 1.2));

/**
 * @param profile onboarding profile: weight, height, age, gender, activityLevel, goal,
 *                targetRate (kg/week), macroProfile, isPregnant, isBreastfeeding, and
 *                adaptive.tdee when a weekly check-in replaced the formula estimate
 */
export const computeNutritionTargets = (profile) => {
    const goal = normaliseGoal(profile.goal);
    const weight = parseFloat(profile.weight) || 0;
    const formulaTdee = calculateTDEE(profile.weight, profile.height, profile.age, profile.gender, profile.activityLevel);
    const adaptiveTdee = Math.round(parseFloat(profile.adaptive?.tdee) || 0);
    const tdee = adaptiveTdee > 0 ? adaptiveTdee : formulaTdee;
    const macroProfile = MACRO_PROFILES[profile.macroProfile] ? profile.macroProfile : 'balanced';
    const macro = MACRO_PROFILES[macroProfile];
    const pregnant = profile.gender === 'female' && Boolean(profile.isPregnant);
    const breastfeeding = profile.gender === 'female' && Boolean(profile.isBreastfeeding);
    const notes = [];

    let adjustment = 0;
    let effectiveGoal = goal;
    if ((pregnant || breastfeeding) && goal === 'cut') {
        effectiveGoal = 'maintain';
        notes.push('Weight-loss targets are paused during pregnancy and breastfeeding.');
    }
    if (effectiveGoal !== 'maintain') {
        const rate = parseFloat(profile.targetRate) || DEFAULT_RATE[effectiveGoal];
        const daily = rate * KCAL_PER_KG / 7;
        adjustment = effectiveGoal === 'cut'
            ? -Math.round(Math.min(daily, tdee * 0.25, (weight * MAX_WEEKLY_LOSS_SHARE * KCAL_PER_KG) / 7))
            : Math.round(Math.min(daily, 500));
    }
    if (pregnant) adjustment += PREGNANCY.kcal;
    if (breastfeeding) adjustment += BREASTFEEDING.kcal;

    let targetCalories = tdee + adjustment;
    const floor = CALORIE_FLOOR[profile.gender] || CALORIE_FLOOR.female;
    if (tdee > 0 && targetCalories < floor) {
        targetCalories = floor;
        notes.push(`Target raised to the ${floor} kcal minimum; lose weight more slowly instead.`);
    }

    let protein = weight * macro.protein[effectiveGoal];
    if (pregnant) protein += PREGNANCY.protein;
    if (breastfeeding) protein += BREASTFEEDING.protein;
    protein = Math.min(protein, (targetCalories * PROTEIN_CAP_SHARE) / 4);

    let fatKcal = targetCalories * macro.fatShare;
    let carbKcal = targetCalories - protein * 4 - fatKcal;
    if (macro.carbCap && carbKcal > targetCalories * macro.carbCap) {
        fatKcal += carbKcal - targetCalories * macro.carbCap;
        carbKcal = targetCalories * macro.carbCap;
    }

    return {
        bmr: Math.round(calculateBMR(profile.weight, profile.height, profile.age, profile.gender)),
        tdee,
        formulaTdee,
        tdeeSource: adaptiveTdee > 0 ? 'adaptive' : 'formula',
        goal: effectiveGoal,
        adjustment,
        targetCalories: Math.round(targetCalories),
        macroProfile,
        macros: {
            protein: Math.round(protein),
            carbs: Math.round(Math.max(carbKcal, 0) / 4),
            fat: Math.round(fatKcal / 9),
        },
        notes,
    };
};
