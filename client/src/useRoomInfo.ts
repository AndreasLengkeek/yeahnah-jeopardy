import type { RoomInfo } from "@yeahnah/shared";
import { useEffect, useState } from "react";
import { socket } from "./socket";

// The device counts the server sends this Room's Host sockets (and only those) whenever
// they change. null until the first arrives, which the server sends as soon as a Host
// claim is accepted.
export function useRoomInfo(): RoomInfo | null {
  const [info, setInfo] = useState<RoomInfo | null>(null);

  useEffect(() => {
    function onRoomInfo(next: RoomInfo) {
      setInfo(next);
    }
    socket.on("roomInfo", onRoomInfo);
    return () => {
      socket.off("roomInfo", onRoomInfo);
    };
  }, []);

  return info;
}
