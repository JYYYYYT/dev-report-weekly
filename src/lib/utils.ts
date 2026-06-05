import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFolderName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() || path;
}
