const Flap = (function () {
  const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;+-/°";
  const ativos = new Set();
  let som = false;
  let ctx = null;
  let ultimoSom = 0;

  function clique() {
    if (!som) return;
    const agora = performance.now();
    if (agora - ultimoSom < 38) return;
    ultimoSom = agora;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = 1500 + Math.random() * 500;
      g.gain.setValueAtTime(0.035, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.035);
    } catch (e) {}
  }

  function agendar(span, alvo, espera) {
    ativos.add({
      span,
      alvo,
      passos: 3 + ((Math.random() * 7) | 0),
      passo: 0,
      prox: performance.now() + espera,
      ultimo: 42 + Math.random() * 22
    });
  }

  function loop(t) {
    ativos.forEach((it) => {
      if (t < it.prox) return;
      it.prox = t + it.ultimo;
      if (it.passo < it.passos) {
        it.span.textContent = CHARS[(Math.random() * CHARS.length) | 0];
        it.span.classList.add("flipping");
        clique();
        it.passo++;
      } else {
        it.span.textContent = it.alvo === " " ? " " : it.alvo;
        it.span.classList.remove("flipping");
        ativos.delete(it);
      }
    });
  }
  setInterval(() => loop(performance.now()), 45);

  function set(el, texto, atraso) {
    const alvo = String(texto || "").toUpperCase();
    const atual = el.dataset.t || "";
    if (atual === alvo && el.children.length === alvo.length) return;
    if (el.children.length !== alvo.length) {
      el.textContent = "";
      for (let i = 0; i < alvo.length; i++) {
        const s = document.createElement("span");
        s.className = "fc";
        s.textContent = atual[i] || " ";
        el.appendChild(s);
      }
    }
    el.dataset.t = alvo;
    const base = (atraso || 0) + Math.random() * 90;
    for (let i = 0; i < alvo.length; i++) {
      const de = atual[i] || " ";
      if (de === alvo[i]) continue;
      agendar(el.children[i], alvo[i], base + i * 16);
    }
  }

  return {
    set,
    som: (v) => { som = v; },
    ehLigado: () => som
  };
})();
