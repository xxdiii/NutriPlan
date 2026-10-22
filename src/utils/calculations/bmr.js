// Basal Metabolic Rate calculation using Mifflin-St Jeor Equation
export const calculateBMR = (weight, height, age, gender) => {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  const a = parseFloat(age);

  if (!w || !h || !a) return 0;

  if (gender === 'male') {
    return (10 * w) + (6.25 * h) - (5 * a) + 5;
  } else {
    return (10 * w) + (6.25 * h) - (5 * a) - 161;
  }
};