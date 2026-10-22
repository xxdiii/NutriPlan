// Load the food catalogue and curated recipes into the database.
// Safe to re-run: rows are upserted and curated recipes that were removed from the
// catalogue are deleted. Users' custom recipes are never touched.
//
// Usage: npm run seed
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { FOOD_TABLE, analyseRecipe, allowedDietCategories } from '../engine/nutrition.js';
import { RECIPES } from '../data/recipes/index.js';

const prisma = new PrismaClient();

const seedFoods = async () => {
    for (const food of FOOD_TABLE.values()) {
        const data = {
            name: food.name,
            source: food.source,
            foodGroup: food.group,
            ...food.per100,
            gi: food.gi,
            priceInr: food.price,
            allergens: JSON.stringify(food.allergens),
            flags: JSON.stringify(food.flags),
            animal: food.animal,
            unitName: food.unit?.name ?? null,
            unitGrams: food.unit?.grams ?? null,
        };
        await prisma.food.upsert({ where: { id: food.key }, create: { id: food.key, ...data }, update: data });
    }
    return FOOD_TABLE.size;
};

const seedRecipes = async () => {
    for (const recipe of RECIPES) {
        const analysis = analyseRecipe(recipe.ingredients, recipe.serves);
        const data = {
            source: 'curated',
            ownerId: null,
            name: recipe.name,
            course: recipe.course,
            cuisine: recipe.cuisine,
            meals: JSON.stringify(recipe.meals),
            regions: JSON.stringify(recipe.regions),
            pairs: JSON.stringify(recipe.pairs),
            stapleGroup: recipe.group,
            servings: recipe.serves,
            servingUnit: recipe.unit,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            difficulty: recipe.difficulty,
            tags: JSON.stringify(recipe.tags),
            instructions: JSON.stringify(recipe.steps),
            batchFriendly: recipe.batchFriendly,
            ...analysis.nutrition,
            glycaemicLoad: analysis.glycaemicLoad,
            costInr: analysis.costInr,
            allergens: JSON.stringify(analysis.allergens),
            dietCategory: analysis.dietCategory,
            flags: JSON.stringify(analysis.flags),
        };
        await prisma.$transaction([
            prisma.recipe.upsert({ where: { id: recipe.id }, create: { id: recipe.id, ...data }, update: data }),
            prisma.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } }),
            prisma.recipeIngredient.createMany({
                data: recipe.ingredients.map((item, position) => ({
                    recipeId: recipe.id, foodId: item.food, grams: item.grams, position,
                })),
            }),
        ]);
    }

    const ids = RECIPES.map(r => r.id);
    const removed = await prisma.recipe.deleteMany({ where: { source: 'curated', id: { notIn: ids } } });
    return { count: RECIPES.length, removed: removed.count };
};

const printCoverage = async () => {
    const recipes = await prisma.recipe.findMany({ where: { source: 'curated' }, select: { meals: true, dietCategory: true } });
    for (const diet of ['vegan', 'vegetarian', 'eggetarian', 'pescatarian', 'non_veg']) {
        const allowed = allowedDietCategories(diet);
        const count = slot => recipes.filter(r => allowed.includes(r.dietCategory) && JSON.parse(r.meals).includes(slot)).length;
        console.log(`  ${diet.padEnd(12)} breakfast ${count('breakfast')}, lunch ${count('lunch')}, dinner ${count('dinner')}, snack ${count('snack')}`);
    }
};

try {
    const foods = await seedFoods();
    const { count, removed } = await seedRecipes();
    console.log(`Seeded ${foods} foods and ${count} curated recipes (${removed} stale recipes removed).`);
    console.log('Recipes available per meal slot:');
    await printCoverage();
} finally {
    await prisma.$disconnect();
}
