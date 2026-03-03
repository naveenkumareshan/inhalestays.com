/**
 * Check if a string looks like a UUID (starts with 8 hex chars followed by a dash).
 * Used for dual-lookup: serial_number vs UUID resolution.
 */
export const isUUID = (s: string): boolean => /^[0-9a-f]{8}-/.test(s);
