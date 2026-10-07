const TORRE = (function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const RAIO = 6371;
  const GRU = DATA.AEROS.GRU;
  const rad = (d) => (d * Math.PI) / 180;
  const grau = (r) => (r * 180) / Math.PI;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const nf = (n) => Math.round(n).toLocaleString("pt-BR");
  const pad3 = (n) => String(Math.round(n)).padStart(3, "0");
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const COR = {
    prog: "#57b86a",
    chk: "#9ed65f",
    emb: "#ffb000",
    atr: "#ffcf5c",
    part: "#63c7ff",
    noar: "#7ee0ff",
    apo: "#b3ecff",
    pou: "#ff8a3d",
    cheg: "#7d6212",
    canc: "#ff5f4d",
    adsb: "#5cff9a",
    chao: "#6d7a5c"
  };

  const ALCANCES = [150, 300, 600, 1200, 2500, 5000, 10000, 20000];
  const PASSOS = [50, 100, 150, 250, 500, 1000, 1500, 2500, 5000, 10000];
  const SEC = [
    ["voo", "EM VOO"],
    ["portao", "AGUARDANDO / EMBARQUE"],
    ["adsb", "TRAFEGO REAL ADS-B"],
    ["fim", "CONCLUIDOS"],
    ["outros", "CANCELADOS / OUTROS DIAS"]
  ];

  let cv = null, ctx = null, dpr = 1, cw = 0, ch = 0;
  let montado = false, rodando = false, raf = 0, timer = 0, ultTs = 0;
  const t0 = Date.now();
  let modoAlcance = "auto";
  let alcance = 1200;
  let varredura = 0;
  let alvos = [];
  let selId = null, hoverId = null, hoverLista = null;
  let ordem = [];
  let usuarioSlider = false;
  let assin = "";

  function hhmm(m) {
    m = ((m % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  }

  function hora() {
    const d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
  }

  function distPt(a, b) {
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * RAIO * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function proj(lat, lon) {
    return {
      x: rad(lon - GRU.lon) * RAIO * Math.cos(rad(GRU.lat)),
      y: rad(lat - GRU.lat) * RAIO
    };
  }

  function rumo(a, b) {
    const dl = rad(b.lon - a.lon);
    const y = Math.sin(dl) * Math.cos(rad(b.lat));
    const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dl);
    return (grau(Math.atan2(y, x)) + 360) % 360;
  }

  function decorrido() {
    return (Date.now() - t0) / 60000;
  }

  function refLive(f) {
    const raw = (((f.ref - DATA.DELTA) % 1440) + 1440) % 1440;
    return raw + (f.delay || 0) - 720 - decorrido();
  }

  function fases(f) {
    const r = refLive(f);
    const toDep = f.tipo === "partidas" ? r : r - f.dur;
    const toArr = f.tipo === "partidas" ? r - f.dur : r;
    return { toDep: toDep, toArr: toArr, p: clamp(-toDep / f.dur, 0, 1) };
  }

  function situacao(f, fs) {
    if (f.cancelado) return { rot: "CANCELADO", cor: COR.canc };
    if (f.dia) return { rot: "PROGRAMADO", cor: COR.prog };
    const d = f.delay || 0;
    if (fs.toDep > 0) {
      if (d && fs.toDep <= 60 && fs.toDep > 4) return { rot: "ATRASADO " + d + " MIN", cor: COR.atr };
      if (f.tipo === "partidas") {
        if (fs.toDep > 60) return { rot: "PROGRAMADO", cor: COR.prog };
        if (fs.toDep > 45) return { rot: "CHECK-IN ABERTO", cor: COR.chk };
        if (fs.toDep > 20) return { rot: "EMBARQUE", cor: COR.emb };
        if (fs.toDep > 4) return { rot: "ULTIMO CHAMADO", cor: COR.emb };
        return { rot: "PARTIU", cor: COR.part };
      }
      return { rot: "PROGRAMADO", cor: COR.prog };
    }
    if (fs.toArr > 0) {
      if (fs.toArr <= 30) return { rot: "APROXIMANDO", cor: COR.apo };
      return { rot: "NO AR", cor: COR.noar };
    }
    if (fs.toArr >= -25) return { rot: "DESEMBARQUE", cor: COR.pou };
    return { rot: "CHEGOU", cor: COR.cheg };
  }

  function caminho(f) {
    return [f.origem].concat(f.escala || [], [f.destino])
      .map((c) => DATA.AEROS[c])
      .filter(Boolean);
  }

  function pontoEm(pontos, p) {
    if (pontos.length < 2) return { lat: pontos[0].lat, lon: pontos[0].lon, rumo: 0 };
    const segs = [];
    let total = 0;
    for (let i = 0; i < pontos.length - 1; i++) {
      const d = distPt(pontos[i], pontos[i + 1]) || 0.001;
      segs.push(d);
      total += d;
    }
    let alvo = clamp(p, 0, 1) * total;
    for (let i = 0; i < segs.length; i++) {
      if (alvo <= segs[i] || i === segs.length - 1) {
        const t = clamp(alvo / segs[i], 0, 1);
        const a = pontos[i], b = pontos[i + 1];
        return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t, rumo: rumo(a, b) };
      }
      alvo -= segs[i];
    }
    const u = pontos[pontos.length - 1];
    return { lat: u.lat, lon: u.lon, rumo: 0 };
  }

  function perfil(a) {
    const ac = (a.f && a.f.ac) || "";
    const largo = /A33|A34|A35|B77|B78|B74/.test(ac);
    const cruise = largo ? 38000 : 33000;
    const velMax = largo ? 900 : 840;
    const p = a.p;
    let k = 1;
    if (p < 0.08) k = 0.3 + 0.7 * (p / 0.08);
    else if (p > 0.92) k = 0.35 + 0.65 * ((1 - p) / 0.08);
    return { alt: Math.round((cruise * k) / 500) * 500, vel: Math.round(velMax * (0.6 + 0.4 * k)) };
  }

  function construir() {
    const out = [];
    const base = DATA.departures.concat(DATA.arrivals);
    for (const f of base) {
      const fs = fases(f);
      const s = situacao(f, fs);
      const o = DATA.AEROS[f.origem];
      const pontos = caminho(f);
      const parado = f.cancelado || f.dia || fs.toDep > 0;
      const concluido = !parado && fs.toArr <= 0;
      let lat, lon, rumoG = 0;
      if (parado) {
        lat = o.lat;
        lon = o.lon;
      } else if (concluido) {
        const d = pontos[pontos.length - 1];
        lat = d.lat;
        lon = d.lon;
      } else {
        const pt = pontoEm(pontos, fs.p);
        lat = pt.lat;
        lon = pt.lon;
        rumoG = pt.rumo;
      }
      const pr = proj(lat, lon);
      const dist = Math.sqrt(pr.x * pr.x + pr.y * pr.y);
      const aereo = !parado && !concluido;
      out.push({
        id: f.tipo + "-" + f.idx,
        tipo: f.tipo,
        f: f,
        no: f.no,
        rota: [f.origem].concat(f.escala || [], [f.destino]).join(">"),
        aereo: aereo,
        anel: dist < 1.2,
        lat: lat,
        lon: lon,
        rumo: rumoG,
        dist: dist,
        p: fs.p,
        toDep: fs.toDep,
        toArr: fs.toArr,
        sit: s.rot,
        cor: s.cor,
        info: aereo ? Math.round(fs.p * 100) + "%" : hhmm(f.tipo === "partidas" ? f.dep : f.arr),
        aeroO: f.origem
      });
    }
    const ads = (typeof LIVE !== "undefined" && LIVE.estado ? LIVE.estado.dados : []) || [];
    for (let i = 0; i < ads.length; i++) {
      const v = ads[i];
      if (v.lat == null || v.lon == null) continue;
      const pr = proj(v.lat, v.lon);
      out.push({
        id: "adsb-" + i + "-" + (v.cs || v.hex || ""),
        tipo: "adsb",
        f: null,
        no: v.cs || v.hex || "-",
        rota: "ADS-B",
        aereo: !v.gnd,
        anel: false,
        lat: v.lat,
        lon: v.lon,
        rumo: v.rumo || 0,
        dist: Math.sqrt(pr.x * pr.x + pr.y * pr.y),
        p: 0,
        toDep: 1,
        toArr: 99999,
        sit: v.gnd ? "NO CHAO" : "EM VOO",
        cor: v.gnd ? COR.chao : COR.adsb,
        info: v.gnd ? "CHAO" : nf(v.alt) + " FT",
        v: v,
        aeroO: ""
      });
    }
    alvos = out;
    const anel = alvos.filter((a) => a.anel).sort((a, b) => a.no.localeCompare(b.no));
    anel.forEach((a, i) => { a.anal = i; a.anelN = anel.length; });
    if (modoAlcance === "auto") {
      let m = 0;
      for (const a of alvos) {
        if ((a.aereo || a.tipo === "adsb") && a.dist > m) m = a.dist;
      }
      const km = Math.max(150, m * 1.15);
      alcance = ALCANCES.find((x) => x >= km) || 20000;
    }
  }

  function secaoDe(a) {
    if (a.tipo === "adsb") return "adsb";
    if (a.f.cancelado || a.f.dia) return "outros";
    if (a.aereo) return "voo";
    if (a.toArr <= 0) return "fim";
    return "portao";
  }

  const ORDEM = {
    voo: (a, b) => a.toArr - b.toArr,
    portao: (a, b) => a.toDep - b.toDep,
    adsb: (a, b) => (a.v.gnd ? 1 : 0) - (b.v.gnd ? 1 : 0) || a.dist - b.dist,
    fim: (a, b) => a.toArr - b.toArr,
    outros: (a, b) => a.no.localeCompare(b.no)
  };

  function tela() {
    const r = cv.getBoundingClientRect();
    cw = r.width;
    ch = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(cw * dpr);
    cv.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function grade(cx, cy, raio) {
    ctx.strokeStyle = "rgba(255,176,0,.14)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (raio * i) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - raio, cy);
    ctx.lineTo(cx + raio, cy);
    ctx.moveTo(cx, cy - raio);
    ctx.lineTo(cx, cy + raio);
    ctx.stroke();
    ctx.setLineDash([]);
    const passo = PASSOS.find((p) => (p / alcance) * raio >= 62) || alcance;
    ctx.fillStyle = "rgba(255,176,0,.55)";
    ctx.font = "10px 'Share Tech Mono', monospace";
    ctx.textAlign = "left";
    for (let km = passo; km <= alcance; km += passo) {
      const r = (km / alcance) * raio;
      if (r > raio - 14) break;
      ctx.fillText(nf(km) + " KM", cx + r + 3, cy - 4);
    }
  }

  function aviao(x, y, ang, tam, cor) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rad(ang));
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(0, -tam);
    ctx.lineTo(tam * 0.14, -tam * 0.45);
    ctx.lineTo(tam * 0.14, -tam * 0.15);
    ctx.lineTo(tam * 0.95, tam * 0.45);
    ctx.lineTo(tam * 0.95, tam * 0.62);
    ctx.lineTo(tam * 0.14, tam * 0.42);
    ctx.lineTo(tam * 0.14, tam * 0.72);
    ctx.lineTo(tam * 0.5, tam * 0.98);
    ctx.lineTo(tam * 0.5, tam * 1.1);
    ctx.lineTo(tam * 0.1, tam * 1.02);
    ctx.lineTo(0, tam * 1.1);
    ctx.lineTo(-tam * 0.1, tam * 1.02);
    ctx.lineTo(-tam * 0.5, tam * 1.1);
    ctx.lineTo(-tam * 0.5, tam * 0.98);
    ctx.lineTo(-tam * 0.14, tam * 0.72);
    ctx.lineTo(-tam * 0.14, tam * 0.42);
    ctx.lineTo(-tam * 0.95, tam * 0.62);
    ctx.lineTo(-tam * 0.95, tam * 0.45);
    ctx.lineTo(-tam * 0.14, -tam * 0.15);
    ctx.lineTo(-tam * 0.14, -tam * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function rotulo(x, y, txt, cor, alinhar) {
    ctx.font = "11px 'Share Tech Mono', monospace";
    ctx.textAlign = alinhar || "left";
    ctx.fillStyle = cor;
    ctx.fillText(txt, x, y);
  }

  function desenhar(ts) {
    const cx = cw / 2;
    const cy = ch / 2;
    const raio = Math.max(40, Math.min(cx, cy) - 10);
    ctx.clearRect(0, 0, cw, ch);

    ctx.fillStyle = "rgba(7,6,4,.85)";
    ctx.beginPath();
    ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    ctx.fill();

    grade(cx, cy, raio);

    const vis = (a) => a.dist <= alcance;
    const kmPx = raio / alcance;
    const pos = (a) => {
      const pr = proj(a.lat, a.lon);
      return { x: cx + pr.x * kmPx, y: cy + pr.y * kmPx };
    };

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    ctx.clip();

    for (const a of alvos) {
      if (a.anel || a.tipo === "adsb") continue;
      if (!a.aereo || !vis(a)) continue;
      const p0 = proj(DATA.AEROS[a.aeroO].lat, DATA.AEROS[a.aeroO].lon);
      const p1 = proj(a.lat, a.lon);
      ctx.strokeStyle = a.id === selId || a.id === hoverId ? a.cor : "rgba(99,199,255,.25)";
      ctx.lineWidth = a.id === selId ? 1.6 : 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(cx + p0.x * kmPx, cy + p0.y * kmPx);
      ctx.lineTo(cx + p1.x * kmPx, cy + p1.y * kmPx);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const ang = varredura;
    const grad = ctx.createConicGradient(ang, cx, cy);
    grad.addColorStop(0, "rgba(60,255,150,0)");
    grad.addColorStop(0.45, "rgba(60,255,150,0)");
    grad.addColorStop(1, "rgba(60,255,150,.17)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(92,255,154,.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * raio, cy + Math.sin(ang) * raio);
    ctx.stroke();

    for (const a of alvos) {
      const on = a.id === selId || a.id === hoverId;
      if (a.anel) {
        const an = (a.anal / Math.max(1, a.anelN)) * Math.PI * 2 - Math.PI / 2;
        const r = 14 + (a.anal % 4) * 4;
        const x = cx + Math.cos(an) * r;
        const y = cy + Math.sin(an) * r;
        ctx.fillStyle = on ? "#fff" : a.cor;
        ctx.beginPath();
        ctx.arc(x, y, on ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
        if (on) rotulo(x + 7, y + 4, a.no, "#fff");
        continue;
      }
      if (!vis(a)) {
        const pr = proj(a.lat, a.lon);
        const angB = Math.atan2(pr.y, pr.x);
        const x = cx + Math.cos(angB) * (raio - 7);
        const y = cy + Math.sin(angB) * (raio - 7);
        const h = a.tipo === "adsb" ? (a.v && a.v.rumo ? a.v.rumo : grau(angB) + 90) : a.rumo;
        aviao(x, y, h, 4.5, a.cor);
        continue;
      }
      const p = pos(a);
      if (a.tipo === "adsb") {
        const s = on ? 6 : 4.5;
        ctx.strokeStyle = a.cor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x + s, p.y);
        ctx.lineTo(p.x, p.y + s);
        ctx.lineTo(p.x - s, p.y);
        ctx.closePath();
        ctx.stroke();
        if (on || !a.v.gnd) rotulo(p.x + s + 3, p.y - 4, a.no + " " + a.info, a.cor);
      } else if (a.aereo) {
        aviao(p.x, p.y, a.rumo, on ? 8 : 6.5, a.cor);
        rotulo(p.x + 9, p.y - 5, a.no, on ? "#fff" : "#d9cfa8");
        rotulo(p.x + 9, p.y + 7, a.info + " · " + nf(a.dist) + " KM", on ? "#fff" : "rgba(217,207,168,.7)");
      } else {
        ctx.fillStyle = a.cor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, on ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
        if (on) rotulo(p.x + 8, p.y + 4, a.no, "#fff");
      }
    }

    ctx.fillStyle = "#5cff9a";
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(92,255,154,.7)";
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();
    rotulo(cx + 11, cy + 4, "GRU", "#5cff9a");

    ctx.restore();

    const dt = ultTs ? Math.min(ts - ultTs, 100) : 16;
    ultTs = ts;
    varredura += ((Math.PI * 2) / 5000) * dt;
    if (varredura > Math.PI * 2) varredura -= Math.PI * 2;
  }

  function stats() {
    let voo = 0, portao = 0, atrasado = 0, pousou = 0, canc = 0;
    for (const a of alvos) {
      if (a.tipo === "adsb") continue;
      if (a.f.cancelado) { canc++; continue; }
      if (a.f.dia) continue;
      if (a.aereo) voo++;
      else if (a.toArr <= 0) pousou++;
      else portao++;
      if (/ATRASADO/.test(a.sit)) atrasado++;
    }
    const ads = alvos.filter((a) => a.tipo === "adsb" && !a.v.gnd).length;
    return [
      ["EM VOO", voo, "#7ee0ff"],
      ["PORTAO", portao, "#ffb000"],
      ["ATRASADOS", atrasado, "#ffcf5c"],
      ["POUSOU", pousou, "#7d6212"],
      ["CANCELADOS", canc, "#ff5f4d"],
      ["ADS-B", ads, "#5cff9a"],
      ["ALCANCE", nf(alcance) + " KM", "#d9cfa8"]
    ];
  }

  function pintarStats() {
    const el = $("#torre-stats");
    if (!el) return;
    el.innerHTML = stats().map((s) =>
      '<div class="st"><span class="st-n" style="color:' + s[2] + '">' + s[1] +
      '</span><span class="st-l">' + s[0] + "</span></div>"
    ).join("");
  }

  function ficha(a) {
    const el = $("#torre-ficha");
    if (!el) return;
    if (!a) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    let extra = "";
    if (a.tipo === "adsb") {
      const v = a.v;
      extra =
        "<div><b>REG</b> " + esc(v.reg || "-") + "</div>" +
        "<div><b>ALT</b> " + (v.gnd ? "CHAO" : nf(v.alt) + " FT") + "</div>" +
        "<div><b>VEL</b> " + (v.vel ? nf(v.vel) + " KT" : "-") + "</div>" +
        "<div><b>RUMO</b> " + (v.rumo || 0) + "°</div>";
    } else {
      const f = a.f;
      extra =
        "<div><b>ROTA</b> " + esc(a.rota) + "</div>" +
        "<div><b>" + (f.tipo === "partidas" ? "PARTIDA" : "CHEGADA") + "</b> " +
        hhmm(f.tipo === "partidas" ? f.dep : f.arr) + "</div>" +
        "<div><b>DURACAO</b> " + Math.floor(f.dur / 60) + "H" + String(f.dur % 60).padStart(2, "0") + "</div>" +
        "<div><b>GATE</b> " + esc(f.gate || "-") + "</div>" +
        "<div><b>AERONAVE</b> " + esc(f.ac || "-") + "</div>" +
        (f.delay ? "<div><b>ATRASO</b> " + f.delay + " MIN</div>" : "");
    }
    el.innerHTML =
      '<div class="ficha-h"><b>' + esc(a.no) + "</b><span style=\"color:" + a.cor + "\">" +
      esc(a.sit) + "</span></div>" + extra +
      '<div><b>DIST GRU</b> ' + nf(a.dist) + " KM</div>";
  }

  function listar() {
    const el = $("#torre-lista");
    if (!el) return;
    const grupos = {};
    for (const k of SEC) grupos[k[0]] = [];
    for (const a of alvos) {
      const s = secaoDe(a);
      (grupos[s] = grupos[s] || []).push(a);
    }
    let html = "";
    ordem = [];
    for (const [key, tit] of SEC) {
      const g = grupos[key] || [];
      if (!g.length) continue;
      g.sort(ORDEM[key] || ORDEM.outros);
      html += '<div class="tl-sec">' + tit + " · " + g.length + "</div>";
      for (const a of g.slice(0, 80)) {
        ordem.push(a);
        const on = a.id === selId ? " on" : a.id === hoverLista ? " hov" : "";
        html += '<div class="tl-row' + on + '" data-id="' + esc(a.id) + '">' +
          '<span style="color:' + a.cor + '">' + esc(a.no) + "</span>" +
          "<span>" + esc(a.rota) + "</span>" +
          "<span>" + esc(a.tipo === "adsb" ? (a.v.gnd ? "AEROPORTO" : "EM VOO") : a.sit) + "</span>" +
          "<span>" + esc(a.info) + "</span>" +
          "<span>" + nf(a.dist) + "K</span></div>";
      }
    }
    el.innerHTML = html || '<div class="tl-sec">SEM DADOS</div>';
    sincSlider();
  }

  function sincSlider() {
    const sl = $("#torre-sel");
    if (!sl) return;
    sl.max = String(Math.max(0, ordem.length - 1));
    const i = ordem.findIndex((a) => a.id === selId);
    if (i >= 0 && Number(sl.value) !== i && document.activeElement !== sl) sl.value = String(i);
    const lb = $("#torre-sel-lbl");
    if (lb) {
      const a = i >= 0 ? ordem[i] : null;
      lb.textContent = a ? a.no + " · " + (i + 1) + "/" + ordem.length : ordem.length + " VOOS";
      lb.title = a ? a.rota + " " + a.sit : "";
    }
  }

  function selecionarPorSlider() {
    if (!usuarioSlider) return;
    const sl = $("#torre-sel");
    if (!sl) return;
    const a = ordem[Number(sl.value)];
    if (!a) return;
    selId = a.id;
    ficha(a);
    listar();
    const row = $("#torre-lista .tl-row.on");
    if (row) row.scrollIntoView({ block: "nearest" });
  }

  function legenda() {
    const el = $(".torre-legenda");
    if (!el) return;
    const itens = [
      ["PROGRAMADO", COR.prog], ["CHECK-IN", COR.chk], ["EMBARQUE", COR.emb],
      ["ATRASADO", COR.atr], ["PARTIU", COR.part], ["NO AR", COR.noar],
      ["APROXIMANDO", COR.apo], ["POUSOU", COR.pou], ["CHEGOU", COR.cheg],
      ["CANCELADO", COR.canc], ["ADS-B", COR.adsb]
    ];
    el.innerHTML = itens.map((i) =>
      '<span><i style="background:' + i[1] + '"></i>' + i[0] + "</span>"
    ).join("");
  }

  function atualizar() {
    construir();
    pintarStats();
    listar();
    const sel = alvos.find((a) => a.id === selId);
    ficha(sel);
    const u = $("#torre-upd");
    if (u) u.textContent = "ATUALIZADO " + hora();
    const ar = $("#torre-alcance");
    if (ar && document.activeElement !== ar && ar.value !== modoAlcance) ar.value = modoAlcance;
    const zv = $("#torre-zoom-val");
    if (zv && document.activeElement !== zv && Number(zv.value) !== alcance) zv.value = alcance;
  }

  function loop(ts) {
    if (!rodando) return;
    desenhar(ts);
    raf = requestAnimationFrame(loop);
  }

  function achar(e) {
    const r = cv.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const cx = cw / 2, cy = ch / 2;
    const raio = Math.max(40, Math.min(cx, cy) - 10);
    const kmPx = raio / alcance;
    let best = null, bd = 24;
    for (const a of alvos) {
      const pr = proj(a.lat, a.lon);
      const x = cx + pr.x * kmPx;
      const y = cy + pr.y * kmPx;
      const d = Math.hypot(x - mx, y - my);
      if (d < bd && Math.hypot(mx - cx, my - cy) <= raio + 8) {
        bd = d;
        best = a;
      }
    }
    return best;
  }

  function montar() {
    if (montado) return;
    const canvas = $("#torre-canvas");
    if (!canvas) return;
    cv = canvas;
    ctx = cv.getContext("2d");
    tela();

    const zval = $("#torre-zoom-val");
    const zin = $("#torre-zoom-in");
    const zout = $("#torre-zoom-out");

    function refletirZoom() {
      if (zval && Number(zval.value) !== alcance) zval.value = alcance;
      if (ar && ar.value !== modoAlcance) ar.value = modoAlcance;
    }

    function aplicar(km) {
      km = clamp(km, 150, 20000);
      alcance = km;
      modoAlcance = String(km);
      if (ar) {
        let opt = ar.querySelector('option[value="' + km + '"]');
        if (!opt) {
          opt = document.createElement("option");
          opt.value = String(km);
          opt.textContent = nf(km) + " KM";
          ar.appendChild(opt);
        }
        ar.value = String(km);
      }
      atualizar();
      refletirZoom();
    }

    const ar = $("#torre-alcance");
    if (ar) {
      ar.innerHTML = '<option value="auto">AUTO</option>' +
        ALCANCES.map((k) => '<option value="' + k + '">' + (k >= 1000 ? k / 1000 + "K" : k) + " KM</option>").join("");
      ar.value = modoAlcance;
      ar.addEventListener("change", () => {
        modoAlcance = ar.value;
        if (modoAlcance !== "auto") alcance = Number(modoAlcance);
        atualizar();
        refletirZoom();
      });
    }

    if (zin) zin.addEventListener("click", () => {
      const prox = ALCANCES.find((x) => x > alcance) || 20000;
      aplicar(prox);
    });
    if (zout) zout.addEventListener("click", () => {
      const prox = ALCANCES.slice().reverse().find((x) => x < alcance) || 150;
      aplicar(prox);
    });
    if (zval) zval.addEventListener("change", () => aplicar(Number(zval.value) || 1200));

    const sl = $("#torre-sel");
    if (sl) {
      sl.addEventListener("pointerdown", () => { usuarioSlider = true; });
      sl.addEventListener("keydown", () => { usuarioSlider = true; });
      sl.addEventListener("input", selecionarPorSlider);
      sl.addEventListener("change", selecionarPorSlider);
    }

    cv.addEventListener("click", (e) => {
      const a = achar(e);
      selId = a ? a.id : null;
      ficha(a);
      listar();
    });
    cv.addEventListener("mousemove", (e) => {
      const a = achar(e);
      const id = a ? a.id : null;
      if (id !== hoverId) {
        hoverId = id;
        cv.style.cursor = a ? "pointer" : "crosshair";
      }
    });
    cv.addEventListener("mouseleave", () => { hoverId = null; });

    const lista = $("#torre-lista");
    if (lista) {
      lista.addEventListener("click", (e) => {
        const row = e.target.closest(".tl-row");
        if (!row) return;
        selId = row.dataset.id;
        ficha(alvos.find((a) => a.id === selId));
        listar();
      });
      lista.addEventListener("mousemove", (e) => {
        const row = e.target.closest(".tl-row");
        const id = row ? row.dataset.id : null;
        if (id !== hoverLista) {
          hoverLista = id;
          listar();
        }
      });
    }

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => { if (montado) tela(); }).observe(cv.parentElement);
    } else {
      window.addEventListener("resize", () => { if (montado) tela(); });
    }

    legenda();
    montado = true;
  }

  function iniciar() {
    montar();
    if (!montado || rodando) return;
    rodando = true;
    ultTs = 0;
    atualizar();
    raf = requestAnimationFrame(loop);
    timer = setInterval(atualizar, 1000);
  }

  function parar() {
    rodando = false;
    cancelAnimationFrame(raf);
    clearInterval(timer);
    raf = 0;
    timer = 0;
  }

  return { iniciar: iniciar, parar: parar };
})();
