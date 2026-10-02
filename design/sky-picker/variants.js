// Renders the current "Set the sky" panel and three variants, each over all four skies.
const P = {
  sun: { ink: "#FFFFFF", mute: "rgba(255,255,255,0.9)", glass: "rgba(9,28,92,0.56)", line: "rgba(255,255,255,0.24)", soft: "rgba(255,255,255,0.09)", sel: "#FFFFFF", selInk: "#0D38A3", shadow: "0 18px 48px rgba(3,16,66,0.32)" },
  cloud: { ink: "#16202B", mute: "#364251", glass: "rgba(255,255,255,0.58)", line: "rgba(255,255,255,0.78)", soft: "rgba(22,32,43,0.07)", sel: "#16202B", selInk: "#FFFFFF", shadow: "0 18px 44px rgba(38,52,70,0.16)" },
  rain: { ink: "#F1F4FF", mute: "rgba(226,233,255,0.84)", glass: "rgba(150,172,255,0.1)", line: "rgba(170,192,255,0.24)", soft: "rgba(210,222,255,0.08)", sel: "#DCE6FF", selInk: "#0A1330", shadow: "0 18px 48px rgba(0,0,0,0.38)" },
  hot: { ink: "#FFF7EC", mute: "rgba(255,240,224,0.9)", glass: "rgba(70,16,2,0.64)", line: "rgba(255,222,180,0.26)", soft: "rgba(255,232,205,0.1)", sel: "#FFE3A1", selInk: "#5A1A04", shadow: "0 18px 48px rgba(80,18,0,0.35)" }
};
const BG = {
  sun: "linear-gradient(180deg, #0F3FB8 0%, #1B4BC8 45%, #3E7BF0 100%)",
  cloud: "linear-gradient(180deg, #8E9AA8 0%, #A9B4C0 50%, #C9D1D9 100%)",
  rain: "linear-gradient(180deg, #0A1330 0%, #131F44 50%, #1C2B55 100%)",
  hot: "linear-gradient(180deg, #9A2D0B 0%, #B8421A 45%, #E8702A 100%)"
};
// Mini skies used inside orbs and tiles. The cloud one is darker than the page sky so a white cloud reads.
const ORB = {
  sun: "linear-gradient(160deg, #0F3FB8 0%, #2659D8 100%)",
  cloud: "linear-gradient(165deg, #8E9AA8 0%, #C9D1D9 100%)",
  rain: "linear-gradient(165deg, #0A1330 0%, #1C2B55 100%)",
  hot: "linear-gradient(165deg, #9A2D0B 0%, #C04A18 100%)"
};
const ORB2 = {
  sun: "linear-gradient(160deg, #1546C4 0%, #3A72EE 100%)",
  cloud: "linear-gradient(165deg, #6F7E90 0%, #A3AFBD 100%)",
  rain: "linear-gradient(165deg, #101B40 0%, #24356A 100%)",
  hot: "linear-gradient(165deg, #A8330D 0%, #E06A24 100%)"
};
const GLOW = { sun: "rgba(255,201,64,0.55)", cloud: "rgba(255,255,255,0.7)", rain: "rgba(143,179,255,0.55)", hot: "rgba(255,168,88,0.6)" };
const WX = [["sun", "Sunny"], ["cloud", "Cloudy"], ["rain", "Rainy"], ["hot", "Hot 30°+"]];
const SHORT = { sun: "Sunny", cloud: "Cloudy", rain: "Rainy", hot: "Hot" };

// ---- Current, copied from A-Sky-Mobile ----
function current(cur) {
  const p = P[cur];
  return `<fieldset class="glass" style="margin:0;padding:14px 6px 6px;min-width:0;border:1px solid ${p.line};border-radius:30px;background:${p.glass};box-shadow:${p.shadow};color:${p.ink}">
  <p style="margin:0;padding:0 12px;font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${p.mute}">Set the sky</p>
  <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px;margin-top:4px">${WX.map(([k, l]) => {
    const on = k === cur;
    return `<button style="min-height:108px;padding:12px 0 6px;border:0;border-radius:22px;background:transparent;color:${on ? p.ink : p.mute};display:flex;flex-direction:column;align-items:center;gap:8px">
    <span style="width:60px;height:60px;border-radius:50%;background:${ORB[k]};box-shadow:${on ? "0 0 0 2.5px " + p.ink + ", 0 12px 32px " + GLOW[k] : "0 0 0 1px " + p.line + ", 0 4px 14px rgba(0,0,0,0.14)"};transform:${on ? "translateY(-5px) scale(1.08)" : "none"};display:flex;align-items:center;justify-content:center;overflow:hidden">${ICONS.cur[k]}</span>
    <span style="font-size:13px;font-weight:${on ? 700 : 500};white-space:nowrap">${l}</span>
    <span style="width:5px;height:5px;border-radius:50%;background:currentColor;opacity:${on ? 1 : 0}"></span></button>`;
  }).join("")}</div></fieldset>`;
}

