export function scriptSafeJson(value) {
  const serialized = JSON.stringify(value);
  if (typeof serialized !== "string") throw new TypeError("Inline script JSON must be serializable to a JSON value.");
  return serialized
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
