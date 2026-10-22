import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../lib/auth.js';
import { loadCuratedRecipes, loadCustomRecipes, toClientRecipe, toEngineRecipe } from '../services/recipes.js';
import { allowedDietCategories, DIET_ORDER } from '../engine/nutrition.js';

const router = Router();
router.use(authenticateToken);

const ALLERGENS = ['dairy', 'eggs', 'peanuts', 'tree_nuts', 'soy', 'wheat', 'fish', 'shellfish', 'sesame'];
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
// Custom recipes have typed nutrition; glycaemic load is estimated with a medium GI.
const ASSUMED_GI = 0.55;

// GET /api/recipes?q=&meal=&diet=&cuisine=&maxTime=&custom=1&limit=&offset=
router.get('/', async (req, res) => {
    try {
        const { q, meal, diet, cuisine, maxTime, custom } = req.query;
        const limit = Math.min(parseInt(req.query.limit, 10) || 24, 500);
        const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

        const customRecipes = await loadCustomRecipes(req.user.id);
        let recipes = custom === '1' ? customRecipes : [...customRecipes, ...(await loadCuratedRecipes())];
        recipes = recipes.filter(r => r.course !== 'staple' || meal === 'staple');

        if (q) {
            const needle = String(q).toLowerCase();
            recipes = recipes.filter(r =>
                r.name.toLowerCase().includes(needle)
                || r.tags.some(t => t.includes(needle))
                || r.ingredients.some(i => i.name.toLowerCase().includes(needle))
                || (r.customIngredients || []).some(i => i.toLowerCase().includes(needle)));
        }
        if (meal && meal !== 'all' && meal !== 'staple') recipes = recipes.filter(r => r.meals.includes(meal));
        if (meal === 'staple') recipes = recipes.filter(r => r.course === 'staple');
        if (diet && diet !== 'all') recipes = recipes.filter(r => allowedDietCategories(diet).includes(r.dietCategory));
        if (cuisine && cuisine !== 'all') recipes = recipes.filter(r => r.cuisine === cuisine);
        if (maxTime) recipes = recipes.filter(r => r.prepTime + r.cookTime <= Number(maxTime));

        recipes.sort((a, b) => (a.source === b.source ? a.name.localeCompare(b.name) : a.source === 'custom' ? -1 : 1));
        res.json({ total: recipes.length, items: recipes.slice(offset, offset + limit).map(toClientRecipe) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/custom', async (req, res) => {
    try {
        res.json((await loadCustomRecipes(req.user.id)).map(toClientRecipe));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const cleanList = (value) => (Array.isArray(value) ? value.map(v => String(v).trim()).filter(Boolean) : []);

/** Validate the custom recipe form; returns [data, error]. */
const customRecipeData = (body) => {
    const name = String(body.name || '').trim();
    const meals = cleanList(body.mealTypes).filter(m => MEALS.includes(m));
    const numbers = Object.fromEntries(['calories', 'protein', 'carbs', 'fat', 'prepTime', 'cookTime', 'servings']
        .map(k => [k, Number(body[k])]));
    if (!name) return [null, 'Recipe name is required.'];
    if (!meals.length) return [null, 'Choose at least one meal type.'];
    if (!(numbers.calories > 0)) return [null, 'Calories per serving must be greater than 0.'];
    if (Object.values(numbers).some(n => !Number.isFinite(n) || n < 0)) return [null, 'Numbers must be zero or more.'];

    // The most restrictive diet the user ticked decides who can eat it.
    const dietTypes = cleanList(body.dietaryType);
    const dietCategory = DIET_ORDER.find(d => dietTypes.includes(d)) || 'non_veg';
    const course = meals.includes('lunch') || meals.includes('dinner') ? 'complete' : meals[0];

    return [{
        source: 'custom',
        name,
        course,
        cuisine: String(body.cuisine || 'other'),
        meals: JSON.stringify(meals),
        regions: '[]',
        pairs: '[]',
        stapleGroup: null,
        servings: Math.max(1, Math.round(numbers.servings) || 1),
        servingUnit: '1 serving',
        prepTime: Math.round(numbers.prepTime),
        cookTime: Math.round(numbers.cookTime),
        difficulty: DIFFICULTIES.includes(body.difficulty) ? body.difficulty : 'beginner',
        tags: JSON.stringify(cleanList(body.tags)),
        instructions: JSON.stringify(cleanList(body.instructions)),
        customIngredients: JSON.stringify(cleanList(body.ingredients)),
        imageUrl: body.imageUrl ? String(body.imageUrl) : null,
        kcal: numbers.calories,
        protein: numbers.protein,
        carbs: numbers.carbs,
        fat: numbers.fat,
        fibre: 0, sugar: 0, sodium: 0, iron: 0, calcium: 0, vitC: 0, folate: 0,
        glycaemicLoad: Math.round(numbers.carbs * ASSUMED_GI * 10) / 10,
        costInr: 0,
        allergens: JSON.stringify(cleanList(body.allergens).filter(a => ALLERGENS.includes(a))),
        dietCategory,
        flags: '{}',
    }, null];
};

router.post('/custom', async (req, res) => {
    try {
        const [data, error] = customRecipeData(req.body || {});
        if (error) return res.status(400).json({ message: error });
        const id = `custom-${req.user.id}-${Date.now().toString(36)}`;
        const row = await prisma.recipe.create({ data: { id, ownerId: req.user.id, ...data }, include: { ingredients: { include: { food: true } } } });
        res.json(toClientRecipe(toEngineRecipe(row)));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/custom/:id', async (req, res) => {
    try {
        const existing = await prisma.recipe.findFirst({ where: { id: req.params.id, ownerId: req.user.id } });
        if (!existing) return res.status(404).json({ message: 'Recipe not found.' });
        const [data, error] = customRecipeData(req.body || {});
        if (error) return res.status(400).json({ message: error });
        const row = await prisma.recipe.update({ where: { id: existing.id }, data, include: { ingredients: { include: { food: true } } } });
        res.json(toClientRecipe(toEngineRecipe(row)));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/custom/:id', async (req, res) => {
    try {
        const { count } = await prisma.recipe.deleteMany({ where: { id: req.params.id, ownerId: req.user.id } });
        if (!count) return res.status(404).json({ message: 'Recipe not found.' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const recipes = [...(await loadCuratedRecipes()), ...(await loadCustomRecipes(req.user.id))];
        const recipe = recipes.find(r => r.id === req.params.id);
        if (!recipe) return res.status(404).json({ message: 'Recipe not found.' });
        res.json(toClientRecipe(recipe));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
