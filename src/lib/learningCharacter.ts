const LEVEL_UP_IMAGES: Record<
  string,
  Record<number, ReturnType<typeof require>>
> = {
  green: {
    1: require("../../assets/character/level-up/green/green-1.png"),
    2: require("../../assets/character/level-up/green/green-2.png"),
    3: require("../../assets/character/level-up/green/green-3.png"),
    4: require("../../assets/character/level-up/green/green-4.png"),
    5: require("../../assets/character/level-up/green/green-5.png"),
  },
  red: {
    1: require("../../assets/character/level-up/red/red-1.png"),
    2: require("../../assets/character/level-up/red/red-2.png"),
    3: require("../../assets/character/level-up/red/red-3.png"),
    4: require("../../assets/character/level-up/red/red-4.png"),
    5: require("../../assets/character/level-up/red/red-5.png"),
  },
  yellow: {
    1: require("../../assets/character/level-up/yellow/yellow-1.png"),
    2: require("../../assets/character/level-up/yellow/yellow-2.png"),
    3: require("../../assets/character/level-up/yellow/yellow-3.png"),
    4: require("../../assets/character/level-up/yellow/yellow-4.png"),
    5: require("../../assets/character/level-up/yellow/yellow-5.png"),
  },
  purple: {
    1: require("../../assets/character/level-up/purple/purple-1.png"),
    2: require("../../assets/character/level-up/purple/purple-2.png"),
    3: require("../../assets/character/level-up/purple/purple-3.png"),
    4: require("../../assets/character/level-up/purple/purple-4.png"),
    5: require("../../assets/character/level-up/purple/purple-5.png"),
  },
};

export function getLevelUpCharacterSource(typeLabel: string, level: number) {
  const clampedLevel = Math.min(5, Math.max(1, level));
  if (!typeLabel) {
    return require("../../assets/character/bat-character.png");
  }
  if (typeLabel.includes("분석형")) {
    return LEVEL_UP_IMAGES.green[clampedLevel];
  }
  if (typeLabel.includes("협력형")) {
    return LEVEL_UP_IMAGES.red[clampedLevel];
  }
  if (typeLabel.includes("창의형")) {
    return LEVEL_UP_IMAGES.yellow[clampedLevel];
  }
  if (typeLabel.includes("사회형")) {
    return LEVEL_UP_IMAGES.purple[clampedLevel];
  }
  return require("../../assets/character/bat-character.png");
}
