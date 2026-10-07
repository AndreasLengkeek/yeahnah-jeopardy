// The address of one of a Room's screens. Mirrors the `/:code/…` routes in App.tsx.
export type RoomScreen = "host" | "board" | "join";

export function roomPath(code: string, screen: RoomScreen): string {
  return `/${code.toUpperCase()}/${screen}`;
}
