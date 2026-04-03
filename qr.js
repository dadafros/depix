// qr.js — Zero-dependency QR code generator
// Generates branded QR codes locally via Canvas API

// === GF(256) with primitive polynomial 0x11d ===
const EXP = new Uint8Array(256);
const LOG = new Uint8Array(256);
let _x = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = _x;
  LOG[_x] = i;
  _x = (_x << 1) ^ (_x >= 128 ? 0x11d : 0);
}

function gfMul(a, b) {
  return (a && b) ? EXP[(LOG[a] + LOG[b]) % 255] : 0;
}

// === Reed-Solomon encoding ===
function rsEncode(data, n) {
  const g = new Uint8Array(n + 1);
  g[0] = 1;
  for (let i = 0; i < n; i++) {
    for (let j = n; j >= 1; j--)
      g[j] = g[j - 1] ^ gfMul(g[j], EXP[i]);
    g[0] = gfMul(g[0], EXP[i]);
  }
  const msg = new Uint8Array(data.length + n);
  msg.set(data);
  for (let i = 0; i < data.length; i++) {
    const c = msg[i];
    if (c) for (let j = 1; j <= n; j++)
      msg[i + j] ^= gfMul(g[n - j], c);
  }
  return msg.slice(data.length);
}

// === QR code tables ===
// EC block params: [ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data]
// Indexed by EC_BLOCKS[version-1][ecLevel] where L=0,M=1,Q=2,H=3
const EC_BLOCKS = [
  [[7,1,19,0,0],[10,1,16,0,0],[13,1,13,0,0],[17,1,9,0,0]],
  [[10,1,34,0,0],[16,1,28,0,0],[22,1,22,0,0],[28,1,16,0,0]],
  [[15,1,55,0,0],[26,1,44,0,0],[18,2,17,0,0],[22,2,13,0,0]],
  [[20,1,80,0,0],[18,2,32,0,0],[26,2,24,0,0],[16,4,9,0,0]],
  [[26,1,108,0,0],[24,2,43,0,0],[18,2,15,2,16],[22,2,11,2,12]],
  [[18,2,68,0,0],[16,4,27,0,0],[24,4,19,0,0],[28,4,15,0,0]],
  [[20,2,78,0,0],[18,4,31,0,0],[18,2,14,4,15],[26,4,13,1,14]],
  [[24,2,97,0,0],[22,2,38,2,39],[22,4,18,2,19],[26,4,14,2,15]],
  [[30,2,116,0,0],[22,3,36,2,37],[20,4,16,4,17],[24,4,12,4,13]],
  [[18,2,68,2,69],[26,4,43,1,44],[24,6,19,2,20],[28,6,15,2,16]],
  [[20,4,81,0,0],[30,1,50,4,51],[28,4,22,4,23],[24,3,12,8,13]],
  [[24,2,92,2,93],[22,6,36,2,37],[26,4,20,6,21],[28,7,14,4,15]],
  [[26,4,107,0,0],[22,8,37,1,38],[24,8,20,4,21],[22,12,11,4,12]],
  [[30,3,115,1,116],[24,4,40,5,41],[20,11,16,5,17],[24,11,12,5,13]],
  [[22,5,87,1,88],[24,5,41,5,42],[30,5,24,7,25],[24,11,12,7,13]],
  [[24,5,98,1,99],[28,7,45,3,46],[24,15,19,2,20],[30,3,15,13,16]],
  [[28,1,107,5,108],[28,10,46,1,47],[28,1,22,15,23],[28,2,14,17,15]],
  [[30,5,120,1,121],[26,9,43,4,44],[28,17,22,1,23],[28,2,14,19,15]],
  [[28,3,113,4,114],[26,3,44,11,45],[26,17,21,4,22],[26,9,13,16,14]],
  [[28,3,107,5,108],[26,3,41,13,42],[28,15,24,5,25],[28,15,15,10,16]],
];

// Alignment pattern center coords per version
const ALIGN = [
  null, null,
  [6,18],[6,22],[6,26],[6,30],[6,34],
  [6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],
  [6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],
  [6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],
];

// EC level to format bits: L=01,M=00,Q=11,H=10
const EC_FMT = [1, 0, 3, 2];

