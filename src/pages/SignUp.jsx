import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../App.css";

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    password2: "",
    name: "",
    joinYear: "",
    voicePart: "Soprano",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    setError("");
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const signup = async (e) => {
    e.preventDefault();
    setError("");
  
    const email = form.email.trim();
    const password = form.password;
    const password2 = form.password2;
    const name = form.name.trim();
    const joinYear = Number(form.joinYear);
    const voicePart = form.voicePart;
  
    if (!email || !password || !password2 || !name || !form.joinYear || !voicePart) {
      setError("모든 항목을 입력해 주세요.");
      return;
    }
    if (!Number.isInteger(joinYear) || joinYear < 1900 || joinYear > 2100) {
      setError("입단년도를 올바르게 입력해 주세요.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상으로 설정해 주세요.");
      return;
    }
    if (password !== password2) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
  
    setLoading(true);
  
    // 1) Auth 가입
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }
  
    const user = data?.user;
    if (!user) {
      setLoading(false);
      setError("회원가입은 되었지만 사용자 정보를 가져오지 못했습니다.");
      return;
    }
  
    // 2) profiles 저장
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        name: name,
        join_year: joinYear,
        voice_part: voicePart,
        role: "common"
      });
  
    setLoading(false);
  
    if (profileError) {
      // Auth는 만들어졌는데 프로필 저장이 실패한 경우
      setError(`프로필 저장 실패: ${profileError.message}`);
      return;
    }
  
    alert("회원가입 완료! 홈으로 이동합니다.");
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
          <h1 className="authTitle">회원가입</h1>
          <p className="authSubtitle">이메일과 비밀번호로 계정을 만들어요.</p>
  
          <form className="authForm" onSubmit={signup}>
            <label className="field">
              <span className="labelText">이메일</span>
              <input
                className="input"
                name="email"
                value={form.email}
                onChange={onChange}
                placeholder="example@domain.com"
                autoComplete="email"
              />
            </label>
  
            {/* ✅ 추가: 이름 */}
            <label className="field">
              <span className="labelText">이름</span>
              <input
                className="input"
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="홍길동"
                autoComplete="name"
              />
            </label>
  
            {/* ✅ 추가: 입단년도 */}
            <label className="field">
              <span className="labelText">입단년도</span>
              <input
                className="input"
                name="joinYear"
                value={form.joinYear}
                onChange={onChange}
                placeholder="2024"
                inputMode="numeric"
              />
            </label>
  
            {/* ✅ 추가: 성부 */}
            <label className="field">
              <span className="labelText">성부</span>
              <select
                className="input"
                name="voicePart"
                value={form.voicePart}
                onChange={onChange}
              >
                <option value="Soprano">Soprano</option>
                <option value="Alto">Alto</option>
                <option value="Tenor">Tenor</option>
                <option value="Bass">Bass</option>
              </select>
            </label>
  
            <label className="field">
              <span className="labelText">비밀번호</span>
              <input
                className="input"
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                placeholder="6자 이상"
                autoComplete="new-password"
              />
            </label>
  
            <label className="field">
              <span className="labelText">비밀번호 확인</span>
              <input
                className="input"
                type="password"
                name="password2"
                value={form.password2}
                onChange={onChange}
                placeholder="비밀번호를 한 번 더 입력"
                autoComplete="new-password"
              />
            </label>
  
            {error && (
              <div className="errorText" role="alert">
                {error}
              </div>
            )}
  
            <button className="authBtn" type="submit" disabled={loading}>
              {loading ? "가입 중..." : "가입하기"}
            </button>
          </form>
  
          <div className="authLinks">
            <span className="mutedText">이미 계정이 있나요?</span>
            <Link to="/login" className="authLink">
              로그인
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
  
}
