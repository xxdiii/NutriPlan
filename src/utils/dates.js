/** YYYY-MM-DD in the user's local timezone (toISOString() would give the UTC date). */
export const localDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** 35 -> "35 min", 195 -> "3h 15m" (prep times include soaking and fermenting). */
export const formatDuration = (minutes) => {
  const total = Math.round(minutes || 0);
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};
