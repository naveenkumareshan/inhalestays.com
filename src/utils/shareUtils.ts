import { getPublicAppUrl } from "./appUrl";

export interface CabinShareData {
  id: string;
  name: string;
  price?: number;
  fullAddress?: string;
  averageRating?: number;
  serialNumber?: string;
}

export interface HostelShareData {
  id: string;
  name: string;
  gender?: string;
  stay_type?: string;
  food_enabled?: boolean;
  food_policy_type?: string;
  location?: string;
  serial_number?: string;
}

const buildUrl = (path: string, userId?: string) => {
  const base = `${getPublicAppUrl()}${path}`;
  return userId ? `${base}?ref=${userId}` : base;
};

export const generateCabinShareText = (cabin: CabinShareData, userId?: string) => {
  const slug = cabin.serialNumber || cabin.id;
  const url = buildUrl(`/book-seat/${slug}`, userId);
  const lines = [
    `📚 ${cabin.name} — Reading Room on InhaleStays`,
    ``,
  ];
  if (cabin.fullAddress) lines.push(`📍 ${cabin.fullAddress}`);
  if (cabin.price) lines.push(`💰 ₹${cabin.price}/month`);
  if (cabin.averageRating && cabin.averageRating > 0) lines.push(`⭐ ${cabin.averageRating.toFixed(1)} rating`);
  lines.push(``, `🔗 ${url}`);
  return { text: lines.join("\n"), url, title: cabin.name };
};

export const generateHostelShareText = (hostel: HostelShareData, lowestPrice?: number, userId?: string) => {
  const slug = hostel.serial_number || hostel.id;
  const url = buildUrl(`/hostels/${slug}`, userId);
  const lines = [
    `🏠 ${hostel.name} — Hostel on InhaleStays`,
    ``,
  ];
  const meta: string[] = [];
  if (hostel.gender) meta.push(hostel.gender);
  if (hostel.stay_type) meta.push(hostel.stay_type === "long_term" ? "Long-term" : hostel.stay_type === "short_term" ? "Short-term" : "Both");
  if (meta.length) lines.push(meta.join(" | "));
  if (hostel.food_policy_type === 'mandatory') lines.push(`🍽 Food Included`);
  else if (hostel.food_policy_type === 'optional') lines.push(`🍽 Food Available`);
  else if (hostel.food_enabled) lines.push(`🍽 Food Available`);
  if (hostel.location) lines.push(`📍 ${hostel.location}`);
  if (lowestPrice && lowestPrice < Infinity) lines.push(`💰 From ₹${lowestPrice}`);
  lines.push(``, `🔗 ${url}`);
  return { text: lines.join("\n"), url, title: hostel.name };
};
