const formatDate = (dateStr) => {
  if (!dateStr) return "-";

  const d = new Date(dateStr);

  return d.toLocaleDateString("en-IN", {
    timeZone: "UTC", // prevents date shifting in IST
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const roundPrice = (amount: number): number => {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

export const formatCurrency = (amount: number, currency = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatBookingPeriod = (startDate, endDate) => {
  if (startDate && endDate) {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    if (start === end) return start;
    return `${start} to ${end}`;
  }
  if (startDate) {
    return `From ${formatDate(startDate)}`;
  }
  return `Till ${formatDate(endDate)}`;
};
