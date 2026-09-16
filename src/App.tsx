import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Tv from "./pages/Tv";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ThemePreview from "./pages/ThemePreview";
import MotionLab from "./pages/MotionLab";
import MotionStudio from "./pages/MotionStudio";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/tv" replace />} />
        <Route path="/tv" element={<Tv />} />
        <Route path="/tv/:sector" element={<Tv />} />
        <Route path="/login" element={<Login />} />
        {import.meta.env.DEV && (
          <>
            <Route path="/dev/motion-lab" element={<MotionLab />} />
            <Route path="/dev/theme-preview" element={<MotionLab />} />
          </>
        )}
        <Route
          path="/studio/motion"
          element={
            <ProtectedRoute>
              <MotionStudio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/tv" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
