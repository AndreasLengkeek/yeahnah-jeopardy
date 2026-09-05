import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { BoardPage } from "./routes/BoardPage";
import { HostPage } from "./routes/HostPage";
import { JoinPage } from "./routes/JoinPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/board" element={<BoardPage />} />
        <Route path="/host" element={<HostPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="*" element={<Navigate to="/join" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
