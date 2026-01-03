import React from "react";
import "./Reserve.css"

function pad2(n) {
    return String(n).padStart(2, "0");
  }
  
function timeToMin(t) {
    const [h, m] = t.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
    return h * 60 + m;
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
  
export default function TimePicker15AmPm({
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
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(false);
                }}                
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
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(false);
                  }}
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