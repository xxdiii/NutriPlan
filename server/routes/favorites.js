import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, parseJson } from '../lib/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
    try {
        const favorites = await prisma.favoriteRecipe.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        // Parse the JSON string 'recipe' field back to object
        res.json(favorites.map(f => ({ ...f, recipe: parseJson(f.recipe, {}) })));
    } catch (error) {
        console.error('GET /api/favorites error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const recipe = req.body;
        // recipeId should be string, ensure it exists
        if (!recipe || !recipe.id) {
            return res.status(400).json({ error: 'Invalid recipe data' });
        }

        const newFavorite = await prisma.favoriteRecipe.create({
            data: {
                userId: req.user.id,
                recipeId: String(recipe.id),
                recipe: JSON.stringify(recipe)
            }
        });
        res.json({ ...newFavorite, recipe: JSON.parse(newFavorite.recipe) });
    } catch (error) {
        // Handle unique constraint violation
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Recipe already favorited' });
        }
        console.error('POST /api/favorites error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:recipeId', async (req, res) => {
    try {
        await prisma.favoriteRecipe.deleteMany({
            where: { userId: req.user.id, recipeId: req.params.recipeId }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