// === BCH encoding ===
function fmtBits(ecLvl, mask) {
  const d = (EC_FMT[ecLvl] << 3) | mask;
  let r = d << 10;
  for (let i = 14; i >= 10; i--)
    if (r & (1 << i)) r ^= 0x537 << (i - 10);
  return ((d << 10) | r) ^ 0x5412;
}

function verBits(ver) {
  let r = ver << 12;
  for (let i = 17; i >= 12; i--)
    if (r & (1 << i)) r ^= 0x1F25 << (i - 12);
  return (ver << 12) | r;
}

// === Mask functions ===
function maskFn(m, r, c) {
  switch (m) {
    case 0: return !((r + c) % 2);
    case 1: return !(r % 2);
    case 2: return !(c % 3);
    case 3: return !((r + c) % 3);
    case 4: return !(((r >> 1) + Math.floor(c / 3)) % 2);
    case 5: return !((r * c) % 2 + (r * c) % 3);
    case 6: return !(((r * c) % 2 + (r * c) % 3) % 2);
    case 7: return !(((r + c) % 2 + (r * c) % 3) % 2);
  }
}

// === Penalty scoring ===
function penalty(m, sz) {
  let p = 0;
  // Rule 1: runs
  for (let r = 0; r < sz; r++) {
    let cnt = 1;
    for (let c = 1; c < sz; c++) {
      if (m[r][c] === m[r][c - 1]) { if (++cnt === 5) p += 3; else if (cnt > 5) p++; }
      else cnt = 1;
    }
  }
  for (let c = 0; c < sz; c++) {
    let cnt = 1;
    for (let r = 1; r < sz; r++) {
      if (m[r][c] === m[r - 1][c]) { if (++cnt === 5) p += 3; else if (cnt > 5) p++; }
      else cnt = 1;
    }
  }
  // Rule 2: 2x2 blocks
  for (let r = 0; r < sz - 1; r++)
    for (let c = 0; c < sz - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) p += 3;
    }
  // Rule 3: finder-like patterns
  const p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  for (let r = 0; r < sz; r++)
    for (let c = 0; c <= sz - 11; c++) {
      let a = true, b = true;
      for (let k = 0; k < 11; k++) {
        if (m[r][c + k] !== p1[k]) a = false;
        if (m[r][c + k] !== p2[k]) b = false;
      }
      if (a || b) p += 40;
    }
  for (let c = 0; c < sz; c++)
    for (let r = 0; r <= sz - 11; r++) {
      let a = true, b = true;
      for (let k = 0; k < 11; k++) {
        if (m[r + k][c] !== p1[k]) a = false;
        if (m[r + k][c] !== p2[k]) b = false;
      }
      if (a || b) p += 40;
    }
  // Rule 4: dark proportion
  let dark = 0;
  for (let r = 0; r < sz; r++)
    for (let c = 0; c < sz; c++) if (m[r][c]) dark++;
  const pct = dark * 100 / (sz * sz);
  const prev5 = Math.floor(pct / 5) * 5;
  p += Math.min(Math.abs(prev5 - 50), Math.abs(prev5 + 5 - 50)) / 5 * 10;
  return p;
}

