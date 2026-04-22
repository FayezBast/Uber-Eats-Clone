export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

export function formatEta(etaMin: number, etaMax: number) {
  return `${etaMin}-${etaMax} min`;
}

export function formatRating(value: number) {
  return value.toFixed(1);
}

export function formatOrderTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatStatusLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((entry) => entry[0].toUpperCase() + entry.slice(1))
    .join(" ");
}

export function formatDistanceKm(value: number) {
  return `${value.toFixed(1)} km`;
}

export function formatEtaSeconds(value: number) {
  const minutes = Math.max(1, Math.ceil(value / 60));
  return `${minutes} min`;
}
