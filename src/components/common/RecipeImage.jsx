import React, { useState } from 'react';

const EMOJI_BY_COURSE = {
  breakfast: '🍳',
  snack: '🥗',
  main: '🍛',
  complete: '🍲',
  staple: '🫓',
};

const GRADIENT_BY_COURSE = {
  breakfast: 'from-amber-200 to-orange-300',
  snack: 'from-lime-200 to-emerald-300',
  main: 'from-orange-200 to-rose-300',
  complete: 'from-yellow-200 to-amber-300',
  staple: 'from-stone-200 to-amber-200',
};

/**
 * Recipe photo, or a coloured placeholder with a dish emoji when there is no photo
 * (curated recipes ship without images) or the image fails to load.
 */
const RecipeImage = ({ recipe, className = '', emojiClassName = 'text-5xl' }) => {
  const [failed, setFailed] = useState(false);
  const course = recipe?.course || 'main';

  if (recipe?.imageUrl && !failed) {
    return (
      <img
        src={recipe.imageUrl}
        alt={recipe.name}
        className={`object-cover ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={recipe?.name || 'Recipe'}
      className={`flex items-center justify-center bg-gradient-to-br ${GRADIENT_BY_COURSE[course] || GRADIENT_BY_COURSE.main} ${className}`}
    >
      <span className={emojiClassName} aria-hidden="true">{EMOJI_BY_COURSE[course] || '🍽️'}</span>
    </div>
  );
};

export default RecipeImage;
