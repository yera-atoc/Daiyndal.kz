// Дайындал.kz — деңгей/XP есептеу логикасы.
// Барлығы бір жерде, сандарды кейін оңай теңшеу үшін.

export const XP_PER_CORRECT_ANSWER = 15;
export const XP_LESSON_COMPLETION_BONUS = 30;
export const XP_PER_LEVEL = 100;

export function levelFromXp(totalXp: number): number {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1;
}

export function xpIntoCurrentLevel(totalXp: number): number {
  return totalXp % XP_PER_LEVEL;
}

export function xpNeededForNextLevel(): number {
  return XP_PER_LEVEL;
}
