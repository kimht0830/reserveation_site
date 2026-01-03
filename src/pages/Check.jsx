import React, { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

import "../App.css";
import "./Reserve.css"; // ✅ 기존 Reserve.css 그대로 재사용

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
  gridStart.setDate(start.getDate() - start.getDay()); // Sun

  const gridEnd = new Date(end);
  gridEnd.setDate(end.getDate() + (6 - end.getDay())); // Sat

  const days = [];
  const cur = new Date(gridStart);
  while (cur <= gridEnd) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// minutes -> "HH:MM"
function minToTime(min) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export default function Check() {

    const [myUserId, setMyUserId] = useState(null);
    React.useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
          setMyUserId(data?.user?.id ?? null);
        });
      }, []);
  const today = new Date();

  const [monthCursor, setMonthCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(new Date(today));
  const [monthCounts, setMonthCounts] = useState({}); // { "YYYY-MM-DD": number }

  const [serverReservations, setServerReservations] = useState([]); // 선택 날짜 예약
  const [loadingResv, setLoadingResv] = useState(false);
  const [error, setError] = useState("");

  const days = useMemo(() => buildCalendarDays(monthCursor), [monthCursor]);
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const selectedKey = ymd(selectedDate);

  const goPrevMonth = () => setMonthCursor(new Date(year, month - 1, 1));
  const goNextMonth = () => setMonthCursor(new Date(year, month + 1, 1));
  const isSameMonth = (d) => d.getMonth() === monthCursor.getMonth();

  // 지난 날짜 흐리게(+클릭 막기) - Reserve.jsx와 동일 컨셉 :contentReference[oaicite:1]{index=1}
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const fetchMonthCounts = useCallback(async () => {
    const start = ymd(startOfMonth(monthCursor));
    const endNext = addDaysKey(endOfMonth(monthCursor), 1);

    const { data, error } = await supabase
      .from("reservations")
      .select("date")
      .gte("date", start)
      .lt("date", endNext);

    if (error) throw error;

    const counts = {};
    for (const r of data ?? []) counts[r.date] = (counts[r.date] ?? 0) + 1;
    setMonthCounts(counts);
  }, [monthCursor]);

  React.useEffect(() => {
    fetchMonthCounts().catch((e) => console.error(e));
  }, [fetchMonthCounts]);

  // 선택 날짜 예약 불러오기 (Reserve.jsx의 fetchReservations 로직 유지) :contentReference[oaicite:2]{index=2}
  React.useEffect(() => {
    let alive = true;

    async function fetchReservations() {
      setLoadingResv(true);
      setError("");

      const { data, error } = await supabase
        .from("reservation_with_profile")
        .select("id, date, start_min, end_min, title, verified, user_label, user_id")
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

  
  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="loginBackBtn">← 홈</Link>

        <div className="monthBar">
          <button className="navBtn" onClick={goPrevMonth} aria-label="Prev month">◀</button>
          <div className="monthTitle">{year}년 {month + 1}월</div>
          <button className="navBtn" onClick={goNextMonth} aria-label="Next month">▶</button>
        </div>
      </header>

      <main className="hero">
        <div className="reserveLayout2">
          {/* 상단: 달력 */}
          <div className="calendarCard">
            <div className="dowRow">
              {["일", "월", "화", "수", "목", "금", "토"].map((x) => (
                <div key={x} className="dowCell">{x}</div>
              ))}
            </div>

            <div className="calendarGridCompact">
              {days.map((d) => {
                const key = ymd(d);
                const dim = !isSameMonth(d);
                const isSel = key === selectedKey;
                const isPast = d < startOfToday;

                const count = monthCounts[key] ?? 0;

                return (
                  <button
                    key={key}
                    type="button"
                    className={`dayCellCompact ${dim ? "dim" : ""} ${isPast ? "past" : ""} ${isSel ? "selected" : ""}`}
                    onClick={() => setSelectedDate(d)}
                    aria-label={`${key} 선택`}
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

          {/* 하단: 예약 현황만 */}
          <div className="panelCard">
            <div className="panelHeader">
              <div className="panelTitle">예약 현황</div>
              <div className="panelSub">{selectedKey}</div>
            </div>

            {error && <div className="errorText" role="alert">{error}</div>}

            {loadingResv ? (
              <div className="emptyText">불러오는 중...</div>
            ) : serverReservations.length === 0 ? (
              <div className="emptyText">예약이 없습니다.</div>
            ) : (
              <div className="reserveList">
                {serverReservations.map((r) => {const isMine = myUserId && r.user_id === myUserId;
                return (    
                  <div key={r.id} className={`reserveItem ${isMine ? "myReserve" : ""}`}>
                    <div className="reserveTime">
                      {minToTime(r.startMin)} ~ {minToTime(r.endMin)}
                    </div>

                    <div className="reserveTitleRow">
                      <span className="reserveTitle">{r.title+" ("+r.user_label+")"}</span>
                      {r.verified && (
                        <span className="verifiedBadge" title="확인된 예약">✓</span>
                      )}
                    </div>
                  </div>
                )})
            }
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