// ---- V1 "Refined orbs": same idea, fixed spacing, one selection cue, duotone icons ----
function v1(cur) {
  const p = P[cur];
  return `<fieldset class="glass" style="margin:0;padding:16px 8px 8px;min-width:0;border:1px solid ${p.line};border-radius:28px;background:${p.glass};box-shadow:${p.shadow};color:${p.ink}">
  <div style="display:flex;justify-content:space-between;align-items:baseline;padding:0 12px">
    <p class="eb" style="margin:0;color:${p.mute}">Set the sky</p>
    <p style="margin:0;font-size:12.5px;font-weight:600;color:${p.mute}">Re-ranks the list</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin-top:8px">${WX.map(([k, l]) => {
    const on = k === cur;
    return `<button style="padding:10px 0 12px;border:0;border-radius:20px;background:transparent;color:${on ? p.ink : p.mute};display:flex;flex-direction:column;align-items:center;gap:10px">
    <span style="width:56px;height:56px;border-radius:50%;background:${ORB2[k]};box-shadow:${on ? "0 0 0 2px " + p.ink + ", 0 10px 24px " + GLOW[k] : "inset 0 0 0 1px rgba(255,255,255,.18), 0 4px 12px rgba(0,0,0,.16)"};transform:${on ? "translateY(-2px)" : "none"};display:flex;align-items:center;justify-content:center">${ICONS.duo[k]}</span>
    <span style="font-size:13px;font-weight:${on ? 700 : 500};line-height:1.2;white-space:nowrap">${l}</span></button>`;
  }).join("")}</div></fieldset>`;
}

// ---- V2 "Sky strip": a compact segmented control; the chosen segment fills with its sky ----
function v2(cur) {
  const p = P[cur];
  return `<fieldset style="margin:0;padding:0;border:0;min-width:0">
  <div style="display:flex;justify-content:space-between;align-items:baseline;margin:0 0 8px;padding:0 4px"><p class="eb" style="margin:0;color:${p.mute}">Set the sky</p><p style="margin:0;font-size:12.5px;font-weight:600;color:${p.mute}">Re-ranks the list</p></div>
  <div class="glass" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:5px;border-radius:26px;border:1px solid ${p.line};background:${p.glass};box-shadow:${p.shadow}">${WX.map(([k]) => {
    const on = k === cur;
    return `<button style="height:68px;padding:0;border:0;border-radius:21px;background:${on ? ORB2[k] : "transparent"};color:${on ? "#FFFFFF" : p.ink};box-shadow:${on ? "inset 0 0 0 1.5px rgba(255,255,255,.6), 0 8px 18px " + GLOW[k] : "none"};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px">
    ${ICONS.line[k]}<span style="font-size:13px;font-weight:${on ? 700 : 550};white-space:nowrap">${SHORT[k]}${k === "hot" ? " 30°+" : ""}</span></button>`;
  }).join("")}</div></fieldset>`;
}

// ---- V3 "Sky tiles": four small windows onto each sky; the chosen one lifts with a check ----
function v3(cur) {
  const p = P[cur];
  return `<fieldset class="glass" style="margin:0;padding:12px;min-width:0;border:1px solid ${p.line};border-radius:32px;background:${p.glass};box-shadow:${p.shadow};color:${p.ink}">
  <p class="eb" style="margin:0 0 10px;padding:0 8px;color:${p.mute}">Set the sky</p>
  <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">${WX.map(([k, l]) => {
    const on = k === cur;
    return `<button style="position:relative;height:112px;padding:0;border:0;border-radius:20px;background:${ORB2[k]};color:#FFFFFF;overflow:visible;box-shadow:${on ? "0 0 0 3px " + p.glass.replace(/[\d.]+\)$/, "1)") + ", 0 0 0 5px " + p.ink + ", 0 14px 28px " + GLOW[k] : "inset 0 0 0 1px rgba(255,255,255,.16)"};transform:${on ? "translateY(-3px)" : "none"};display:flex;flex-direction:column;align-items:center;justify-content:space-between">
    <span style="margin-top:14px;display:flex">${ICONS.scene[k]}</span>
    <span style="margin-bottom:10px;font-size:12.5px;font-weight:700;letter-spacing:.01em;white-space:nowrap">${SHORT[k]}</span>
    ${on ? `<span style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;background:${p.ink};color:${p.selInk === "#FFFFFF" ? "#16202B" : p.selInk};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.25)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${cur === "cloud" ? "#FFFFFF" : P[cur].selInk}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>` : ""}
    </button>`;
  }).join("")}</div></fieldset>`;
}

const ROWS = [["Current", current], ["V1 · Refined orbs (duotone icons)", v1], ["V2 · Sky strip (line icons)", v2], ["V3 · Sky tiles (scene icons)", v3]];
const ONLY = (location.hash.slice(1) || "sun,cloud,rain,hot").split(",");
document.getElementById("out").innerHTML = ROWS.map(([t, fn]) => `<h2>${t}</h2><div class="row">${WX.filter(([k]) => ONLY.indexOf(k) >= 0).map(([k]) =>
  `<div class="sky" style="background:${BG[k]}">${fn(k)}</div>`).join("")}</div>`).join("");