// === QR matrix generation ===
function generateQR(text, ecLvl) {
  const bytes = new TextEncoder().encode(text);

  // Find smallest version
  let ver = 0;
  for (let v = 1; v <= 20; v++) {
    const [, b1c, b1d, b2c, b2d] = EC_BLOCKS[v - 1][ecLvl];
    const cap = b1c * b1d + b2c * b2d;
    const overhead = Math.ceil((4 + (v <= 9 ? 8 : 16)) / 8);
    if (bytes.length <= cap - overhead) { ver = v; break; }
  }
  if (!ver) throw new Error("Data too long");

  const [ecPer, b1c, b1d, b2c, b2d] = EC_BLOCKS[ver - 1][ecLvl];
  const totalData = b1c * b1d + b2c * b2d;
  const lenBits = ver <= 9 ? 8 : 16;

  // Encode data bits (byte mode = 0100)
  let bits = "0100" + bytes.length.toString(2).padStart(lenBits, "0");
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  bits += "0".repeat(Math.min(4, totalData * 8 - bits.length));
  while (bits.length % 8) bits += "0";
  let pad = 0;
  while (bits.length < totalData * 8)
    bits += (pad++ % 2 ? "00010001" : "11101100");

  const data = new Uint8Array(totalData);
  for (let i = 0; i < totalData; i++)
    data[i] = parseInt(bits.substr(i * 8, 8), 2);

  // Split into blocks, compute EC
  const blocks = [], ecBlks = [];
  let off = 0;
  for (let i = 0; i < b1c; i++) { blocks.push(data.slice(off, off + b1d)); off += b1d; }
  for (let i = 0; i < b2c; i++) { blocks.push(data.slice(off, off + b2d)); off += b2d; }
  for (const bl of blocks) ecBlks.push(rsEncode(bl, ecPer));

  // Interleave data + EC
  const maxD = Math.max(b1d, b2d || 0);
  const nBlk = b1c + b2c;
  const inter = [];
  for (let i = 0; i < maxD; i++)
    for (let j = 0; j < nBlk; j++)
      if (i < blocks[j].length) inter.push(blocks[j][i]);
  for (let i = 0; i < ecPer; i++)
    for (let j = 0; j < nBlk; j++)
      inter.push(ecBlks[j][i]);

  // Build matrix
  const sz = ver * 4 + 17;
  const mod = Array.from({ length: sz }, () => new Uint8Array(sz));
  const res = Array.from({ length: sz }, () => new Uint8Array(sz));

  const setM = (r, c, v) => { mod[r][c] = v ? 1 : 0; res[r][c] = 1; };

  // Finder patterns + separators
  function placeFinder(or, oc) {
    for (let r = -1; r <= 7; r++)
      for (let c = -1; c <= 7; c++) {
        const mr = or + r, mc = oc + c;
        if (mr < 0 || mr >= sz || mc < 0 || mc >= sz) continue;
        const dark = r >= 0 && r <= 6 && c >= 0 && c <= 6 &&
          (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        setM(mr, mc, dark);
      }
  }
  placeFinder(0, 0);
  placeFinder(0, sz - 7);
  placeFinder(sz - 7, 0);

  // Alignment patterns
  if (ver >= 2) {
    const pos = ALIGN[ver];
    for (const ar of pos)
      for (const ac of pos) {
        if (res[ar][ac]) continue;
        for (let r = -2; r <= 2; r++)
          for (let c = -2; c <= 2; c++)
            setM(ar + r, ac + c, Math.abs(r) === 2 || Math.abs(c) === 2 || (!r && !c));
      }
  }

  // Timing patterns
  for (let i = 8; i < sz - 8; i++) {
    if (!res[6][i]) { mod[6][i] = (i & 1) ^ 1; res[6][i] = 1; }
    if (!res[i][6]) { mod[i][6] = (i & 1) ^ 1; res[i][6] = 1; }
  }

  // Dark module
  mod[sz - 8][8] = 1;
  res[sz - 8][8] = 1;

  // Reserve format info areas
  for (let i = 0; i < 8; i++) {
    res[8][i] = 1; res[8][sz - 1 - i] = 1;
    res[i][8] = 1; res[sz - 1 - i][8] = 1;
  }
  res[8][8] = 1;

  // Reserve version info areas (v7+)
  if (ver >= 7)
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 3; j++) {
        res[i][sz - 11 + j] = 1;
        res[sz - 11 + j][i] = 1;
      }

  // Place data in zigzag
  const allBits = [];
  for (const b of inter)
    for (let k = 7; k >= 0; k--) allBits.push((b >> k) & 1);

  let bi = 0;
  for (let right = sz - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const up = ((right + 1) & 2) === 0;
    for (let v = 0; v < sz; v++)
      for (let j = 0; j < 2; j++) {
        const x = right - j, y = up ? sz - 1 - v : v;
        if (x >= 0 && !res[y][x] && bi < allBits.length)
          mod[y][x] = allBits[bi++];
      }
  }

  // Try all 8 masks, pick lowest penalty
  let bestPen = Infinity, bestMat = null;
  for (let m = 0; m < 8; m++) {
    const mat = mod.map(r => new Uint8Array(r));
    for (let r = 0; r < sz; r++)
      for (let c = 0; c < sz; c++)
        if (!res[r][c] && maskFn(m, r, c)) mat[r][c] ^= 1;

    // Write format info
    const fb = fmtBits(ecLvl, m);
    for (let i = 0; i <= 5; i++) mat[8][i] = (fb >> i) & 1;
    mat[8][7] = (fb >> 6) & 1;
    mat[8][8] = (fb >> 7) & 1;
    mat[7][8] = (fb >> 8) & 1;
    for (let i = 9; i < 15; i++) mat[14 - i][8] = (fb >> i) & 1;
    for (let i = 0; i < 8; i++) mat[sz - 1 - i][8] = (fb >> i) & 1;
    for (let i = 8; i < 15; i++) mat[8][sz - 15 + i] = (fb >> i) & 1;

    // Write version info (v7+)
    if (ver >= 7) {
      const vb = verBits(ver);
      for (let i = 0; i < 18; i++) {
        const bit = (vb >> i) & 1;
        const a = sz - 11 + (i % 3), b = (i / 3) | 0;
        mat[a][b] = bit;
        mat[b][a] = bit;
      }
    }

    const pen = penalty(mat, sz);
    if (pen < bestPen) { bestPen = pen; bestMat = mat; }
  }

  return { matrix: bestMat, size: sz };
}

