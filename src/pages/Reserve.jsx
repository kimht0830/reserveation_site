import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import "../App.css";


function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDuration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function addDaysKey(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

function clampTimeValue(value) {
  if (typeof value !== "string" || !value.includes(":")) return "00:00";
  const [h, m] = value.split(":").map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "00:00";
  const hh = Math.min(23, Math.max(0, h));
  const allowed = [0, 15, 30, 45];
  const mm = allowed.includes(m) ? m : 0;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function toAmPm(h24) {
  const isPM = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { ap: isPM ? "PM" : "AM", h12 };
}

function to24(ap, h12) {
  // ap: "AM"|"PM", h12: 1..12
  if (ap === "AM") return h12 === 12 ? 0 : h12;
  // PM
  return h12 === 12 ? 12 : h12 + 12;
}

function TimePicker15AmPm({
  value,
  onChange,
  disabled = false,
  placeholder = "시간 선택",
  min, // optional: "HH:MM"
}) {
  const [open, setOpen] = React.useState(false);

  const safeValue = React.useMemo(() => clampTimeValue(value), [value]);
  const minMin = React.useMemo(() => (min ? timeToMin(min) : -Infinity), [min]);

  const [h24, m] = React.useMemo(() => safeValue.split(":").map(Number), [safeValue]);
  const { ap, h12 } = React.useMemo(() => toAmPm(h24), [h24]);

  const minutes = React.useMemo(() => [0, 15, 30, 45], []);
  const hours12 = React.useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const aps = ["AM", "PM"];

  const wrapRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const setTime = (nextAp, nextH12, nextM) => {
    const hh24 = to24(nextAp, nextH12);
    const v = `${pad2(hh24)}:${pad2(nextM)}`;
    if (timeToMin(v) < minMin) return;
    onChange?.(v);
  };

  const isDisabledOption = (nextAp, nextH12, nextM) => {
    const hh24 = to24(nextAp, nextH12);
    const v = `${pad2(hh24)}:${pad2(nextM)}`;
    return timeToMin(v) < minMin;
  };

  

  // 표시용(오전/오후)
  const displayText = React.useMemo(() => {
    const labelAp = ap === "AM" ? "오전" : "오후";
    return `${labelAp} ${h12}:${pad2(m)}`;
  }, [ap, h12, m]);

  return (
    <div ref={wrapRef} className="tpWrap" style={{ position: "relative" }}>
      <button
        type="button"
        className="input tpButton"
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {safeValue ? displayText : placeholder}
        <span style={{ marginLeft: "auto", opacity: 0.7 }}>▾</span>
      </button>

      {open && (
        <div
          className="tpPopup"
          role="dialog"
          aria-label="시간 선택"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 50,
            width: "100%",
            maxWidth: 420,
            padding: 10,
            borderRadius: 12,
            background: "rgba(20,20,30,0.95)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            display: "grid",
            gridTemplateColumns: "0.8fr 1fr 1fr",
            gap: 10,
          }}
        >
          {/* AM/PM */}
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>오전/오후</div>
            <div
              style={{
                maxHeight: 220,
                overflow: "auto",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {aps.map((x) => {
                const active = x === ap;
                return (
                  <button
                    key={x}
                    type="button"
                    onClick={() => setTime(x, h12, m)}
                    className="tpItem"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      background: active ? "rgba(255,255,255,0.10)" : "transparent",
                      color: "white",
                      border: "0",
                      cursor: "pointer",
                    }}
                  >
                    {x === "AM" ? "오전" : "오후"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1~12 */}
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>시</div>
            <div
              style={{
                maxHeight: 220,
                overflow: "auto",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {hours12.map((hh) => {
                const active = hh === h12;
                const disAll = minutes.every((mm) => isDisabledOption(ap, hh, mm));
                return (
                  <button
                    key={hh}
                    type="button"
                    onClick={() => !disAll && setTime(ap, hh, m)}
                    disabled={disAll}
                    className="tpItem"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      background: active ? "rgba(255,255,255,0.10)" : "transparent",
                      color: disAll ? "rgba(255,255,255,0.35)" : "white",
                      border: "0",
                      cursor: disAll ? "not-allowed" : "pointer",
                      opacity: disAll ? 0.7 : 1,
                    }}
                  >
                    {hh}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 00/15/30/45 */}
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>분</div>
            <div
              style={{
                maxHeight: 220,
                overflow: "auto",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {minutes.map((mm) => {
                const active = mm === m;
                const dis = isDisabledOption(ap, h12, mm);
                return (
                  <button
                    key={mm}
                    type="button"
                    onClick={() => !dis && setTime(ap, h12, mm)}
                    disabled={dis}
                    className="tpItem"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      background: active ? "rgba(255,255,255,0.10)" : "transparent",
                      color: dis ? "rgba(255,255,255,0.35)" : "white",
                      border: "0",
                      cursor: dis ? "not-allowed" : "pointer",
                      opacity: dis ? 0.7 : 1,
                    }}
                  >
                    {pad2(mm)}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 6 }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.08)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.10)",
                cursor: "pointer",
              }}
            >
              닫기
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.14)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.10)",
                cursor: "pointer",
              }}
              aria-label="선택 완료"
            >
              완료
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
  const [selectedDate, setSelectedDate] = useState(new Date(today));

  // 데모 예약 데이터: { "YYYY-MM-DD": [{startMin,endMin,title}] }
  const [demoReservations, setDemoReservations] = useState(() => {
    const k = ymd(today);
    return {
      [k]: [
        { startMin: 19 * 60, endMin: 20 * 60 + 30, title: "예시 예약" , verified: true},
      ],
    };
  });

  const [form, setForm] = useState({
    start: "19:00",
    duration: 60, // 분 단위 (15분 단위만 허용)
    title: "",
  });
  const [error, setError] = useState("");

  const days = useMemo(() => buildCalendarDays(monthCursor), [monthCursor]);
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();

  const goPrevMonth = () => setMonthCursor(new Date(year, month - 1, 1));
  const goNextMonth = () => setMonthCursor(new Date(year, month + 1, 1));

  const isSameMonth = (d) => d.getMonth() === monthCursor.getMonth();

  const selectedKey = ymd(selectedDate);
  const reservationsForDay = useMemo(() => {
    const arr = demoReservations[selectedKey] ?? [];
    return [...arr].sort((a, b) => a.startMin - b.startMin);
  }, [demoReservations, selectedKey]);

  const onChange = (e) => {
    setError("");
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleReserve = (e) => {
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
    const part2End = crossesMidnight ? (endTotal - 24 * 60) : 0;
  
    // 예약 배열
    const day1Arr = demoReservations[day1] ?? [];
    const day2Arr = demoReservations[day2] ?? [];
  
    // 겹침 검사
    const conflictDay1 = day1Arr.some((r) =>
      overlaps(part1Start, part1End, r.startMin, r.endMin)
    );
    if (conflictDay1) {
      setError("해당 시간대는 이미 예약이 있습니다. 다른 시간을 선택해 주세요.");
      return;
    }
  
    if (crossesMidnight) {
      const conflictDay2 = day2Arr.some((r) =>
        overlaps(part2Start, part2End, r.startMin, r.endMin)
      );
      if (conflictDay2) {
        setError("다음날(자정 이후) 시간대에 이미 예약이 있습니다. 다른 시간을 선택해 주세요.");
        return;
      }
    }
  
    const title = form.title.trim() || "예약";
  
    setDemoReservations((prev) => {
      const next = { ...prev };
  
      // day1 저장
      const a1 = next[day1] ? [...next[day1]] : [];
      a1.push({
        startMin: part1Start,
        endMin: part1End,
        title: crossesMidnight ? `${title} (익일 포함)` : title,
        verified: false,
      });
      next[day1] = a1;
  
      // day2 저장
      if (crossesMidnight && part2End > 0) {
        const a2 = next[day2] ? [...next[day2]] : [];
        a2.push({
          startMin: part2Start,
          endMin: part2End,
          title: `${title} (전날부터)`,
          verified: false,
        });
        next[day2] = a2;
      }
  
      return next;
    });
  
    setForm((p) => ({ ...p, title: "" }));
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

                const count = (demoReservations[key] ?? []).length;

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
                          <span className="reserveTitle">{r.title}</span>

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
