import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import TimePicker15AmPm from "./TimePicker.jsx";

import "../App.css";
import "./Reserve.css";

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

// "YYYY-MM-DD" -> Date
function parseYmd(s) {
  const [yy, mm, dd] = s.split("-").map(Number);
  return new Date(yy, mm - 1, dd);
}

export default function Reserve() {
  const today = new Date();

  /* ===================== 로그인 유저 ===================== */
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

      if (data?.role === "admin") setIsAdmin(true);
    }

    fetchUserAndRole();
  }, []);

  /* ===================== 달력 ===================== */
  const [monthCursor, setMonthCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(new Date(today));

  const days = useMemo(() => buildCalendarDays(monthCursor), [monthCursor]);
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedKey = ymd(selectedDate);

  /* ===================== 폼/상태 ===================== */
  const [form, setForm] = useState({
    start: "19:00",
    duration: 60,
    title: "",
  });
  const [error, setError] = useState("");

  // ⭐ 수정 모드
  const [editingId, setEditingId] = useState(null);
  const [editingDate, setEditingDate] = useState(selectedKey);

  const resetEditMode = useCallback(() => {
    setEditingId(null);
    setEditingDate(selectedKey);
    setForm({ start: "19:00", duration: 60, title: "" });
    setError("");
  }, [selectedKey]);

  const editingLocked = editingId !== null;

  const goPrevMonth = () => {
    if (editingLocked) return;
    setMonthCursor(new Date(year, month - 1, 1));
  };
  const goNextMonth = () => {
    if (editingLocked) return;
    setMonthCursor(new Date(year, month + 1, 1));
  };

  const isSameMonth = (d) => d.getMonth() === monthCursor.getMonth();

  /* ===================== 월별 뱃지(전체 예약 개수) ===================== */
  const [monthCounts, setMonthCounts] = useState({});

  const fetchMonthCounts = useCallback(async () => {
    const start = ymd(startOfMonth(monthCursor));
    const endNext = addDaysKey(endOfMonth(monthCursor), 1);

    const { data, error } = await supabase
      .from("reservations")
      .select("date")
      .gte("date", start)
      .lt("date", endNext);

    if (error) return;

    const counts = {};
    for (const r of data ?? []) counts[r.date] = (counts[r.date] ?? 0) + 1;
    setMonthCounts(counts);
  }, [monthCursor]);

  useEffect(() => {
    fetchMonthCounts();
  }, [fetchMonthCounts]);

  /* ===================== 선택 날짜 예약 목록 ===================== */
  const [serverReservations, setServerReservations] = useState([]);
  const [loadingResv, setLoadingResv] = useState(false);

  const fetchReservations = useCallback(async () => {
    setLoadingResv(true);
    setError("");

    const { data, error } = await supabase
      .from("reservation_with_profile")
      .select("id, date, start_min, end_min, title, verified, user_label, user_id")
      .eq("date", selectedKey)
      .order("start_min", { ascending: true });

    if (error) {
      console.error(error);
      setError("예약 정보를 불러오지 못했습니다.");
      setServerReservations([]);
      setLoadingResv(false);
      return;
    }

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

    setLoadingResv(false);
  }, [selectedKey]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const reservationsForDay = serverReservations;

  /* ===================== 충돌 검사용 (원본 테이블) ===================== */
  const fetchRawReservationsForDay = async (dayKey) => {
    const { data, error } = await supabase
      .from("reservations")
      .select("id, start_min, end_min")
      .eq("date", dayKey)
      .order("start_min", { ascending: true });

    if (error) throw error;

    return (data ?? []).map((r) => ({
      id: r.id,
      startMin: r.start_min,
      endMin: r.end_min,
    }));
  };

  /* ===================== 입력 변경 ===================== */
  const onChange = (e) => {
    setError("");
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  /* ===================== 예약 취소 (내 예약만) ===================== */
  const cancelReservation = async (id) => {
    if (!myUserId) return;
    if (!window.confirm("이 예약을 취소할까요?")) return;

    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", id)
      .eq("user_id", myUserId);

    if (error) {
      console.error(error);
      alert("예약 취소에 실패했습니다. (RLS/권한을 확인하세요)");
      return;
    }

    if (editingId === id) resetEditMode();

    await fetchReservations();
    await fetchMonthCounts();
  };

  /* ===================== 예약 추가/수정 ===================== */
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

    if (editingId && endTotal > 24 * 60) {
      setError("수정은 자정(24:00) 넘김을 아직 지원하지 않습니다. 취소 후 다시 예약해 주세요.");
      return;
    }

    const title = form.title.trim() || "예약";

    try {
      if (editingId) {
        if (!myUserId) {
          setError("로그인이 필요합니다.");
          return;
        }

        const targetDay = editingDate;
        const partStart = startMin;
        const partEnd = endTotal;

        const existing = await fetchRawReservationsForDay(targetDay);
        const conflict = existing.some((r) => {
          if (r.id === editingId) return false;
          return overlaps(partStart, partEnd, r.startMin, r.endMin);
        });
        if (conflict) {
          setError("해당 시간대는 이미 예약이 있습니다. 다른 시간을 선택해 주세요.");
          return;
        }

        const { error: upErr } = await supabase
          .from("reservations")
          .update({
            date: targetDay,
            start_min: partStart,
            end_min: partEnd,
            title: title,
            verified: isAdmin, // 기존 정책 유지
          })
          .eq("id", editingId)
          .eq("user_id", myUserId);

        if (upErr) throw upErr;

        resetEditMode();

        if (targetDay !== selectedKey) {
          const [yy, mm, dd] = targetDay.split("-").map(Number);
          setSelectedDate(new Date(yy, mm - 1, dd));
        }
      } else {
        const crossesMidnight = endTotal > 24 * 60;

        const day1 = selectedKey;
        const day2 = addDaysKey(selectedDate, 1);

        const part1Start = startMin;
        const part1End = Math.min(24 * 60, endTotal);

        const part2Start = 0;
        const part2End = crossesMidnight ? endTotal - 24 * 60 : 0;

        const day1Existing = await fetchRawReservationsForDay(day1);
        const conflictDay1 = day1Existing.some((r) =>
          overlaps(part1Start, part1End, r.startMin, r.endMin)
        );
        if (conflictDay1) {
          setError("해당 시간대는 이미 예약이 있습니다. 다른 시간을 선택해 주세요.");
          return;
        }

        if (crossesMidnight) {
          const day2Existing = await fetchRawReservationsForDay(day2);
          const conflictDay2 = day2Existing.some((r) =>
            overlaps(part2Start, part2End, r.startMin, r.endMin)
          );
          if (conflictDay2) {
            setError("다음날(자정 이후) 시간대에 이미 예약이 있습니다. 다른 시간을 선택해 주세요.");
            return;
          }
        }

        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) {
          setError("로그인이 필요합니다.");
          return;
        }

        const rows = [
          {
            date: day1,
            start_min: part1Start,
            end_min: part1End,
            title: crossesMidnight ? `${title} (익일 포함)` : title,
            verified: isAdmin,
            user_id: user.id,
          },
        ];

        if (crossesMidnight && part2End > 0) {
          rows.push({
            date: day2,
            start_min: part2Start,
            end_min: part2End,
            title: `${title} (전날부터)`,
            verified: isAdmin,
            user_id: user.id,
          });
        }

        const { error: insErr } = await supabase.from("reservations").insert(rows);
        if (insErr) throw insErr;

        setForm((p) => ({ ...p, title: "" }));
      }

      await fetchReservations();
      await fetchMonthCounts();
    } catch (err) {
      console.error(err);
      setError("저장에 실패했습니다. (RLS/테이블/네트워크를 확인하세요)");
    }
  };

  /* ===================== duration options ===================== */
  const durationOptions = useMemo(() => {
    const arr = [];
    for (let m = 15; m <= 180; m += 15) arr.push(m);
    return arr;
  }, []);

  /* ===================== draft highlight ===================== */
  const draftRange = useMemo(() => {
    const s = timeToMin(form.start);
    const dur = Number(form.duration);
    if (!Number.isFinite(s) || !Number.isFinite(dur) || dur <= 0) return null;

    const endTotal = s + dur;
    const start = s;
    const end = Math.min(24 * 60, endTotal);
    if (end <= start) return null;
    return { start, end };
  }, [form.start, form.duration]);

  /* ===================== ✅ 정기예약(관리자) ===================== */
  const [recurring, setRecurring] = useState(() => ({
    startDate: ymd(today),
    endDate: ymd(today),
    intervalType: "week", // "day" | "week"
    interval: 1, // N
    start: "19:00",
    duration: 60,
    title: "",
  }));
  const [recurringLoading, setRecurringLoading] = useState(false);

  const buildRecurringDates = (startStr, endStr, type, intervalN) => {
    const start = parseYmd(startStr);
    const end = parseYmd(endStr);
    if (!(start instanceof Date) || isNaN(start)) return [];
    if (!(end instanceof Date) || isNaN(end)) return [];
    if (start > end) return [];
    const stepDays = type === "day" ? intervalN : intervalN * 7;
    if (!Number.isFinite(stepDays) || stepDays <= 0) return [];

    const out = [];
    let cur = new Date(start);
    while (cur <= end) {
      out.push(ymd(cur));
      cur.setDate(cur.getDate() + stepDays);
    }
    return out;
  };

  const handleCreateRecurring = async () => {
    if (!isAdmin) return;
    if (!myUserId) {
      setError("로그인이 필요합니다.");
      return;
    }

    setError("");

    const startMin = timeToMin(recurring.start);
    const durationMin = Number(recurring.duration);
    const intervalN = Number(recurring.interval);

    if (!Number.isFinite(startMin) || !Number.isFinite(durationMin)) {
      setError("정기예약 시간/사용시간 형식이 올바르지 않습니다.");
      return;
    }
    if (startMin % 15 !== 0 || durationMin % 15 !== 0) {
      setError("정기예약 시간은 15분 단위로 선택해 주세요.");
      return;
    }
    if (durationMin <= 0) {
      setError("정기예약 사용 시간은 0보다 커야 합니다.");
      return;
    }

    const endTotal = startMin + durationMin;
    if (endTotal > 24 * 60) {
      setError("정기예약은 자정(24:00) 넘김을 아직 지원하지 않습니다.");
      return;
    }

    const title = (recurring.title || "").trim() || "정기예약";

    const dates = buildRecurringDates(
      recurring.startDate,
      recurring.endDate,
      recurring.intervalType,
      intervalN
    );

    if (dates.length === 0) {
      setError("정기예약 날짜 범위/텀이 올바르지 않습니다.");
      return;
    }

    setRecurringLoading(true);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    try {
      for (const dayKey of dates) {
        // 충돌 검사
        const existing = await fetchRawReservationsForDay(dayKey);
        const conflict = existing.some((r) =>
          overlaps(startMin, endTotal, r.startMin, r.endMin)
        );

        if (conflict) {
          skipped += 1;
          continue;
        }

        const { error: insErr } = await supabase.from("reservations").insert([
          {
            date: dayKey,
            start_min: startMin,
            end_min: endTotal,
            title: title,
            verified: true, // 관리자가 생성한 정기예약은 기본 verified=true 추천
            user_id: myUserId,
          },
        ]);

        if (insErr) {
          console.error(insErr);
          failed += 1;
        } else {
          created += 1;
        }
      }

      await fetchReservations();
      await fetchMonthCounts();

      setError(`정기예약 완료: 생성 ${created}건 / 충돌로 스킵 ${skipped}건 / 실패 ${failed}건`);
    } catch (e) {
      console.error(e);
      setError("정기예약 생성 중 오류가 발생했습니다.");
    } finally {
      setRecurringLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="loginBackBtn">← 홈</Link>

        <div className="monthBar">
          <button
            className="navBtn"
            onClick={goPrevMonth}
            aria-label="Prev month"
            disabled={editingLocked}
            title={editingLocked ? "수정 중에는 이동할 수 없어요. '수정 취소'를 눌러주세요." : ""}
          >
            ◀
          </button>
          <div className="monthTitle">{year}년 {month + 1}월</div>
          <button
            className="navBtn"
            onClick={goNextMonth}
            aria-label="Next month"
            disabled={editingLocked}
            title={editingLocked ? "수정 중에는 이동할 수 없어요. '수정 취소'를 눌러주세요." : ""}
          >
            ▶
          </button>
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

                const disabledByEdit = editingLocked && !isSel;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabledByEdit}
                    className={`dayCellCompact ${dim ? "dim" : ""} ${isPast ? "past" : ""} ${isSel ? "selected" : ""} ${disabledByEdit ? "editLocked" : ""}`}
                    onClick={() => {
                      if (disabledByEdit) return;
                      setSelectedDate(d);
                    }}
                    aria-label={`${key} 선택`}
                    title={disabledByEdit ? "수정 중에는 날짜를 바꿀 수 없어요. '수정 취소'를 눌러주세요." : ""}
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
            {/* 좌: 예약 현황 */}
            <div className="panelCard">
              <div className="panelHeader">
                <div className="panelTitle">예약 현황</div>
                <div className="panelSub">{selectedKey}</div>
              </div>

              {loadingResv ? (
                <div className="emptyText">불러오는 중...</div>
              ) : reservationsForDay.length === 0 ? (
                <div className="emptyText">예약이 없습니다.</div>
              ) : (
                <div className="reserveList">
                  {reservationsForDay.map((r) => {
                    const isOverlap =
                      draftRange && overlaps(draftRange.start, draftRange.end, r.startMin, r.endMin);

                    const overlapClass = isOverlap
                      ? (r.verified ? "overlapVerified" : "overlapUnverified")
                      : "";

                    const isMine = myUserId && r.user_id === myUserId;

                    return (
                      <div key={r.id} className={`reserveItem ${overlapClass}`}>
                        <div className="reserveTime">
                          {minToTime(r.startMin)} ~ {minToTime(r.endMin)}
                        </div>

                        <div className="reserveTitleRow">
                          <span className="reserveTitle">
                            {r.title} ({r.user_label})
                          </span>

                          {r.verified && (
                            <span className="verifiedBadge" title="확인된 예약">✓</span>
                          )}

                          {isMine && (
                            <>
                              <button
                                className="editBtn"
                                type="button"
                                onClick={() => {
                                  setError("");
                                  setEditingId(r.id);
                                  setEditingDate(selectedKey);
                                  setForm({
                                    start: minToTime(r.startMin),
                                    duration: r.endMin - r.startMin,
                                    title: r.title,
                                  });
                                }}
                              >
                                수정
                              </button>

                              <button
                                className="cancelBtn"
                                type="button"
                                onClick={() => cancelReservation(r.id)}
                              >
                                취소
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 우: 예약 입력/수정 + (관리자) 정기예약 */}
            <div className="panelCard">
              <div className="panelHeader">
                <div className="panelTitle">{editingLocked ? "예약 수정" : "예약하기"}</div>
                <div className="panelSub">
                  {editingLocked ? "수정 중에는 달력을 이동할 수 없어요." : "시작/종료 시간을 입력"}
                </div>
              </div>

              <form className="reserveForm" onSubmit={handleReserve}>
                {editingLocked && (
                  <label className="field">
                    <span className="labelText">날짜</span>
                    <input
                      className="input"
                      type="date"
                      value={editingDate}
                      onChange={(e) => {
                        setError("");
                        setEditingDate(e.target.value);
                      }}
                    />
                  </label>
                )}

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
                  {editingLocked ? "예약 수정" : "예약 추가"}
                </button>

                {editingLocked && (
                  <button
                    className="authBtn secondaryBtn"
                    type="button"
                    onClick={resetEditMode}
                  >
                    수정 취소
                  </button>
                )}
              </form>

              {/* ✅ 관리자 전용 정기예약 */}
              {isAdmin && !editingLocked && (
                <>
                  <div className="adminDivider" />
                  <form className="reserveForm adminForm">

                  <div className="panelHeader" style={{ paddingTop: 0 }}>
                    <div className="panelTitle">정기 예약 (관리자)</div>
                    <div className="panelSub">기간/텀을 지정해 여러 건 생성</div>
                  </div>

                  <label className="field">
                    <span className="labelText">시작 날짜</span>
                    <input
                      type="date"
                      className="input"
                      value={recurring.startDate}
                      onChange={(e) => setRecurring((p) => ({ ...p, startDate: e.target.value }))}
                    />
                  </label>

                  <label className="field">
                    <span className="labelText">끝 날짜</span>
                    <input
                      type="date"
                      className="input"
                      value={recurring.endDate}
                      onChange={(e) => setRecurring((p) => ({ ...p, endDate: e.target.value }))}
                    />
                  </label>

                  <label className="field">
                    <span className="labelText">예약 텀</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <select
                        className="input"
                        value={recurring.intervalType}
                        onChange={(e) => setRecurring((p) => ({ ...p, intervalType: e.target.value }))}
                      >
                        <option value="week">매 N주</option>
                        <option value="day">매 N일</option>
                      </select>

                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={recurring.interval}
                        onChange={(e) => setRecurring((p) => ({ ...p, interval: Number(e.target.value) }))}
                        placeholder="N"
                      />
                    </div>
                  </label>

                  <label className="field">
                    <span className="labelText">시작 시간</span>
                    <TimePicker15AmPm
                      value={recurring.start}
                      onChange={(v) => setRecurring((p) => ({ ...p, start: v }))}
                    />
                  </label>

                  <label className="field">
                    <span className="labelText">사용 시간</span>
                    <select
                      className="input"
                      value={recurring.duration}
                      onChange={(e) => setRecurring((p) => ({ ...p, duration: Number(e.target.value) }))}
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
                      value={recurring.title}
                      onChange={(e) => setRecurring((p) => ({ ...p, title: e.target.value }))}
                      placeholder="예: 매주 운영회의"
                    />
                  </label>
                  
                  
                  <button
                    className="authBtn adminBtn"
                    type="button"
                    onClick={handleCreateRecurring}
                    disabled={recurringLoading}
                    title="충돌나는 날짜는 자동으로 건너뜁니다."
                  >
                    {recurringLoading ? "생성 중..." : "정기 예약 생성"}
                  </button>
                  

                  <div className="tinyHelp">
                    * 충돌(이미 예약된 시간대)은 자동으로 스킵됩니다. (자정 넘김 미지원)
                  </div>
                  </form>
                </>
              )}

              <div className="tinyHelp">
                * 15분 단위만 가능.
                {editingLocked ? " 수정 중에는 달력 이동/날짜 클릭이 제한됩니다." : ""}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
