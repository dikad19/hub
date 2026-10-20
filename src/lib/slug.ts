export const RESERVED_SLUGS = [
  "dashboard",
  "login",
  "register",
  "api",
  "admin",
  "_next",
  "settings",
  "about",
  "help",
  "static",
];

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function normalizeWa(input: string) {
  let n = input.replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  return n;
}
