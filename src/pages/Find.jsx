import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../App.css";

export default function Find() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sendReset = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");

    const v = email.trim();
    if (!v) {
      setError("이메일을 입력해 주세요.");
      return;
    }

    setLoading(true);

    // ✅ 중요: redirectTo는 네 사이트 주소 + reset-password 라우트로
    // 개발환경: http://localhost:5173/reset-password
    // 배포환경: https://your-domain.com/reset-password
    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(v, { redirectTo });

    setLoading(false);

    // 보안상 '가입 여부'를 알려주지 않는 메시지로 통일하는 게 좋음
    if (error) {
      setError(error.message);
      return;
    }
    setMsg("이메일을 확인해 비밀번호 재설정 링크를 진행해 주세요.");
  };

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="loginBackBtn">← 홈</Link>
      </header>

      <main className="hero">
        <div className="authCard">
          <h1 className="authTitle">ID/비밀번호 찾기</h1>
          <p className="authSubtitle">
            ID는 가입에 사용한 이메일입니다. 비밀번호는 이메일로 재설정할 수 있어요.
          </p>

          <div className="mutedText" style={{ marginBottom: 12 }}>
            • ID(이메일)를 기억한다면 아래에서 비밀번호 재설정 링크를 받아보세요.
          </div>

          <form className="authForm" onSubmit={sendReset}>
            <label className="field">
              <span className="labelText">이메일</span>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                autoComplete="email"
              />
            </label>

            {error && <div className="errorText" role="alert">{error}</div>}
            {msg && <div className="successText" role="status">{msg}</div>}

            <button className="authBtn" type="submit" disabled={loading}>
              {loading ? "보내는 중..." : "비밀번호 재설정 링크 보내기"}
            </button>
          </form>

          <div className="authLinks">
            <Link to="/login" className="authLink">로그인으로</Link>
            <span className="mutedText"> | </span>
            <Link to="/signup" className="authLink">회원가입</Link>
          </div>
        </div>
      </main>
    </div>
  );
}