// === Rendering ===

function renderToCanvas(matrix, modules, size, fg, bg) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const quietZone = 4;
  const total = modules + quietZone * 2;
  const unit = size / total;
  const off = quietZone * unit;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = fg;
  for (let r = 0; r < modules; r++)
    for (let c = 0; c < modules; c++)
      if (matrix[r][c]) {
        const x = Math.round(off + c * unit);
        const y = Math.round(off + r * unit);
        ctx.fillRect(x, y,
          Math.round(off + (c + 1) * unit) - x,
          Math.round(off + (r + 1) * unit) - y);
      }

  return { canvas, ctx };
}

/**
 * Render a branded QR code (teal on dark with logo). Uses ECC H.
 * For Liquid addresses scanned by SideSwap.
 */
// Exported for testing only
export { generateQR as _generateQR };

export function renderBrandedQr(text, imgEl, { loadingEl, errorEl } = {}) {
  imgEl.classList.add("hidden");
  if (errorEl) errorEl.classList.add("hidden");
  if (loadingEl) loadingEl.classList.remove("hidden");

  try {
    const { matrix, size: modules } = generateQR(text, 3); // ECC H
    const px = 300;
    const { canvas, ctx } = renderToCanvas(matrix, modules, px, "#38e3ac", "#111921");

    const done = () => {
      imgEl.src = canvas.toDataURL("image/png");
      if (loadingEl) loadingEl.classList.add("hidden");
      imgEl.classList.remove("hidden");
    };

    const logo = new Image();
    logo.onload = () => {
      const ls = px * 0.22, pad = 6;
      ctx.beginPath();
      ctx.arc(px / 2, px / 2, ls / 2 + pad, 0, Math.PI * 2);
      ctx.fillStyle = "#111921";
      ctx.fill();
      ctx.drawImage(logo, (px - ls) / 2, (px - ls) / 2, ls, ls);
      done();
    };
    logo.onerror = done;
    logo.src = "./icon-192.png";
  } catch {
    if (loadingEl) loadingEl.classList.add("hidden");
    if (errorEl) errorEl.classList.remove("hidden");
  }
}

/**
 * Render a QR code for PIX (teal on dark, no logo). Uses ECC M for more capacity.
 * For PIX codes scanned by bank apps.
 */
export function renderPixQr(text, imgEl, { loadingEl, errorEl } = {}) {
  imgEl.classList.add("hidden");
  if (errorEl) errorEl.classList.add("hidden");
  if (loadingEl) loadingEl.classList.remove("hidden");

  try {
    const { matrix, size: modules } = generateQR(text, 1); // ECC M
    const px = 300;
    const { canvas } = renderToCanvas(matrix, modules, px, "#38e3ac", "#111921");

    imgEl.src = canvas.toDataURL("image/png");
    if (loadingEl) loadingEl.classList.add("hidden");
    imgEl.classList.remove("hidden");
  } catch {
    if (loadingEl) loadingEl.classList.add("hidden");
    if (errorEl) errorEl.classList.remove("hidden");
  }
}
