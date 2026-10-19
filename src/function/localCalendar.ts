import { getLocalDateString } from "./getLocalDateString";

export function getLocalMinuteOfDay(date = new Date()): number {
  return (
    date.getHours() * 60 +
    date.getMinutes() +
    date.getSeconds() / 60 +
    date.getMilliseconds() / 60_000
  );
}

export function getNextLocalMidnightMs(nowMs: number): number {
  const date = new Date(nowMs);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  ).getTime();
}

export function getLocalDayAtMs(nowMs: number): string {
  return getLocalDateString(new Date(nowMs));
}

export function localDateFromString(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function addLocalDays(value: string, offset: number): string | null {
  const date = localDateFromString(value);
  if (!date || !Number.isInteger(offset)) return null;
  date.setDate(date.getDate() + offset);
  return getLocalDateString(date);
}
