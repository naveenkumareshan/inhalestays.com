/**
 * Returns elapsed time display for complaints.
 * - For open/in_progress: live elapsed from created_at to now
 * - For resolved/closed: frozen elapsed from created_at to resolved_at
 */
export function getElapsedDisplay(
  createdAt: string,
  resolvedAt?: string | null,
): string {
  const start = new Date(createdAt).getTime();
  const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Returns CSS classes for elapsed time badge based on complaint status
 */
export function getElapsedBadgeClass(status: string): string {
  if (status === 'resolved' || status === 'closed') {
    return 'bg-green-100 text-green-700';
  }
  return 'bg-red-100 text-red-700';
}
