import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

import "../App.css";
import "./Reserve.css";

/* ================= utils ================= */

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysKey(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return ymd(d);
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

export default function Cancel() {
  const today = new Date();

  /* ---------- auth ---------- */
  const [myUserId, setMyUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMyUserId(data?.user?.id ?? null);
    });
  }, []);

  /* ---------- calendar ---------- */
  const [monthCursor, setMonthCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(today);

  const days = useMemo(() => buildCalendarDays(monthCursor), [monthCursor]);
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const selectedKey = ymd(selectedDate);

  const goPrevMonth = () =>
    setMonthCursor(new Date(year, month - 1, 1));
  const goNextMonth = () =>
    setMonthCursor(new Date(year, month + 1, 1));

  const isSameMonth = (d) =>
    d.getMonth() === monthCursor.getMonth();

  /* ---------- month counts (내 예약 개수) ---------- */
  const [monthCounts, setMonthCounts] = useState({}); // {date: count}

  const fetchMyMonthCounts = useCallback(async () => {
    if (!myUserId) return;

    const start = ymd(startOfMonth(monthCursor));
    const endNext = addDaysKey(endOfMonth(monthCursor), 1);

    const { data, error } = await supabase
      .from("reservations")
      .select("date")
      .eq("user_id", myUserId)
      .gte("date", start)
      .lt("date", endNext);

    if (error) return;

    const counts = {};
    for (const r of data ?? []) {
      counts[r.date] = (counts[r.date] ?? 0) + 1;
    }
    setMonthCounts(counts);
  }, [monthCursor, myUserId]);

  useEffect(() => {
    fetchMyMonthCounts();
  }, [fetchMyMonthCounts]);

  /* ---------- reservations ---------- */
  const [myReservations, setMyReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* 방법 1️⃣: 달력 날짜 클릭 */
  const fetchByDate = useCallback(async () => {
    if (!myUserId) return;

    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("reservation_with_profile")
      .select(
        "id, date, start_min, end_min, title, verified, user_label, user_id"
      )
      .eq("user_id", myUserId)
      .eq("date", selectedKey)
      .order("start_min", { ascending: true });

    if (error) {
      setError("예약을 불러오지 못했습니다.");
      setMyReservations([]);
    } else {
      setMyReservations(data ?? []);
    }

    setLoading(false);
  }, [myUserId, selectedKey]);

  useEffect(() => {
    fetchByDate();
  }, [fetchByDate]);

  /* 방법 2️⃣: 날짜 범위 검색 */
  const [range, setRange] = useState({
    from: ymd(today),
    to: ymd(today),
  });

  const fetchByRange = async () => {
    if (!myUserId) return;

    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("reservation_with_profile")
      .select(
        "id, date, start_min, end_min, title, verified, user_label, user_id"
      )
      .eq("user_id", myUserId)
      .gte("date", range.from)
      .lte("date", range.to)
      .order("date", { ascending: true })
      .order("start_min", { ascending: true });

    if (error) {
      setError("예약을 불러오지 못했습니다.");
      setMyReservations([]);
    } else {
      setMyReservations(data ?? []);
    }

    setLoading(false);
  };

  /* ---------- cancel ---------- */
  const cancelReservation = async (id) => {
    if (!window.confirm("이 예약을 취소할까요?")) return;

    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", id)
      .eq("user_id", myUserId);

    if (error) {
      alert("취소 실패");
    } else {
      setMyReservations((prev) => prev.filter((r) => r.id !== id));
      fetchMyMonthCounts(); // 달력 숫자 갱신
    }
  };

  /* ================= render ================= */

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

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
          {/* 상단 달력 */}
          <div className="calendarCard">
            <div className="dowRow">
              {["일","월","화","수","목","금","토"].map((d) => (
                <div key={d} className="dowCell">{d}</div>
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
                    className={`dayCellCompact ${dim?"dim":""} ${isPast?"past":""} ${isSel?"selected":""}`}
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

          {/* 하단 */}
          <div className="bottomSplit">
            {/* 좌: 내 예약 */}
            <div className="panelCard">
              <div className="panelHeader">
                <div className="panelTitle">내 예약</div>
                <div className="panelSub">{selectedKey}</div>
              </div>

              {loading ? (
                <div className="emptyText">불러오는 중...</div>
              ) : error ? (
                <div className="errorText">{error}</div>
              ) : myReservations.length === 0 ? (
                <div className="emptyText">예약이 없습니다.</div>
              ) : (
                <div className="reserveList">
                  {myReservations.map((r) => (
                    <div key={r.id} className="reserveItem myReserve">
                      <div className="reserveTime">
                        {r.date} · {minToTime(r.start_min)} ~ {minToTime(r.end_min)}
                      </div>

                      <div className="reserveTitleRow">
                        <span className="reserveTitle">
                          {r.title} ({r.user_label})
                        </span>

                        {!r.verified && (
                          <button
                            className="cancelBtn"
                            onClick={() => cancelReservation(r.id)}
                          >
                            취소
                          </button>
                        )}

                        {r.verified && <span className="verifiedBadge">✓</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 우: 날짜 범위 검색 */}
            <div className="panelCard">
              <div className="panelHeader">
                <div className="panelTitle">범위 조회</div>
                <div className="panelSub">내 예약 검색</div>
              </div>

              <label className="field">
                <span className="labelText">시작 날짜</span>
                <input
                  type="date"
                  className="input"
                  value={range.from}
                  onChange={(e) =>
                    setRange((p) => ({ ...p, from: e.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span className="labelText">종료 날짜</span>
                <input
                  type="date"
                  className="input"
                  value={range.to}
                  onChange={(e) =>
                    setRange((p) => ({ ...p, to: e.target.value }))
                  }
                />
              </label>

              <button className="authBtn" onClick={fetchByRange}>
                범위 조회
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
