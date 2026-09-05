import type { PlayerIdentity } from "./types.js";

// Trims a text identity's name; a signature identity is returned unchanged. Applied at
// join time so the stored identity is already canonical.
export function normalizeIdentity(identity: PlayerIdentity): PlayerIdentity {
  return identity.kind === "text" ? { kind: "text", name: identity.name.trim() } : identity;
}

// Whether an identity carries no actual content: a blank/whitespace-only typed name, or
// a Signature with no image data. Rejected at join time the same way a blank name has
// always been. The canvas-export glue is responsible for yielding an empty string from
// an untouched canvas (and for blocking submit before it gets here) — this reducer-level
// check is the backstop, not a pixel inspection.
export function isBlankIdentity(identity: PlayerIdentity): boolean {
  return identity.kind === "text" ? identity.name.trim() === "" : identity.image.trim() === "";
}

// Duplicate-identity check for the join reducer: only two typed names collide, by exact
// trimmed match. A Signature is never equal to anything — two Players may draw identical
// images without either blocking the other.
export function identitiesMatch(a: PlayerIdentity, b: PlayerIdentity): boolean {
  if (a.kind !== "text" || b.kind !== "text") return false;
  return a.name.trim() === b.name.trim();
}
