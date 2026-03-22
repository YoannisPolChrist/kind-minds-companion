const ENERGY_STOPS = [
  { max: 20, color: "#201b19" },
  { max: 40, color: "#4b3c2d" },
  { max: 60, color: "#7d6341" },
  { max: 80, color: "#b48732" },
  { max: 100, color: "#d9aa45" },
];

function clampEnergy(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getEnergyColor(value: number) {
  const energy = clampEnergy(value);
  return ENERGY_STOPS.find((stop) => energy <= stop.max)?.color || ENERGY_STOPS[ENERGY_STOPS.length - 1].color;
}

export function getEnergyTone(value: number) {
  const energy = clampEnergy(value);

  if (energy <= 20) return "Sehr niedrig";
  if (energy <= 40) return "Niedrig";
  if (energy <= 60) return "Stabil";
  if (energy <= 80) return "Aktiv";
  return "Hoch";
}

export function getEnergyGradient() {
  return "linear-gradient(90deg, #201b19 0%, #4b3c2d 25%, #7d6341 50%, #b48732 75%, #d9aa45 100%)";
}
