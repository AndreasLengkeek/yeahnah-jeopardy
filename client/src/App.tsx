import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { BoardPage } from "./routes/BoardPage";
import { HomePage } from "./routes/HomePage";
import { HostPage } from "./routes/HostPage";
import { JoinPage } from "./routes/JoinPage";
import { RoomCodeEntryPage } from "./routes/RoomCodeEntryPage";

// Every Room screen's address carries its Room Code (ADR-0015). Anything else —
// including the old bare /host and /board — goes home.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/join" element={<RoomCodeEntryPage />} />
      <Route path="/:code/host" element={<HostPage />} />
      <Route path="/:code/board" element={<BoardPage />} />
      <Route path="/:code/join" element={<JoinPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
