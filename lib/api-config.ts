export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.helioai.tech"
).replace(/\/+$/, "");

export const WIDGETS_API_URL = `${API_BASE_URL}/widgets`;

