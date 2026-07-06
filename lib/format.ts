const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

export function formatDateTime(value: Date): string {
  return dateTimeFormatter.format(value);
}

export function formatDate(value: Date): string {
  return dateFormatter.format(value);
}
