import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const auth = useAuth();

  const [form, setForm] = useState({ id: "", password: "" });
  const [error, setError] = useState("");

  const onChange = (e) => {
    setError("");
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
  
    const emailOrId = form.id.trim();       // 여기서는 email로 사용한다고 가정
    const password = form.password;
  
    if (!emailOrId || !password) {
      setError("아이디(이메일)와 비밀번호를 모두 입력해 주세요.");
      return;
    }
  
    // 1) Supabase 로그인 요청
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailOrId,
      password,
    });
  
    if (error) {
      // 메시지는 사용자에게 너무 자세히 주지 않는 게 보통 안전
      setError("로그인에 실패했습니다. 아이디(이메일)와 비밀번호를 확인해 주세요.");
      return;
    }
  
    // 2) (선택) 네가 기존에 AuthContext를 쓰고 있다면, 표시용 이름/아이디 저장
    // Supabase가 세션은 이미 관리하므로, auth.login은 "상단에 보여줄 값" 정도로만 써도 됨.
    // 이메일을 표시하려면:
    //auth.login(data.user.email);
  
    // 3) 홈으로 이동
    navigate("/");
  };

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="loginBackBtn">
          ← 홈
        </Link>
      </header>

      <main className="hero">
        <div className="authCard">
          <h1 className="authTitle">로그인</h1>
          <p className="authSubtitle">동아리방 예약 서비스를 이용하려면 로그인하세요.</p>

          <form className="authForm" onSubmit={onSubmit}>
            <label className="field">
              <span className="labelText">이메일</span>
              <input
                className="input"
                name="id"
                value={form.id}
                onChange={onChange}
                autoComplete="username"
                placeholder="이메일을 입력하세요"
              />
            </label>

            <label className="field">
              <span className="labelText">비밀번호</span>
              <input
                className="input"
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                autoComplete="current-password"
                placeholder="비밀번호를 입력하세요"
              />
            </label>

            {error && <div className="errorText" role="alert">{error}</div>}

            <button className="authBtn" type="submit">
              로그인
            </button>
          </form>

          <div className="authLinks">
            <Link to="/signup" className="authLink">회원가입</Link>
            <span className="dot">•</span>
            <Link to="/find" className="authLink">ID/비밀번호 찾기</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
