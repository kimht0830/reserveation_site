import React, { useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import TimePicker15AmPm from "./TimePicker.jsx"

import "../App.css";
import "./Reserve.css"

function addDaysKey(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

function formatDuration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
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

// "HH:MM" -> minutes
function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}
// minutes -> "HH:MM"
function minToTime(min) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  // [start, end) 겹침 검사
  return aStart < bEnd && bStart < aEnd;
}

export default function Reserve() {
  const today = new Date();
  const [monthCursor, setMonthCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const fetchMonthCounts = async () => {
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
  };

  React.useEffect(() => {
    let alive = true;
    fetchMonthCounts();
    return () => { alive = false; };
  }, [fetchMonthCounts,monthCursor]);

  const [selectedDate, setSelectedDate] = useState(new Date(today));

  /*// 데모 예약 데이터: { "YYYY-MM-DD": [{startMin,endMin,title}] }
  const [demoReservations, setDemoReservations] = useState(() => {
    const k = ymd(today);
    return {
      [k]: [
        { startMin: 19 * 60, endMin: 20 * 60 + 30, title: "예시 예약" , verified: true},
      ],
    };
  });*/

  const [form, setForm] = useState({
    start: "19:00",
    duration: 60, // 분 단위 (15분 단위만 허용)
    title: "",
  });
  const [error, setError] = useState("");

  const [serverReservations, setServerReservations] = useState([]); // 선택 날짜의 예약 목록
  const [loadingResv, setLoadingResv] = useState(false);
  const [monthCounts, setMonthCounts] = useState({}); // { "YYYY-MM-DD": number }

  const days = useMemo(() => buildCalendarDays(monthCursor), [monthCursor]);
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();

  const goPrevMonth = () => setMonthCursor(new Date(year, month - 1, 1));
  const goNextMonth = () => setMonthCursor(new Date(year, month + 1, 1));

  const isSameMonth = (d) => d.getMonth() === monthCursor.getMonth();

  const selectedKey = ymd(selectedDate);
  const fetchReservations = useCallback(async () => {
    setLoadingResv(true);
    setError("");
  
    const { data, error } = await supabase
      .from("reservation_with_profile")
      .select("id, date, start_min, end_min, title, verified, user_label")
      .eq("date", selectedKey)
      .order("start_min", { ascending: true });
  
    if (error) {
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
        }))
      );
    }
  
    setLoadingResv(false);
  }, [selectedKey]);
  
  React.useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const reservationsForDay = serverReservations;
  

  const onChange = (e) => {
    setError("");
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const fetchReservationsForSelectedDay = async (dayKey) => {
    const { data, error } = await supabase
      .from("reservation_with_profile")
      .select("id, date, start_min, end_min, title, verified, user_label")
      .eq("date", dayKey)
      .order("start_min", { ascending: true });
  
    if (error) throw error;
  
    return (data ?? []).map((r) => ({
      id: r.id,
      startMin: r.start_min,
      endMin: r.end_min,
      title: r.title,
      verified: r.verified,
      user_label: r.user_label
    }));
  };

  const handleReserve = async (e) => {
    e.preventDefault();
    setError("");
  
    const startMin = timeToMin(form.start);
    const durationMin = Number(form.duration);
  
    if (!Number.isFinite(startMin) || !Number.isFinite(durationMin)) {
      setError("시간/사용시간 형식이 올바르지 않습니다.");
      return;
    }
    if (startMin % 15 !== 0 || durationMin % 15 !== 0) {
      setError("시간은 15분 단위로 선택해 주세요.");
      return;
    }
    if (durationMin <= 0) {
      setError("사용 시간은 0보다 커야 합니다.");
      return;
    }
  
    const endTotal = startMin + durationMin;
    const crossesMidnight = endTotal > 24 * 60;
  
    const day1 = selectedKey;
    const day2 = addDaysKey(selectedDate, 1);
  
    // 1일차 구간
    const part1Start = startMin;
    const part1End = Math.min(24 * 60, endTotal);
  
    // 2일차 구간(자정 넘을 때)
    const part2Start = 0;
    const part2End = crossesMidnight ? endTotal - 24 * 60 : 0;
  
    // ✅ 충돌 검사: DB에서 해당 날짜 예약을 불러와서 검사
    try {
      const day1Existing = await fetchReservationsForSelectedDay(day1);
      const conflictDay1 = day1Existing.some((r) =>
        overlaps(part1Start, part1End, r.startMin, r.endMin)
      );
      if (conflictDay1) {
        setError("해당 시간대는 이미 예약이 있습니다. 다른 시간을 선택해 주세요.");
        return;
      }
  
      if (crossesMidnight) {
        const day2Existing = await fetchReservationsForSelectedDay(day2);
        const conflictDay2 = day2Existing.some((r) =>
          overlaps(part2Start, part2End, r.startMin, r.endMin)
        );
        if (conflictDay2) {
          setError("다음날(자정 이후) 시간대에 이미 예약이 있습니다. 다른 시간을 선택해 주세요.");
          return;
        }
      }
  
      const title = form.title.trim() || "예약";
  
      const { data: { user }, error } = await supabase.auth.getUser();
      // ✅ DB insert (자정 넘김이면 2건 insert)
      const rows = [
        {
          date: day1,
          start_min: part1Start,
          end_min: part1End,
          title: crossesMidnight ? `${title} (익일 포함)` : title,
          verified: false,
          user_id: user.id,
        },
      ];
  
      if (crossesMidnight && part2End > 0) {
        rows.push({
          date: day2,
          start_min: part2Start,
          end_min: part2End,
          title: `${title} (전날부터)`,
          verified: false,
          user_id: user.id,
        });
      }
  
      const { error: insErr } = await supabase.from("reservations").insert(rows);
      if (insErr) throw insErr;
  
      // ✅ 입력칸 초기화
      setForm((p) => ({ ...p, title: "" }));
  
      // ✅ 화면 갱신: 선택 날짜(day1) 다시 불러오기
      //const refreshed = await fetchReservationsForSelectedDay(day1);
      await fetchReservations();
      await fetchMonthCounts();
      //setServerReservations(refreshed); // ← 아래 3) 참고
  
    } catch (err) {
      console.error(err);
      setError("예약 저장에 실패했습니다. (RLS/테이블/네트워크를 확인하세요)");
    }
  };

  
  

  const durationOptions = useMemo(() => {
    // 15분 ~ 12시간(720분) 예시. 필요하면 더 늘려도 됨.
    const arr = [];
    for (let m = 15; m <= 180; m += 15) arr.push(m);
    return arr;
  }, []);

  // 지난 날짜 흐리게
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const draftRange = useMemo(() => {
    const s = timeToMin(form.start);
    const dur = Number(form.duration);

    if (!Number.isFinite(s) || !Number.isFinite(dur) || dur <= 0) return null;

    const endTotal = s + dur;

    // ✅ 왼쪽은 "선택한 날짜" 일정만 보여주니까, 그 날짜에 해당하는 구간만 하이라이트
    const start = s;
    const end = Math.min(24 * 60, endTotal); // 자정 넘으면 24:00까지만

    // 유효한 범위만
    if (end <= start) return null;

    return { start, end };
  }, [form.start, form.duration]);

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

          {/* 하단: 좌 예약현황 / 우 입력 */}
          <div className="bottomSplit">
            {/* 좌: 예약 현황 */}
            <div className="panelCard">
              <div className="panelHeader">
                <div className="panelTitle">예약 현황</div>
                <div className="panelSub">{selectedKey}</div>
              </div>

              {reservationsForDay.length === 0 ? (
                <div className="emptyText">예약이 없습니다.</div>
              ) : (
                <div className="reserveList">
                  {reservationsForDay.map((r, idx) => {
                    const isOverlap =
                      draftRange && overlaps(draftRange.start, draftRange.end, r.startMin, r.endMin);

                    const overlapClass = isOverlap
                      ? (r.verified ? "overlapVerified" : "overlapUnverified")
                      : "";

                    return (
                      <div key={idx} className={`reserveItem ${overlapClass}`}>
                        <div className="reserveTime">
                          {minToTime(r.startMin)} ~ {minToTime(r.endMin)}
                        </div>

                        <div className="reserveTitleRow">
                          <span className="reserveTitle">{r.title+" ("+r.user_label+")"}</span>

                          {r.verified && (
                            <span className="verifiedBadge" title="확인된 예약">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 우: 시간 입력 */}
            <div className="panelCard">
              <div className="panelHeader">
                <div className="panelTitle">예약하기</div>
                <div className="panelSub">시작/종료 시간을 입력</div>
              </div>

              <form className="reserveForm" onSubmit={handleReserve}>
              <label className="field">
                <span className="labelText">시작 시간</span>
                <TimePicker15AmPm
                  value={form.start}
                  onChange={(v) => {
                    setError("");
                    setForm((p) => ({ ...p, start: v }));
                  }}
                />
              </label>

              <label className="field">
                <span className="labelText">사용 시간</span>
                <select
                  className="input"
                  name="duration"
                  value={form.duration}
                  onChange={(e) => {
                    setError("");
                    setForm((p) => ({ ...p, duration: Number(e.target.value) }));
                  }}
                >
                  {durationOptions.map((m) => (
                    <option key={m} value={m}>
                      {formatDuration(m)}
                    </option>
                  ))}
                </select>
              </label>

                <label className="field">
                  <span className="labelText">예약 사유</span>
                  <input
                    className="input"
                    name="title"
                    value={form.title}
                    onChange={onChange}
                    placeholder="예: 합주, 파트연습"
                  />
                </label>

                {error && (
                  <div className="errorText" role="alert">{error}</div>
                )}

                <button className="authBtn" type="submit">
                  예약 추가
                </button>
              </form>

              <div className="tinyHelp">
                * 15분 단위만 가능. (나중에 DB 연동 시 자동으로 “예약됨” 표시)
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
