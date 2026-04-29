import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms = 400) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

export function toTitleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\w\S*/g, (part) => part.charAt(0).toUpperCase() + part.slice(1));
}
