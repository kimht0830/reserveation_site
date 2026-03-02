import React, { useCallback, useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

import "../App.css";
import "./Reserve.css";

/* ================= util ================= */

function addDaysKey(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function buildCalendarDays(monthDate) {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);

  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - start.getDay());
  const gridEnd = new Date(end);
  gridEnd.setDate(end.getDate() + (6 - end.getDay()));

  const days = [];
  const cur = new Date(gridStart);
  while (cur <= gridEnd) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function minToTime(min) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/* ================= component ================= */

export default function Check() {
  const today = new Date();

  /* ---------- auth / role ---------- */
  const [myUserId, setMyUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchUserAndRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setMyUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (data?.role === "admin") {
        setIsAdmin(true);
      }
    }

    fetchUserAndRole();
  }, []);

  /* ---------- calendar ---------- */
  const [monthCursor, setMonthCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const selectedKey = ymd(selectedDate);

  const days = useMemo(() => buildCalendarDays(monthCursor), [monthCursor]);
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();

  const goPrevMonth = () =>
    setMonthCursor(new Date(year, month - 1, 1));
  const goNextMonth = () =>
    setMonthCursor(new Date(year, month + 1, 1));
  //const isSameMonth = (d) => d.getMonth() === monthCursor.getMonth();

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  /* ---------- month badge counts ---------- */
  const [monthCounts, setMonthCounts] = useState({});

  const fetchMonthCounts = useCallback(async () => {
    const start = ymd(startOfMonth(monthCursor));
    const endNext = addDaysKey(endOfMonth(monthCursor), 1);

    const { data } = await supabase
      .from("reservations")
      .select("date")
      .gte("date", start)
      .lt("date", endNext);

    const counts = {};
    for (const r of data ?? []) {
      counts[r.date] = (counts[r.date] ?? 0) + 1;
    }
    setMonthCounts(counts);
  }, [monthCursor]);

  useEffect(() => {
    fetchMonthCounts();
  }, [fetchMonthCounts]);

  /* ---------- reservations ---------- */
  const [serverReservations, setServerReservations] = useState([]);
  const [loadingResv, setLoadingResv] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function fetchReservations() {
      setLoadingResv(true);
      setError("");

      const { data, error } = await supabase
        .from("reservation_with_profile")
        .select(
          "id, date, start_min, end_min, title, verified, user_label, user_id"
        )
        .eq("date", selectedKey)
        .order("start_min", { ascending: true });

      if (!alive) return;

      if (error) {
        console.error(error);
        setError("예약 정보를 불러오지 못했습니다.");
        setServerReservations([]);
      } else {
        setServerReservations(
          (data ?? []).map((r) => ({
            id: r.id,
            startMin: r.start_min,
            endMin: r.end_min,
            title: r.title,
            verified: r.verified,
            user_label: r.user_label,
            user_id: r.user_id,
          }))
        );
      }

      setLoadingResv(false);
    }

    fetchReservations();
    return () => {
      alive = false;
    };
  }, [selectedKey]);

  /* ---------- admin: verified toggle ---------- */
  const toggleVerified = async (id, nextValue) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from("reservations")
      .update({ verified: nextValue })
      .eq("id", id);

    if (error) {
      alert("확인 상태 변경 실패");
      console.error(error);
      return;
    }

    setServerReservations((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, verified: nextValue } : r
      )
    );
  };

  /* ================= render ================= */

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="loginBackBtn">← 홈</Link>

        <div className="monthBar">
          <button className="navBtn" onClick={goPrevMonth}>◀</button>
          <div className="monthTitle">{year}년 {month + 1}월</div>
          <button className="navBtn" onClick={goNextMonth}>▶</button>
        </div>
      </header>

      <main className="hero">
        <div className="reserveLayout2">
          {/* 달력 */}
          <div className="calendarCard">
            <div className="dowRow">
              {["일","월","화","수","목","금","토"].map((d) => (
                <div key={d} className="dowCell">{d}</div>
              ))}
            </div>

            <div className="calendarGridCompact">
              {days.map((d) => {
                const key = ymd(d);
                const isSel = key === selectedKey;
                const isPast = d < startOfToday;
                const count = monthCounts[key] ?? 0;

                return (
                  <button
                    key={key}
                    className={`dayCellCompact ${isSel?"selected":""} ${isPast?"past":""}`}
                    onClick={() => setSelectedDate(d)}
                  >
                    <div className="dayTopRow">
                      <span className="dayNum">{d.getDate()}</span>
                      {!!count && <span className="dayBadge">{count}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 예약 목록 */}
          <div className="panelCard">
            <div className="panelHeader">
              <div className="panelTitle">예약 현황</div>
              <div className="panelSub">{selectedKey}</div>
            </div>

            {error && <div className="errorText">{error}</div>}

            {loadingResv ? (
              <div className="emptyText">불러오는 중...</div>
            ) : serverReservations.length === 0 ? (
              <div className="emptyText">예약이 없습니다.</div>
            ) : (
              <div className="reserveList">
                {serverReservations.map((r) => {
                  const isMine = myUserId && r.user_id === myUserId;

                  return (
                    <div
                      key={r.id}
                      className={`reserveItem ${isMine ? "myReserve" : ""}`}
                    >
                      <div className="reserveTime">
                        {minToTime(r.startMin)} ~ {minToTime(r.endMin)}
                      </div>

                      <div className="reserveTitleRow">
                        <span className="reserveTitle">
                          {r.title} ({r.user_label})
                        </span>

                        {r.verified && (
                          <span className="verifiedBadge">✓</span>
                        )}

                        {isAdmin && (
                          <button
                            className={`verifyBtn ${r.verified ? "on" : "off"}`}
                            onClick={() =>
                              toggleVerified(r.id, !r.verified)
                            }
                          >
                            {r.verified ? "확인 취소" : "확인"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
