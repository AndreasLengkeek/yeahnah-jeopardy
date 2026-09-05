import type { PlayerIdentity as PlayerIdentityValue } from "@yeahnah/shared";

// Renders a Player's identity from one place: a typed name as plain text (so the
// surrounding element's styling applies unchanged), or a drawn Signature as a small
// inline image sized to the surrounding line so it drops in wherever the name used to
// be. Every spot that once interpolated `player.name` goes through here so a new display
// location can't forget to handle a Signature.
export function PlayerIdentity({ identity }: { identity: PlayerIdentityValue }) {
  if (identity.kind === "signature") {
    return (
      <img
        src={identity.image}
        alt="Signature"
        style={{ height: "1.2em", width: "auto", verticalAlign: "middle" }}
      />
    );
  }

  return <>{identity.name}</>;
}
