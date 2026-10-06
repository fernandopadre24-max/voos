var LIVE = (function () {
  "use strict";
  var GRU = { lat: -23.4421, lon: -46.4721 };
  var ADSB = "https://api.adsb.lol/v2/point/-23.4421/-46.4721/150";
  var SKY = "https://opensky-network.org/api/states/all?lamin=-25.5&lomin=-48.5&lamax=-21.5&lomax=-44.5";
  var INTERVALO = 20000;
  var SNAPSHOT_TS = "2026-10-02 18:07:53";
  var SNAPSHOT = [{"c":"TAM3210","r":"PR-MYK","a":3550,"v":240,"h":38,"g":0,"la":-23.395,"lo":-46.416,"d":7.7},{"c":"AZU2886","r":"PR-YSA","a":21375,"v":428,"h":120,"g":0,"la":-23.524,"lo":-46.557,"d":12.6},{"c":"TAM3401","r":"PR-XBP","a":10375,"v":300,"h":192,"g":0,"la":-23.503,"lo":-46.258,"d":22.8},{"c":"PTFRV","r":"","a":2675,"v":99,"h":324,"g":0,"la":-23.517,"lo":-46.69,"d":23.7},{"c":"AZU6025","r":"PS-AEJ","a":3150,"v":128,"h":148,"g":0,"la":-23.59,"lo":-46.682,"d":26.9},{"c":"TAM3088","r":"PR-MHX","a":0,"v":3,"h":329,"g":1,"la":-23.622,"lo":-46.661,"d":27.7},{"c":"TAM3914","r":"PR-MBN","a":0,"v":1,"h":329,"g":1,"la":-23.621,"lo":-46.661,"d":27.7},{"c":"AZU5070","r":"PS-AEQ","a":2450,"v":122,"h":147,"g":0,"la":-23.628,"lo":-46.656,"d":27.8},{"c":"TAM3143","r":"PR-TYQ","a":0,"v":15,"h":326,"g":1,"la":-23.631,"lo":-46.655,"d":28},{"c":"PSUDS","r":"PS-UDS","a":4625,"v":152,"h":82,"g":0,"la":-23.516,"lo":-46.74,"d":28.5},{"c":"PSBNZ","r":"PS-BNZ","a":3275,"v":0,"h":0,"g":0,"la":-23.259,"lo":-46.704,"d":31.1},{"c":"GLO1540","r":"PR-XMD","a":16175,"v":371,"h":54,"g":0,"la":-23.561,"lo":-46.19,"d":31.6},{"c":"TAM3529","r":"PS-LBH","a":12425,"v":341,"h":314,"g":0,"la":-23.142,"lo":-46.326,"d":36.5},{"c":"ACN5991","r":"PS-CNH","a":9000,"v":171,"h":67,"g":0,"la":-23.136,"lo":-46.657,"d":38.8},{"c":"GLO1180","r":"PR-GXU","a":22100,"v":362,"h":240,"g":0,"la":-23.684,"lo":-46.751,"d":39},{"c":"LPE2415","r":"CC-BLG","a":36000,"v":390,"h":261,"g":0,"la":-23.869,"lo":-46.393,"d":48.1},{"c":"AZU4176","r":"PS-ADL","a":29100,"v":351,"h":253,"g":0,"la":-23.343,"lo":-45.972,"d":52.1},{"c":"GLO1637","r":"PS-GPI","a":10200,"v":312,"h":134,"g":0,"la":-23.333,"lo":-46.989,"d":54},{"c":"TAM3276","r":"PR-MYW","a":22950,"v":365,"h":237,"g":0,"la":-23.76,"lo":-46.884,"d":54.8},{"c":"TAM3128","r":"PS-LBJ","a":24250,"v":346,"h":305,"g":0,"la":-23.556,"lo":-47.033,"d":58.5},{"c":"TAM3538","r":"PS-LHC","a":16150,"v":404,"h":32,"g":0,"la":-23.028,"lo":-46.072,"d":61.4},{"c":"GLO1116","r":"PR-GEA","a":13400,"v":374,"h":245,"g":0,"la":-23.864,"lo":-46.904,"d":64.3}];

  var EMPRESAS = {
    TAM: "LATAM", LA: "LATAM", LPE: "LATAM", LAN: "LATAM",
    GLO: "GOL", G3: "GOL",
    AZU: "AZUL", AD: "AZUL", ANA: "AZUL",
    AMX: "AMERICAN", AAL: "AMERICAN", UAL: "UNITED", DAL: "DELTA",
    BAW: "BRITISH AIR", AFR: "AIR FRANCE", KLM: "KLM", UAE: "EMIRATES",
    QTR: "QATAR AIRWAYS", TAP: "TAP PORTUGAL", THY: "TURKISH AIR", IBE: "IBERIA",
    ACA: "AIR CANADA", CMP: "COPA AIRLINES", AZA: "ITA AIRWAYS", SWR: "SWISS",
    RYR: "RYANAIR", EZY: "EASYJET", NAX: "NORWEGIAN", VLG: "VUELING",
    WZZ: "WIZZ AIR", SIA: "SINGAPORE", ETI: "ETHIOPIAN", MEA: "MIDDLE EAST",
    AUA: "AUSTRIAN", BEL: "BRUSSELS", EIN: "AER LINGUS", CSA: "CZECH",
    DLH: "LUFTHANSA", JBU: "JETBLUE", AVA: "AVIANCA", GTI: "ATLAS AIR",
    FDX: "FEDEX", UPS: "UPS AIRLINES", CFO: "CARGOLUX"
  };

  var FONTES = [
    function () { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(ADSB); },
    function () { return "https://api.cors.lol/?url=" + encodeURIComponent(ADSB); },
    function () { return "https://cors.eu.org/" + ADSB; },
    function () { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(SKY); },
    function () { return "https://cors.eu.org/" + SKY; },
    function () { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(ADSB); }
  ];

  var st = {
    modo: "snapshot",
    dados: SNAPSHOT.map(function (s) {
      return { cs: s.c, hex: "", reg: s.r, alt: s.a, vel: s.v, rumo: s.h, gnd: !!s.g, lat: s.la, lon: s.lo, d: s.d };
    }),
    ts: SNAPSHOT_TS,
    conexoes: 0
  };
  var timer = null, buscando = false, semRedeFlag = false, atraso = INTERVALO, ultima = 0;

  function semRede(v) { semRedeFlag = !!v; }

  function empresa(cs) {
    if (!cs) return "—";
    var p = String(cs).toUpperCase().replace(/[0-9]+$/, "");
    return EMPRESAS[p] || "—";
  }

  function limpar(s) { return String(s == null ? "" : s).replace(/[^A-Za-z0-9 -]/g, "").toUpperCase(); }

  function distKm(lat, lon) {
    var dLat = (lat - GRU.lat) * 111;
    var dLon = (lon - GRU.lon) * 111 * Math.cos(GRU.lat * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
  }

  function hora() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, "0"); }
    return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }

  function norm(a) {
    if (!a || a.lat == null || a.lon == null) return null;
    var gnd = a.alt_baro === "ground" || a.on_ground === true;
    return {
      cs: limpar(a.flight).trim(),
      hex: limpar(a.hex),
      reg: limpar(a.r),
      alt: gnd ? 0 : (Number(a.alt_baro) || 0),
      vel: Math.round(Number(a.gs) || 0),
      rumo: Math.round(Number(a.track) || 0),
      gnd: gnd,
      lat: a.lat,
      lon: a.lon,
      d: Math.round(distKm(a.lat, a.lon) * 10) / 10
    };
  }

  function viaOpenSky(json) {
    return (json.states || []).map(function (s) {
      if (!s || s[5] == null || s[6] == null) return null;
      return {
        hex: s[0],
        flight: String(s[1] || "").trim(),
        r: "",
        lat: s[6],
        lon: s[5],
        alt_baro: s[7] == null ? undefined : Math.round(s[7] * 3.28084),
        on_ground: s[8],
        gs: s[9] == null ? undefined : Math.round(s[9] * 1.94384),
        track: s[10]
      };
    }).filter(Boolean);
  }

  function processar(json) {
    var arr = json && json.ac ? json.ac : (json && json.states ? viaOpenSky(json) : []);
    var l = arr.map(norm).filter(Boolean);
    l.sort(function (a, b) { return a.d - b.d; });
    return l.slice(0, 40);
  }

  function fonteUrl(i) { return FONTES[i](); }

  function buscar(cb) {
    var i = 0;
    function tenta() {
      if (i >= FONTES.length) return cb(null);
      var ctl = new AbortController();
      var to = setTimeout(function () { ctl.abort(); }, 8000);
      fetch(fonteUrl(i), { signal: ctl.signal, cache: "no-store" })
        .then(function (r) {
          clearTimeout(to);
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (j) { cb(j); })
        .catch(function () { clearTimeout(to); i++; tenta(); });
    }
    tenta();
  }

  function linhas() {
    return st.dados.map(function (f) {
      var alt = f.gnd ? "NO CHAO" : String(f.alt);
      return '<div class="row vivo-r vivo-row">' +
        '<span class="cell">' + (f.cs || f.hex || "—") + '</span>' +
        '<span class="cell">' + empresa(f.cs) + '</span>' +
        '<span class="cell">' + (f.reg || "—") + '</span>' +
        '<span class="cell num">' + alt + '</span>' +
        '<span class="cell num">' + f.vel + '</span>' +
        '<span class="cell num">' + String(f.rumo).padStart(3, "0") + '</span>' +
        '<span class="cell num">' + f.d.toFixed(1) + '</span>' +
        '<span class="cell ' + (f.gnd ? "sit-chao" : "sit-voo") + '">' + (f.gnd ? "NO CHAO" : "EM VOO") + '</span>' +
        '</div>';
    }).join("");
  }

  function render() {
    var el = document.getElementById("vivo-lista");
    if (el) el.innerHTML = linhas();
    var e = document.getElementById("vivo-estado");
    var u = document.getElementById("vivo-upd");
    var nVoo = st.dados.filter(function (f) { return !f.gnd; }).length;
    var nChao = st.dados.length - nVoo;
    if (e) {
      if (st.modo === "ao-vivo") {
        e.className = "vivo-estado ok";
        e.innerHTML = '<i class="vivo-dot"></i>AO VIVO';
      } else if (st.modo === "reconexao") {
        e.className = "vivo-estado warn";
        e.textContent = "RECONEXAO...";
      } else if (st.modo === "conectando") {
        e.className = "vivo-estado warn";
        e.textContent = "CONECTANDO...";
      } else {
        e.className = "vivo-estado snap";
        e.textContent = "SNAPSHOT LOCAL";
      }
    }
    if (u) {
      if (st.modo === "ao-vivo") u.textContent = "ATUALIZADO " + st.ts + " · " + st.dados.length + " AERONAVES (" + nVoo + " EM VOO / " + nChao + " NO CHAO) · FONTE ADSB.LOL";
      else if (st.modo === "reconexao") u.textContent = "ULTIMA LEITURA AO VIVO " + st.ts + " · RETENTANDO CONEXAO · " + st.dados.length + " AERONAVES";
      else if (st.modo === "conectando") u.textContent = "CONSULTANDO REDE ADS-B...";
      else u.textContent = "SEM CONEXAO · SNAPSHOT DE " + st.ts + " · " + st.dados.length + " AERONAVES";
    }
    renderBarra();
  }

  function chipsHtml(ordenados, qtd) {
    return ordenados.slice(0, qtd).map(function (f) {
      var onde = typeof f.d === "number" ? f.d.toFixed(1) + " KM" : "—";
      var alt = f.gnd ? "NO CHAO" : String(f.alt) + " FT";
      return '<span class="vb-chip"><b>' + (f.cs || f.hex || "—") + "</b> · " + onde + " · " + alt + "</span>";
    }).join('<i class="vb-sep">•</i>');
  }

  function renderBarra() {
    var rot = st.modo === "ao-vivo" ? "AO VIVO" :
      st.modo === "reconexao" ? "RECONEXAO" :
      st.modo === "conectando" ? "CONECTANDO" : "SNAPSHOT";
    var cls = "vb-estado" + (st.modo === "ao-vivo" ? "" : st.modo === "snapshot" ? " snap" : " warn");
    var txt = rot + " · " + st.dados.length + " AERONAVES";
    var estados = document.querySelectorAll("#vivo-bar-estado, .vivo-int .vb-estado");
    for (var i = 0; i < estados.length; i++) {
      estados[i].className = cls;
      estados[i].textContent = txt;
    }
    var ordenados = st.dados.slice().sort(function (a, b) { return (a.d || 0) - (b.d || 0); });
    var bs = document.getElementById("vivo-bar-slide");
    if (bs) {
      var runo = '<span class="vb-run">' + (chipsHtml(ordenados, 14) || '<span class="vb-chip">SEM DADOS</span>') + "</span>";
      bs.innerHTML = runo + runo;
    }
    var internos = document.querySelectorAll(".vivo-int .vi-lista");
    for (var j = 0; j < internos.length; j++) {
      internos[j].innerHTML = chipsHtml(ordenados, 10) || '<span class="vb-chip">SEM DADOS</span>';
    }
  }

  function falha() {
    atraso = Math.min(atraso * 2, 60000);
    if (st.modo === "ao-vivo" || st.modo === "reconexao") st.modo = "reconexao";
    else st.modo = "snapshot";
  }

  function atualizar() {
    if (document.hidden || buscando) return;
    if (semRedeFlag) { falha(); render(); return; }
    var t = Date.now();
    if (t - ultima < atraso) return;
    ultima = t;
    buscando = true;
    if (st.modo !== "ao-vivo") st.modo = "conectando";
    render();
    buscar(function (json) {
      buscando = false;
      var l = json ? processar(json) : [];
      if (l.length) {
        st.dados = l;
        st.modo = "ao-vivo";
        st.ts = hora();
        st.conexoes++;
        atraso = INTERVALO;
      } else {
        falha();
      }
      render();
    });
  }

  function iniciar() {
    render();
    if (timer) return;
    atualizar();
    timer = setInterval(atualizar, INTERVALO);
  }

  function parar() {
    if (timer) { clearInterval(timer); timer = null; }
    atraso = INTERVALO;
    ultima = 0;
  }

  function usarSnapshot() {
    parar();
    st.modo = "snapshot";
    st.ts = SNAPSHOT_TS;
    st.dados = SNAPSHOT.map(function (s) {
      return { cs: s.c, hex: "", reg: s.r, alt: s.a, vel: s.v, rumo: s.h, gnd: !!s.g, lat: s.la, lon: s.lo, d: s.d };
    });
    render();
  }

  function pegar(cb) {
    if (semRedeFlag) return cb(st.dados, st.modo);
    if (st.modo === "ao-vivo") return cb(st.dados, st.modo);
    buscar(function (json) {
      var l = json ? processar(json) : [];
      if (l.length) {
        st.dados = l;
        st.modo = "ao-vivo";
        st.ts = hora();
        st.conexoes++;
        render();
        cb(l, "ao-vivo");
      } else {
        falha();
        render();
        cb(st.dados, st.modo);
      }
    });
  }

  return {
    iniciar: iniciar,
    parar: parar,
    render: render,
    pegar: pegar,
    empresa: empresa,
    usarSnapshot: usarSnapshot,
    processar: processar,
    semRede: semRede,
    estado: st
  };
})();
