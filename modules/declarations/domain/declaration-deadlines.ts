export function getDeclarationDeadlineError(input: {
  dueDate: Date | null;
  submitBefore: Date | null;
  now?: Date;
}): "assignment" | "declaration" | null {
  const now = input.now ?? new Date();

  if (input.dueDate && input.dueDate.getTime() < now.getTime()) {
    return "assignment";
  }

  if (input.submitBefore && input.submitBefore.getTime() < now.getTime()) {
    return "declaration";
  }

  return null;
}
