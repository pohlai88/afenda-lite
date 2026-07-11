/** Pure countdown helpers — browser display is UX only; deadline is server-enforced. */

export type CountdownParts = {
  totalMs: number;
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function getCountdownParts(target: Date, now: Date): CountdownParts {
  const totalMs = target.getTime() - now.getTime();
  if (totalMs <= 0) {
    return { totalMs: 0, expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const secondsTotal = Math.floor(totalMs / 1000);
  const days = Math.floor(secondsTotal / 86_400);
  const hours = Math.floor((secondsTotal % 86_400) / 3600);
  const minutes = Math.floor((secondsTotal % 3600) / 60);
  const seconds = secondsTotal % 60;

  return { totalMs, expired: false, days, hours, minutes, seconds };
}

export function formatCountdown(
  parts: CountdownParts,
  locale: "vi" | "en" = "vi",
): string {
  if (parts.expired) {
    return locale === "vi" ? "Đã hết hạn" : "Closed";
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  if (parts.days > 0) {
    return locale === "vi"
      ? `${parts.days}n ${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`
      : `${parts.days}d ${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
  }
  return `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}
