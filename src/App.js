import React from "react";
import { BrowserRouter, Routes, Route, Link , Navigate, useLocation} from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import Signup from "./pages/SignUp";
import Reserve from "./pages/Reserve";
import Check from "./pages/Check";
import Cancel from "./pages/Cancel";
import { supabase } from "./lib/supabase";
import { AuthProvider, useAuth } from "./auth/AuthContext"; // ✅ 추가

function Home() {
  const { user, loading } = useAuth();

  if (loading) return null; // 또는 로딩 스피너

  return (
    <div className="page">
      <header className="topbar">
        {!user ? (
          <Link to="/login" className="loginBtn">
            로그인
          </Link>
        ) : (
          <div className="userArea">
            <span className="userIdBadge">
              {user.email}
            </span>
            <button
              className="logoutBtn"
              onClick={() => supabase.auth.signOut()}
            >
              로그아웃
            </button>
          </div>
        )}
      </header>

      <main className="hero">
        <div className="heroCard">
          <h1 className="title">동아리방 예약</h1>
          <p className="subtitle">원하는 기능을 선택하세요.</p>

          <div className="btnGrid">
            <Link to="/check" className="mainBtn">예약 확인</Link>
            <Link to="/reserve" className="mainBtn primary">예약 하기</Link>
            <Link to="/cancel" className="mainBtn danger">예약 취소</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Placeholder({ title }) {
  return (
    <div className="placeholder">
      <Link to="/" className="backLink">← 홈으로</Link>
      <h2>{title}</h2>
      <p>여기에 {title} 페이지 내용을 추가하면 돼.</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // 로딩 스피너로 바꿔도 됨

  if (!user) {
    // 로그인 후 원래 가려던 페이지로 돌아오게 state에 저장
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          <Route path="/signup" element={<Signup />} />
          <Route path="/find" element={<Placeholder title="ID/비밀번호 찾기" />} />
          <Route path="/check" element={<Check/>} />
          <Route
            path="/reserve"
            element={
              <ProtectedRoute>
                <Reserve />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cancel"
            element={
              <ProtectedRoute>
                <Cancel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
