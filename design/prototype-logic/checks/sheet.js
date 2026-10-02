const fs = require("fs"); const all = require("../content/content-all.json");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const COL = { train: "#d9480f", bus: "#1c7ed6", ferry: "#0b7285", car: "#555", walk: "#2b8a3e" };
const DASH = { train: "", bus: "6 4", ferry: "2 5", car: "10 5", walk: "1 5" };
const one = (a) => {
  const m = a.map; let s = `<rect width="400" height="300" fill="#a5d8ff"/>`;
  m.land.forEach(d => s += `<path d="${d}" fill="#f1e8d0"/>`);
  (m.water || []).forEach(d => s += `<path d="${d}" fill="#a5d8ff"/>`);
  (m.valley || []).forEach(d => s += `<path d="${d}" fill="#b2d8a8"/>`);
  m.lines.forEach(l => { s += `<path d="${l.d}" fill="none" stroke="${COL[l.kind]}" stroke-width="2.5" stroke-dasharray="${DASH[l.kind]}" stroke-linecap="round"/><text x="${l.lx}" y="${l.ly}" font-size="8" fill="${COL[l.kind]}" font-family="Helvetica">${esc(l.label)}</text>`; });
  s += `<path d="${m.trail}" fill="none" stroke="#e8590c" stroke-width="4" stroke-linecap="round" opacity="0.85"/>`;
  m.labels.forEach(l => s += `<text x="${l.x}" y="${l.y}" font-size="9" font-style="italic" fill="${l.water ? "#1864ab" : "#7a6a45"}" text-anchor="middle" font-family="Helvetica">${esc(l.text)}</text>`);
  m.fac.forEach(f => s += `<circle cx="${f.x}" cy="${f.y}" r="3" fill="${f.kind === "toilet" ? "#7048e8" : "#c2255c"}"/>`);
  m.stops.forEach(t => s += `<rect x="${t.x - 4}" y="${t.y - 4}" width="8" height="8" fill="#fff" stroke="#000" stroke-width="1.5"/><text x="${t.x + 7}" y="${t.y + 12}" font-size="7" font-family="Helvetica">${esc(t.name)}</text>`);
  m.pois.forEach(p => s += `<circle cx="${p.x}" cy="${p.y}" r="7" fill="#111"/><text x="${p.x}" y="${p.y + 3}" font-size="8" fill="#fff" text-anchor="middle" font-family="Helvetica">${p.n}</text>`);
  s += `<rect width="400" height="300" fill="none" stroke="#000"/><rect x="0" y="0" width="${a.id.length * 8 + 10}" height="16" fill="#000"/><text x="5" y="12" font-size="12" fill="#fff" font-family="Helvetica">${a.id}</text>`;
  return s;
};
for (let k = 0; k < 4; k++) {
  const grp = all.slice(k * 6, k * 6 + 6); if (!grp.length) break;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="1230" height="620" viewBox="0 0 1230 620"><rect width="1230" height="620" fill="#fff"/>`;
  grp.forEach((a, i) => s += `<g transform="translate(${5 + (i % 3) * 408},${5 + Math.floor(i / 3) * 308})">${one(a)}</g>`);
  fs.writeFileSync(`sheet${k}.svg`, s + "</svg>");
}
