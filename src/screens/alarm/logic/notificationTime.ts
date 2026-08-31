export type NotificationTime = {
  ampm: "오전" | "오후";
  hour: number;
  minute: number;
};

export type ActiveTimePicker = null | "review" | "dndStart" | "dndEnd";

export const DEFAULT_REVIEW_TIME: NotificationTime = {
  ampm: "오후",
  hour: 7,
  minute: 30,
};

export function parseRemindTime(
  remindTime: string | null | undefined,
): NotificationTime {
  if (!remindTime || typeof remindTime !== "string") {
    return DEFAULT_REVIEW_TIME;
  }
  const parts = String(remindTime).trim().split(":");
  const parsedHour = parseInt(parts[0], 10);
  const parsedMinute = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
  if (Number.isNaN(parsedHour)) return DEFAULT_REVIEW_TIME;

  const hour24 = Math.max(0, Math.min(23, parsedHour));
  const minute = Number.isNaN(parsedMinute)
    ? 0
    : Math.max(0, Math.min(59, Math.floor(parsedMinute / 5) * 5));
  if (hour24 === 0) return { ampm: "오전", hour: 12, minute };
  if (hour24 < 12) return { ampm: "오전", hour: hour24, minute };
  if (hour24 === 12) return { ampm: "오후", hour: 12, minute };
  return { ampm: "오후", hour: hour24 - 12, minute };
}

export function formatNotificationTime(time: NotificationTime) {
  const minute = time.minute.toString().padStart(2, "0");
  const suffix = time.ampm === "오전" ? "AM" : "PM";
  return `${time.hour}:${minute} ${suffix}`;
}

export function to24HourString(time: NotificationTime) {
  const minute = time.minute.toString().padStart(2, "0");
  const base = time.hour % 12;
  const hour = time.ampm === "오후" ? base + 12 : base;
  return `${hour.toString().padStart(2, "0")}:${minute}`;
}

export function changeNotificationTime(
  time: NotificationTime,
  field: keyof NotificationTime,
  difference: number,
): NotificationTime {
  if (field === "ampm") {
    return { ...time, ampm: time.ampm === "오전" ? "오후" : "오전" };
  }
  if (field === "hour") {
    let hour = time.hour + difference;
    if (hour < 1) hour = 12;
    if (hour > 12) hour = 1;
    return { ...time, hour };
  }

  let minute = time.minute + difference;
  if (minute < 0) minute = 55;
  if (minute > 55) minute = 0;
  return { ...time, minute };
}
