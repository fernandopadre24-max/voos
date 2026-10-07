(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const KEY = "voou.reservas.v1";

  const COLS = [7, 13, 20, 6, 7, 18];
  const HEADS = {
    partidas: ["VOO", "COMPANHIA", "DESTINO", "PORTÃO", "HORÁRIO", "SITUAÇÃO"],
    chegadas: ["VOO", "COMPANHIA", "ORIGEM", "PORTÃO", "CHEGADA", "SITUAÇÃO"]
  };

  let reservas = [];
  try { reservas = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { reservas = []; }
  const FILA = {};

  const MAX_PAX = 6;
  const W = {
    step: 1, flight: null, aviso: "",
    origem: "GRU", destino: "GIG", dia: 0, lista: [], busca: "",
    paxs: [{ nome: "", doc: "", assento: null }],
    email: "", tel: "",
    classe: "ECON", ativo: 0, bags: 0, peso: 0, pag: "CARTAO",
    erros: {}, emissao: null, milhas: 0
  };

  function mesmoDia(f) { return (f && f.dia ? f.dia : 0) === 0; }

  function rotuloDia(dia) {
    if (!dia) return "HOJE · " + DATA.dataLonga(0);
    if (dia === 1) return "AMANHA · " + DATA.dataLonga(1);
    return DATA.dataSemana(dia) + " · " + DATA.dataLonga(dia);
  }

  function paxList(r) {
    if (r.passageiros && r.passageiros.length) return r.passageiros;
    return [{ nome: r.pax.nome, doc: r.pax.doc, assento: r.assento }];
  }

  function ensurePax(r) {
    if (!r.passageiros || !r.passageiros.length) {
      r.passageiros = paxList(r).map((p) => ({ nome: p.nome, doc: p.doc, assento: p.assento }));
    }
    return r.passageiros;
  }

  function assentosReservados(paxs, exceto) {
    const s = new Set();
    paxs.forEach((p, i) => { if (i !== exceto && p.assento) s.add(p.assento); });
    return s;
  }

  let filtro = { partidas: "", chegadas: "" };
  const rota = {
    partidas: { origem: "GRU", destino: "" },
    chegadas: { origem: "", destino: "GRU" }
  };

  function salvar() { localStorage.setItem(KEY, JSON.stringify(reservas)); }
  function agoraMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  function hhmm(m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
  function durTxt(m) { return Math.floor(m / 60) + "H" + String(m % 60).padStart(2, "0"); }
  function brl(v) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }); }
  function dataHoje() { const d = new Date(); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); }
  function horaAgora() { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0"); }
  function pad(v, n) { v = String(v).toUpperCase(); return v.length > n ? v.slice(0, n) : v.padEnd(n); }

  function rotaVoo(f) { return [f.origem].concat(f.escala || [], [f.destino]).join(" > "); }

  const BR_AEROS = ["GRU", "CGH", "VCP", "GIG", "SDU", "REC", "FOR", "BSB", "CNF", "SSA", "BEL", "POA", "CWB", "MAU"];

  function internacional(v) {
    if (!v || !v.origem || !v.destino) return false;
    if (BR_AEROS.indexOf(v.origem) < 0 || BR_AEROS.indexOf(v.destino) < 0) return true;
    return (v.escala || []).some(function (a) { return BR_AEROS.indexOf(a) < 0; });
  }

  function passaporteOk(d) {
    const t = String(d || "").trim();
    return t.length >= 6 && (t.match(/[A-Za-z]/g) || []).length >= 2;
  }

  function escalaTxt(f) {
    const e = f.escala || [];
    if (!e.length) return "VOO DIRETO";
    return e.length + " ESCALA" + (e.length > 1 ? "S" : "") + " EM " +
      e.map((c) => ((DATA.AEROS && DATA.AEROS[c]) || { cidade: c }).cidade).join(" + ");
  }

  function celDestino(f, larg) {
    const e = f.escala || [];
    const sufixo = e.length ? " " + e.length + " ESC" : "";
    return f.cidade.slice(0, Math.max(3, larg - sufixo.length)) + sufixo;
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gateDe(f) {
    if (f.gate2 && f.gateMudaEm !== null && f.gateMudaEm !== undefined) {
      if (agoraMin() - f.gateMudaEm >= 0) return f.gate2;
    }
    return f.gate;
  }

  function statusDe(f) {
    const delay = f.delay || 0;
    if (f.cancelado) return "CANCELADO";
    if (f.dia) return "PROGRAMADO";
    const raw = (((f.ref - DATA.DELTA) % 1440) + 1440) % 1440;
    const rel = 720 - raw - delay;
    if (f.tipo === "partidas") {
      if (delay && rel >= -60 && rel < -4) return "ATRASADO " + delay + " MIN";
      if (rel < -60) return "PROGRAMADO";
      if (rel < -45) return "CHECK-IN ABERTO";
      if (rel < -20) return "EMBARQUE";
      if (rel < -4) return "ULTIMO CHAMADO";
      return "PARTIU";
    }
    if (delay && rel >= -60 && rel < -4) return "ATRASADO " + delay + " MIN";
    if (rel < -90) return "PROGRAMADO";
    if (rel < -30) return "NO AR";
    if (rel < -12) return "APROXIMANDO";
    if (rel < 0) return "POUSOU";
    if (rel < 25) return "DESEMBARQUE";
    return "CHEGOU";
  }

  function podeReservar(f) { return !!f && statusDe(f) === "PROGRAMADO"; }

  function classeStat(s) {
    if (s === "CANCELADO") return "bad";
    if (s === "LOTADO") return "yel";
    if (s === "LISTA DE ESPERA") return "org";
    if (s.indexOf("ATRASADO") === 0) return "yel";
    if (s === "ULTIMO CHAMADO") return "org";
    if (s === "EMBARQUE" || s === "POUSOU" || s === "DESEMBARQUE") return "hot";
    if (s === "PARTIU") return "deep";
    if (s === "CHEGOU") return "dim";
    return "";
  }

  function ordemChave(f) {
    let d = f.ref - agoraMin();
    if (d < -720) d += 1440;
    return d;
  }

  function baseRota(tipo) {
    const r = rota[tipo];
    if (tipo === "partidas") {
      if (!r.destino) return DATA.departures.filter(mesmoDia);
      if (r.origem === "GRU") return DATA.departures.filter((f) => f.destino === r.destino && mesmoDia(f));
      return DATA.gerarVoos("partidas", r.origem, r.destino, 0);
    }
    if (!r.origem) return DATA.arrivals.filter(mesmoDia);
    if (r.destino === "GRU") return DATA.arrivals.filter((f) => f.origem === r.origem && mesmoDia(f));
    return DATA.gerarVoos("chegadas", r.origem, r.destino, 0);
  }

  function rotaTxt(tipo) {
    const r = rota[tipo];
    return (r.origem || "TODAS") + " > " + (r.destino || "TODOS");
  }

  function listaFiltrada(tipo) {
    const q = (filtro[tipo] || "").toUpperCase().trim();
    let arr = baseRota(tipo).filter((f) => {
      if (!q) return true;
      return f.no.indexOf(q) >= 0 || f.cidade.indexOf(q) >= 0 || f.destino.indexOf(q) >= 0 ||
        f.origem.indexOf(q) >= 0 || (DATA.AIRLINES[f.al] || "").indexOf(q) >= 0 || f.al.indexOf(q) === 0;
    });
    arr = arr.slice().sort((a, b) => ordemChave(a) - ordemChave(b));
    return arr;
  }

  function criarRow(f, i, tipo) {
    const row = document.createElement("div");
    row.className = "row";
    row.dataset.i = f.idx;
    row.dataset.tipo = tipo;
    row._voo = f;
    row._cells = [];
    for (let c = 0; c < 6; c++) {
      const cell = document.createElement("div");
      cell.className = "cell c" + c;
      const v = document.createElement("span");
      v.className = "val";
      cell.appendChild(v);
      row.appendChild(cell);
      row._cells.push(v);
    }
    return row;
  }

  function renderBoard(tipo) {
    const cont = $("#board-" + tipo);
    const lista = listaFiltrada(tipo);
    let mudou = cont.children.length !== lista.length;
    if (!mudou) {
      for (let i = 0; i < lista.length; i++) {
        if (!cont.children[i]._voo || chaveVoo(cont.children[i]._voo) !== chaveVoo(lista[i])) { mudou = true; break; }
      }
    }
    if (mudou) {
      cont.textContent = "";
      lista.forEach((f, i) => cont.appendChild(criarRow(f, i, tipo)));
    }
    lista.forEach((f, i) => {
      const row = cont.children[i];
      row._voo = f;
      const st = rotuloLista(f);
      const vals = [
        pad(f.no, COLS[0]),
        pad(DATA.AIRLINES[f.al] || f.al, COLS[1]),
        pad(celDestino(f, COLS[2]), COLS[2]),
        pad(f.cancelado ? "--" : gateDe(f), COLS[3]),
        pad(hhmm(f.ref), COLS[4]),
        pad(st, COLS[5])
      ];
      row.classList.toggle("st-hot", classeStat(st) === "hot");
      row.classList.toggle("st-bad", classeStat(st) === "bad");
      row.classList.toggle("st-dim", classeStat(st) === "dim");
      row.classList.toggle("st-org", classeStat(st) === "org");
      row.classList.toggle("st-deep", classeStat(st) === "deep");
      row.classList.toggle("st-yel", classeStat(st) === "yel");
      vals.forEach((v, j) => Flap.set(row._cells[j], v, i * 34 + j * 6));
    });
    const upd = $("#upd-" + tipo);
    if (upd) upd.textContent = rotaTxt(tipo) + " · ATUALIZADO " + horaAgora();
  }

  function renderCabecalhos() {
    ["partidas", "chegadas"].forEach((tipo) => {
      const h = $("#head-" + tipo);
      h.textContent = "";
      HEADS[tipo].forEach((t, i) => {
        const c = document.createElement("div");
        c.className = "cell c" + i;
        c.textContent = t;
        h.appendChild(c);
      });
    });
  }

  function cliqueRow(e) {
    const row = e.target.closest(".row");
    if (!row || row.id) return;
    const tipo = row.dataset.tipo;
    const f = row._voo;
    if (!f) return;
    if (tipo === "chegadas") {
      W.aviso = "O VOO " + f.no + " ESTA CHEGANDO A " + f.destino + ". ESCOLHA UM VOO DE PARTIDA PARA RESERVAR.";
      W.flight = null;
    } else if (!podeReservar(f)) {
      W.aviso = "O VOO " + f.no + " ESTA COM SITUACAO " + statusDe(f) + ". APENAS VOOS COM SITUACAO PROGRAMADO PODERAO SER RESERVADOS.";
      W.flight = null;
    } else if (lotado(f)) {
      W.aviso = "O VOO " + f.no + " ESTA LOTADO - NENHUMA POLTRONA LIVRE. ENTRE NA LISTA DE ESPERA NO TERMINAL: ESPERA " + f.no.replace(/\s/g, "");
      W.flight = null;
    } else {
      W.aviso = "";
      W.flight = f;
      W.origem = f.origem;
      W.destino = f.destino;
      W.dia = f.dia || 0;
      W.paxs = [{ nome: "", doc: "", assento: null }];
      W.ativo = 0;
      W.email = ""; W.tel = "";
      if (!mesmoDia(f)) W.pag = "CARTAO";
    }
    W.step = W.flight ? 2 : 1;
    W.erros = {};
    irPara("reserva");
    renderWizard();
  }

  function opcoesAero(todas, rotulo, sel) {
    const aero = Object.keys(DATA.AEROS).sort((a, b) =>
      DATA.AEROS[a].cidade.localeCompare(DATA.AEROS[b].cidade) || a.localeCompare(b));
    return (todas ? `<option value="">${rotulo}</option>` : "") +
      aero.map((c) => `<option value="${c}"${c === sel ? " selected" : ""}>${c} · ${DATA.AEROS[c].cidade}</option>`).join("");
  }

  function montarRotaSelects(tipo) {
    const r = rota[tipo];
    const ori = $("#rota-ori-" + tipo);
    const des = $("#rota-des-" + tipo);
    if (!ori || !des) return;
    ori.innerHTML = opcoesAero(tipo === "chegadas", "TODAS AS ORIGENS", r.origem);
    des.innerHTML = opcoesAero(tipo === "partidas", "TODOS OS DESTINOS", r.destino);
    imporRota(tipo);
  }

  function imporRota(tipo) {
    const r = rota[tipo];
    if (tipo === "partidas" && r.origem !== "GRU" && !r.destino) r.destino = "GIG";
    if (tipo === "chegadas" && r.destino !== "GRU" && !r.origem) r.origem = "GRU";
    if (r.origem && r.origem === r.destino) {
      if (tipo === "partidas") r.destino = r.origem === "GRU" ? "" : "GRU";
      else r.origem = r.destino === "GRU" ? "" : "GRU";
    }
    const ori = $("#rota-ori-" + tipo);
    const des = $("#rota-des-" + tipo);
    if (!ori || !des) return;
    ori.value = r.origem;
    des.value = r.destino;
    if (tipo === "partidas") {
      const t = des.querySelector('option[value=""]');
      if (t) t.disabled = r.origem !== "GRU";
    } else {
      const t = ori.querySelector('option[value=""]');
      if (t) t.disabled = r.destino !== "GRU";
    }
  }

  function trocarRota(tipo, campo, valor) {
    rota[tipo][campo] = valor;
    imporRota(tipo);
    renderBoard(tipo);
  }

  function layout(ac) {
    if (/777|787|A330|A350|A340|767/.test(ac)) return { linhas: 30, grupos: [["A", "B"], ["C", "D", "E", "F"], ["G", "H"]], exec: 5 };
    return { linhas: 28, grupos: [["A", "B", "C"], ["D", "E", "F"]], exec: 4 };
  }

  function chaveVoo(v) {
    return [v.no, v.ref, v.origem, v.destino, v.dia || 0].join("|");
  }

  function ocupados(voo) {
    const L = layout(voo.ac);
    const rnd = mulberry(hash(chaveVoo(voo)));
    const set = new Set();
    for (let r = 1; r <= L.linhas; r++) {
      for (const g of L.grupos) {
        for (const c of g) {
          const dens = r <= L.exec ? 0.7 : 0.48;
          if (rnd() < dens) set.add(r + c);
        }
      }
    }
    if (cheia(voo)) {
      for (let r = 1; r <= L.linhas; r++) {
        for (const g of L.grupos) {
          for (const c of g) set.add(r + c);
        }
      }
    }
    const k = chaveVoo(voo);
    reservas.forEach((x) => {
      if (x.status === "CANCELADA" || chaveVoo(x.voo) !== k) return;
      paxList(x).forEach((p) => { if (p.assento) set.add(p.assento); });
    });
    return set;
  }

  function seatMapHTML(voo, atual, bloqueados) {
    const L = layout(voo.ac);
    const ocup = ocupados(voo);
    const nFila = filaSize(voo);
    let espSeat = "";
    if (nFila) {
      for (let r = 1; r <= L.linhas; r++) {
        for (const c of L.grupos.flat()) {
          const id = r + c;
          if (!ocup.has(id) && !(bloqueados && bloqueados.has(id))) { espSeat = id; break; }
        }
        if (espSeat) break;
      }
    }
    let h = '<div class="cockpit"><span>&uarr; PROA / FRENTE DO AVIAO</span><span>' + voo.ac + "</span></div>";
    if (nFila) h += '<div class="esp-tag">LISTA DE ESPERA (' + nFila + ")" + (espSeat ? " · VAGA GARANTIDA: " + espSeat + " (SOMENTE P/ ESPERA)" : "") + "</div>";
    h += '<div class="seats">';
    for (let r = 1; r <= L.linhas; r++) {
      h += '<div class="seatrow"><span class="rownum">' + String(r).padStart(2, "0") + "</span>";
      L.grupos.forEach((g, gi) => {
        g.forEach((c) => {
          const id = r + c;
          const taken = ocup.has(id) || !!(bloqueados && bloqueados.has(id));
          const sel = atual === id;
          const esp = !taken && espSeat === id;
          h += '<button type="button" class="seat' + (r <= L.exec ? " exec" : "") + (taken ? " taken" : "") + (sel ? " sel" : "") + (esp ? " esp" : "") +
            '" data-seat="' + id + '"' + (taken ? " disabled" : "") + ' title="' + (esp ? "VAGA GARANTIDA PELA LISTA DE ESPERA" : "ASSENTO " + id) + '">' + id + "</button>";
        });
        if (gi < L.grupos.length - 1) h += '<span class="aisle"></span>';
      });
      h += '<span class="rownum">' + String(r).padStart(2, "0") + "</span></div>";
    }
    h += "</div>";
    return h;
  }

  function totalAssentos(ac) {
    const L = layout(ac);
    return L.linhas * L.grupos.reduce((s, g) => s + g.length, 0);
  }

  function cheia(voo) {
    return hash([voo.no, voo.origem, voo.destino, voo.tipo || ""].join("|")) % 6 === 0;
  }

  function livres(voo) {
    return totalAssentos(voo.ac) - ocupados(voo).size;
  }

  function lotado(voo) {
    return !!voo && livres(voo) === 0;
  }

  function filaKey(no) {
    return String(no || "").replace(/\s/g, "").toUpperCase();
  }

  function filaSize(voo) {
    const k = filaKey(voo.no);
    return FILA[k] ? FILA[k].length : 0;
  }

  function rotuloLista(f) {
    const st = statusDe(f);
    if (st !== "PROGRAMADO") return st;
    if (!lotado(f)) return st;
    return filaSize(f) ? "LISTA DE ESPERA" : "LOTADO";
  }

  function precoBase(km) { return Math.max(219, Math.round((km * 0.47) / 10) * 10 - 1); }

  function precoTotal(f, classe, bags) {
    const b = precoBase(f.km);
    let p = classe === "EXEC" ? Math.round((b * 2.7) / 10) * 10 - 1 : b;
    if (classe !== "EXEC") p += bags * 89;
    return p;
  }

  function franquiaKg(classe) { return classe === "EXEC" ? 20 : 10; }
  function taxaPesoPax(kg, classe) { return Math.max(0, (kg || 0) - franquiaKg(classe)) * 6; }
  function taxaPeso(paxs, classe) { return (paxs || []).reduce((s, p) => s + taxaPesoPax(p.peso, classe), 0); }
  function pesoTotal(paxs) { return (paxs || []).reduce((s, p) => s + (p.peso || 0), 0); }

  const CARTOES_KEY = "voou.cartoes";

  function normCartao(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }

  function cartoesLer() {
    try { return JSON.parse(localStorage.getItem(CARTOES_KEY) || "{}") || {}; } catch (e) { return {}; }
  }

  function cartoesSalvar(c) {
    try { localStorage.setItem(CARTOES_KEY, JSON.stringify(c)); } catch (e) {}
  }

  function cartaoAtivo() {
    return T.cartao ? cartoesLer()[T.cartao] || null : null;
  }

  function normNome(s) { return String(s || "").replace(/\s+/g, " ").trim().toUpperCase(); }

  function ligarCartaoCliente(nome) {
    const n = normNome(nome);
    if (n.length < 6 || n.indexOf(" ") < 0) return null;
    const cs = cartoesLer();
    const chave = Object.keys(cs).find((k) => normNome(cs[k].nome) === n);
    if (chave) { T.cartao = chave; return { card: cs[chave], novo: false }; }
    const num = gerarCartao();
    cs[normCartao(num)] = { num: num, nome: n, criado: Date.now(), saldo: {} };
    cartoesSalvar(cs);
    T.cartao = normCartao(num);
    return { card: cs[T.cartao], novo: true };
  }

  function linhaCartaoLigado(nome) {
    const l = ligarCartaoCliente(nome);
    if (!l) return null;
    return "CARTAO DE MILHAS " + (l.novo ? "EMITIDO E LIGADO: " : "LIGADO AO CLIENTE: ") + l.card.num + " · " + l.card.nome;
  }

  function gerarCartao() {
    const cs = cartoesLer();
    let num = "";
    do {
      let d = "";
      for (let i = 0; i < 10; i++) d += String((Math.random() * 10) | 0);
      num = "VM-" + d;
    } while (cs[normCartao(num)]);
    return num;
  }

  function milhasSaldo(al) { const c = cartaoAtivo(); return c ? (c.saldo[al] || 0) : 0; }

  function fmtMil(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

  function milhasValor(n) { return (n || 0) / 100; }

  function milhasMaxUsar(al, bruto) {
    return Math.max(0, Math.min(milhasSaldo(al), Math.floor(bruto * 100)));
  }

  function milhasGanhas(f, classe, n) {
    return Math.round(f.km * (classe === "EXEC" ? 2 : 1) * n);
  }

  function brutoRascunho(R) {
    if (!R.voo) return 0;
    return (precoTotal(R.voo, R.classe, R.bags) + 89.9) * R.paxs.length + taxaPeso(R.paxs, R.classe);
  }

  function gerarPNR() {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    do {
      s = "";
      for (let i = 0; i < 5; i++) s += abc[(Math.random() * abc.length) | 0];
    } while (reservas.some((r) => r.pnr === s));
    return s;
  }

  function barcodeHTML(seed) {
    const rnd = mulberry(hash(seed));
    let h = '<div class="barcode">';
    for (let i = 0; i < 58; i++) {
      const w = 1 + ((rnd() * 4) | 0);
      h += '<i style="width:' + w + 'px"></i>';
    }
    return h + "</div>";
  }

  function bilheteHTML(r, paxInfo, ordem, total) {
    const ps = paxInfo || paxList(r)[0];
    const v = r.voo;
    const embarque = hhmm(v.ref - 40);
    const tag = total > 1 ? " · " + ordem + "/" + total : "";
    return `
      <div class="pass">
        <div class="pass-stub">
          <div class="pass-brand"><b>VOOU</b><span>PASSAGEM ELETRONICA${tag}</span></div>
          <div class="pass-route">
            <div><small>DE</small><b>${v.origem}</b><span>${(DATA.AEROS[v.origem] || { cidade: "SAO PAULO" }).cidade}</span></div>
            <div class="arrow">&rarr;</div>
            <div><small>${v.tipo === "partidas" ? "PARA" : "DE"}</small><b>${v.tipo === "partidas" ? v.destino : v.origem}</b><span>${v.cidade}</span></div>
          </div>
          <div class="pass-escala">ROTA ${rotaVoo(v)} · ${escalaTxt(v)}</div>
          <div class="pass-grid">
            <div><small>PASSAGEIRO</small><b>${ps.nome}</b></div>
            <div><small>VOO</small><b>${v.no}</b></div>
            <div><small>DATA</small><b>${v.data || dataHoje()}</b></div>
            <div><small>${v.tipo === "partidas" ? "PARTIDA" : "CHEGADA"}</small><b>${hhmm(v.ref)}</b></div>
            <div><small>EMBARQUE</small><b>${embarque}</b></div>
            <div><small>PORTAO</small><b>${gateDe(v)}</b></div>
            <div><small>ASSENTO</small><b>${ps.assento}</b></div>
            <div><small>CLASSE</small><b>${r.classe}</b></div>
            <div><small>BAGAGENS</small><b>${r.bags}${r.peso ? " · " + r.peso + " KG" : ""}</b></div>
            ${r.milhas ? `<div><small>MILHAS</small><b>+${fmtMil(r.milhas.ganhas)}</b></div>` : ""}
          </div>
        </div>
        <div class="pass-tear"><span></span></div>
        <div class="pass-coupon">
          <div class="pass-brand"><b>VOOU</b><span>${r.pnr}</span></div>
          <div class="pass-mini">
            <div><small>${v.origem}</small><b>${v.tipo === "partidas" ? v.destino : v.origem}</b></div>
            <div><small>ASSENTO</small><b>${ps.assento}</b></div>
            <div><small>PORTAO</small><b>${gateDe(v)}</b></div>
            <div><small>EMBARQUE</small><b>${embarque}</b></div>
          </div>
          ${barcodeHTML(r.pnr + ps.assento)}
          <div class="pass-pnr"><small>CODIGO DE RESERVA</small><b>${r.pnr}</b></div>
          ${r.pag === "BALCAO" ? '<div class="pass-pag">PAGAMENTO NO BALCAO · PAGAR NA RETIRADA</div>' : ""}
          ${r.status === "CHECK-IN" ? '<div class="stamp">CHECK-IN<br>FEITO</div>' : ""}
          ${r.status === "CANCELADA" ? '<div class="stamp canc">CANCELADA</div>' : ""}
        </div>
      </div>`;
  }

  function passesHTML(r) {
    const ps = paxList(r);
    return ps.map((p, i) => bilheteHTML(r, p, i + 1, ps.length)).join("");
  }

  function imprimir() {
    const area = $("#print-area");
    if (!area) return;
    area.innerHTML = "";
    $$(".pass").filter((p) => p.offsetParent !== null).forEach((p) => area.appendChild(p.cloneNode(true)));
    window.print();
  }

  function painel(titulo, corpo, extra) {
    return '<div class="panel"><div class="panel-title">' + titulo + (extra || "") + "</div><div class=\"panel-body\">" + corpo + "</div></div>";
  }

  function resumoVoo(f) {
    const dia = f.dia || 0;
    return `
      <div class="voo-resumo">
        <div class="vr-l">
          <span class="vr-no">${f.no}</span>
          <span class="vr-al">${DATA.AIRLINES[f.al]}</span>
        </div>
        <div class="vr-m">
          <b>${rotaVoo(f)}</b>
          <span>${f.cidade} · ${f.ac} · DURACAO ${durTxt(f.dur)}</span>
          <span>${f.km.toLocaleString("pt-BR")} KM DE VOO · ${escalaTxt(f)} · ${f.term}</span>
        </div>
        <div class="vr-r">
          <b>${hhmm(f.ref)}</b>
          <span>PORTAO ${gateDe(f)}</span>
          <span>${dia ? DATA.dataSemana(dia) + " " + DATA.dataCurta(dia) : "HOJE " + DATA.dataCurta(0)}</span>
        </div>
      </div>`;
  }

  function aplicarBusca() {
    const alvo = $("#wizard");
    if (!alvo) return;
    const q = (W.busca || "").toUpperCase().trim();
    let n = 0;
    $$(".voo-item", alvo).forEach((b) => {
      const f = W.lista[Number(b.dataset.i)];
      if (!f) return;
      const sim = !q || f.no.indexOf(q) >= 0 || (DATA.AIRLINES[f.al] || "").indexOf(q) >= 0 ||
        f.cidade.indexOf(q) >= 0 || f.destino.indexOf(q) >= 0 || f.origem.indexOf(q) >= 0 ||
        hhmm(f.ref).indexOf(q) >= 0 || statusDe(f).indexOf(q) >= 0;
      b.style.display = sim ? "" : "none";
      if (sim) n++;
    });
    const t = $("#bs-total", alvo);
    if (t) t.textContent = n + " DE " + W.lista.length + " VOOS";
  }

  function renderWizard() {
    const alvo = $("#wizard");
    if (W.step === 1) {
      if (W.destino === W.origem) W.destino = DATA.listaAeroportos(W.origem)[0];
      const lista = DATA.gerarVoos("partidas", W.origem, W.destino, W.dia, true)
        .slice()
        .sort((a, b) => (W.dia ? a.ref - b.ref : ordemChave(a) - ordemChave(b)));
      W.lista = lista;
      if (W.flight && (!lista.some((f) => chaveVoo(f) === chaveVoo(W.flight)) || !podeReservar(W.flight))) W.flight = null;
      const opcoes = (excluir, sel) => DATA.listaAeroportos(excluir).map((c) =>
        `<option value="${c}"${c === sel ? " selected" : ""}>${c} · ${DATA.AEROS[c].cidade} (${DATA.AEROS[c].nome})</option>`).join("");
      const tarifa = precoBase(Math.max(25, DATA.DIST(W.origem, W.destino)));
      let corpo = "";
      if (W.aviso) corpo += '<div class="aviso">' + W.aviso + "</div>";
      else if (!lista.length) corpo += '<div class="aviso">NENHUM VOO DISPONIVEL DE ' + W.origem + " PARA " + W.destino + " EM " + rotuloDia(W.dia).toUpperCase() + (W.origem !== "GRU" ? " · A BASE SO OPERA PARTIDAS DE GRU" : " · A BASE NAO OPERA ESSE TRECHO") + "</div>";
      corpo += `
        <div class="busca">
          <div class="bk full">
            <span class="bk-t">DATA DA VIAGEM</span>
            <div class="date-strip">
              ${Array.from({ length: DATA.DIAS }, (_, d) => `
                <button type="button" class="dia-btn${W.dia === d ? " on" : ""}" data-dia="${d}">
                  <b>${d === 0 ? "HOJE" : d === 1 ? "AMANHA" : DATA.dataSemana(d).split(" ")[0]}</b>
                  <span>${DATA.dataCurta(d)}</span>
                  <i>${d < 2 ? DATA.dataLonga(d) : DATA.dataSemana(d)}</i>
                </button>`).join("")}
            </div>
          </div>
          <label class="bk">AEROPORTO DE ORIGEM
            <select class="sel" id="bs-ori">${opcoes(null, W.origem)}</select>
          </label>
          <label class="bk">AEROPORTO DE DESTINO
            <select class="sel" id="bs-des">${opcoes(W.origem, W.destino)}</select>
          </label>
          <label class="bk full">BUSCAR VOO
            <div class="busca-linha">
              <input class="in" id="bs-busca" type="text" value="${W.busca || ""}" placeholder="NUMERO, COMPANHIA, CIDADE OU HORA" autocomplete="off">
              <span class="upd" id="bs-total"></span>
            </div>
          </label>
        </div>
        <p class="txt">${lista.length} VOO(S) PARA <b>${W.origem} &rarr; ${W.destino}</b> · ${DATA.AEROS[W.destino].cidade} · ${rotuloDia(W.dia).toUpperCase()} · TARIFA A PARTIR DE <b>${brl(tarifa)}</b>. SELECIONE O VOO ABAIXO OU CLIQUE NUMA LINHA DO TABULEIRO DE PARTIDAS. <b>APENAS VOOS COM SITUACAO PROGRAMADO PODERAO SER RESERVADOS.</b></p>
        <div class="lista-voos">
          ${lista.map((f, i) => {
            const st = statusDe(f);
            const livre = st === "PROGRAMADO";
            const sel = W.flight && chaveVoo(W.flight) === chaveVoo(f);
            return `<button type="button" class="voo-item${sel ? " on" : ""}" data-i="${i}"${livre ? "" : " disabled"} title="${livre ? "SELECIONAR ESTE VOO" : "SITUACAO " + st + " - RESERVA BLOQUEADA"}">
              <span class="vi-no">${f.no}</span>
              <span class="vi-cid">${DATA.AIRLINES[f.al]}${(f.escala || []).length ? '<i class="vi-esc" title="' + rotaVoo(f) + '">' + f.escala.length + ' ESCALA' + (f.escala.length > 1 ? "S" : "") + '</i>' : ""}</span>
              <span class="vi-h">${hhmm(f.ref)}</span>
              <span class="vi-g">PORT ${gateDe(f)}</span>
              <span class="vi-s s-${classeStat(st)}">${st}</span>
            </button>`;
          }).join("")}
        </div>`;
      corpo += '<div class="wz-nav"><span></span><button class="btn prim" id="wz-next"' + (W.flight ? "" : " disabled") + ">CONTINUAR &rarr;</button></div>";
      alvo.innerHTML = painel("PASSO 1 / 4 — ORIGEM, DESTINO E DATA", corpo);
      aplicarBusca();
      $("#bs-busca", alvo).addEventListener("input", (e) => {
        W.busca = e.target.value;
        aplicarBusca();
      });
      $$(".dia-btn", alvo).forEach((b) => b.addEventListener("click", () => {
        W.dia = Number(b.dataset.dia);
        if (!mesmoDia({ dia: W.dia }) && W.pag === "BALCAO") W.pag = "CARTAO";
        W.erros = {};
        W.aviso = "";
        renderWizard();
      }));
      $("#bs-ori", alvo).addEventListener("change", (e) => {
        W.origem = e.target.value;
        if (W.destino === W.origem) W.destino = DATA.listaAeroportos(W.origem)[0];
        W.flight = null;
        W.aviso = "";
        renderWizard();
      });
      $("#bs-des", alvo).addEventListener("change", (e) => {
        W.destino = e.target.value;
        W.flight = null;
        W.aviso = "";
        renderWizard();
      });
      $$(".voo-item", alvo).forEach((b) => b.addEventListener("click", () => {
        W.flight = W.lista[Number(b.dataset.i)];
        if (!mesmoDia(W.flight) && W.pag === "BALCAO") W.pag = "CARTAO";
        W.paxs = [{ nome: "", doc: "", assento: null }];
        W.ativo = 0;
        W.erros = {};
        W.aviso = "";
        renderWizard();
      }));
      const nx = $("#wz-next", alvo);
      if (nx) nx.addEventListener("click", () => { W.step = 2; W.erros = {}; renderWizard(); });
      return;
    }

    if (!W.flight) { W.step = 1; return renderWizard(); }
    if (!podeReservar(W.flight)) {
      W.aviso = "O VOO " + W.flight.no + " ESTA COM SITUACAO " + statusDe(W.flight) + ". APENAS VOOS COM SITUACAO PROGRAMADO PODERAO SER RESERVADOS.";
      W.flight = null;
      W.step = 1;
      return renderWizard();
    }

    if (W.step === 2) {
      const e = W.erros;
      const intl = internacional(W.flight);
      const corpo = `
        ${resumoVoo(W.flight)}
        <div class="pax-block">
          <div class="pax-head">PASSAGEIROS DA RESERVA <b>${W.paxs.length} / ${MAX_PAX}</b>${intl ? " · VOO INTERNACIONAL - PASSAPORTE OBRIGATORIO" : ""}</div>
          <div class="pax-list">
            ${W.paxs.map((p, i) => `
              <div class="pax-item${i === 0 ? " titular" : ""}">
                <span class="pax-tag">P${i + 1}</span>
                <label class="pax-f">NOME COMPLETO
                  <input class="in${e["nome" + i] ? " bad" : ""}" data-pk="nome" data-pi="${i}" value="${p.nome}" placeholder="${i === 0 ? "TITULAR - COMO NO DOCUMENTO" : "ACOMPANHANTE"}">
                </label>
                <label class="pax-f">${intl ? "PASSAPORTE" : "DOCUMENTO"}
                  <input class="in${e["doc" + i] ? " bad" : ""}" data-pk="doc" data-pi="${i}" value="${p.doc}" placeholder="${intl ? "PASSAPORTE (EX.: AB123456)" : "CPF / PASSAPORTE"}">
                </label>
                ${i > 0 ? '<button type="button" class="btn mini" data-rm="' + i + '">REMOVER</button>' : '<span class="pax-tag tit">TIT</span>'}
                ${e["nome" + i] ? '<i class="err">' + e["nome" + i] + "</i>" : ""}
                ${e["doc" + i] ? '<i class="err">' + e["doc" + i] + "</i>" : ""}
              </div>`).join("")}
          </div>
          <button type="button" class="btn add" id="add-pax"${W.paxs.length >= MAX_PAX ? " disabled" : ""}>+ ADICIONAR OUTRO PASSAGEIRO</button>
        </div>
        <div class="form2">
          <label>E-MAIL DE CONTATO
            <input class="in${e.email ? " bad" : ""}" id="f-email" value="${W.email}" placeholder="PASSAGEIRO@EMAIL.COM">
            ${e.email ? '<i class="err">' + e.email + "</i>" : ""}
          </label>
          <label>TELEFONE DE CONTATO
            <input class="in${e.tel ? " bad" : ""}" id="f-tel" value="${W.tel}" placeholder="(11) 99999-0000">
            ${e.tel ? '<i class="err">' + e.tel + "</i>" : ""}
          </label>
        </div>
        <div class="wz-nav">
          <button class="btn" id="wz-back">&larr; VOLTAR</button>
          <button class="btn prim" id="wz-next">CONTINUAR &rarr;</button>
        </div>`;
      alvo.innerHTML = painel("PASSO 2 / 4 — PASSAGEIROS", corpo);
      $$("input[data-pk]", alvo).forEach((inp) => {
        inp.addEventListener("input", () => { W.paxs[Number(inp.dataset.pi)][inp.dataset.pk] = inp.value; });
      });
      $("#f-email", alvo).addEventListener("input", (ev) => { W.email = ev.target.value; });
      $("#f-tel", alvo).addEventListener("input", (ev) => { W.tel = ev.target.value; });
      $$("button[data-rm]", alvo).forEach((b) => b.addEventListener("click", () => {
        W.paxs.splice(Number(b.dataset.rm), 1);
        if (W.ativo >= W.paxs.length) W.ativo = W.paxs.length - 1;
        W.erros = {};
        renderWizard();
      }));
      const add = $("#add-pax", alvo);
      if (add) add.addEventListener("click", () => {
        if (W.paxs.length >= MAX_PAX) return;
        W.paxs.push({ nome: "", doc: "", assento: null });
        W.erros = {};
        renderWizard();
        const inps = $$('.pax-item input[data-pk="nome"]', $("#wizard"));
        const ult = inps[inps.length - 1];
        if (ult) ult.focus();
      });
      $("#wz-back", alvo).addEventListener("click", () => { W.step = 1; renderWizard(); });
      $("#wz-next", alvo).addEventListener("click", () => {
        const er = {};
        W.paxs.forEach((p, i) => {
          if (p.nome.trim().length < 6 || p.nome.trim().indexOf(" ") < 0) er["nome" + i] = "INFORME NOME E SOBRENOME";
          if (intl) {
            if (!passaporteOk(p.doc)) er["doc" + i] = "VOO INTERNACIONAL EXIGE PASSAPORTE (EX.: AB123456)";
          } else if (p.doc.replace(/\D/g, "").length < 6) er["doc" + i] = "DOCUMENTO INVALIDO";
        });
        if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(W.email.trim())) er.email = "E-MAIL INVALIDO";
        if (W.tel.replace(/\D/g, "").length < 10) er.tel = "TELEFONE COM DDD";
        W.erros = er;
        if (Object.keys(er).length) return renderWizard();
        W.step = 3;
        renderWizard();
      });
      return;
    }

    if (W.step === 3) {
      const f = W.flight;
      const paxs = W.paxs;
      if (W.ativo >= paxs.length) W.ativo = paxs.length - 1;
      const atual = paxs[W.ativo];
      const bloqueados = assentosReservados(paxs, W.ativo);
      const todos = paxs.every((p) => p.assento);
      const nomeCurto = (p, i) => (p.nome.trim() ? p.nome.trim().split(" ")[0] : "P" + (i + 1));
      const corpo = `
        ${resumoVoo(f)}
        <div class="cls-pick">
          <button type="button" class="cls${W.classe === "ECON" ? " on" : ""}" data-c="ECON">
            <b>ECONOMICA</b><span>${brl(precoBase(f.km))}</span><small>CABINE PADRAO · 1 DESPACHADA</small>
          </button>
          <button type="button" class="cls${W.classe === "EXEC" ? " on" : ""}" data-c="EXEC">
            <b>EXECUTIVA</b><span>${brl(Math.round((precoBase(f.km) * 2.7) / 10) * 10 - 1)}</span><small>FILA 1 A 5 · 2 DESPACHADAS</small>
          </button>
        </div>
        <div class="seat-title">ASSENTOS DA RESERVA <b>${paxs.filter((p) => p.assento).length}/${paxs.length}</b></div>
        <div class="pax-choose">
          ${paxs.map((p, i) => `
            <button type="button" class="pchip${i === W.ativo ? " on" : ""}${p.assento ? " done" : ""}" data-pi="${i}">
              <b>P${i + 1}</b><span>${nomeCurto(p, i).toUpperCase()}</span><i>${p.assento || "—"}</i>
            </button>`).join("")}
        </div>
        <div class="seat-title">ASSENTO DE <b>P${W.ativo + 1} ${nomeCurto(atual, W.ativo).toUpperCase()}</b> <b>${atual.assento || "—"}</b></div>
        <div class="seat-wrap" id="seat-wrap">${seatMapHTML(f, atual.assento, bloqueados)}</div>
        <div class="legend">
          <span><i class="lg free"></i>LIVRE</span>
          <span><i class="lg taken"></i>OCUPADO</span>
          <span><i class="lg exec"></i>EXECUTIVA</span>
          <span><i class="lg sel"></i>SELECIONADO</span>
        </div>
        <div class="wz-nav">
          <button class="btn" id="wz-back">&larr; VOLTAR</button>
          <button class="btn prim" id="wz-next"${todos ? "" : " disabled"}>${todos ? "CONTINUAR &rarr;" : "ESCOLHA TODOS OS ASSENTOS"}</button>
        </div>`;
      alvo.innerHTML = painel("PASSO 3 / 4 — CLASSE E ASSENTOS", corpo);
      $$(".cls", alvo).forEach((b) => b.addEventListener("click", () => { W.classe = b.dataset.c; renderWizard(); }));
      $$(".pchip", alvo).forEach((b) => b.addEventListener("click", () => { W.ativo = Number(b.dataset.pi); renderWizard(); }));
      $("#seat-wrap", alvo).addEventListener("click", (ev) => {
        const b = ev.target.closest(".seat");
        if (!b || b.disabled) return;
        paxs[W.ativo].assento = b.dataset.seat;
        renderWizard();
      });
      $("#wz-back", alvo).addEventListener("click", () => { W.step = 2; renderWizard(); });
      $("#wz-next", alvo).addEventListener("click", () => { W.step = 4; renderWizard(); });
      return;
    }

    if (W.step === 4) {
      const f = W.flight;
      const n = W.paxs.length;
      const exPeso = taxaPesoPax(W.peso, W.classe);
      const porPax = precoTotal(f, W.classe, W.bags) + 89.9 + exPeso;
      const bruto = porPax * n;
      const usar = Math.min(Math.max(0, W.milhas || 0), milhasMaxUsar(f.al, bruto));
      const desconto = milhasValor(usar);
      const total = bruto - desconto;
      const cartao = cartaoAtivo();
      const saldo = milhasSaldo(f.al);
      const tarifa = precoBase(f.km);
      const taxa = 89.9;
      const corpo = `
        ${resumoVoo(f)}
        <div class="form2">
          <label class="blk">EQUIPAGEM DESPACHADA POR PASSAGEIRO
            <div class="opts">
              ${[0, 1, 2].map((k) => `<button type="button" class="opt${W.bags === k ? " on" : ""}" data-b="${k}">${k} MALOTA${k === 1 ? "" : "S"}${W.classe === "EXEC" || k === 0 ? " (GRATIS)" : " + R$ 89"}</button>`).join("")}
            </div>
          </label>
          <label class="blk">PESO DA BAGAGEM POR PASSAGEIRO
            <div class="opts">
              ${[0, 10, 15, 23, 32].map((k) => { const ex = Math.max(0, k - franquiaKg(W.classe)); return `<button type="button" class="opt${W.peso === k ? " on" : ""}" data-k="${k}">${k} KG${ex ? " + " + brl(ex * 6) : " (GRATIS)"}</button>`; }).join("")}
            </div>
          </label>
          <label class="blk">FORMA DE PAGAMENTO
            <div class="opts">
              ${["CARTAO", "CARTAO DE MILHAS", "PIX", "BOLETO", "BALCAO"].map((p) => {
                const off = (p === "BALCAO" && !mesmoDia(f)) || (p === "CARTAO DE MILHAS" && (!cartao || !(saldo > 0)));
                const nome = p === "BALCAO" ? "PAGAR NO BALCAO" : p;
                const sub = p === "BALCAO"
                  ? (mesmoDia(f) ? "PRESENCIAL NA RETIRADA · SOMENTE VOOS DE HOJE" : "INDISPONIVEL · VOO NAO E DE HOJE")
                  : p === "CARTAO" ? "DEBITO OU CREDITO"
                    : p === "CARTAO DE MILHAS" ? (cartao ? "RESGATE DO SALDO: " + fmtMil(saldo) + " MILHAS" : "SEM CARTAO DE MILHAS DO CLIENTE")
                      : p === "PIX" ? "APROVACAO IMEDIATA" : "VENCIMENTO EM 1 DIA UTIL";
                return `<button type="button" class="opt${W.pag === p ? " on" : ""}${off ? " off" : ""}" data-p="${p}"${off ? " disabled" : ""}>${nome}<small>${sub}</small></button>`;
              }).join("")}
            </div>
            ${W.erros.pag ? '<i class="err">' + W.erros.pag + "</i>" : ""}
          </label>
          ${cartao ? `
          <label class="blk">RESGATE DE MILHAS · ${cartao.num} · ${cartao.nome}
            <input class="in" id="wz-milhas" type="text" inputmode="numeric" autocomplete="off" value="${usar ? fmtMil(usar) : ""}" placeholder="SALDO ${fmtMil(saldo)} MILHAS · 1.000 MILHAS = R$ 10,00">
          </label>` : `
          <label class="blk">CARTAO DE MILHAS DO CLIENTE
            <input class="in" id="wz-cartao" type="text" autocomplete="off" placeholder="INFORME O NUMERO DO CARTAO (EX.: VM-1234567890)">
            ${W.erros.cartao ? '<i class="err">' + W.erros.cartao + "</i>" : ""}
            <small>SEM CARTAO? CADASTRE O CLIENTE NO TERMINAL: CADASTRAR &lt;NOME&gt;</small>
          </label>`}
        </div>
        <div class="totais">
          <div><span>TARIFA BASE ${W.classe} ×${n}</span><b>${brl(tarifa * n)}</b></div>
          <div><span>TAXAS E ENCARGOS ×${n}</span><b>${brl(taxa * n)}</b></div>
          ${W.bags && W.classe !== "EXEC" ? `<div><span>${W.bags} MALOTA(S) ×${n}</span><b>${brl(W.bags * 89 * n)}</b></div>` : ""}
          ${exPeso ? `<div><span>EXCESSO DE PESO ${W.peso} KG ×${n}</span><b>${brl(exPeso * n)}</b></div>` : ""}
          ${usar ? `<div class="mil"><span>RESGATE DE MILHAS ${fmtMil(usar)}</span><b>-${taxaTxt(desconto)}</b></div>` : ""}
          <div class="grand"><span>TOTAL ${n} PASSAGEIRO${n > 1 ? "S" : ""}</span><b>${brl(Math.round(total))}</b></div>
        </div>
        <div class="wz-nav">
          <button class="btn" id="wz-back">&larr; VOLTAR</button>
          <button class="btn prim" id="wz-ok">CONFIRMAR RESERVA</button>
        </div>`;
      alvo.innerHTML = painel("PASSO 4 / 4 — PAGAMENTO", corpo);
      $$(".opt[data-b]", alvo).forEach((b) => b.addEventListener("click", () => { W.bags = Number(b.dataset.b); renderWizard(); }));
      $$(".opt[data-k]", alvo).forEach((b) => b.addEventListener("click", () => { W.peso = Number(b.dataset.k); renderWizard(); }));
      $$(".opt[data-p]", alvo).forEach((b) => b.addEventListener("click", () => {
        W.pag = b.dataset.p;
        if (W.pag === "CARTAO DE MILHAS") W.milhas = milhasMaxUsar(f.al, bruto);
        renderWizard();
      }));
      const mi = $("#wz-milhas", alvo);
      if (mi) mi.addEventListener("change", () => {
        W.milhas = Math.max(0, Number(String(mi.value).replace(/\D/g, "")) || 0);
        renderWizard();
      });
      const wc = $("#wz-cartao", alvo);
      if (wc) wc.addEventListener("change", () => {
        const k = normCartao(wc.value);
        if (cartoesLer()[k]) { T.cartao = k; W.erros.cartao = ""; renderWizard(); }
        else { W.erros.cartao = "CARTAO NAO ENCONTRADO. CONFIRA O NUMERO OU CADASTRE O CLIENTE NO TERMINAL."; renderWizard(); }
      });
      $("#wz-back", alvo).addEventListener("click", () => { W.step = 3; renderWizard(); });
      $("#wz-ok", alvo).addEventListener("click", confirmar);
      return;
    }

    const r = W.emissao;
    const corpo = `
      <div class="ok-box">
        <div class="ok-title">RESERVA CONFIRMADA</div>
        <div class="ok-pnr">${r.pnr}</div>
        <div class="ok-sub">GUARDE ESTE CODIGO · ${paxList(r).length} PASSAGEM(S) EMITIDA(S) · ENVIADO PARA ${r.pax.email}</div>
        ${r.milhas ? `<div class="ok-sub">${r.milhas.usadas ? "RESGATE: " + fmtMil(r.milhas.usadas) + " MILHAS = -" + taxaTxt(r.milhas.desconto) + " · " : ""}+${fmtMil(r.milhas.ganhas)} MILHAS NA ${DATA.AIRLINES[r.voo.al]} · SALDO ${fmtMil(milhasSaldo(r.voo.al))} MILHAS${r.cartao ? " · CARTAO " + r.cartao : ""}</div>` : ""}
      </div>
      ${passesHTML(r)}
      <div class="wz-nav">
        <button class="btn" id="wz-new">NOVA RESERVA</button>
        <button class="btn" id="wz-print">IMPRIMIR BILHETES</button>
        <button class="btn prim" id="wz-tick">VER MINHAS RESERVAS &rarr;</button>
      </div>`;
    alvo.innerHTML = painel("EMISSAO CONCLUIDA — PNR " + r.pnr, corpo);
    $("#wz-new", alvo).addEventListener("click", novaReserva);
    $("#wz-print", alvo).addEventListener("click", imprimir);
    $("#wz-tick", alvo).addEventListener("click", () => irPara("bilhetes"));
  }

  function emitirReserva(f, paxs, email, tel, classe, bags, pag, milhasDesej) {
    const n = paxs.length;
    const taxa = taxaPeso(paxs, classe);
    const bruto = (precoTotal(f, classe, bags) + 89.9) * n + taxa;
    const cartao = cartaoAtivo();
    const usar = cartao ? Math.max(0, Math.min(milhasDesej || 0, milhasMaxUsar(f.al, bruto))) : 0;
    const desconto = milhasValor(usar);
    const preco = bruto - desconto;
    const assentos = paxs.map((p) => p.assento);
    const r = {
      pnr: gerarPNR(),
      criado: Date.now(),
      status: "RESERVADA",
      classe: classe === "EXEC" ? "EXECUTIVA" : "ECONOMICA",
      bags: classe === "EXEC" ? Math.max(2, bags) : bags,
      peso: pesoTotal(paxs),
      taxaPeso: taxa,
      assento: assentos[0],
      preco: Math.round(preco),
      milhas: { usadas: usar, desconto: desconto, ganhas: cartao ? milhasGanhas(f, classe, n) : 0 },
      cartao: cartao ? cartao.num : null,
      pag: pag || "CARTAO",
      pax: { nome: paxs[0].nome, doc: paxs[0].doc, email: email, tel: tel },
      passageiros: paxs.map((p) => ({ nome: p.nome, doc: p.doc, assento: p.assento, peso: p.peso || 0 })),
      voo: {
        no: f.no, al: f.al, tipo: f.tipo, origem: f.origem, destino: f.destino,
        cidade: f.cidade, dep: f.dep, arr: f.arr, ref: f.ref, dur: f.dur,
        gate: f.gate, gate2: f.gate2, gateMudaEm: f.gateMudaEm, ac: f.ac, term: f.term,
        km: f.km, cancelado: !!f.cancelado, delay: f.delay || 0,
        dia: f.dia || 0, data: f.data || dataHoje(), escala: f.escala || []
      }
    };
    reservas.push(r);
    if (cartao) {
      const cs = cartoesLer();
      const cc = cs[T.cartao];
      cc.saldo[f.al] = Math.max(0, (cc.saldo[f.al] || 0) - usar) + r.milhas.ganhas;
      cartoesSalvar(cs);
    }
    salvar();
    atualizarBadge();
    renderBilhetes();
    return r;
  }

  function confirmar() {
    if (!podeReservar(W.flight)) {
      W.aviso = (W.flight ? "O VOO " + W.flight.no + " ESTA COM SITUACAO " + statusDe(W.flight) + ". " : "") + "APENAS VOOS COM SITUACAO PROGRAMADO PODERAO SER RESERVADOS.";
      W.flight = null;
      W.step = 1;
      W.erros = {};
      renderWizard();
      return;
    }
    if (W.pag === "BALCAO" && !mesmoDia(W.flight)) {
      W.erros = { pag: "PAGAMENTO NO BALCAO SO E PERMITIDO PARA VOOS DE HOJE. ESCOLHA OUTRA FORMA OU OUTRO DIA." };
      W.step = 4;
      renderWizard();
      return;
    }
    W.paxs.forEach((p) => { p.peso = W.peso; });
    const r = emitirReserva(W.flight, W.paxs, W.email, W.tel, W.classe, W.bags, W.pag, W.milhas);
    W.emissao = r;
    W.step = 5;
    renderWizard();
  }

  function novaReserva() {
    W.step = 1; W.flight = null; W.bags = 0; W.peso = 0;
    W.origem = "GRU"; W.destino = "GIG"; W.dia = 0;
    W.paxs = [{ nome: "", doc: "", assento: null }];
    W.ativo = 0; W.email = ""; W.tel = "";
    W.classe = "ECON"; W.pag = "CARTAO"; W.erros = {}; W.aviso = ""; W.emissao = null;
    W.busca = "";
    W.milhas = 0;
    renderWizard();
  }

  function achar(pnr) { return reservas.find((r) => r.pnr === pnr.toUpperCase().trim()); }

  function chipStatus(s) {
    if (s === "CHECK-IN") return '<span class="chip ck">CHECK-IN FEITO</span>';
    if (s === "CANCELADA") return '<span class="chip cx">CANCELADA</span>';
    return '<span class="chip rs">RESERVADA</span>';
  }

  function renderBilhetes() {
    const c = $("#lista-bilhetes");
    if (!reservas.length) {
      c.innerHTML = painel("NENHUMA RESERVA", '<div class="vazio">SEM BILHETES EMITIDOS NESTE TERMINAL.<br><br><button class="btn prim" id="ir-res">FIZER UMA RESERVA</button></div>');
      $("#ir-res", c).addEventListener("click", () => { novaReserva(); irPara("reserva"); });
      return;
    }
    const ordem = reservas.slice().sort((a, b) => b.criado - a.criado);
    c.innerHTML = ordem.map((r) => {
      const v = r.voo;
      const ps = paxList(r);
      const assentos = ps.map((p) => p.assento).join(" + ");
      return `
      <div class="reserva" data-pnr="${r.pnr}">
        <div class="res-head">
          <span class="pnr">${r.pnr}</span>
          ${chipStatus(r.status)}
          ${r.milhas && r.milhas.ganhas ? `<span class="chip ml">+${fmtMil(r.milhas.ganhas)} MILHAS</span>` : ""}
          ${r.cartao ? `<span class="chip cm">${r.cartao}</span>` : ""}
          ${r.pag === "BALCAO" ? '<span class="chip pg">PAGAMENTO NO BALCAO</span>' : ""}
          <span class="res-criado">EMITIDA EM ${new Date(r.criado).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
        </div>
        <div class="res-grid">
          <div><small>${ps.length > 1 ? "PASSAGEIROS" : "PASSAGEIRO"}</small><b>${ps.length > 1 ? ps.length + " · " + ps[0].nome.split(" ")[0] : r.pax.nome}</b></div>
          <div><small>VOO</small><b>${v.no} · ${DATA.AIRLINES[v.al]}</b></div>
          <div><small>ROTA</small><b>${rotaVoo(v).replace(/ > /g, " &rarr; ")}</b></div>
          <div><small>PARTIDA</small><b>${v.data || dataHoje()} ${hhmm(v.ref)}</b></div>
          <div><small>PORTAO</small><b>${gateDe(v)}</b></div>
          <div><small>ASSENTO${ps.length > 1 ? "S" : ""}</small><b>${assentos}</b></div>
          <div><small>CLASSE</small><b>${r.classe}</b></div>
          <div><small>VALOR PAGO</small><b>${brl(r.preco)}</b></div>
        </div>
        ${ps.length > 1 ? `<div class="res-paxs">${ps.map((p, i) =>
          `<span><b>P${i + 1}</b> ${p.nome} · ${internacional(v) ? "PASSAPORTE" : "DOC"} ${p.doc} · ${p.assento}</span>`).join("")}</div>` : ""}
        <div class="res-actions">
          <button class="btn" data-act="pass">${ps.length > 1 ? ps.length + " BILHETES" : "BILHETE DE EMBARQUE"}</button>
          <button class="btn" data-act="seat">TROCAR ASSENTO${ps.length > 1 ? "S" : ""}</button>
          ${r.status === "RESERVADA" ? '<button class="btn" data-act="ci">FAZER CHECK-IN</button>' : ""}
          ${r.status !== "CANCELADA" ? '<button class="btn danger" data-act="cancel">CANCELAR</button>' : ""}
        </div>
        <div class="res-extra"></div>
      </div>`;
    }).join("");
  }

  const seatSel = {};

  function montarTrocaAssento(r, box, reabrir) {
    const ps = ensurePax(r);
    if (!(seatSel[r.pnr] < ps.length)) seatSel[r.pnr] = 0;
    const desenha = () => {
      const ativo = seatSel[r.pnr] || 0;
      const p = ps[ativo];
      const bloq = assentosReservados(ps, ativo);
      const curto = (x, i) => (x.nome.trim() ? x.nome.trim().split(" ")[0] : "P" + (i + 1));
      box.innerHTML = `
        <div class="seat-title">TROCA DE ASSENTOS · <b>${ps.length} PASSAGEIRO${ps.length > 1 ? "S" : ""}</b></div>
        <div class="pax-choose">
          ${ps.map((x, i) => `
            <button type="button" class="pchip${i === ativo ? " on" : ""}${x.assento ? " done" : ""}" data-pi="${i}">
              <b>P${i + 1}</b><span>${curto(x, i).toUpperCase()}</span><i>${x.assento || "—"}</i>
            </button>`).join("")}
        </div>
        <div class="seat-title">ASSENTO DE <b>P${ativo + 1} ${curto(p, ativo).toUpperCase()}</b> <b>${p.assento || "—"}</b></div>
        <div class="seat-wrap">${seatMapHTML(r.voo, p.assento, bloq)}</div>
        <div class="legend">
          <span><i class="lg free"></i>LIVRE</span>
          <span><i class="lg taken"></i>OCUPADO</span>
          <span><i class="lg sel"></i>SELECIONADO</span>
        </div>`;
      $$(".pchip", box).forEach((b) => b.addEventListener("click", () => { seatSel[r.pnr] = Number(b.dataset.pi); desenha(); }));
      $(".seat-wrap", box).addEventListener("click", (ev) => {
        const b = ev.target.closest(".seat");
        if (!b || b.disabled) return;
        p.assento = b.dataset.seat;
        if (ativo === 0) r.assento = ps[0].assento;
        salvar();
        renderBilhetes();
        if (reabrir) reabrir(); else desenha();
      });
    };
    desenha();
  }

  function abrirSeatBilhetes(r) {
    const card = $(`.reserva[data-pnr="${r.pnr}"]`);
    if (!card) return;
    const extra = $(".res-extra", card);
    extra.dataset.open = "seat";
    montarTrocaAssento(r, extra, () => abrirSeatBilhetes(r));
  }

  function clicarBilhetes(e) {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const card = btn.closest(".reserva");
    const r = achar(card.dataset.pnr);
    if (!r) return;
    const extra = $(".res-extra", card);
    const act = btn.dataset.act;

    if (act === "pass") {
      if (extra.dataset.open === "pass") { extra.dataset.open = ""; extra.innerHTML = ""; btn.textContent = paxList(r).length > 1 ? paxList(r).length + " BILHETES" : "BILHETE DE EMBARQUE"; return; }
      extra.dataset.open = "pass";
      extra.innerHTML = passesHTML(r) + '<div class="wz-nav"><button class="btn" data-print>IMPRIMIR</button></div>';
      $("[data-print]", extra).addEventListener("click", imprimir);
      btn.textContent = "FECHAR BILHETE";
      return;
    }

    if (act === "seat") {
      if (extra.dataset.open === "seat") { extra.dataset.open = ""; extra.innerHTML = ""; return; }
      extra.dataset.open = "seat";
      abrirSeatBilhetes(r);
      return;
    }

    if (act === "ci") {
      r.status = "CHECK-IN";
      salvar();
      atualizarBadge();
      renderBilhetes();
      const novo = $(`.reserva[data-pnr="${r.pnr}"]`);
      if (novo) {
        const ex = $(".res-extra", novo);
        ex.dataset.open = "pass";
        ex.innerHTML = passesHTML(r) + '<div class="ok-inline">CHECK-IN CONCLUIDO · APRESENTE-SE NO PORTAO ' + gateDe(r.voo) + " A PARTIR DE " + hhmm(r.voo.ref - 40) + "</div>";
      }
      return;
    }

    if (act === "cancel") {
      if (btn.dataset.armed !== "1") {
        btn.dataset.armed = "1";
        btn.textContent = "CONFIRMAR CANCELAMENTO?";
        setTimeout(() => { if (btn.isConnected) { btn.dataset.armed = ""; btn.textContent = "CANCELAR"; } }, 4000);
        return;
      }
      r.status = "CANCELADA";
      salvar();
      atualizarBadge();
      renderBilhetes();
    }
  }

  function renderCheckinResultado(pnr) {
    const box = $("#ci-result");
    const msg = $("#ci-msg");
    if (!pnr) { box.innerHTML = ""; return; }
    const r = achar(pnr);
    if (!r) {
      msg.innerHTML = '<span class="err">RESERVA NAO LOCALIZADA. VERIFIQUE O CODIGO.</span>';
      box.innerHTML = "";
      return;
    }
    const ps = paxList(r);
    msg.innerHTML = '<span class="okmsg">RESERVA ' + r.pnr + " ENCONTRADA · " +
      (ps.length > 1 ? ps.length + " PASSAGEIROS · " + ps[0].nome : r.pax.nome) + "</span>";
    const podeCI = r.status === "RESERVADA";
    box.innerHTML = `
      <div class="panel">
        <div class="panel-title">${r.pnr} — ${chipStatus(r.status)} — ${ps.length} PASSAGEM(S)</div>
        <div class="panel-body">
          ${passesHTML(r)}
          ${(r.peso || r.bags) ? `<div class="ok-inline">BAGAGEM: ${r.bags} MALOTA(S)${r.peso ? " · " + r.peso + " KG · TAXA DE PESO " + brl(r.taxaPeso || 0) : ""}</div>` : ""}
          ${r.pag === "BALCAO" ? '<div class="ok-inline pg">PAGAMENTO PENDENTE NO BALCAO · RETIRE O BILHETE E PAGUE ANTES DO EMBARQUE</div>' : ""}
          <div class="ci-acoes">
            ${podeCI ? '<button class="btn prim" id="ci-go">FAZER CHECK-IN</button>' : ""}
            <button class="btn" id="ci-seat">TROCAR ASSENTO${ps.length > 1 ? "S" : ""}</button>
            <button class="btn" id="ci-print">IMPRIMIR</button>
          </div>
          ${podeCI ? "" : '<div class="ok-inline">CHECK-IN JA REALIZADO · PORTAO ' + gateDe(r.voo) + " · EMBARQUE " + hhmm(r.voo.ref - 40) + "</div>"}
          <div class="ci-seatbox" id="ci-seatbox"></div>
        </div>
      </div>`;
    if (podeCI) {
      $("#ci-go").addEventListener("click", () => {
        r.status = "CHECK-IN";
        salvar();
        atualizarBadge();
        renderBilhetes();
        renderCheckinResultado(r.pnr);
      });
    }
    $("#ci-print").addEventListener("click", imprimir);
    $("#ci-seat").addEventListener("click", () => {
      const b = $("#ci-seatbox");
      if (b.innerHTML) { b.innerHTML = ""; return; }
      montarTrocaAssento(r, b, () => abrirSeatCheckin(r));
    });
  }

  function abrirSeatCheckin(r) {
    renderCheckinResultado(r.pnr);
    const b = $("#ci-seatbox");
    if (b) montarTrocaAssento(r, b, () => abrirSeatCheckin(r));
  }

  function atualizarBadge() {
    const n = reservas.filter((r) => r.status !== "CANCELADA").length;
    $("#badge").textContent = n;
  }

  function irPara(tab) {
    $$(".tab").forEach((t) => {
      const ativa = t.dataset.tab === tab;
      t.classList.toggle("on", ativa);
      if (ativa) t.setAttribute("aria-current", "page");
      else t.removeAttribute("aria-current");
    });
    $$(".view").forEach((v) => v.classList.toggle("on", v.id === "view-" + tab));
    if (tab === "partidas" || tab === "chegadas") {
      renderBoard(tab);
      const bw = document.querySelector("#view-" + tab + " .board-wrap");
      if (bw) bw.scrollTop = 0;
    }
    if (tab === "bilhetes") renderBilhetes();
    if (tab === "reserva") renderWizard();
    if (tab === "atendimento") {
      termBoot();
      setTimeout(() => { const i = $("#term-in"); if (i) i.focus(); }, 60);
    }
    if (tab === "aovivo" || tab === "partidas" || tab === "chegadas" || tab === "reserva") LIVE.iniciar(); else LIVE.parar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function montarTicker() {
    const txt = DATA.AVISOS.map((a) => "• " + a + "   ").join("").repeat(2);
    ["#tk1", "#tk2", "#tk3", "#tk4"].forEach((id) => { $(id).textContent = txt; });
  }

  function relogio() {
    const d = new Date();
    $("#clock").textContent = String(d.getHours()).padStart(2, "0") + ":" +
      String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0");
    $("#date").textContent = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).toUpperCase();
  }

  // ---------- terminal de atendimento ----------
  function novoRascunho() {
    return { voo: null, paxs: [{ nome: "", doc: "", assento: null, peso: 0 }], ativo: 0, email: "", tel: "", rf: "", tk: "", classe: "ECON", bags: 0, pag: "CARTAO", milhas: 0, opc: { classe: false, malota: false, peso: false, pag: false, milhas: false } };
  }

  const T = {
    boot: false, imprimindo: false, fila: [], hist: [], hi: 0, iv: null, pausado: false,
    rascunho: novoRascunho(), rota: null, dia: 0, guia: false, cartao: null
  };
  const COMANDOS = ["AJUDA", "VOOS", "CHEGADAS", "ROTA", "RES", "TO",     "DATA", "SITUACAO", "ALTERAR", "TARIFA", "VALOR", "MILHAS",
    "LISTAR", "ABATER", "CARTAO", "CADASTRAR", "RESERVAR", "PASSAGEIRO", "PASSAGEIROS", "ADICIONAR", "REMOVER", "ATIVO",
    "DOC", "EMAIL", "TELEFONE", "CLASSE", "PAGAMENTO", "ASSENTOS", "ASSENTO", "ASSENTOLIVRE", "MALOTA", "PESO",
    "STATUS", "CONFIRMAR", "CONSULTAR", "CHECKIN", "CANCELAR", "BILHETES", "NOVO", "SOM", "LIMPAR",
    "*R", "*I", "X2", "ER", ".CE", ".CD", ".AE", "SOF",
    "AN", "NM", "AP", "RF", "TK", "SS", "RT", "XE", "XI",
    "*LM", "*CM", "*ACM", "*C", "*LR", "*N", "*LT", "*RV", "*LP", "*RM", "*MAV", "*ASS", "*AL", "*CHK", "$PG", "$V",
    "V", ".PT", ".CH", ".VV"];
  const GUIA_CMDS = ["RESERVAR", "PASSAGEIRO", "DOC", "EMAIL", "TELEFONE", "FONE", "ASSENTO", "POLTRONA",
    "ASSENTOLIVRE", "SEATLIVRE", "AUTOSEAT", "CLASSE", "MALOTA", "MALOTAS", "BAGAGEM", "PESO",
    "PAGAMENTO", "PAG", "ADICIONAR", "NOVOPAX", "REMOVER", "EXCLUIR", "ATIVO", "TROCAR", "MILHAS", "CARTAO", "ESPERA",
    "*R", "*I", "X2", "ER", "AN", "NM", "AP", "RF", "TK", "SS", "RT", "XE", "XI"];
  const CMD_SET = new Set(COMANDOS.concat(["HELP", "?", "ROUTE", "DE", "FROM", "PARA", "DIA", "INFO", "ARRIVALS",
    "AOVIVO", "LIVE", "TRAFEGO", "TARIFAS", "PRECO", "INICIO", "ZERAR", "LISTAPAX", "NOVOPAX", "EXCLUIR", "TROCAR",
    "FONE", "PAG", "MAPA", "POLTRONA", "MALOTAS", "BAGAGEM", "RASCUNHO", "EMITIR", "LOCALIZAR", "PNR",
    "CHECK-IN", "RESERVAS", "CLEAR", "SEATLIVRE", "AUTOSEAT", "LM", "ACM"]));
  const PAG_VALORES = ["CARTAO", "CREDITO", "DEBITO", "CAR", "PIX", "BOLETO", "BALCAO", "BALC"];
  const ALIAS_TERM = [
    ["*ACM", "ACM"], ["*MAV", "ASSENTOS"], ["*CHK", "CHECKIN"], ["*ASS", "ASSENTO"],
    ["*CM", "CADASTRAR"], ["*LP", "PASSAGEIROS"], ["*LM", "LM"], ["*LT", "LIMPAR"],
    ["*RV", "RESERVAR"], ["*RM", "REMOVER"], ["*LR", "BILHETES"], ["*AL", "ASSENTOLIVRE"],
    ["$PG", "PAGAMENTO"], ["*C", "CONFIRMAR"], ["*N", "NOVO"], ["$V", "VALOR"],
    [".PT", "VOOS"], [".CH", "CHEGADAS"], [".VV", "AOVIVO"], ["V", "VOOS", 1]
  ];
  const MESES_AM = { JAN: 0, FEV: 1, FEB: 1, MAR: 2, ABR: 3, APR: 3, MAI: 4, MAY: 4, JUN: 5, JUL: 6,
    AGO: 7, AUG: 7, SET: 8, SEP: 8, OUT: 9, OCT: 9, NOV: 10, DEZ: 11, DEC: 11 };
  const TERM_CMDS = [
    ["VOOS", "[FILTRO] LISTA DE PARTIDAS"],
    ["CHEGADAS", "[FILTRO] LISTA DE CHEGADAS"],
    ["V", "[FILTRO] LISTA OS VOOS"],
    [".PT", "LISTA AS PARTIDAS"],
    [".CH", "LISTA AS CHEGADAS"],
    [".VV", "VOOS AO VIVO"],
    ["ROTA", "<ORI> <DES> ROTA DO ATENDIMENTO"],
    ["RES", "<ORI> <DES> ESCOLHE O PAR"],
    ["TO", "<DES> FROM <ORI>"],
    ["DE", "<ORI> PARA <DES>"],
    ["DATA", "<DIA> DE 0 A 6"],
    ["SITUACAO", "<VOO> SITUACAO EM TEMPO REAL"],
    ["ALTERAR", "<VOO> [DIA] [HH:MM] MUDA DIA E HORA DO VOO"],
    ["ESPERA", "<VOO> ENTRA NA LISTA DE ESPERA DO VOO LOTADO"],
    ["AOVIVO", "TRAFEGO AO VIVO DO GRU"],
    ["TARIFA", "<ORI> <DES> TARIFA E DISTANCIA"],
    ["VALOR", "COMPOSICAO DO VALOR DA RESERVA"],
    ["RESERVAR", "<VOO> SELECIONA O VOO"],
    ["PASSAGEIRO", "<NOME> NOME DO PAX ATIVO"],
    ["ADICIONAR", "<NOME> INCLUI PASSAGEIRO"],
    ["PASSAGEIROS", "LISTA OS PASSAGEIROS"],
    ["ATIVO", "<N> TROCA O PASSAGEIRO ATIVO"],
    ["REMOVER", "<N> REMOVE O PASSAGEIRO"],
    ["DOC", "<NUMERO> CPF OU PASSAPORTE"],
    ["EMAIL", "<ENDERECO> E-MAIL PARA EMISSAO"],
    ["TELEFONE", "<NUMERO> COM DDD"],
    ["CLASSE", "ECON OU EXEC"],
    ["PAGAMENTO", "CARTAO, CARTAO DE MILHAS, PIX, BOLETO OU BALCAO"],
    ["ASSENTOS", "MAPA DE POLTRONAS DO VOO"],
    ["ASSENTO", "<12A> POLTRONA DO PAX"],
    ["ASSENTOLIVRE", "POLTRONAS LIVRES AUTOMATICAS"],
    ["MALOTA", "<0|1|2> EQUIPAGEM DESPACHADA"],
    ["PESO", "<KG> BAGAGEM DO PAX"],
    ["MILHAS", "[N] SALDO E RESGATE"],
    ["CADASTRAR", "<NOME> NOVO CLIENTE E CARTAO"],
    ["CARTAO", "[NUM] ATIVA O CARTAO DE MILHAS"],
    ["LISTAR MILHAS", "SALDO DE MILHAS POR EMPRESA"],
    ["ADICIONAR MILHAS", "<E> <N> CREDITA MILHAS"],
    ["ABATER MILHAS", "[NA PASSAGEM] <N> USA MILHAS"],
    ["STATUS", "MOSTRA O RASCUNHO ATUAL"],
    ["CONFIRMAR", "EMITE A RESERVA E O PNR"],
    ["CONSULTAR", "<PNR> DADOS DE UMA RESERVA"],
    ["CHECKIN", "<PNR> FAZ O CHECK-IN"],
    ["CANCELAR", "<PNR> CANCELA A RESERVA"],
    ["BILHETES", "LISTA AS SUAS RESERVAS"],
    ["NOVO", "NOVO ATENDIMENTO (DESCARTA O RASCUNHO)"],
    ["SOM", "ON OU OFF"],
    ["LIMPAR", "LIMPA A TELA"],
    ["*LM", "[NOME|NUM] MILHAS DO CLIENTE"],
    ["*CM", "[NOME] CADASTRA CLIENTE E CARTAO"],
    ["*ACM", "[NOME|NUM] ATIVA O CARTAO"],
    ["*C", "CONFIRMA A RESERVA"],
    ["*LR", "LISTA AS SUAS RESERVAS"],
    ["*N", "NOVO ATENDIMENTO"],
    ["*LT", "LIMPA A TELA"],
    ["$V", "VALOR DA RESERVA"],
    ["*RV", "[VOO] SELECIONA O VOO"],
    ["*LP", "[NOME] LISTA OS PASSAGEIROS"],
    ["*RM", "[N] REMOVE O PASSAGEIRO"],
    ["$PG", "[FORMA] FORMA DE PAGAMENTO"],
    ["*MAV", "MAPA DE ASSENTOS DO VOO"],
    ["*ASS", "<12A> POLTRONA DO PAX"],
    ["*AL", "ASSENTOS LIVRES AUTOMATICAS"],
    ["*CHK", "<PNR> FAZ O CHECK-IN"],
    ["*R", "EXIBE O PNR EM ANDAMENTO"],
    ["*I", "EXIBE O ITINERARIO"],
    ["X2", "CANCELA O SEGMENTO DO VOO"],
    ["ER", "GRAVA E EMITE O PNR"],
    [".CE", "<CIDADE> CODIFICA CIDADE (EX.: .CE SALVADOR)"],
    [".CD", "<AEROPORTO> DECODIFICA (EX.: .CD SSA)"],
    [".AE", "LISTA AS COMPANHIAS AEREAS"],
    ["SOF", "ENCERRA A SESSAO DO TERMINAL"],
    ["AN", "<DATA><ORI><DES> DISPONIBILIDADE (EX.: AN06OCTSAOFOR)"],
    ["NM", "<N>SOBRENOME/NOME DO PAX (EX.: NM1SILVA/JOAO MR)"],
    ["AP", "<FONE> TELEFONE (AP E-<EMAIL> GRAVA O E-MAIL)"],
    ["RF", "<NOME> QUEM SOLICITOU A RESERVA"],
    ["TKTL", "<DD><MES> PRAZO DE EMISSAO (EX.: TKTL06OCT)"],
    ["SS", "<1><CLASSE> VENDA DO ASSENTO (EX.: SS1Y1)"],
    ["RT", "[/PNR] EXIBE O PNR ATUAL"],
    ["XE", "<N> CANCELA O SEGMENTO (EX.: XE1)"],
    ["XI", "CANCELA O ITINERARIO TODO"],
    ["AJUDA", "LISTA COMPLETA NO TERMINAL"]
  ];

  function montarTermCmds() {
    const l = $("#tc-list");
    if (!l) return;
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    l.innerHTML = TERM_CMDS.map((c) =>
      '<button type="button" class="tc-item" data-i="' + esc(c[0]) + '"><b>' + esc(c[0]) + "</b><span>" + esc(c[1]) + "</span></button>"
    ).join("");
    l.addEventListener("click", (e) => {
      const b = e.target.closest(".tc-item");
      if (!b) return;
      const inp = $("#term-in");
      inp.value = b.dataset.i + " ";
      inp.dispatchEvent(new Event("input"));
      inp.focus();
    });
  }

  function rPax() {
    const R = T.rascunho;
    if (R.ativo >= R.paxs.length) R.ativo = R.paxs.length - 1;
    if (R.ativo < 0) R.ativo = 0;
    return R.paxs[R.ativo];
  }

  function rAssento() { return rPax().assento; }

  function termEl() { return $("#term-out"); }
  function termRolar() { const el = termEl(); el.scrollTop = el.scrollHeight; }

  function termPrint(linhas, tipo) {
    if (!Array.isArray(linhas)) linhas = [linhas];
    linhas.forEach((l) => T.fila.push({ t: l === undefined || l === null || l === "" ? " " : String(l), c: tipo || "" }));
    termProximo();
  }

  function termProximo() {
    if (T.imprimindo || !T.fila.length) return;
    T.imprimindo = true;
    const item = T.fila.shift();
    const el = document.createElement("div");
    el.className = "to-line" + (item.c ? " " + item.c : "");
    termEl().appendChild(el);
    const txt = item.t;
    let i = 0;
    T.iv = setInterval(() => {
      if (T.pausado) return;
      i += 3;
      el.textContent = txt.slice(0, i);
      if (i >= txt.length) {
        pintarStatus(el, txt);
        clearInterval(T.iv);
        T.iv = null;
        T.imprimindo = false;
        termRolar();
        setTimeout(termProximo, 25);
      } else {
        termRolar();
      }
    }, 14);
  }

  function pintarStatus(el, txt) {
    if (txt.indexOf("CANCELADO") < 0 && txt.indexOf("ULTIMO CHAMADO") < 0 && txt.indexOf("PARTIU") < 0 && txt.indexOf("ATRASADO") < 0) return;
    const re = /(ATRASADO|CANCELADO|ULTIMO CHAMADO|PARTIU)/g;
    el.textContent = "";
    let last = 0;
    let m;
    while ((m = re.exec(txt))) {
      if (m.index > last) el.appendChild(document.createTextNode(txt.slice(last, m.index)));
      const sp = document.createElement("span");
      sp.className = "ts-" + classeStat(m[0]);
      sp.textContent = m[0];
      el.appendChild(sp);
      last = m.index + m[0].length;
    }
    if (last < txt.length) el.appendChild(document.createTextNode(txt.slice(last)));
  }

  function alternarPausa() {
    T.pausado = !T.pausado;
    termPausaUI();
  }

  function termPausaUI() {
    const c = $("#term");
    if (c) c.classList.toggle("pausado", !!T.pausado);
  }

  function termCtrlC() {
    T.pausado = false;
    termPausaUI();
    const parcial = T.imprimindo ? termEl().lastElementChild : null;
    T.fila = [];
    if (T.iv) { clearInterval(T.iv); T.iv = null; }
    T.imprimindo = false;
    if (parcial) {
      parcial.textContent = parcial.textContent + (parcial.textContent ? " " : "") + "^C";
      termRolar();
    } else {
      termPrint(["^C"], "sys");
    }
  }

  function termErro(linhas) { termPrint(linhas, "bad"); }

  function assentoValido(f, s) {
    const L = layout(f.ac);
    const m = /^(\d{1,2})([A-H])$/.exec(String(s).toUpperCase());
    if (!m) return false;
    const r = Number(m[1]);
    if (r < 1 || r > L.linhas) return false;
    return L.grupos.some((g) => g.indexOf(m[2]) >= 0);
  }

  function termAjuda() {
    termPrint([
      "COMANDOS DO TERMINAL DE ATENDIMENTO",
      "------------------------------------------------",
      " VOOS [FILTRO] ....... VOOS DE PARTIDA (EX.: VOOS MAD, VOOS 10:05)",
      " CHEGADAS [FILTRO] ... VOOS DE CHEGADA (EX.: CHEGADAS LISBOA)",
      " ROTA <ORI> <DES> .... ROTA DO ATENDIMENTO (EX.: ROTA GRU MAD)",
      " RES <ORI> <DES> ...... ESCOLHE DE - PARA E LISTA OS VOOS (EX.: RES SSA FOR)",
      " TO <DES> FROM <ORI> .. ESCOLHE O PAR AO CONTRARIO (EX.: TO SSA FROM GRU)",
      " DE <ORI> PARA <DES> ... IGUAL AO TO EM PORTUGUES (EX.: DE GRU PARA SSA)",
      " DATA <DIA> .......... DATA ALVO DE 0 A 6 (EX.: DATA AMANHA)",
      " SITUACAO <VOO> ...... SITUACAO EM TEMPO REAL DO VOO (API REAL SE ATIVA)",
      " ALTERAR <VOO> ....... MUDA DIA E HORA DO VOO (EX.: ALTERAR LA3375 18:30)",
      " ESPERA <VOO> ........ ENTRA NA LISTA DE ESPERA DO VOO LOTADO",
      " AOVIVO .............. TRAFEGO AO VIVO DE VERDADE PROXIMO AO GRU",
      " TARIFA <ORI> <DES> .. TARIFA, DISTANCIA E DURACAO DA ROTA",
      " VALOR ............... COMPOSICAO DO VALOR DA RESERVA",
      " RESERVAR <VOO> ...... SELECIONA O VOO E LIGA O NOME DO CLIENTE AO CARTAO DE MILHAS (APENAS PROGRAMADO). EX.: RESERVAR 3",
      " PASSAGEIRO <NOME> ... NOME COMPLETO DO PASSAGEIRO ATIVO (P1)",
      " ADICIONAR <NOME> .... INCLUI OUTRO PASSAGEIRO NA RESERVA",
      " PASSAGEIROS ......... LISTA OS PASSAGEIROS DA RESERVA",
      " ATIVO <N> ........... TROCA O PASSAGEIRO EM EDICAO (EX.: ATIVO 2)",
      " REMOVER <N> ......... REMOVE O PASSAGEIRO <N> DA RESERVA",
      " DOC <NUMERO> ........ CPF (NACIONAL) OU PASSAPORTE (INTERNACIONAL)",
      " EMAIL <ENDERECO> .... E-MAIL PARA EMISSAO",
      " TELEFONE <NUMERO> ... TELEFONE COM DDD",
      " CLASSE ECON|EXEC .... CLASSE DA PASSAGEM",
      " PAGAMENTO <FORMA> ... CARTAO, CARTAO DE MILHAS, PIX, BOLETO OU BALCAO (VOOS DE HOJE)",
      " ASSENTOS ............ MAPA DE POLTRONAS DO VOO ESCOLHIDO",
      " ASSENTO <12A> ....... ESCOLHE A POLTRONA DO PASSAGEIRO ATIVO",
      " ASSENTOLIVRE ........ ESCOLHE ASSENTOS LIVRES PARA QUEM FALTA",
      " MALOTA <0|1|2> ...... EQUIPAGEM DESPACHADA",
      " PESO <KG> ........... PESO DA BAGAGEM DO PAX ATIVO E VALOR PELO PESO (EX.: PESO 18)",
      " MILHAS [N] ......... SALDO DAS MILHAS E RESGATE NO VALOR DA PASSAGEM",
      " CADASTRAR <NOME> .... CADASTRA O CLIENTE E EMITE O CARTAO DE MILHAS",
      " CARTAO [NUM] ........ ATIVA E MOSTRA O CARTAO (CARTAO SAIR DESATIVA)",
      " LISTAR MILHAS ....... SALDO DE MILHAS POR EMPRESA",
      " ADICIONAR MILHAS <E> <N>  CREDITA MILHAS NA EMPRESA (EX.: ADICIONAR MILHAS LA 1500)",
      " ABATER MILHAS <N> ... ABATE MILHAS NA PASSAGEM (EX.: ABATER MILHAS NA PASSAGEM 500)",
      " STATUS .............. MOSTRA O RASCUNHO ATUAL",
      " CONFIRMAR ........... EMITE A RESERVA E O PNR",
      " CONSULTAR <PNR> ..... DADOS DE UMA RESERVA",
      " CHECKIN <PNR> ....... FAZ O CHECK-IN DA RESERVA",
      " CANCELAR <PNR> ...... CANCELA A RESERVA",
      " BILHETES ............ LISTA AS SUAS RESERVAS",
      " NOVO ................ NOVO ATENDIMENTO (DESCARTA O RASCUNHO)",
      " SOM ON|OFF .......... LIGA OU DESLIGA O SOM DO TABULEIRO",
      " LIMPAR .............. LIMPA A TELA",
      " V ................... LISTA OS VOOS (ACEITA FILTRO)",
      " .PT ................. LISTA AS PARTIDAS",
      " .CH ................. LISTA AS CHEGADAS",
      " .VV ................. VOOS AO VIVO PROXIMO AO GRU",
      " *LM<NOME|NUM> ....... MILHAS DO CLIENTE (NOME OU CARTAO)",
      " *CM [NOME] .......... CADASTRA O CLIENTE E EMITE O CARTAO DE MILHAS",
      " *ACM [X] ............ ATIVA O CARTAO DE MILHAS (NUMERO OU NOME)",
      " *C .................. CONFIRMA A RESERVA CADASTRADA",
      " *LR ................. LISTA AS SUAS RESERVAS",
      " *N .................. NOVO ATENDIMENTO",
      " *LT ................. LIMPA A TELA",
      " $V .................. VALOR DA RESERVA",
      " *RV [VOO] ........... SELECIONA O VOO (EX.: *RV 3)",
      " *LP [NOME] .......... LISTA OS PASSAGEIROS DO VOO",
      " *RM [N] ............. REMOVE O PASSAGEIRO",
      " $PG [FORMA] ......... FORMA DE PAGAMENTO",
      " *MAV ................ MAPA DE ASSENTOS DO VOO",
      " *ASS<12A> ........... POLTRONA DO PAX",
      " *AL ................. ASSENTOS LIVRES AUTOMATICAS",
      " *CHK<PNR> ........... FAZ O CHECK-IN DA RESERVA",
      " *R .................. EXIBE O PNR EM ANDAMENTO",
      " *I .................. EXIBE O ITINERARIO",
      " X2 .................. CANCELA O SEGMENTO DO VOO",
      " ER .................. GRAVA E EMITE O PNR",
      " .CE <CIDADE> ........ CODIFICA CIDADE (EX.: .CE SALVADOR)",
      " .CD <AEROPORTO> ..... DECODIFICA AEROPORTO (EX.: .CD SSA)",
      " .AE ................. LISTA AS COMPANHIAS AEREAS",
      " SOF ................. ENCERRA A SESSAO DO TERMINAL",
      " AN<DATA><ORI><DES> .. DISPONIBILIDADE DE VOOS (EX.: AN06OCTSAOFOR)",
      " NM1SOBRENOME/NOME ... NOME DO PASSAGEIRO (EX.: NM1SILVA/JOAO MR)",
      " AP <FONE> ........... TELEFONE (AP E-<EMAIL> GRAVA O E-MAIL)",
      " RF <NOME> ........... REGISTRA QUEM SOLICITOU A RESERVA",
      " TKTL<DD><MES> ....... PRAZO DE EMISSAO (EX.: TKTL06OCT)",
      " SS<1><CLASSE> ....... VENDA DO ASSENTO (EX.: SS1Y1)",
      " RT [/PNR] ........... EXIBE O PNR ATUAL OU RECUPERA POR PNR",
      " XE<N> ............... CANCELA O SEGMENTO (EX.: XE1)",
      " XI .................. CANCELA O ITINERARIO TODO",
      "------------------------------------------------",
      "APOS O RESERVAR O TERMINAL AVANCA O PROXIMO PASSO SOZINHO",
      "TAB COMPLETA O COMANDO   SETA CIMA REPETE O ULTIMO",
      "CTRL+C INTERROMPE A LISTAGEM EM ANDAMENTO"
    ]);
  }

  function taxaTxt(v) { return "R$ " + v.toFixed(2).replace(".", ","); }

  function infoRota(o, d) {
    const vs = DATA.gerarVoos("partidas", o, d, 0);
    if (!vs.length) return null;
    return { km: vs[0].km, dur: vs[0].dur };
  }

  function termTitulo(tipo) {
    const rota = T.rota ? T.rota.origem + " > " + T.rota.destino : (tipo === "chegadas" ? "TODAS > GRU" : "GRU > TODOS");
    const data = T.dia ? DATA.dataLonga(T.dia) + " " + DATA.dataSemana(T.dia) : "HOJE " + dataHoje();
    return rota + "   " + data;
  }

  function termLista() {
    if (T.rota) return DATA.gerarVoos("partidas", T.rota.origem, T.rota.destino, T.dia);
    if (T.dia) return null;
    return DATA.departures.filter(mesmoDia);
  }

  function termListaChegadas() {
    if (T.rota) return DATA.gerarVoos("chegadas", T.rota.origem, T.rota.destino, T.dia);
    if (T.dia) return null;
    return DATA.arrivals.filter(mesmoDia);
  }

  function avisoRotaAtual() {
    const R = T.rascunho;
    if (!R.voo) return null;
    const no = R.voo.no.replace(/\s/g, "");
    if (T.rota) {
      if (R.voo.origem !== T.rota.origem || R.voo.destino !== T.rota.destino || (R.voo.dia || 0) !== T.dia) {
        return "ATENCAO: O VOO " + no + " NAO PERTENCE A ESTA ROTA/DATA. USE RESERVAR PARA TROCAR.";
      }
      return null;
    }
    if (R.voo.origem !== "GRU" || (R.voo.dia || 0) !== T.dia) {
      return "ATENCAO: O VOO " + no + " NAO PERTENCE AO ESCOPO ATUAL (GRU / ESTA DATA). USE RESERVAR PARA TROCAR.";
    }
    return null;
  }

  function termRota(arg) {
    const p = arg.toUpperCase().split(/[\s>,]+/).filter(Boolean);
    if (p.length && (p[0] === "TODAS" || p[0] === "TUDO" || p[0] === "LIMPAR" || p[0] === "OFF")) {
      T.rota = null;
      const l = ["OK: ROTA DESFEITA - LISTANDO TODAS AS PARTIDAS E CHEGADAS DE GRU.", "USE: ROTA <ORIGEM> <DESTINO>  EX.: ROTA GRU MAD"];
      const av = avisoRotaAtual();
      if (av) l.splice(1, 0, av);
      return termPrint(l, "sys");
    }
    if (!p.length) {
      if (!T.rota) return termPrint(["ROTA ATUAL: NAO DEFINIDA - LISTANDO TODAS AS PARTIDAS DE GRU", "USE: ROTA <ORIGEM> <DESTINO>  EX.: ROTA GRU MAD"], "sys");
      const i = infoRota(T.rota.origem, T.rota.destino);
      return termPrint([
        "ROTA ATUAL: " + T.rota.origem + " > " + T.rota.destino + "   " + DATA.AEROS[T.rota.destino].cidade,
        "  DISTANCIA: " + i.km + " KM   DURACAO: " + durTxt(i.dur) + "   DATA: " + (T.dia ? DATA.dataLonga(T.dia) : "HOJE"),
        "USE: VOOS PARA LISTAR   OU ROTA <ORI> <DES> PARA TROCAR."
      ], "sys");
    }
    if (p.length < 2) return termErro(["ERRO: USE ROTA <ORIGEM> <DESTINO>. EX.: ROTA GRU MAD"]);
    const o = p[0], d = p[p.length - 1];
    if (!DATA.AEROS[o] || !DATA.AEROS[d]) return termErro(["ERRO: AEROPORTO DESCONHECIDO.", "EX.: ROTA GRU MAD  |  ROTA CGH GIG"]);
    if (o === d) return termErro(["ERRO: ORIGEM E DESTINO SAO IGUAIS."]);
    T.rota = { origem: o, destino: d };
    const i = infoRota(o, d);
    const l = [
      "OK: ROTA = " + o + " > " + d + "   " + DATA.AEROS[d].cidade + " (" + DATA.AEROS[d].nome + ")",
      "  DISTANCIA: " + i.km + " KM   DURACAO: " + durTxt(i.dur),
      "  TARIFA ECON: " + brl(precoBase(i.km)) + "   TARIFA EXEC: " + brl(Math.round((precoBase(i.km) * 2.7) / 10) * 10 - 1),
      "PROXIMO PASSO: VOOS  OU  RESERVAR <VOO>"
    ];
    const av = avisoRotaAtual();
    if (av) l.splice(3, 0, av);
    termPrint(l, "sys");
  }

  function primeiroProgramado(lista) {
    for (let n = 0; n < lista.length; n++) if (statusDe(lista[n]) === "PROGRAMADO" && !lotado(lista[n])) return n + 1;
    return null;
  }

  function parRota(arg) {
    const p = arg.toUpperCase().split(/[\s>,\-]+/).filter(Boolean);
    const apos = (kw) => { const i = p.indexOf(kw); return i >= 0 && i + 1 < p.length ? p[i + 1] : null; };
    const temTo = p.indexOf("TO") >= 0, temFrom = p.indexOf("FROM") >= 0;
    const temDe = p.indexOf("DE") >= 0, temPara = p.indexOf("PARA") >= 0;
    const temD = temTo || temPara, temO = temFrom || temDe;
    if (temD || temO) {
      if (!temD || !temO) {
        return {
          erro: (temTo || temFrom)
            ? ["ERRO: USE TO <DESTINO> FROM <ORIGEM>. EX.: TO SSA FROM GRU"]
            : ["ERRO: USE DE <ORIGEM> PARA <DESTINO>. EX.: DE GRU PARA SSA"]
        };
      }
      return { o: temFrom ? apos("FROM") : apos("DE"), d: temTo ? apos("TO") : apos("PARA") };
    }
    if (p.length < 2) return {};
    return { o: p[0], d: p[p.length - 1] };
  }

  function listaResVoos(o, d, cab) {
    T.rota = { origem: o, destino: d };
    const i = infoRota(o, d);
    termPrint(cab.concat([
      "  DISTANCIA: " + i.km + " KM   DURACAO: " + durTxt(i.dur) + "   TARIFA ECON: " + brl(precoBase(i.km))
    ]), "sys");
    const lista = termLista() || [];
    const l = [
      "VOOS DISPONIVEIS - " + termTitulo("partidas"),
      pad("N", 4) + pad("VOO", 8) + pad("COMPANHIA", 12) + pad("DESTINO", 18) + pad("HORA", 7) + pad("PORT", 6) + "SITUACAO",
      "----------------------------------------------------------------------"
    ];
    lista.forEach((f, n) => {
      l.push(pad(n + 1, 4) + pad(f.no.replace(/\s/g, ""), 8) + pad(DATA.AIRLINES[f.al] || f.al, 12) + pad(celDestino(f, 18), 18) +
        pad(hhmm(f.ref), 7) + pad(f.cancelado ? "--" : gateDe(f), 6) + rotuloLista(f));
    });
    l.push("SELECIONE O VOO: RESERVAR <NUMERO DA LINHA>" + (primeiroProgramado(lista) ? "  EX.: RESERVAR " + primeiroProgramado(lista) : ""));
    termPrint(l);
  }

  function termRes(arg) {
    const r = parRota(arg);
    if (r.erro) return termErro(r.erro);
    if (!r.o || !r.d) return termErro([
      "ERRO: USE RES <ORIGEM> <DESTINO>. EX.: RES SSA FOR",
      "TAMBEM ACEITA: RES DE SSA PARA FOR   OU   RES TO SSA FROM GRU"
    ]);
    const o = r.o, d = r.d;
    if (!DATA.AEROS[o] || !DATA.AEROS[d]) return termErro([
      "ERRO: AEROPORTO DESCONHECIDO EM: " + o + " > " + d,
      "EX.: RES SSA FOR   (SALVADOR > FORTALEZA)"
    ]);
    if (o === d) return termErro(["ERRO: ORIGEM E DESTINO SAO IGUAIS."]);
    listaResVoos(o, d, [
      "RES = DE " + o + " (" + DATA.AEROS[o].cidade + ")  >  PARA " + d + " (" + DATA.AEROS[d].cidade + ")   " +
        (T.dia ? DATA.dataLonga(T.dia) : "HOJE")
    ]);
  }

  function termTo(cmd, arg) {
    const r = parRota(cmd + (arg ? " " + arg : ""));
    if (r.erro) return termErro(r.erro);
    const pt = cmd === "DE" || cmd === "PARA";
    if (!r.o || !r.d) return termErro(pt ? [
      "ERRO: USE DE <ORIGEM> PARA <DESTINO>. EX.: DE GRU PARA SSA",
      "TAMBEM ACEITA: PARA <DESTINO> DE <ORIGEM>"
    ] : [
      "ERRO: USE TO <DESTINO> FROM <ORIGEM>. EX.: TO SSA FROM GRU",
      "TAMBEM ACEITA: FROM <ORIGEM> TO <DESTINO>"
    ]);
    const o = r.o, d = r.d;
    if (!DATA.AEROS[o] || !DATA.AEROS[d]) return termErro([
      "ERRO: AEROPORTO DESCONHECIDO EM: " + o + " > " + d,
      pt ? "EX.: DE GRU PARA SSA   (DE GRU PARA SALVADOR)" : "EX.: TO SSA FROM GRU   (DE GRU PARA SSA)"
    ]);
    if (o === d) return termErro(["ERRO: ORIGEM E DESTINO SAO IGUAIS."]);
    listaResVoos(o, d, pt ? [
      "DE " + o + " (" + DATA.AEROS[o].cidade + ")  >  PARA " + d + " (" + DATA.AEROS[d].cidade + ")   " +
        (T.dia ? DATA.dataLonga(T.dia) : "HOJE")
    ] : [
      "TO " + d + " FROM " + o + "   " + DATA.AEROS[o].cidade + " > " + DATA.AEROS[d].cidade + "   " +
        (T.dia ? DATA.dataLonga(T.dia) : "HOJE")
    ]);
  }

  function termData(arg) {
    const a = arg.toUpperCase().replace(/\s+/g, "");
    if (!a) return termPrint(["DATA ALVO: " + (T.dia ? DATA.dataLonga(T.dia) + " " + DATA.dataSemana(T.dia) : "HOJE " + dataHoje()), "USE: DATA HOJE | DATA AMANHA | DATA <0-" + (DATA.DIAS - 1) + ">"], "sys");
    let d = -1;
    if (a === "HOJE") d = 0;
    else if (a === "AMANHA" || a === "AMANHÃ") d = 1;
    else if (/^\d+$/.test(a)) d = Number(a);
    if (d < 0 || d > DATA.DIAS - 1) return termErro(["ERRO: USE DATA HOJE, DATA AMANHA OU DATA <0-" + (DATA.DIAS - 1) + ">."]);
    T.dia = d;
    const l = ["OK: DATA = " + (d === 0 ? "HOJE" : d === 1 ? "AMANHA" : DATA.dataSemana(d)) +
      "   " + DATA.dataLonga(d) + "   " + DATA.dataCurta(d)];
    const av = avisoRotaAtual();
    if (av) l.push(av);
    if (d && !T.rota) l.push("PARA LISTAR OS VOOS DESTA DATA USE: ROTA <ORIGEM> <DESTINO>  EX.: ROTA GRU GIG");
    termPrint(l, "sys");
  }

  function termAlterar(arg) {
    const uso = ["ERRO: USE ALTERAR <VOO> [DIA] [HH:MM].", "EX.: ALTERAR LA3375 18:30   ALTERAR LA3375 AMANHA 09:15", "ALTERAR <VOO> RESTAURAR VOLTA AO HORARIO ORIGINAL."];
    const toks = arg.toUpperCase().split(/\s+/).filter(Boolean);
    if (!toks.length) return termErro(uso);
    let dia, ref, reset = false;
    let i = toks.length;
    for (i = toks.length - 1; i >= 0; i--) {
      const t = toks[i];
      if (t === "RESTAURAR" || t === "ORIGINAL" || t === "PADRAO" || t === "RESET") { reset = true; continue; }
      if (/^\d{1,2}:\d{1,2}$/.test(t)) {
        const p = t.split(":");
        const h = Number(p[0]), m = Number(p[1]);
        if (h > 23 || m > 59) return termErro(["ERRO: HORA INVALIDA '" + t + "'. USE DE 00:00 A 23:59. EX.: 18:30"]);
        ref = h * 60 + m;
        continue;
      }
      if (/^\d{3,4}$/.test(t)) {
        const h = Number(t.slice(0, t.length - 2)), m = Number(t.slice(-2));
        if (h <= 23 && m <= 59) { ref = h * 60 + m; continue; }
        break;
      }
      if (/^\d{1,2}$/.test(t)) {
        const d = Number(t);
        if (d <= DATA.DIAS - 1) { dia = d; continue; }
        break;
      }
      if (t === "HOJE") { dia = 0; continue; }
      if (t === "AMANHA" || t === "AMANHÃ" || t.indexOf("AMANH") === 0) { dia = 1; continue; }
      break;
    }
    const voo = toks.slice(0, i + 1).join(" ");
    if (!voo) return termErro(uso);
    if (!reset && dia === undefined && ref === undefined) return termErro(uso);
    const n = voo.replace(/\s/g, "");
    let tipo = "partidas";
    let f = DATA.departures.find((x) => x.no.replace(/\s/g, "") === n);
    if (!f) { tipo = "chegadas"; f = DATA.arrivals.find((x) => x.no.replace(/\s/g, "") === n); }
    if (!f) return termErro(["ERRO: VOO '" + voo + "' NAO ENCONTRADO.", "USE O COMANDO VOOS PARA VER A LISTA."]);
    if (reset) {
      const tinha = DATA.restaurar(tipo, n);
      renderBoard("partidas");
      renderBoard("chegadas");
      if (!tinha) return termPrint(["VOO " + n + " JA ESTA NO HORARIO ORIGINAL."], "sys");
      return termPrint([
        "RESTAURADO - VOO " + n,
        "  DATA: " + rotuloDia(0),
        "  HORARIO: " + hhmm(f.ref),
        "  SITUACAO: " + statusDe(f)
      ], "sys");
    }
    const e = DATA.alterar(tipo, n, dia, ref);
    renderBoard("partidas");
    renderBoard("chegadas");
    termPrint([
      "ALTERADO - VOO " + n,
      "  DATA: " + rotuloDia(e.dia === null ? 0 : e.dia),
      "  HORARIO: " + hhmm(f.ref),
      "  SITUACAO: " + statusDe(f),
      "USE: VOOS PARA LISTAR   OU SITUACAO " + n + " PARA DETALHES."
    ], "sys");
  }

  function termFiltrar(lista, q) {
    if (!q) return lista;
    const n = q.toUpperCase().replace(/\s+/g, "");
    return lista.filter((f) => f.no.replace(/\s/g, "").indexOf(n) >= 0 || f.cidade.indexOf(n) === 0 ||
      f.origem === n || f.destino === n || hhmm(f.ref).indexOf(n) >= 0 ||
      f.al === n || (DATA.AIRLINES[f.al] || "").indexOf(n) === 0);
  }

  function termAcharVoo(arg, lista) {
    const n = arg.toUpperCase().replace(/\s+/g, "");
    if (!n) return { erro: ["ERRO: INFORME O VOO. EX.: RESERVAR LA3375", "USE O COMANDO VOOS PARA VER A LISTA."] };
    let f = null;
    if (/^\d+$/.test(n)) f = lista[Number(n) - 1] || null;
    if (!f) f = lista.find((x) => x.no.replace(/\s/g, "") === n);
    if (!f) {
      const m = lista.filter((x) => x.destino === n || x.origem === n || x.cidade.indexOf(n) === 0 || x.no.replace(/\s/g, "").indexOf(n) >= 0);
      if (m.length === 1) f = m[0];
      else if (m.length > 1) {
        const l = ["ENCONTRADOS " + m.length + " VOOS PARA '" + arg.trim().toUpperCase() + "':"];
        m.slice(0, 12).forEach((x) => l.push("  " + pad(x.no.replace(/\s/g, ""), 8) + pad(x.cidade, 18) + pad(hhmm(x.ref), 7) + "PORT " + (x.cancelado ? "--" : gateDe(x))));
        l.push("USE O NUMERO EXATO DO VOO.");
        return { multi: l };
      }
    }
    if (!f) return { erro: ["ERRO: VOO '" + arg.trim().toUpperCase() + "' NAO ENCONTRADO.", "USE O COMANDO VOOS."] };
    return { voo: f };
  }

  function isoDataBR(br) {
    const p = String(br || "").split("/");
    return p.length === 3 ? p[2] + "-" + p[1] + "-" + p[0] : "";
  }

  async function situacaoReal(f) {
    const partes = String(f.no || "").split(/\s+/);
    const carrier = (f.al || partes[0] || "").toUpperCase();
    const numero = partes.length > 1 ? partes[partes.length - 1] : String(f.no || "");
    const iso = isoDataBR(f.data || dataHoje());
    const ctl = new AbortController();
    const to = setTimeout(function () { ctl.abort(); }, 4500);
    try {
      const r = await fetch("/api/situacao?carrier=" + encodeURIComponent(carrier) +
        "&number=" + encodeURIComponent(numero) + "&data=" + encodeURIComponent(iso),
        { signal: ctl.signal, cache: "no-store" });
      const j = await r.json();
      if (!j || !j.ok || !j.linhas || !j.linhas.length) return [];
      return j.linhas.map(function (l) { return "  " + l; });
    } finally { clearTimeout(to); }
  }

  function termSituacao(arg) {
    if (!arg.trim()) return termErro(["ERRO: USE SITUACAO <VOO>. EX.: SITUACAO LA3375", "TAMBEM ACEITA CIDADE: SITUACAO MAD"]);
    const base = (termLista() || []).concat(DATA.arrivals, DATA.departures);
    const vistos = new Set();
    const arr = base.filter((f) => { const k = chaveVoo(f); if (vistos.has(k)) return false; vistos.add(k); return true; });
    const r = termAcharVoo(arg, arr);
    if (r.erro) return termErro(r.erro);
    if (r.multi) return termPrint(r.multi);
    const f = r.voo;
    const st = rotuloLista(f);
    const atraso = f.delay || 0;
    const cor = f.cancelado ? "bad" : (classeStat(st) === "hot" ? "hl" : "sys");
    termPrint([
      "SITUACAO - VOO " + f.no.replace(/\s/g, "") + "   " + (f.tipo === "chegadas" ? "CHEGADA" : "PARTIDA"),
      "  COMPANHIA: " + (DATA.AIRLINES[f.al] || f.al) + "   " + f.ac,
      "  ROTA: " + rotaVoo(f) + "   " + f.cidade,
      "  ESCALA: " + escalaTxt(f),
      "  DATA: " + (f.data || dataHoje()) + (f.dia ? "  " + (f.semana || "") : ""),
      "  HORARIO: " + hhmm(f.ref) + (atraso ? "  (ATRASO DE " + atraso + " MIN)" : "  (NO HORARIO)"),
      "  DURACAO: " + durTxt(f.dur) + "   AERONAVE: " + f.ac + "   PORTAO: " + (f.cancelado ? "--" : gateDe(f)),
      "  SITUACAO: " + st + (filaSize(f) ? "   (ESPERA: " + filaSize(f) + ")" : "")
    ], cor);
    if (filaSize(f)) {
      const fl = FILA[filaKey(f)];
      termPrint("  FILA DE ESPERA (" + filaSize(f) + "): " + fl.map((q, p) => (p + 1) + "." + q.nome).join("   "), "org");
    }
    situacaoReal(f).then(function (linhas) {
      if (linhas.length) termPrint(linhas, "hl");
    }).catch(function () {});
  }

  function termEspera(arg) {
    if (!arg.trim()) return termErro(["ERRO: USE ESPERA <VOO>. EX.: ESPERA LA3375", "ENTRA NA LISTA DE ESPERA DE UM VOO LOTADO."]);
    const f = (termLista() || []).find((x) => x.no.replace(/\s/g, "") === arg.toUpperCase().replace(/\s+/g, ""));
    if (!f) return termErro(["ERRO: VOO '" + arg.trim().toUpperCase() + "' NAO ENCONTRADO.", "USE O COMANDO VOOS."]);
    if (!lotado(f)) return termErro(["O VOO " + f.no.replace(/\s/g, "") + " AINDA TEM " + livres(f) + " POLTRONA(S) LIVRE(S).", "USE RESERVAR " + f.no.replace(/\s/g, "") + " PARA RESERVAR AGORA."]);
    const p = T.rascunho.paxs[T.rascunho.ativo] || {};
    if (!p.nome) return termErro(["ERRO: INFORME SEU NOME: PASSAGEIRO <NOME COMPLETO>", "DEPOIS: ESPERA " + f.no.replace(/\s/g, "")]);
    const k = filaKey(f);
    FILA[k] = FILA[k] || [];
    const r = FILA[k].find((x) => x.nome === p.nome);
    if (r) return termErro(["VOCE JA ESTA NA LISTA DE ESPERA DO VOO " + f.no.replace(/\s/g, "") + " NA POSICAO " + (FILA[k].indexOf(r) + 1) + "."]);
    if (FILA[k].length >= 4) return termErro(["A LISTA DE ESPERA DO VOO " + f.no.replace(/\s/g, "") + " JA TEM 4 PASSAGEIROS.", "VOLTE MAIS TARDE."]);
    FILA[k].push({ nome: p.nome, quando: Date.now() });
    termPrint(["VOCE ENTROU NA LISTA DE ESPERA DO VOO " + f.no.replace(/\s/g, "") + " NA POSICAO " + FILA[k].length + ".", "SE ALGUEM CANCELAR, A POLTRONA SAI DO MODO PASSAGEIRO E O BOARDO MARCA SUA VAGA."], "hl");
  }

  function termTarifa(arg) {
    const p = arg.toUpperCase().split(/[\s>,]+/).filter(Boolean);
    let o, d;
    if (p.length >= 2) { o = p[0]; d = p[p.length - 1]; }
    else if (T.rota) { o = T.rota.origem; d = T.rota.destino; }
    else return termErro(["ERRO: INFORME A ROTA. EX.: TARIFA GRU MAD", "OU DEFINA A ROTA PRIMEIRO: ROTA GRU MAD"]);
    if (!DATA.AEROS[o] || !DATA.AEROS[d] || o === d) return termErro(["ERRO: ROTA INVALIDA. EX.: TARIFA GRU MAD"]);
    const i = infoRota(o, d);
    const base = precoBase(i.km);
    termPrint([
      "TARIFAS - " + o + " > " + d + "   " + DATA.AEROS[d].cidade,
      "  DISTANCIA: " + i.km + " KM   DURACAO: " + durTxt(i.dur),
      "  ECONOMICA: " + brl(base) + "   MALOTA: + R$ 89,00",
      "  EXECUTIVA: " + brl(Math.round((base * 2.7) / 10) * 10 - 1),
      "  TAXA DE SERVICO: " + taxaTxt(89.9) + " POR PASSAGEIRO"
    ], "sys");
  }

  function termPeso(arg) {
    const R = T.rascunho;
    if (!R.voo) return termErro(["ERRO: NENHUM VOO ESCOLHIDO.", "USE: RESERVAR <VOO>"]);
    const p = rPax();
    const fr = franquiaKg(R.classe);
    if (!arg.trim()) {
      const taxa = taxaPeso(R.paxs, R.classe);
      return termPrint([
        "BAGAGEM DESPACHADA - PASSAGEIRO ATIVO P" + (R.ativo + 1) + "  " + (p.nome || "(SEM NOME)"),
        "  PESO: " + (p.peso || 0) + " KG   FRANQUIA: " + fr + " KG   EXCESSO: " + Math.max(0, (p.peso || 0) - fr) + " KG",
        "  TAXA DE PESO DESTE PASSAGEIRO: " + brl(taxaPesoPax(p.peso, R.classe)),
        "  PESO TOTAL DA RESERVA: " + pesoTotal(R.paxs) + " KG   TAXA TOTAL: " + brl(taxa),
        "  USE: PESO <KG> (0 A 32 KG). EX.: PESO 18"
      ], "sys");
    }
    const lim = arg.replace(/[^\d.,]/g, "").replace(",", ".");
    const kg = lim === "" ? NaN : Number(lim);
    if (!(kg >= 0 && kg <= 32)) return termErro([
      "ERRO: PESO INVALIDO. USE PESO DE 0 A 32 KG. EX.: PESO 18",
      "FRANQUIA GRATUITA: " + fr + " KG POR PASSAGEIRO. EXCESSO: R$ 6,00 POR KG."
    ]);
    p.peso = kg;
    T.rascunho.opc.peso = true;
    const ex = Math.max(0, kg - fr);
    return termPrint([
      "OK: PESO DA BAGAGEM DE P" + (R.ativo + 1) + " = " + kg + " KG",
      "  FRANQUIA: " + fr + " KG   EXCESSO: " + ex + " KG   TAXA DE PESO: " + brl(ex * 6)
    ], "sys");
  }

  function semCartaoErro() {
    return ["ERRO: CLIENTE SEM CARTAO DE MILHAS.", "USE: CADASTRAR <NOME> PARA OBTER O CARTAO, OU CARTAO <NUMERO>."];
  }

  function milhasListagem() {
    const R = T.rascunho;
    const al = R.voo ? R.voo.al : null;
    const c = cartaoAtivo();
    if (!c) return termErro(semCartaoErro());
    const l = ["SALDO DE MILHAS POR EMPRESA", "----------------------------------------",
      "  CARTAO: " + c.num + "   CLIENTE: " + c.nome];
    Object.keys(DATA.AIRLINES).forEach((k) => {
      const s = c.saldo[k] || 0;
      if (s > 0 || k === al) l.push("  " + pad(k + " " + DATA.AIRLINES[k], 24) + " " + pad(DATA.PROGRAMAS[k] || "PROGRAMA", 16) + fmtMil(s) + " MILHAS = ATÉ " + taxaTxt(milhasValor(s)));
    });
    if (al) l.push("VOO " + R.voo.no.replace(/\s/g, "") + " ACUMULA MILHAS NA " + DATA.AIRLINES[al] + ".");
    l.push("USE: MILHAS <N> | LISTAR MILHAS | ABATER MILHAS [NA PASSAGEM] <N> | ADICIONAR MILHAS <EMPRESA> <N>");
    termPrint(l, "sys");
  }

  function termResgatar(n, via) {
    const c = cartaoAtivo();
    if (!c) return termErro(semCartaoErro());
    const R = T.rascunho;
    const al = R.voo ? R.voo.al : null;
    if (!al) return termErro(["ERRO: NENHUM VOO ESCOLHIDO.", "USE: RESERVAR <VOO> PRIMEIRO PARA RESGATAR MILHAS."]);
    const bruto = brutoRascunho(R);
    const max = milhasMaxUsar(al, bruto);
    if (!max) return termErro(["ERRO: SALDO INSUFICIENTE DE MILHAS NA " + DATA.AIRLINES[al] + " (" + fmtMil(milhasSaldo(al)) + " MILHAS)."]);
    const usar = Math.min(n, max);
    R.milhas = usar;
    R.opc.milhas = true;
    const tit = via === "ABATER" ? "ABATE DE " + fmtMil(usar) + " MILHAS NA PASSAGEM" : "RESGATE DE " + fmtMil(usar) + " MILHAS";
    termPrint([
      "OK: " + tit + " = -" + taxaTxt(milhasValor(usar)),
      "  CARTAO " + c.num + " · SALDO " + DATA.AIRLINES[al] + ": " + fmtMil(milhasSaldo(al)) + " MILHAS (DEBITADO NA CONFIRMAR)",
      usar < n
        ? "  LIMITE APLICADO: " + fmtMil(max) + " MILHAS (SALDO OU VALOR DA PASSAGEM)."
        : "  VALOR FINAL: " + brl(Math.round(bruto - milhasValor(usar)))
    ], "sys");
  }

  function termMilhas(arg) {
    const txt = String(arg || "").trim();
    if (!txt) return milhasListagem();
    const n = Number(txt.replace(/\D/g, ""));
    if (n === 0 && /^0+$/.test(txt)) {
      T.rascunho.milhas = 0;
      T.rascunho.opc.milhas = true;
      return termPrint(["OK: NENHUMA MILHA RESGATADA - PASSAGEM SEM DESCONTO DE MILHAS"], "sys");
    }
    if (!(n > 0)) return termErro(["ERRO: USE MILHAS <N> EX.: MILHAS 500.", "MILHAS 1000 = R$ 10,00 DE DESCONTO."]);
    termResgatar(n, "MILHAS");
  }

  function termAbaterMilhas(arg) {
    const n = Number(String(arg || "").replace(/\D/g, ""));
    if (!(n > 0)) return termErro(["ERRO: USE ABATER MILHAS [NA PASSAGEM] <N>. EX.: ABATER MILHAS NA PASSAGEM 500", "1.000 MILHAS = R$ 10,00 DE DESCONTO NA PASSAGEM."]);
    termResgatar(n, "ABATER");
  }

  function achaEmpresa(txt) {
    const q = String(txt || "").toUpperCase().trim();
    if (!q) return null;
    const keys = Object.keys(DATA.AIRLINES);
    if (keys.indexOf(q) >= 0) return q;
    let acha = null;
    keys.forEach((k) => {
      if (acha) return;
      const nome = String(DATA.AIRLINES[k] || "").toUpperCase();
      if (nome.indexOf(q) === 0 || q.indexOf(nome) === 0) acha = k;
    });
    return acha;
  }

  function termAdicionarMilhas(txt) {
    const t = String(txt || "").toUpperCase().split(/\s+/).filter(Boolean);
    if (t.length < 2) return termErro(["ERRO: USE ADICIONAR MILHAS <EMPRESA> <N>. EX.: ADICIONAR MILHAS LA 1500", "EMPRESA: SIGLA (LA, G3, AD) OU NOME (LATAM, GOL, AZUL)."]);
    const n = Number(t[t.length - 1].replace(/\D/g, ""));
    if (!(n > 0)) return termErro(["ERRO: QUANTIDADE DE MILHAS INVALIDA. EX.: ADICIONAR MILHAS LA 1500"]);
    const c = cartaoAtivo();
    if (!c) return termErro(semCartaoErro());
    const al = achaEmpresa(t.slice(0, -1).join(" "));
    if (!al) return termErro(["ERRO: EMPRESA AEREA NAO ENCONTRADA.", "USE A SIGLA (LA, G3, AD, AA...) OU O NOME (LATAM, GOL, AZUL...)."]);
    const cs = cartoesLer();
    const cc = cs[T.cartao];
    cc.saldo[al] = (cc.saldo[al] || 0) + n;
    cartoesSalvar(cs);
    termPrint([
      "OK: +" + fmtMil(n) + " MILHAS NA " + DATA.AIRLINES[al] + " (" + (DATA.PROGRAMAS[al] || "PROGRAMA") + ")  CARTAO: " + cc.num,
      "  SALDO ATUAL: " + fmtMil(cc.saldo[al]) + " MILHAS = ATÉ " + taxaTxt(milhasValor(cc.saldo[al]))
    ], "sys");
  }

  function mostrarCartao(c) {
    const l = ["CARTAO MILHAS ATIVO", " NUMERO: " + c.num + "   CLIENTE: " + c.nome, "  SALDO POR EMPRESA:"];
    let tem = false;
    Object.keys(DATA.AIRLINES).forEach((k) => {
      const s = c.saldo[k] || 0;
      if (s > 0) { tem = true; l.push("  " + pad(k + " " + DATA.AIRLINES[k], 24) + fmtMil(s) + " MILHAS = ATÉ " + taxaTxt(milhasValor(s))); }
    });
    if (!tem) l.push("  NENHUMA MILHA AINDA. USE ADICIONAR MILHAS <E> <N> OU EMITA PASSAGENS.");
    l.push("  USE: MILHAS | ABATER MILHAS NA PASSAGEM <N> | CARTAO SAIR");
    termPrint(l, "sys");
  }

  function termCadastrar(arg) {
    const nome = String(arg || "").trim();
    if (nome.length < 6 || nome.indexOf(" ") < 0) {
      return termErro(["ERRO: USE CADASTRAR <NOME COMPLETO>. EX.: CADASTRAR JOAO SILVA", "O CADASTRO EMITE O CARTAO DE MILHAS DO CLIENTE."]);
    }
    const cs = cartoesLer();
    const num = gerarCartao();
    cs[normCartao(num)] = { num: num, nome: nome.toUpperCase(), criado: Date.now(), saldo: {} };
    cartoesSalvar(cs);
    T.cartao = normCartao(num);
    termPrint([
      "OK: CLIENTE CADASTROADO NO PROGRAMA VOOU MILHAS",
      "  NOME: " + nome.toUpperCase(),
      "  CARTAO MILHAS: " + num,
      "  CARTAO ATIVADO NESTE ATENDIMENTO.",
      "  USE: MILHAS | ADICIONAR MILHAS <E> <N> | ABATER MILHAS NA PASSAGEM <N>"
    ], "sys");
  }

  function termMilhasCliente(arg) {
    const a = String(arg || "").trim();
    const cs = cartoesLer();
    if (!a) {
      if (cartaoAtivo()) return milhasListagem();
      return termErro(semCartaoErro());
    }
    const k = normCartao(a);
    if (cs[k]) { T.cartao = k; return milhasListagem(); }
    const n = normNome(a);
    const chave = Object.keys(cs).find((kk) => normNome(cs[kk].nome) === n);
    if (chave) { T.cartao = chave; return milhasListagem(); }
    return termErro([
      "ERRO: CLIENTE OU CARTAO '" + a + "' NAO ENCONTRADO.",
      "USE: LM <NOME OU NUMERO> | CM <NOME> | ACM"
    ]);
  }

  function termAtivarCartao(arg) {
    const a = String(arg || "").trim();
    const cs = cartoesLer();
    if (a) {
      const k = normCartao(a);
      if (cs[k]) { T.cartao = k; return termCartao(""); }
      const n = normNome(a);
      const chave = Object.keys(cs).find((kk) => normNome(cs[kk].nome) === n);
      if (chave) { T.cartao = chave; return termCartao(""); }
      return termErro(["ERRO: CARTAO '" + a + "' NAO ENCONTRADO.", "USE: ACM <NUMERO OU NOME> OU CM <NOME>."]);
    }
    if (cartaoAtivo()) return termCartao("");
    const chaves = Object.keys(cs).sort((x, y) => (cs[y].criado || 0) - (cs[x].criado || 0));
    if (!chaves.length) return termErro(["ERRO: NENHUM CARTAO DE MILHAS CADASTRADO.", "USE: CM <NOME DO CLIENTE> PARA EMITIR O CARTAO."]);
    T.cartao = chaves[0];
    return termCartao("");
  }

  function termCartao(arg) {
    const a = String(arg || "").trim().toUpperCase();
    if (!a) {
      const c = cartaoAtivo();
      if (!c) return termErro(["ERRO: NENHUM CARTAO ATIVO.", "USE: CARTAO <NUMERO> OU CADASTRAR <NOME>."]);
      return mostrarCartao(c);
    }
    if (a === "SAIR" || a === "OFF" || a === "LIMPAR") {
      if (!T.cartao) return termErro(["ERRO: NENHUM CARTAO ATIVO."]);
      T.cartao = null;
      return termPrint(["OK: CARTAO DESATIVADO."], "sys");
    }
    const k = normCartao(a);
    const c = cartoesLer()[k];
    if (!c) return termErro(["ERRO: CARTAO '" + a + "' NAO ENCONTRADO.", "USE: CARTAO <NUMERO> OU CADASTRAR <NOME>."]);
    T.cartao = k;
    return mostrarCartao(c);
  }

  function termValor() {
    const R = T.rascunho;
    if (!R.voo) return termErro(["ERRO: NENHUM VOO ESCOLHIDO.", "USE: RESERVAR <VOO>"]);
    const tarifa = precoTotal(R.voo, R.classe, R.bags);
    const taxa = taxaPeso(R.paxs, R.classe);
    const porPax = tarifa + 89.9;
    const usar = R.milhas || 0;
    const desconto = milhasValor(usar);
    termPrint([
      "VALOR DA RESERVA (RASCUNHO)",
      "  VOO: " + R.voo.no.replace(/\s/g, "") + "  " + rotaVoo(R.voo) + "  " + (R.voo.data || dataHoje()),
      "  ESCALA: " + escalaTxt(R.voo),
      "  CLASSE: " + (R.classe === "EXEC" ? "EXECUTIVA" : "ECONOMICA") + "   MALOTAS/PASSAGEIRO: " + R.bags,
      "  BAGAGEM: " + pesoTotal(R.paxs) + " KG   FRANQUIA: " + franquiaKg(R.classe) + " KG POR PASSAGEIRO",
      "  TARIFA POR PASSAGEIRO: " + brl(tarifa),
      "  TAXA DE SERVICO: " + taxaTxt(89.9) + " POR PASSAGEIRO",
      "  TAXA DE PESO: " + brl(taxa) + "   (EXCESSO DE " + brl(6) + " POR KG ACIMA DA FRANQUIA)",
      "  PASSAGEIROS: " + R.paxs.length,
      ...(usar ? ["  RESGATE DE MILHAS: " + fmtMil(usar) + " MILHAS = -" + taxaTxt(desconto)] : []),
      "  TOTAL: " + brl(Math.round(porPax * R.paxs.length + taxa - desconto)) + "   PAGAMENTO: " + (R.pag === "BALCAO" ? "NO BALCAO" : R.pag),
      "  VALOR FINAL EMITIDO NO COMANDO CONFIRMAR."
    ], "sys");
  }

  function termAssentoLivre() {
    const f = T.rascunho.voo;
    if (!f) return termErro(["ERRO: NENHUM VOO ESCOLHIDO.", "USE: RESERVAR <VOO>"]);
    const L = layout(f.ac);
    const oc = ocupados(f);
    const usados = new Set(T.rascunho.paxs.map((p) => p.assento).filter(Boolean));
    let ok = 0;
    const falta = [];
    T.rascunho.paxs.forEach((p, i) => {
      if (p.assento) return;
      let achou = null;
      busca: for (let r = 1; r <= L.linhas; r++) {
        for (const g of L.grupos) {
          for (const c of g) {
            const id = r + c;
            if (!oc.has(id) && !usados.has(id)) { achou = id; break busca; }
          }
        }
      }
      if (achou) { p.assento = achou; usados.add(achou); ok++; }
      else falta.push("P" + (i + 1));
    });
    if (!ok && falta.length) return termErro(["ERRO: NENHUM ASSENTO LIVRE PARA " + falta.join(", ") + ".", "USE O COMANDO ASSENTOS."]);
    const l = ok ? ["OK: " + ok + " ASSENTO(S) ATRIBUIDO(S) AUTOMATICAMENTE."] : ["NENHUM PASSAGEIRO PRECISAVA DE ASSENTO."];
    T.rascunho.paxs.forEach((p, i) => l.push("  P" + (i + 1) + "  " + pad((p.nome || "(SEM NOME)").toUpperCase(), 26) + " ASSENTO " + (p.assento || "---")));
    if (falta.length) l.push("SEM LIVRE PARA: " + falta.join(", "));
    termPrint(l, "sys");
  }

  function termNovo() {
    T.guia = false;
    T.rascunho = novoRascunho();
    termPrint([
      "NOVO ATENDIMENTO INICIADO.",
      "RASCUNHO ANTERIOR DESCARTADO.",
      "PROXIMO PASSO: VOOS  OU  RESERVAR <VOO>"
    ], "sys");
  }

  function termExibirPnr() {
    const R = T.rascunho;
    if (R.voo || R.paxs.some((p) => p.nome || p.doc)) return termStatus();
    return termErro(["ERRO: NAO HA PNR EM ANDAMENTO.", "USE RESERVAR <VOO> PARA INICIAR OU CONSULTAR <PNR>."]);
  }

  function termItinerario() {
    const R = T.rascunho;
    const l = ["ITINERARIO DO ATENDIMENTO", "----------------------------------------"];
    if (R.voo) {
      l.push("  SEGMENTO 1: " + R.voo.no.replace(/\s/g, "") + "  " + rotaVoo(R.voo) + "  " + (R.voo.data || dataHoje()) + " " + hhmm(R.voo.ref));
      l.push("  PASSAGEIROS: " + R.paxs.map((p) => (p.nome || "(SEM NOME)").toUpperCase()).join(" + "));
      l.push("  ASSENTOS: " + R.paxs.map((p) => p.assento || "---").join(" "));
    } else if (T.rota) {
      l.push("  ROTA PREVISTA: " + T.rota.origem + " > " + T.rota.destino + "   DATA: " + (T.dia ? DATA.dataLonga(T.dia) : "HOJE"));
      l.push("  NENHUM SEGMENTO RESERVADO. USE RESERVAR <VOO>.");
    } else {
      return termErro(["ERRO: ITINERARIO VAZIO.", "USE RESERVAR <VOO> OU ROTA <ORI> <DES> PARA MONTAR."]);
    }
    termPrint(l, "sys");
  }

  function termCancelarSegmento() {
    const R = T.rascunho;
    if (!R.voo) return termErro(["ERRO: NAO HA SEGMENTO ATIVO PARA CANCELAR.", "USE RESERVAR <VOO> PARA ESCOLHER O VOO."]);
    const no = R.voo.no.replace(/\s/g, "");
    R.voo = null;
    R.milhas = 0;
    R.opc.milhas = false;
    R.paxs.forEach((p) => { p.assento = null; });
    termPrint(["OK: SEGMENTO " + no + " CANCELADO - VOO REMOVIDO DO PNR.", "PROXIMO PASSO: RESERVAR <VOO> PARA ESCOLHER OUTRO."], "sys");
  }

  function termCodificarCidade(arg) {
    const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    const q = norm(arg);
    if (!q) return termErro(["ERRO: USE .CE <CIDADE>. EX.: .CE SALVADOR"]);
    const cods = Object.keys(DATA.AEROS);
    let hits = cods.filter((k) => norm(DATA.AEROS[k].cidade) === q);
    if (!hits.length) hits = cods.filter((k) => norm(DATA.AEROS[k].cidade).indexOf(q) === 0);
    if (!hits.length) return termErro(["ERRO: CIDADE NAO ENCONTRADA: " + norm(arg), "EX.: .CE SALVADOR  OU  .CE SAO PAULO"]);
    termPrint([DATA.AEROS[hits[0]].cidade + " = " + hits.join(", ")], "sys");
  }

  function termDecodificar(arg) {
    const k = arg.trim().toUpperCase();
    if (!DATA.AEROS[k]) return termErro(["ERRO: AEROPORTO DESCONHECIDO: " + (k || "?"), "EX.: .CD SSA"]);
    termPrint([k + " = " + DATA.AEROS[k].cidade + "   AEROPORTO " + DATA.AEROS[k].nome], "sys");
  }

  function termCompanhias() {
    const l = ["COMPANHIAS AEREAS"];
    Object.keys(DATA.AIRLINES).forEach((k) => l.push("  " + pad(k, 5) + DATA.AIRLINES[k]));
    l.push("USE .CD <CODIGO> PARA O AEROPORTO OU SITUACAO <VOO> PARA O VOO.");
    termPrint(l, "sys");
  }

  function termAn(arg) {
    const a = String(arg).toUpperCase().replace(/\s+/g, "");
    const m = a.match(/^(\d{2})([A-Z]{3})([A-Z]{3})([A-Z]{3})(?:\/([A-Z0-9]+))?$/);
    if (!m) return termErro([
      "ERRO: USE AN <DIA><MES><ORIGEM><DESTINO>. EX.: AN06OCTSAOFOR",
      "CIDADES: SAO, RIO OU SIGLAS DE AEROPORTO (GRU, FOR, SSA).",
      "FILTRO: /AM, /PM OU /HHMM (EX.: AN06OCTSAOFOR/AM)."
    ]);
    const cid = { SAO: "GRU", RIO: "GIG", SP: "GRU", RJ: "GIG" };
    const resol = (c) => cid[c] || (DATA.AEROS[c] ? c : null);
    const o = resol(m[3]), d = resol(m[4]);
    if (!o || !d) return termErro(["ERRO: ORIGEM/DESTINO DESCONHECIDO: " + (o ? m[4] : m[3]), "USE 3 LETRAS. EX.: AN06OCTSAOFOR OU AN06OCTGRUSSA."]);
    if (o === d) return termErro(["ERRO: ORIGEM E DESTINO IGUAIS."]);
    const mi = MESES_AM[m[2]];
    if (mi === undefined) return termErro(["ERRO: MES INVALIDO: " + m[2] + ". USE SIGLA DE 3 LETRAS. EX.: OUT OU OCT."]);
    const hoje = new Date();
    const alvo = new Date(hoje.getFullYear(), mi, Number(m[1]));
    if (alvo.getDate() !== Number(m[1])) return termErro(["ERRO: DATA INVALIDA: " + m[1] + m[2] + "."]);
    const delta = Math.round((new Date(alvo.getFullYear(), alvo.getMonth(), alvo.getDate()) -
      new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / 86400000);
    if (delta < 0) return termErro(["ERRO: DATA " + m[1] + m[2] + " JA PASSOU. HOJE E " + DATA.dataLonga(0) + " " + DATA.dataSemana(0) + "."]);
    let lista = DATA.gerarVoos("partidas", o, d, delta);
    const filtro = m[5] || "";
    let ftxt = "";
    if (filtro === "AM") { lista = lista.filter((f) => hhmm(f.ref) < "12:00"); ftxt = "   FILTRO /AM (MANHA)"; }
    else if (filtro === "PM") { lista = lista.filter((f) => hhmm(f.ref) >= "12:00"); ftxt = "   FILTRO /PM (TARDE/NOITE)"; }
    else if (filtro === "ADL" || filtro === "ALL") { ftxt = "   FILTRO /" + filtro + " (DIA INTEIRO)"; }
    else if (/^\d{4}$/.test(filtro)) {
      const h = filtro.slice(0, 2) + ":" + filtro.slice(2);
      lista = lista.filter((f) => hhmm(f.ref) >= h);
      ftxt = "   FILTRO /" + filtro + " (A PARTIR DE " + h + ")";
    } else if (filtro) {
      return termErro(["ERRO: FILTRO /" + filtro + " NAO SUPORTADO.", "USE /AM, /PM OU /HHMM. EX.: AN" + m[1] + m[2] + m[3] + m[4] + "/AM."]);
    }
    T.dia = delta;
    T.rota = { origem: o, destino: d };
    const cab = "DISPONIBILIDADE - " + m[1] + m[2] + "   " + o + " > " + d + "   " +
      (delta ? DATA.dataLonga(delta) + " " + DATA.dataSemana(delta) : "HOJE " + dataHoje()) + ftxt;
    if (!lista.length) return termPrint([cab, "NENHUM VOO DISPONIVEL NESTA DATA/FILTRO."], "sys");
    const l = linhasVoos(cab, lista);
    l.push("USE: RESERVAR <VOO> OU RESERVAR <NUMERO DA LINHA>");
    const av = avisoRotaAtual();
    if (av) l.push(av);
    termPrint(l, "sys");
  }

  function termNomeGds(arg) {
    const m = String(arg).trim().match(/^(\d+)\s*(.+)$/);
    if (!m) return termErro(["ERRO: USE NM1SOBRENOME/NOME. EX.: NM1SILVA/JOAO MR"]);
    const idx = Number(m[1]);
    if (idx < 1 || idx > MAX_PAX) return termErro(["ERRO: NUMERO DE PASSAGEIRO INVALIDO (1 A " + MAX_PAX + ")."]);
    const R = T.rascunho;
    while (R.paxs.length < idx) R.paxs.push({ nome: "", doc: "", assento: null, peso: 0 });
    R.ativo = idx - 1;
    const esp = m[2].trim().replace(/\s+/g, " ");
    const limpa = (s) => s.replace(/\s+(MR|MRS|MS|DR|SR|MISS)\s*$/i, "").trim();
    let nome;
    if (esp.indexOf("/") >= 0) {
      const p2 = esp.split("/");
      nome = limpa(p2[1] || "") + " " + limpa(p2[0] || "");
    } else {
      nome = limpa(esp);
    }
    termCampo("nome", nome.replace(/\s+/g, " ").trim().toUpperCase());
  }

  function termRecebidoPor(arg) {
    const v = String(arg).trim();
    if (!v) return termPrint(["RF ATUAL: " + (T.rascunho.rf || "---"), "USE RF <NOME> PARA REGISTRAR QUEM SOLICITOU."], "sys");
    T.rascunho.rf = v.toUpperCase();
    termPrint(["OK: RF = " + T.rascunho.rf + " (RECEBIDO POR)"], "sys");
  }

  function termTktl(arg) {
    const v = String(arg).toUpperCase().replace(/\s+/g, "");
    const m = v.match(/^(\d{2})([A-Z]{3})$/);
    if (!m) return termErro(["ERRO: USE TKTL<DD><MES>. EX.: TKTL06OCT"]);
    if (MESES_AM[m[2]] === undefined) return termErro(["ERRO: MES INVALIDO: " + m[2] + ". USE SIGLA DE 3 LETRAS. EX.: TKTL06OCT."]);
    const n = Number(m[1]);
    const hoje = new Date();
    const alvo = new Date(hoje.getFullYear(), MESES_AM[m[2]], n);
    if (n < 1 || n > 31 || alvo.getDate() !== n) return termErro(["ERRO: DIA INVALIDO: " + m[1] + ". EX.: TKTL06OCT."]);
    T.rascunho.tk = m[1] + m[2];
    termPrint(["OK: TKTL = " + T.rascunho.tk + " - PRAZO DE EMISSAO REGISTRADO."], "sys");
  }

  function termSell(arg) {
    const v = String(arg).toUpperCase().replace(/\s+/g, "");
    const m = v.match(/^(\d+)([A-Z])(\d*)$/);
    if (!m) return termErro(["ERRO: USE SS<QTDADE><CLASSE><SEGMENTO>. EX.: SS1Y1", "CLASSES: Y (ECONOMICA), J OU F (EXECUTIVA)."]);
    const qtd = Number(m[1]);
    const seg = m[3] ? Number(m[3]) : 1;
    if (!qtd) return termErro(["ERRO: QUANTIDADE INVALIDA. EX.: SS1Y1"]);
    if (seg !== 1) return termErro(["ERRO: SEGMENTO " + seg + " NAO EXISTE. HA 1 SEGMENTO ATIVO NO PNR."]);
    const R = T.rascunho;
    if (!R.voo) return termErro(["ERRO: NAO HA SEGMENTO ATIVO PARA VENDER.", "USE RESERVAR <VOO> PRIMEIRO."]);
    let classe = null;
    if ("YEWKMHLQSRG".indexOf(m[2]) >= 0) classe = "ECON";
    else if ("JCDFP".indexOf(m[2]) >= 0) classe = "EXEC";
    if (!classe) return termErro(["ERRO: CLASSE '" + m[2] + "' NAO RECONHECIDA. USE Y (ECON) OU J/F (EXEC)."]);
    R.classe = classe;
    R.opc.classe = true;
    termPrint([
      "OK: " + qtd + " LUGAR NA CLASSE " + (classe === "EXEC" ? "EXECUTIVA" : "ECONOMICA") + " SOLICITADO NO SEGMENTO 1",
      "  VOO: " + R.voo.no.replace(/\s/g, "") + "   TARIFA: " + brl(precoTotal(R.voo, classe, R.bags))
    ], "sys");
  }

  function termXe(arg) {
    const n = Number(String(arg).replace(/\D/g, ""));
    const R = T.rascunho;
    if (!R.voo) return termErro(["ERRO: NAO HA SEGMENTO ATIVO PARA CANCELAR.", "USE RESERVAR <VOO>."]);
    if (!n || n === 1) return termCancelarSegmento();
    return termErro(["ERRO: SEGMENTO " + n + " NAO EXISTE. HA 1 SEGMENTO ATIVO (XE1)."]);
  }

  function termXi() {
    const R = T.rascunho;
    const tinha = !!R.voo || R.paxs.some((p) => p.nome || p.doc);
    if (!tinha) return termErro(["ERRO: NAO HA ITINERARIO PARA CANCELAR."]);
    T.guia = false;
    T.rascunho = novoRascunho();
    termPrint(["OK: ITINERARIO CANCELADO - PNR DESCARTADO.", "PROXIMO PASSO: VOOS  OU  RESERVAR <VOO>"], "sys");
  }

  function termSof() {
    const tinha = !!T.rascunho.voo || T.rascunho.paxs.some((p) => p.nome);
    T.guia = false;
    T.rascunho = novoRascunho();
    termPrint([
      "SESSAO ENCERRADA.",
      "----------------------------------------",
      tinha ? "PNR EM ABERTO DESCARTADO." : "NENHUM PNR EM ABERTO.",
      "OBRIGADO POR USAR O VOOU - ATE LOGO.",
      "DIGITE RESERVAR <VOO> PARA INICIAR OUTRO ATENDIMENTO."
    ], "hl");
  }

  function termSom(arg) {
    const a = arg.toUpperCase().replace(/\s+/g, "");
    let ligado = Flap.ehLigado();
    if (a === "ON" || a === "LIGAR" || a === "1") ligado = true;
    else if (a === "OFF" || a === "DESLIGAR" || a === "0") ligado = false;
    else if (a) return termErro(["ERRO: USE SOM ON OU SOM OFF."]);
    Flap.som(ligado);
    const b = $("#btnSom");
    if (b) { b.textContent = "SOM : " + (ligado ? "ON" : "OFF"); b.classList.toggle("on", ligado); }
    termPrint(["SOM DO TABULEIRO: " + (ligado ? "ON" : "OFF")], "sys");
  }

  function linhasVoos(titulo, lista) {
    const l = [
      titulo,
      pad("N", 4) + pad("VOO", 8) + pad("COMPANHIA", 12) + pad("DESTINO", 18) + pad("HORA", 7) + pad("PORT", 6) + "SITUACAO",
      "----------------------------------------------------------------------"
    ];
    lista.forEach((f, i) => {
      l.push(pad(i + 1, 4) + pad(f.no.replace(/\s/g, ""), 8) + pad(DATA.AIRLINES[f.al] || f.al, 12) + pad(celDestino(f, 18), 18) +
        pad(hhmm(f.ref), 7) + pad(f.cancelado ? "--" : gateDe(f), 6) + rotuloLista(f));
    });
    return l;
  }

  function termVoos(arg) {
    const base = termLista();
    if (!base) return termErro(["ERRO: ROTA NAO DEFINIDA PARA ESTA DATA.", "USE: ROTA <ORIGEM> <DESTINO>  EX.: ROTA GRU GIG", "DEPOIS: DATA AMANHA  E  VOOS"]);
    const lista = termFiltrar(base, arg);
    if (!lista.length) return termPrint(["NENHUM VOO ENCONTRADO PARA '" + arg.trim().toUpperCase() + "'."], "sys");
    const l = linhasVoos("VOOS DE PARTIDA - " + termTitulo("partidas"), lista);
    l.push("USE: RESERVAR <VOO> OU RESERVAR <NUMERO DA LINHA>");
    termPrint(l);
  }

  function termChegadas(arg) {
    const base = termListaChegadas();
    if (!base) return termErro(["ERRO: ROTA NAO DEFINIDA PARA ESTA DATA.", "USE: ROTA <ORIGEM> <DESTINO>  EX.: ROTA GRU GIG", "DEPOIS: DATA AMANHA  E  CHEGADAS"]);
    const lista = termFiltrar(base, arg);
    if (!lista.length) return termPrint(["NENHUMA CHEGADA ENCONTRADA PARA '" + arg.trim().toUpperCase() + "'."], "sys");
    const l = [
      "CHEGADAS - " + termTitulo("chegadas"),
      pad("N", 4) + pad("VOO", 8) + pad("COMPANHIA", 12) + pad("ORIGEM", 18) + pad("HORA", 7) + pad("PORT", 6) + "SITUACAO",
      "----------------------------------------------------------------------"
    ];
    lista.forEach((f, i) => {
      l.push(pad(i + 1, 4) + pad(f.no.replace(/\s/g, ""), 8) + pad(DATA.AIRLINES[f.al] || f.al, 12) + pad(celDestino(f, 18), 18) +
        pad(hhmm(f.ref), 7) + pad(f.cancelado ? "--" : gateDe(f), 6) + rotuloLista(f));
    });
    l.push("USE: SITUACAO <VOO> PARA VER OS DETALHES DO VOO.");
    termPrint(l);
  }

  function termReservar(arg) {
    const lista = termLista();
    if (!lista) return termErro(["ERRO: ROTA NAO DEFINIDA PARA ESTA DATA.", "USE: ROTA <ORIGEM> <DESTINO>  EX.: ROTA GRU GIG", "DEPOIS: DATA AMANHA  E  RESERVAR <VOO>"]);
    const achado = termAcharVoo(arg, lista);
    if (achado.erro) return termErro(achado.erro);
    if (achado.multi) return termPrint(achado.multi);
    const f = achado.voo;
    if (!podeReservar(f)) {
      return termErro([
        "ERRO: O VOO " + f.no.replace(/\s/g, "") + " ESTA COM SITUACAO " + statusDe(f) + ".",
        "APENAS VOOS COM SITUACAO PROGRAMADO PODERAO SER RESERVADOS.",
        "USE O COMANDO VOOS PARA VER A SITUACAO DE CADA VOO."
      ]);
    }
    if (lotado(f)) {
      return termErro([
        "ERRO: O VOO " + f.no.replace(/\s/g, "") + " ESTA LOTADO - NENHUMA POLTRONA LIVRE.",
        "ENTRE NA LISTA DE ESPERA: ESPERA " + f.no.replace(/\s/g, "") + "  (SE ALGUEM CANCELAR, VOCE RECEBE A VAGA AUTOMATICAMENTE)."
      ]);
    }
    T.rascunho.voo = f;
    T.rascunho.milhas = 0;
    T.rascunho.opc.milhas = false;
    T.guia = true;
    const ocVoo = ocupados(f);
    T.rascunho.paxs.forEach((p) => {
      if (p.assento && (!assentoValido(f, p.assento) || ocVoo.has(p.assento))) p.assento = null;
    });
    const lig = T.rascunho.paxs[0].nome ? linhaCartaoLigado(T.rascunho.paxs[0].nome) : null;
    termPrint([
      "VOO SELECIONADO: " + f.no.replace(/\s/g, ""),
      "  ROTA: " + rotaVoo(f) + "   " + f.cidade,
      "  ESCALA: " + escalaTxt(f),
      "  PARTIDA: " + hhmm(f.ref) + "   DURACAO: " + durTxt(f.dur) + "   AERONAVE: " + f.ac,
      "  PORTAO: " + (f.cancelado ? "--" : gateDe(f)) + "   SITUACAO: " + statusDe(f),
      "  TARIFA " + (T.rascunho.classe === "EXEC" ? "EXECUTIVA" : "ECONOMICA") + ": " + brl(precoTotal(f, T.rascunho.classe, T.rascunho.bags)),
      ...(lig ? ["  " + lig] : [])
    ], "sys");
  }

  function proxPasso() {
    const R = T.rascunho;
    if (!R.voo) return T.guia ? ["ESCOLHA DO VOO (SEGMENTO)", "RESERVAR <VOO>"] : null;
    const p = R.paxs[R.ativo];
    if (!p.nome) return ["NOME DO PASSAGEIRO ATIVO P" + (R.ativo + 1), "<NOME COMPLETO>"];
    if (!p.doc) return internacional(R.voo)
      ? ["PASSAPORTE DO PASSAGEIRO P" + (R.ativo + 1), "<NUMERO DO PASSAPORTE>"]
      : ["DOCUMENTO DO PASSAGEIRO P" + (R.ativo + 1), "<CPF>"];
    if (!R.email) return ["E-MAIL DE CONTATO", "<ENDERECO DE E-MAIL>"];
    if (!R.tel) return ["TELEFONE COM DDD", "<NUMERO COM DDD>"];
    const sem = R.paxs.findIndex((x) => !x.assento);
    if (sem >= 0) return ["ASSENTO DO PASSAGEIRO P" + (sem + 1), "<12A>  OU  ASSENTOLIVRE"];
    if (!R.opc.classe) return ["CLASSE DA PASSAGEM", "ECON OU EXEC"];
    if (!R.opc.malota) return ["MALOTAS DESPACHADAS", "0, 1 OU 2"];
    if (!R.opc.peso) return ["PESO DA BAGAGEM EM KG", "<KG>   FRANQUIA " + franquiaKg(R.classe) + " KG, EXCESSO R$ 6,00 POR KG"];
    if (!R.opc.milhas && cartaoAtivo()) {
      const al = R.voo.al;
      const max = milhasMaxUsar(al, brutoRascunho(R));
      return ["RESGATE DE MILHAS (OPCIONAL)",
        (max ? "ATE " + fmtMil(max) + " MILHAS = " + taxaTxt(milhasValor(max)) + "  ·  " : "") +
        "SALDO " + fmtMil(milhasSaldo(al)) + " MILHAS  ·  DIGITE 0 PARA NAO USAR"];
    }
    if (!R.opc.pag) return ["FORMA DE PAGAMENTO", "CARTAO, CARTAO DE MILHAS, PIX, BOLETO OU BALCAO" + (cartaoAtivo() ? "" : "   ·   ACUMULE MILHAS: CADASTRAR <NOME>")];
    return null;
  }

  function mostraProximo() {
    if (!T.guia) return;
    const s = proxPasso();
    if (!s) {
      termPrint(["", ">>> TUDO PREENCHIDO - DIGITE CONFIRMAR PARA EMITIR A RESERVA."], "hl");
      return;
    }
    termPrint(["", ">>> PROXIMO PASSO: " + s[0], "    DIGITE APENAS: " + s[1]], "sys");
  }

  function entradaPasso(valor) {
    const R = T.rascunho;
    if (!R.voo) return execCmd("RESERVAR", valor);
    const p = rPax();
    if (!p.nome) return execCmd("PASSAGEIRO", valor);
    if (!p.doc) return execCmd("DOC", valor);
    if (!R.email) return execCmd("EMAIL", valor);
    if (!R.tel) return execCmd("TELEFONE", valor);
    const sem = R.paxs.findIndex((x) => !x.assento);
    if (sem >= 0) {
      if (sem !== R.ativo) R.ativo = sem;
      return execCmd("ASSENTO", valor);
    }
    if (!R.opc.classe) return execCmd("CLASSE", valor);
    if (!R.opc.malota) return execCmd("MALOTA", valor);
    if (!R.opc.peso) return execCmd("PESO", valor);
    if (!R.opc.milhas && cartaoAtivo()) return execCmd("MILHAS", valor);
    if (!R.opc.pag) return execCmd("PAGAMENTO", valor);
  }

  function termCampo(chave, valor) {
    if (!valor.trim()) {
      if (chave === "nome") {
        termErro(["ERRO: INFORME O NOME. EX.: PASSAGEIRO MARIA SILVA", "PARA INCLUIR OUTRO PASSAGEIRO USE: ADICIONAR <NOME>"]);
      } else {
        termErro(["ERRO: INFORME O VALOR. EX.: " + chave.toUpperCase() + " ..."]);
      }
      return;
    }
    if (chave === "nome" && (valor.trim().length < 6 || valor.trim().indexOf(" ") < 0)) {
      termErro(["ERRO: INFORME NOME E SOBRENOME."]);
      return;
    }
    if (chave === "nome" || chave === "doc") {
      const p = rPax();
      const intl = chave === "doc" && internacional(T.rascunho.voo);
      if (intl && !passaporteOk(valor)) {
        termErro(["ERRO: VOO INTERNACIONAL EXIGE PASSAPORTE.", "DIGITE APENAS O NUMERO. EX.: AB123456"]);
        return;
      }
      p[chave] = valor.trim();
      const ok = ["OK: P" + (T.rascunho.ativo + 1) + " " + (intl ? "PASSAPORTE" : chave.toUpperCase()) + " = " + valor.trim().toUpperCase()];
      if (chave === "nome" && T.rascunho.ativo === 0) {
        const lig = linhaCartaoLigado(p.nome);
        if (lig) ok.push("  " + lig);
      }
      termPrint(ok, "sys");
      return;
    }
    T.rascunho[chave === "email" ? "email" : "tel"] = valor.trim();
    termPrint(["OK: " + chave.toUpperCase() + " = " + valor.trim().toUpperCase()], "sys");
  }

  function termAssentos() {
    const f = T.rascunho.voo;
    if (!f) { termErro(["ERRO: NENHUM VOO ESCOLHIDO.", "USE: RESERVAR <VOO>"]); return; }
    const L = layout(f.ac);
    const oc = ocupados(f);
    const meus = T.rascunho.paxs.map((p) => p.assento).filter(Boolean);
    meus.forEach((s) => oc.delete(s));
    const outros = new Set(meus.filter((s) => s !== rAssento()));
    const l = [
      "MAPA DE ASSENTOS - VOO " + f.no.replace(/\s/g, "") + " (" + f.ac + ")",
      "  . = LIVRE    # = OCUPADO    @ = P" + (T.rascunho.ativo + 1) + "    + = OUTROS DA RESERVA",
      "     " + L.grupos.map((g) => g.join(" ")).join("   ")
    ];
    for (let r = 1; r <= L.linhas; r++) {
      let linha = "  " + String(r).padStart(2, "0") + "   ";
      L.grupos.forEach((g, gi) => {
        g.forEach((c) => {
          const id = r + c;
          let ch = oc.has(id) ? "#" : ".";
          if (outros.has(id)) ch = "+";
          if (rAssento() === id) ch = "@";
          linha += ch + " ";
        });
        if (gi < L.grupos.length - 1) linha += "  ";
      });
      l.push(linha);
    }
    l.push("USE: ASSENTO <NUMERO><LETRA>  EX.: ASSENTO 12A");
    termPrint(l);
  }

  function termAssento(arg) {
    const f = T.rascunho.voo;
    const s = arg.toUpperCase().replace(/\s+/g, "");
    if (!f) { termErro(["ERRO: NENHUM VOO ESCOLHIDO.", "USE: RESERVAR <VOO>"]); return; }
    if (!s) { termErro(["ERRO: INFORME A POLTRONA. EX.: ASSENTO 12A", "USE O COMANDO ASSENTOS PARA VER O MAPA."]); return; }
    if (!assentoValido(f, s)) { termErro(["ERRO: ASSENTO '" + s + "' INVALIDO PARA ESTA AERONAVE.", "USE O COMANDO ASSENTOS PARA VER O MAPA."]); return; }
    if (ocupados(f).has(s)) { termErro(["ERRO: ASSENTO " + s + " JA ESTA OCUPADO.", "USE O COMANDO ASSENTOS."]); return; }
    const dup = T.rascunho.paxs.findIndex((p, i) => i !== T.rascunho.ativo && p.assento === s);
    if (dup >= 0) { termErro(["ERRO: ASSENTO " + s + " JA RESERVADO PARA P" + (dup + 1) + ".", "USE O COMANDO PASSAGEIROS PARA VER."]); return; }
    rPax().assento = s;
    termPrint(["OK: ASSENTO " + s + " CONFIRMADO PARA P" + (T.rascunho.ativo + 1) + " NO VOO " + f.no.replace(/\s/g, "")], "sys");
  }

  function termPassageiros(arg) {
    const R = T.rascunho;
    const f = String(arg || "").trim().toUpperCase();
    const l = [pad("N", 4) + pad("SIT", 5) + pad("DOCUMENTO", 14) + pad("ASSENTO", 9) + "NOME"];
    let achou = 0;
    R.paxs.forEach((p, i) => {
      if (f && (p.nome || "").toUpperCase().indexOf(f) < 0) return;
      achou++;
      l.push(pad(i + 1, 4) + pad(i === R.ativo ? "<-" : "", 5) + pad(p.doc || "---", 14) + pad(p.assento || "---", 9) + (p.nome || "(SEM NOME)"));
    });
    l.push("TOTAL: " + R.paxs.length + " DE " + MAX_PAX + " PASSAGEIROS   USE: ATIVO <N> PARA EDITAR.");
    if (f) l.push("FILTRO '" + f + "': " + achou + " PASSAGEIRO(S) ENCONTRADO(S).");
    termPrint(l, "sys");
  }

  function termAdicionar(nome) {
    const R = T.rascunho;
    if (R.paxs.length >= MAX_PAX) { termErro(["ERRO: LIMITE DE " + MAX_PAX + " PASSAGEIROS POR RESERVA."]); return; }
    R.paxs.push({ nome: "", doc: "", assento: null });
    R.ativo = R.paxs.length - 1;
    if (nome && nome.trim()) {
      if (nome.trim().length < 6 || nome.trim().indexOf(" ") < 0) {
        R.paxs.pop();
        R.ativo = R.paxs.length - 1;
        termErro(["ERRO: INFORME NOME E SOBRENOME."]);
        return;
      }
      rPax().nome = nome.trim();
      termPrint(["OK: P" + (R.ativo + 1) + " INCLUIDO = " + nome.trim().toUpperCase() + " (AGORA EM EDICAO)"], "sys");
      return;
    }
    termPrint(["OK: PASSAGEIRO P" + (R.ativo + 1) + " INCLUIDO E SELECIONADO.", "USE: PASSAGEIRO <NOME>"], "sys");
  }

  function termRemover(arg) {
    const R = T.rascunho;
    const n = Number(String(arg).replace(/\D/g, ""));
    if (!n) { termErro(["ERRO: USE REMOVER <N>. EX.: REMOVER 2", "USE O COMANDO PASSAGEIROS PARA VER A LISTA."]); return; }
    if (n < 1 || n > R.paxs.length) { termErro(["ERRO: PASSAGEIRO " + n + " NAO EXISTE NA RESERVA."]); return; }
    if (R.paxs.length === 1) { termErro(["ERRO: A RESERVA PRECISA DE PELO MENOS 1 PASSAGEIRO."]); return; }
    const removido = R.paxs.splice(n - 1, 1)[0];
    if (R.ativo >= R.paxs.length) R.ativo = R.paxs.length - 1;
    termPrint(["OK: P" + n + " " + (removido.nome || "SEM NOME") + " REMOVIDO.", "PASSAGEIROS RESTANTES: " + R.paxs.length], "sys");
  }

  function termAtivo(arg) {
    const R = T.rascunho;
    const n = Number(String(arg).replace(/\D/g, ""));
    if (!n || n < 1 || n > R.paxs.length) {
      termErro(["ERRO: USE ATIVO <N> ENTRE 1 E " + R.paxs.length + ".", "USE O COMANDO PASSAGEIROS PARA VER A LISTA."]);
      return;
    }
    R.ativo = n - 1;
    const p = rPax();
    termPrint(["OK: EDITANDO P" + n + (p.nome ? " = " + p.nome.toUpperCase() : "")], "sys");
  }

  function faltasRascunho() {
    const R = T.rascunho;
    const intl = internacional(R.voo);
    const f = [];
    if (!R.voo) f.push("VOO");
    R.paxs.forEach((p, i) => {
      if (p.nome.trim().length < 6 || p.nome.trim().indexOf(" ") < 0) f.push("PASSAGEIRO P" + (i + 1));
      const docOk = intl ? passaporteOk(p.doc) : p.doc.replace(/\D/g, "").length >= 6;
      if (!docOk) f.push((intl ? "PASSAPORTE P" : "DOC P") + (i + 1));
      if (!p.assento) f.push("ASSENTO P" + (i + 1));
    });
    return f;
  }

  function termStatus() {
    const R = T.rascunho;
    const taxa = taxaPeso(R.paxs, R.classe);
    const c = cartaoAtivo();
    const rot = internacional(R.voo) ? "PASSAPORTE" : "DOC";
    const l = [
      "RASCUNHO DO ATENDIMENTO",
      "  ROTA ALVO: " + (T.rota ? T.rota.origem + " > " + T.rota.destino : "NAO DEFINIDA (GRU)") +
        "   DATA ALVO: " + (T.dia ? DATA.dataLonga(T.dia) + " " + DATA.dataSemana(T.dia) : "HOJE"),
      "  VOO: " + (R.voo ? R.voo.no.replace(/\s/g, "") + "  " + rotaVoo(R.voo) + "  " + (R.voo.data || dataHoje()) + " " + hhmm(R.voo.ref) + "  PORT " + (R.voo.cancelado ? "--" : gateDe(R.voo)) : "---"),
      "  EMAIL: " + (R.email || "---") + "   TELEFONE: " + (R.tel || "---"),
      ...((R.rf || R.tk) ? ["  RF: " + (R.rf || "---") + "   TKTL: " + (R.tk || "---")] : []),
      "  CLASSE: " + (R.classe === "EXEC" ? "EXECUTIVA" : "ECONOMICA") + "   MALOTAS POR PASSAGEIRO: " + R.bags,
      "  BAGAGEM: " + pesoTotal(R.paxs) + " KG   FRANQUIA: " + (franquiaKg(R.classe) * R.paxs.length) + " KG   TAXA DE PESO: " + brl(taxa),
      "  PAGAMENTO: " + (R.pag === "BALCAO" ? "NO BALCAO (NA RETIRADA)" : R.pag),
      "  CARTAO MILHAS: " + (c ? c.num + " (" + c.nome + ")" : "--- (USE CADASTRAR <NOME>)"),
      "  PASSAGEIROS (" + R.paxs.length + "):"
    ];
    R.paxs.forEach((p, i) => {
      l.push("   P" + (i + 1) + (i === R.ativo ? " <" : "  ") + " " + pad((p.nome || "(SEM NOME)").toUpperCase(), 28) +
        " " + rot + " " + pad(p.doc || "---", 14) + " ASSENTO " + (p.assento || "---") + "   BAG " + (p.peso || 0) + " KG");
    });
    if (R.voo) l.push("  VALOR TOTAL: " + brl(Math.round(brutoRascunho(R) - milhasValor(R.milhas || 0))) + (R.milhas ? "   (COM RESGATE DE " + fmtMil(R.milhas) + " MILHAS)" : ""));
    const f = faltasRascunho();
    l.push(f.length ? "  FALTA INFORMAR: " + f.join(" / ") : "  PRONTO PARA CONFIRMAR.");
    termPrint(l, f.length ? "sys" : "hl");
  }

  function termConfirmar() {
    const R = T.rascunho;
    const f = faltasRascunho();
    if (f.length) {
      termErro(["ERRO: DADOS INCOMPLETOS.", "  FALTA: " + f.join(" / "), "  CORRIJA E TENTE NOVAMENTE."]);
      return;
    }
    if (R.pag === "BALCAO" && !mesmoDia(R.voo)) {
      termErro(["ERRO: PAGAMENTO NO BALCAO SOMENTE PARA VOOS DE HOJE.", "USE: PAGAMENTO CARTAO | CARTAO DE MILHAS | PIX | BOLETO"]);
      return;
    }
    if (!podeReservar(R.voo)) {
      termErro([
        "ERRO: O VOO " + R.voo.no.replace(/\s/g, "") + " NAO ESTA MAIS COM SITUACAO PROGRAMADO.",
        "SITUACAO ATUAL: " + statusDe(R.voo) + ".",
        "USE RESERVAR <VOO> PARA ESCOLHER OUTRO VOO PROGRAMADO."
      ]);
      return;
    }
    const taxa = taxaPeso(R.paxs, R.classe);
    const kg = pesoTotal(R.paxs);
    const r = emitirReserva(R.voo, R.paxs, R.email, R.tel, R.classe, R.bags, R.pag, R.milhas || 0);
    const total = R.paxs.length;
    const pagTxt = r.pag === "BALCAO" ? "PAGAMENTO NO BALCAO" : r.pag;
    T.guia = false;
    T.rascunho = novoRascunho();
    termPrint([
      "RESERVA CONFIRMADA COM SUCESSO",
      "----------------------------------------",
      " PNR: " + r.pnr,
      " PASSAGEIROS: " + total,
      " VOO: " + r.voo.no.replace(/\s/g, "") + "  " + rotaVoo(r.voo) + "  " + (r.voo.data || dataHoje()) + " " + hhmm(r.voo.ref) + "  PORTAO " + (r.voo.cancelado ? "--" : gateDe(r.voo)),
      " CLASSE: " + r.classe + "   MALOTAS: " + r.bags,
      ...(kg ? [" BAGAGEM: " + kg + " KG   TAXA DE PESO: " + brl(taxa)] : []),
      " VALOR TOTAL: " + brl(r.preco) + "  PAGAMENTO: " + pagTxt,
      ...(r.milhas.usadas ? [" MILHAS RESGATAS: " + fmtMil(r.milhas.usadas) + " = -" + taxaTxt(r.milhas.desconto)] : []),
      ...(r.cartao ? [
        " CARTAO MILHAS: " + r.cartao + " (" + r.pax.nome.toUpperCase() + ")",
        " MILHAS GANHAS: +" + fmtMil(r.milhas.ganhas) + " NA " + DATA.AIRLINES[r.voo.al] + " · SALDO: " + fmtMil(milhasSaldo(r.voo.al)) + " MILHAS"
      ] : [" MILHAS: CLIENTE SEM CARTAO - NAO ACUMULADAS"]),
      "----------------------------------------"
    ].concat(paxList(r).map((p, i) =>
      "  P" + (i + 1) + "  " + pad(p.nome.toUpperCase(), 28) + " " + (internacional(r.voo) ? "PASSAPORTE" : "DOC") + " " + pad(p.doc, 14) + " ASSENTO " + p.assento
    ), [
      "----------------------------------------",
      " BILHETE: ABA BILHETES   CHECK-IN: ABA CHECK-IN",
      " NOVO ATENDIMENTO INICIADO."
    ]), "hl");
  }

  function termConsultar(pnr) {
    const r = achar(pnr);
    if (!r) { termErro(["ERRO: RESERVA '" + pnr.toUpperCase() + "' NAO LOCALIZADA."]); return; }
    const ps = paxList(r);
    const l = [
      "RESERVA " + r.pnr + "  [" + r.status + "]   PASSAGEIROS: " + ps.length
    ].concat(ps.map((p, i) =>
      "  P" + (i + 1) + "  " + pad(p.nome.toUpperCase(), 28) + " " + (internacional(r.voo) ? "PASSAPORTE" : "DOC") + " " + pad(p.doc, 14) + " ASSENTO " + p.assento
    ), [
      "  VOO: " + r.voo.no.replace(/\s/g, "") + "  " + rotaVoo(r.voo) + "  " + (r.voo.data || dataHoje()) + " " + hhmm(r.voo.ref) + "  PORTAO " + (r.voo.cancelado ? "--" : gateDe(r.voo)),
      "  CLASSE: " + r.classe + "   VALOR TOTAL: " + brl(r.preco)
    ]);
    if (r.peso || r.taxaPeso) l.push("  BAGAGEM: " + (r.peso || 0) + " KG   TAXA DE PESO: " + brl(r.taxaPeso || 0));
    l.push("  PAGAMENTO: " + (r.pag === "BALCAO" ? "NO BALCAO (NA RETIRADA)" : r.pag || "CARTAO"));
    l.push("  EMISSAO: " + new Date(r.criado).toLocaleString("pt-BR"));
    termPrint(l, r.status === "CANCELADA" ? "bad" : "sys");
  }

  function termCheckin(pnr) {
    const r = achar(pnr);
    if (!r) { termErro(["ERRO: RESERVA '" + pnr.toUpperCase() + "' NAO LOCALIZADA."]); return; }
    if (r.status === "CANCELADA") { termErro(["ERRO: RESERVA CANCELADA. NAO E POSSIVEL CHECK-IN."]); return; }
    if (r.status === "CHECK-IN") { termPrint(["CHECK-IN JA REALIZADO PARA O PNR " + r.pnr + ".", "  PORTAO " + gateDe(r.voo) + "  EMBARQUE " + hhmm(r.voo.ref - 40)], "sys"); return; }
    r.status = "CHECK-IN";
    salvar();
    atualizarBadge();
    renderBilhetes();
    const ps = paxList(r);
    const extra = (r.peso || r.bags)
      ? ["  BAGAGEM: " + (r.bags || 0) + " MALOTA(S)" + (r.peso ? "   " + r.peso + " KG   TAXA DE PESO: " + brl(r.taxaPeso || 0) : "")]
      : [];
    termPrint([
      "CHECK-IN CONCLUIDO - PNR " + r.pnr + "   PASSAGEIROS: " + ps.length
    ].concat(ps.map((p, i) =>
      "  P" + (i + 1) + "  " + pad(p.nome.toUpperCase(), 28) + " ASSENTO " + p.assento
    ), extra, [
      "  PORTAO: " + gateDe(r.voo) + "   EMBARQUE: " + hhmm(r.voo.ref - 40) + "   PARTIDA: " + hhmm(r.voo.ref),
      "  APRESENTE-SE NO PORTAO COM ANTECEDENCIA."
    ]), "hl");
  }

  function termCancelar(pnr) {
    const r = achar(pnr);
    if (!r) { termErro(["ERRO: RESERVA '" + pnr.toUpperCase() + "' NAO LOCALIZADA."]); return; }
    if (r.status === "CANCELADA") { termPrint(["RESERVA " + r.pnr + " JA ESTAVA CANCELADA."], "sys"); return; }
    r.status = "CANCELADA";
    salvar();
    atualizarBadge();
    renderBilhetes();
    termPrint(["RESERVA " + r.pnr + " CANCELADA.", "  VALOR DE " + brl(r.preco) + " SERA ESTORNADO EM ATÉ 5 DIAS UTEIS."], "bad");
  }

  function termBilhetes() {
    if (!reservas.length) { termPrint(["NENHUMA RESERVA EMITIDA."], "sys"); return; }
    const l = [pad("PNR", 7) + pad("STATUS", 14) + pad("VOO", 8) + pad("DESTINO", 16) + pad("HORA", 7) + pad("ASSENTO", 8) + "PASSAGEIRO"];
    reservas.slice().sort((a, b) => b.criado - a.criado).forEach((r) => {
      const ps = paxList(r);
      const assentos = ps.map((p) => p.assento).join(" ");
      l.push(pad(r.pnr, 7) + pad(r.status, 14) + pad(r.voo.no.replace(/\s/g, ""), 8) + pad(r.voo.destino, 16) +
        pad(hhmm(r.voo.ref), 7) + pad(assentos, 8) +
        (ps.length > 1 ? ps.length + "X " : "") + ps[0].nome.toUpperCase());
    });
    termPrint(l);
  }

  function termAoVivo() {
    termPrint(["CONSULTANDO TRAFEGO AO VIVO PROXIMO AO GRU ..."], "sys");
    LIVE.pegar(function (lista, modo) {
      if (!lista || !lista.length) {
        return termPrint(["SEM CONEXAO COM A REDE ADS-B NO MOMENTO.", "ABRA A TELA AO VIVO PARA VER O SNAPSHOT LOCAL."], "bad");
      }
      const l = [
        "TRAFEGO AO VIVO - RAIO 150 NM DE GRU - " + lista.length + " AERONAVES",
        "VOO      EMPRESA         REGISTRO   ALTITUDE  VEL  DIST",
        "---------------------------------------------------------"
      ];
      lista.slice(0, 12).forEach((f) => {
        l.push(
          pad(f.cs || f.hex || "-", 8) + " " +
          pad(LIVE.empresa(f.cs), 14) + " " +
          pad(f.reg || "-", 10) + " " +
          pad(f.gnd ? "NO CHAO" : String(f.alt), 8) + " " +
          pad(String(f.vel), 4) + " " +
          pad(f.d.toFixed(1) + " KM", 6)
        );
      });
      l.push(modo === "ao-vivo"
        ? "FONTE: ADSB.LOL EM TEMPO REAL"
        : "FONTE: SNAPSHOT LOCAL (SEM CONEXAO)");
      termPrint(l, "sys");
    });
  }

  function termExec(raw) {
    const cmd = raw.trim();
    termPrint(["Read> " + cmd]);
    if (!cmd) return;
    T.hist.push(cmd);
    T.hi = T.hist.length;
    const partes = cmd.split(/\s+/);
    let C = partes[0].toUpperCase();
    let arg = partes.slice(1).join(" ");
    const cu = cmd.toUpperCase();
    const al = ALIAS_TERM.find((x) => cu.indexOf(x[0]) === 0 && (!x[2] || cu.length === x[0].length || cu[x[0].length] === " "));
    if (al) { C = al[1]; arg = cu.slice(al[0].length).trim(); }
    if (C === "NM" || /^NM\d/.test(cu)) { C = "NM"; arg = cu.slice(2).trim(); }
    else if (C === "TK" || /^TKTL/.test(cu)) { C = "TK"; arg = cu.slice(2).replace(/^TL/, "").trim(); }
    else if (C === "AP" || /^AP\d/.test(cu) || /^APE-/.test(cu)) {
      const r2 = (C === "AP" ? arg : cu.slice(2)).trim();
      if (/^E-/.test(r2)) { C = "EMAIL"; arg = r2.slice(2).trim(); }
      else { C = "TELEFONE"; arg = r2; }
    }
    else if (C === "SS" || /^SS\d/.test(cu)) { C = "SS"; arg = cu.slice(2).trim(); }
    else if (C === "RT" || /^RT\//.test(cu)) { C = "RT"; arg = cu.slice(2).replace(/^\//, "").trim(); }
    else if (C === "XE" || /^XE\d/.test(cu)) { C = "XE"; arg = cu.slice(2).trim(); }
    else if (C === "XI") { C = "XI"; arg = ""; }
    else if (C === "AN" || /^AN\d{2}[A-Z]{3}/.test(cu)) { C = "AN"; arg = cu.slice(2).trim(); }
    if (T.guia) {
      const s = proxPasso();
      const pg = s && s[1].indexOf("PAGAMENTO") === 0 && PAG_VALORES.indexOf(C) >= 0;
      if (s && (!CMD_SET.has(C) || pg)) {
        entradaPasso(cmd);
        mostraProximo();
        return;
      }
    }
    execCmd(C, arg);
    if (T.guia && GUIA_CMDS.indexOf(C) >= 0) mostraProximo();
  }

  function execCmd(C, arg) {
    switch (C) {
      case "AJUDA": case "HELP": case "?": return termAjuda();
      case "VOOS": return termVoos(arg);
      case "LM": return termMilhasCliente(arg);
      case "LISTAR": {
        if (arg.toUpperCase().trim().split(/\s+/)[0] === "MILHAS") return milhasListagem();
        return termVoos(arg);
      }
      case "CHEGADAS": case "ARRIVALS": return termChegadas(arg);
      case "ROTA": case "ROUTE": return termRota(arg);
      case "RES": return termRes(arg);
      case "TO": case "FROM": case "DE": case "PARA": return termTo(C, arg);
      case "DATA": case "DIA": return termData(arg);
      case "SITUACAO": case "INFO": return termSituacao(arg);
      case "ALTERAR": return termAlterar(arg);
      case "ESPERA": return termEspera(arg);
      case "AOVIVO": case "LIVE": case "TRAFEGO": return termAoVivo();
      case "TARIFA": case "TARIFAS": return termTarifa(arg);
      case "VALOR": case "PRECO": return termValor();
      case "MILHAS": return termMilhas(arg);
      case "ABATER": return termAbaterMilhas(arg);
      case "CARTAO": if (/MILHAS/.test(String(arg).toUpperCase())) return execCmd("PAGAMENTO", "CARTAO DE MILHAS"); return termCartao(arg);
      case "ACM": return termAtivarCartao(arg);
      case "CADASTRAR": return termCadastrar(arg);
      case "ASSENTOLIVRE": case "SEATLIVRE": case "AUTOSEAT": return termAssentoLivre();
      case "NOVO": case "INICIO": case "ZERAR": return termNovo();
      case "SOM": return termSom(arg);
      case "RESERVAR": return termReservar(arg);
      case "PASSAGEIRO": return termCampo("nome", arg);
      case "PASSAGEIROS": case "LISTAPAX": return termPassageiros(arg);
      case "ADICIONAR": case "NOVOPAX": {
        const a = arg.toUpperCase().trim();
        if (a === "MILHAS" || a.indexOf("MILHAS ") === 0) return termAdicionarMilhas(a.replace(/^MILHAS\s*/, ""));
        return termAdicionar(arg);
      }
      case "REMOVER": case "EXCLUIR": return termRemover(arg);
      case "ATIVO": case "TROCAR": return termAtivo(arg);
      case "DOC": return termCampo("doc", arg);
      case "EMAIL": return termCampo("email", arg);
      case "TELEFONE": case "FONE": return termCampo("tel", arg);
      case "CLASSE": {
        const c = arg.toUpperCase().replace(/\s+/g, "");
        if (c === "EXEC" || c === "EXECUTIVA" || c === "2") T.rascunho.classe = "EXEC";
        else if (c === "ECON" || c === "ECONOMICA" || c === "1" || !c) T.rascunho.classe = "ECON";
        else return termErro(["ERRO: USE CLASSE ECON OU CLASSE EXEC."]);
        T.rascunho.opc.classe = true;
        const v = T.rascunho.voo;
        return termPrint(["OK: CLASSE = " + (T.rascunho.classe === "EXEC" ? "EXECUTIVA" : "ECONOMICA") +
          (v ? "   TARIFA: " + brl(precoTotal(v, T.rascunho.classe, T.rascunho.bags)) : "")], "sys");
      }
      case "PAGAMENTO": case "PAG": {
        const p = arg.toUpperCase().replace(/\s+/g, "");
        if (!p) return termPrint(["FORMA ATUAL: " + T.rascunho.pag + "   USE: PAGAMENTO CARTAO | CARTAO DE MILHAS | PIX | BOLETO | BALCAO"], "sys");
        const mapa = { CARTAO: "CARTAO", CREDITO: "CARTAO", DEBITO: "CARTAO", CAR: "CARTAO", CARTAODEMILHAS: "CARTAO DE MILHAS", CARTAOMILHAS: "CARTAO DE MILHAS", PIX: "PIX", BOLETO: "BOLETO", BALCAO: "BALCAO", BALC: "BALCAO" };
        const v = mapa[p];
        if (!v) return termErro(["ERRO: FORMA DESCONHECIDA. USE CARTAO, CARTAO DE MILHAS, PIX, BOLETO OU BALCAO."]);
        if (v === "BALCAO" && T.rascunho.voo && !mesmoDia(T.rascunho.voo)) {
          return termErro(["ERRO: PAGAMENTO NO BALCAO SOMENTE PARA VOOS DE HOJE.", "ESCOLHA OUTRA FORMA DE PAGAMENTO."]);
        }
        if (v === "CARTAO DE MILHAS") {
          const c = cartaoAtivo();
          if (!c) return termErro(semCartaoErro());
          const al = T.rascunho.voo ? T.rascunho.voo.al : null;
          if (al && milhasSaldo(al) <= 0) {
            return termErro(["ERRO: SALDO INSUFICIENTE DE MILHAS NA " + DATA.AIRLINES[al] + " (0 MILHAS).", "USE OUTRA FORMA DE PAGAMENTO OU ADICIONAR MILHAS <E> <N>."]);
          }
          T.rascunho.pag = v;
          T.rascunho.opc.pag = true;
          if (al) {
            const max = milhasMaxUsar(al, brutoRascunho(T.rascunho));
            T.rascunho.milhas = max;
            T.rascunho.opc.milhas = true;
            return termPrint([
              "OK: PAGAMENTO = CARTAO DE MILHAS",
              "  RESGATE AUTOMATICO: " + fmtMil(max) + " MILHAS = -" + taxaTxt(milhasValor(max)),
              "  CARTAO " + c.num + " · SALDO " + DATA.AIRLINES[al] + ": " + fmtMil(milhasSaldo(al)) + " MILHAS (DEBITADO NA CONFIRMAR)"
            ], "sys");
          }
          return termPrint(["OK: PAGAMENTO = CARTAO DE MILHAS", "  CARTAO " + c.num + " · RESGATE APLICADO A PASSAGEM"], "sys");
        }
        T.rascunho.pag = v;
        T.rascunho.opc.pag = true;
        return termPrint(["OK: PAGAMENTO = " + (v === "BALCAO" ? "PAGAMENTO NO BALCAO (RETIRADA)" : v)], "sys");
      }
      case "ASSENTOS": case "MAPA": return termAssentos();
      case "ASSENTO": case "POLTRONA": return termAssento(arg);
      case "MALOTA": case "MALOTAS": case "BAGAGEM": {
        const b = Number(arg.replace(/\D/g, ""));
        if (!(b >= 0 && b <= 2)) {
          if (b > 2) return termErro(["ERRO: MALOTA ACEITA DE 0 A 2.", "PARA PESO EM KG USE: PESO <KG>. EX.: PESO 18"]);
          return termErro(["ERRO: USE MALOTA 0, MALOTA 1 OU MALOTA 2."]);
        }
        T.rascunho.bags = b;
        T.rascunho.opc.malota = true;
        return termPrint(["OK: MALOTAS DESPACHADAS = " + b], "sys");
      }
      case "PESO": return termPeso(arg);
      case "STATUS": case "RASCUNHO": return termStatus();
      case "*R": return termExibirPnr();
      case "*I": return termItinerario();
      case "X2": return termCancelarSegmento();
      case "ER": return termConfirmar();
      case "AN": return termAn(arg);
      case "NM": return termNomeGds(arg);
      case "RF": return termRecebidoPor(arg);
      case "TK": return termTktl(arg);
      case "SS": return termSell(arg);
      case "RT": return arg ? termConsultar(arg) : termExibirPnr();
      case "XE": return termXe(arg);
      case "XI": return termXi();
      case ".CE": return termCodificarCidade(arg);
      case ".CD": return termDecodificar(arg);
      case ".AE": return termCompanhias();
      case "SOF": return termSof();
      case "CONFIRMAR": case "EMITIR": return termConfirmar();
      case "CONSULTAR": case "LOCALIZAR": case "PNR": return termConsultar(arg);
      case "CHECKIN": case "CHECK-IN": return termCheckin(arg);
      case "CANCELAR": return termCancelar(arg);
      case "BILHETES": case "RESERVAS": return termBilhetes();
      case "LIMPAR": case "CLEAR": T.pausado = false; termPausaUI(); termEl().textContent = ""; T.fila = []; T.imprimindo = false; if (T.iv) { clearInterval(T.iv); T.iv = null; } return;
      default: return termErro(["COMANDO DESCONHECIDO: " + C + " - DIGITE AJUDA PARA VER A LISTA."]);
    }
  }

  function termBoot() {
    if (T.boot) return;
    T.boot = true;
    termPrint([
      "VOOU ATENDIMENTO - TERMINAL 1 / BALCAO DAS EMPRESAS",
      "VOOU RM RUNTIME v2.4   (C) 1998 VOOU TURISMO E TRANSPORTES S/A",
      "",
      "TESTE DE MEMORIA ....... 640K OK",
      "CONECTANDO AO HOST GRU . OK",
      "CARREGANDO TARIFAS ..... OK",
      "BASE DE VOOS ........... " + DATA.departures.length + " PARTIDAS / " + DATA.arrivals.length + " CHEGADAS",
      "",
      "DIGITE AJUDA PARA VER OS COMANDOS DO TERMINAL."
    ], "sys");
  }

  function initTerminal() {
    const inp = $("#term-in");
    const echo = $("#term-echo");
    const eco = () => { echo.textContent = inp.value.toUpperCase(); };
    inp.addEventListener("input", eco);
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const v = inp.value;
        inp.value = "";
        eco();
        termExec(v);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (T.hi > 0) { T.hi--; inp.value = T.hist[T.hi] || ""; eco(); }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (T.hi < T.hist.length) { T.hi++; inp.value = T.hist[T.hi] || ""; eco(); }
      } else if (e.key === "Tab") {
        e.preventDefault();
        const v = inp.value.toUpperCase().replace(/\s+/g, "");
        const m = v ? COMANDOS.find((c) => c.indexOf(v) === 0) : null;
        if (m) { inp.value = m + " "; eco(); }
      } else if (e.key === " " && !inp.value) {
        e.preventDefault();
        alternarPausa();
      }
    });
    $("#term").addEventListener("click", () => inp.focus());
    $("#term-out").addEventListener("click", () => inp.focus());
    $("#term").addEventListener("keydown", (e) => {
      if (e.ctrlKey && !e.shiftKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        inp.value = "";
        eco();
        termCtrlC();
      }
    });
  }

  function iniciar() {
    renderCabecalhos();
    montarRotaSelects("partidas");
    montarRotaSelects("chegadas");
    renderBoard("partidas");
    renderBoard("chegadas");
    renderWizard();
    renderBilhetes();
    atualizarBadge();
    montarTicker();
    relogio();
    setInterval(relogio, 1000);

    $$(".tab").forEach((t) => t.addEventListener("click", () => irPara(t.dataset.tab)));

    $("#btnSom").addEventListener("click", () => {
      const ligado = !Flap.ehLigado();
      Flap.som(ligado);
      $("#btnSom").textContent = "SOM : " + (ligado ? "ON" : "OFF");
      $("#btnSom").classList.toggle("on", ligado);
    });

    ["partidas", "chegadas"].forEach((tipo) => {
      const inp = $("#filtro-" + tipo);
      let t = null;
      inp.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => { filtro[tipo] = inp.value; renderBoard(tipo); }, 220);
      });
      const ori = $("#rota-ori-" + tipo);
      const des = $("#rota-des-" + tipo);
      if (ori) ori.addEventListener("change", () => trocarRota(tipo, "origem", ori.value));
      if (des) des.addEventListener("change", () => trocarRota(tipo, "destino", des.value));
      $("#" + "board-" + tipo).addEventListener("click", cliqueRow);
    });

    $("#form-checkin").addEventListener("submit", (e) => {
      e.preventDefault();
      renderCheckinResultado($("#ci-pnr").value);
    });

    $("#lista-bilhetes").addEventListener("click", clicarBilhetes);

    initTerminal();
    montarTermCmds();

    const barraVivo = $("#vivo-bar");
    if (barraVivo) barraVivo.addEventListener("click", () => irPara("aovivo"));
    $$(".vivo-int").forEach((el) => el.addEventListener("click", () => irPara("aovivo")));
    LIVE.iniciar();

    setInterval(() => {
      renderBoard("partidas");
      renderBoard("chegadas");
      const w = $("#wizard");
      if (W.step === 1 && w && !w.contains(document.activeElement)) renderWizard();
    }, 5000);
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
