import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../App.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // Supabase가 redirect로 넘겨준 세션을 URL에서 받아 세팅하는 과정이 필요할 때가 있음
  useEffect(() => {
    const run = async () => {
      setError("");
      setMsg("");

      // 일부 설정/버전에선 이걸 호출해야 세션이 잡힘
      // (URL에 토큰이 포함되어 들어오는 경우)
      const { data, error } = await supabase.auth.getSession();
      if (error) setError(error.message);

      // 세션이 있든 없든 일단 화면은 열어줌
      setReady(true);
    };
    run();
  }, []);

  const updatePassword = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");

    if (password.length < 6) {
      setError("비밀번호는 6자 이상으로 설정해 주세요.");
      return;
    }
    if (password !== password2) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMsg("비밀번호가 변경되었습니다. 로그인 페이지로 이동합니다.");
    setTimeout(() => navigate("/login", { replace: true }), 800);
  };

  if (!ready) return null;

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="loginBackBtn">← 홈</Link>
      </header>

      <main className="hero">
        <div className="authCard">
          <h1 className="authTitle">비밀번호 재설정</h1>
          <p className="authSubtitle">새 비밀번호를 입력해 주세요.</p>

          <form className="authForm" onSubmit={updatePassword}>
            <label className="field">
              <span className="labelText">새 비밀번호</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상"
                autoComplete="new-password"
              />
            </label>

            <label className="field">
              <span className="labelText">새 비밀번호 확인</span>
              <input
                className="input"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="한 번 더 입력"
                autoComplete="new-password"
              />
            </label>

            {error && <div className="errorText" role="alert">{error}</div>}
            {msg && <div className="successText" role="status">{msg}</div>}

            <button className="authBtn" type="submit" disabled={loading}>
              {loading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}