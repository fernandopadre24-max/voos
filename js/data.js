const DATA = (function () {
  const AIRLINES = {
    LA: "LATAM",
    G3: "GOL",
    AD: "AZUL",
    TP: "TAP PORTUGAL",
    EK: "EMIRATES",
    QR: "QATAR AIRWAYS",
    AA: "AMERICAN",
    UA: "UNITED",
    DL: "DELTA",
    AF: "AIR FRANCE",
    BA: "BRITISH AIR",
    LH: "LUFTHANSA",
    IB: "IBERIA",
    KL: "KLM",
    TK: "TURKISH AIR",
    LX: "SWISS",
    AM: "AEROMEXICO",
    AC: "AIR CANADA",
    AR: "AEROLINEAS",
    AZ: "ITA AIRWAYS",
    CM: "COPA AIRLINES"
  };

  const PROGRAMAS = {
    LA: "LATAM PASS",
    G3: "SMILES",
    AD: "TUDOAZUL",
    TP: "MILES & GO",
    EK: "SKYWARDS",
    QR: "QMILES",
    AA: "AADVANTAGE",
    UA: "MILEAGE PLUS",
    DL: "SKY MILES",
    AF: "FLYING BLUE",
    BA: "EXECUTIVE CLUB",
    LH: "MILES & MORE",
    IB: "IBERIA PLUS",
    KL: "FLYING BLUE",
    TK: "MILES & SMILES",
    LX: "CIRCLE",
    AM: "CLUB PREMIER",
    AC: "AEROPLAN",
    AR: "AEROLINEAS PLUS",
    AZ: "VOLARE",
    CM: "CONNECTMILES"
  };

  const AEROS = {
    GRU: { cidade: "SAO PAULO", nome: "GUARULHOS", lat: -23.4356, lon: -46.4731 },
    CGH: { cidade: "SAO PAULO", nome: "CONGONHAS", lat: -23.6261, lon: -46.6564 },
    VCP: { cidade: "CAMPINAS", nome: "VIRACOPOS", lat: -23.0074, lon: -47.1344 },
    GIG: { cidade: "RIO DE JANEIRO", nome: "GALEAO", lat: -22.809, lon: -43.2506 },
    SDU: { cidade: "RIO DE JANEIRO", nome: "SANTOS DUMONT", lat: -22.9105, lon: -43.1631 },
    REC: { cidade: "RECIFE", nome: "GUARARAPES", lat: -8.1319, lon: -34.913 },
    FOR: { cidade: "FORTALEZA", nome: "PINTO MARTINS", lat: -3.7763, lon: -38.5324 },
    BSB: { cidade: "BRASILIA", nome: "PRESIDENTE JUSCELINO", lat: -15.8697, lon: -47.9208 },
    CNF: { cidade: "BELO HORIZONTE", nome: "CONFINS", lat: -19.6244, lon: -43.9719 },
    SSA: { cidade: "SALVADOR", nome: "DEPUTADO LUIS EDUARDO", lat: -12.9087, lon: -38.3225 },
    BEL: { cidade: "BELEM", nome: "JUCASLINO KISHINO", lat: -1.4745, lon: -48.4683 },
    POA: { cidade: "PORTO ALEGRE", nome: "SALGADO FILHO", lat: -29.9944, lon: -51.1714 },
    CWB: { cidade: "CURITIBA", nome: "AFONSO PENA", lat: -25.5327, lon: -49.1758 },
    MAU: { cidade: "MANAUS", nome: "EDUARDO GOMES", lat: -3.0386, lon: -60.0497 },
    SCL: { cidade: "SANTIAGO", nome: "ARTURO MERINO", lat: -33.393, lon: -70.7858 },
    EZE: { cidade: "BUENOS AIRES", nome: "EZEIZA", lat: -34.8222, lon: -58.5358 },
    LIM: { cidade: "LIMA", nome: "JORGE CHAVEZ", lat: -12.0219, lon: -77.1143 },
    MEX: { cidade: "MEXICO", nome: "BENITO JUAREZ", lat: 19.4363, lon: -99.0721 },
    MIA: { cidade: "MIAMI", nome: "INTERNACIONAL", lat: 25.7959, lon: -80.287 },
    IAH: { cidade: "HOUSTON", nome: "GEORGE BUSH", lat: 29.9902, lon: -95.3368 },
    ATL: { cidade: "ATLANTA", nome: "HARTSFIELD", lat: 33.6407, lon: -84.4277 },
    JFK: { cidade: "NEW YORK", nome: "JOHN F. KENNEDY", lat: 40.6413, lon: -73.7781 },
    ORD: { cidade: "CHICAGO", nome: "OHARE", lat: 41.9742, lon: -87.9073 },
    LAX: { cidade: "LOS ANGELES", nome: "INTERNACIONAL", lat: 33.9416, lon: -118.4085 },
    YYZ: { cidade: "TORONTO", nome: "PEARSON", lat: 43.6777, lon: -79.6248 },
    LIS: { cidade: "LISBOA", nome: "HUMBERTO DELGADO", lat: 38.7742, lon: -9.1342 },
    OPO: { cidade: "PORTO", nome: "FRANCISCO SA CARNEIRO", lat: 41.2481, lon: -8.6814 },
    MAD: { cidade: "MADRID", nome: "BARAJAS", lat: 40.4719, lon: -3.5626 },
    BCN: { cidade: "BARCELONA", nome: "EL PRAT", lat: 41.2974, lon: 2.0833 },
    CDG: { cidade: "PARIS", nome: "CHARLES DE GAULLE", lat: 49.0097, lon: 2.5479 },
    LHR: { cidade: "LONDRES", nome: "HEATHROW", lat: 51.47, lon: -0.4543 },
    FRA: { cidade: "FRANKFURT", nome: "MAIN", lat: 50.0379, lon: 8.5622 },
    MUC: { cidade: "MUNIQUE", nome: "FRANZ JOSEF", lat: 48.3538, lon: 11.7861 },
    AMS: { cidade: "AMSTERDAM", nome: "SCHIPHOL", lat: 52.3105, lon: 4.7683 },
    FCO: { cidade: "ROMA", nome: "FIUMICINO", lat: 41.8003, lon: 12.2389 },
    ZRH: { cidade: "ZURIQUE", nome: "KLOTEN", lat: 47.4647, lon: 8.5492 },
    IST: { cidade: "ISTAMBUL", nome: "ISTANBUL HAVALIMANI", lat: 41.2753, lon: 28.7519 },
    DOH: { cidade: "DOHA", nome: "HAMAD", lat: 25.2731, lon: 51.6081 },
    DXB: { cidade: "DUBAI", nome: "INTERNACIONAL", lat: 25.2532, lon: 55.3657 },
    NRT: { cidade: "TOKIO", nome: "NARITA", lat: 35.772, lon: 140.3929 },
    JNB: { cidade: "JOANESBURGO", nome: "O.R. TAMBO", lat: -26.1367, lon: 28.2411 },
    PTY: { cidade: "PANAMA", nome: "TOCUMEN INTL", lat: 9.0714, lon: -79.3835 }
  };

  const DIST = (a, b) => {
    const R = 6371;
    const rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(AEROS[b].lat - AEROS[a].lat);
    const dLon = rad(AEROS[b].lon - AEROS[a].lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(AEROS[a].lat)) * Math.cos(rad(AEROS[b].lat)) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
  };

  const DEST = {};
  Object.keys(AEROS).forEach((k) => {
    if (k !== "GRU") DEST[k] = { cidade: AEROS[k].cidade, km: DIST("GRU", k) };
  });

  const HUBS = ["LIS", "MAD", "CDG", "LHR", "FRA", "AMS", "IST", "DOH", "DXB", "MIA", "JFK",
    "MEX", "ATL", "YYZ", "LIM", "SCL", "EZE", "MAU"];

  function escolherEscala(a, b) {
    const km = DIST(a, b);
    let melhor = null;
    let melhorCusto = 0;
    HUBS.forEach((h) => {
      if (!AEROS[h] || h === a || h === b) return;
      const d1 = DIST(a, h);
      const d2 = DIST(h, b);
      if (d1 < 700 || d2 < 400) return;
      const desvio = d1 + d2 - km;
      if (desvio > km * 0.35) return;
      const custo = desvio + Math.abs(d1 - d2) * 0.35;
      if (melhor === null || custo < melhorCusto) { melhor = h; melhorCusto = custo; }
    });
    return melhor;
  }

  function escalasDe(origem, destino, km, i) {
    if (!AEROS[origem] || !AEROS[destino] || origem === destino) return [];
    if (km <= 6200) return [];
    if (i % 3 === 2) return [];
    const h1 = escolherEscala(origem, destino);
    if (!h1) return [];
    const e = [h1];
    if (km > 12500) {
      const h2 = escolherEscala(h1, destino);
      if (h2 && h2 !== origem && e.indexOf(h2) < 0) e.push(h2);
    }
    return e;
  }

  const DEPARTURES = [
    { no: "G3 1402", al: "G3", to: "GIG", dep: "06:10", arr: "07:15", gate: "A03", term: "T2", ac: "B737-800" },
    { no: "AD 2643", al: "AD", to: "REC", dep: "06:45", arr: "09:35", gate: "B07", term: "T1", ac: "A320NEO" },
    { no: "LA 3375", al: "LA", to: "MAD", dep: "07:20", arr: "18:50", gate: "C12", term: "T2", ac: "A330-900" },
    { no: "TP 042", al: "TP", to: "LIS", dep: "07:55", arr: "17:20", gate: "C08", term: "T2", ac: "A330-900NEO" },
    { no: "G3 1670", al: "G3", to: "BSB", dep: "08:30", arr: "10:25", gate: "A10", term: "T2", ac: "B737-800", delay: 25 },
    { no: "AD 4005", al: "AD", to: "CNF", dep: "09:05", arr: "10:45", gate: "B04", term: "T1", ac: "E195-E2", delay: 50 },
    { no: "LA 8081", al: "LA", to: "SCL", dep: "10:40", arr: "13:55", gate: "C05", gate2: "C09", term: "T2", ac: "A321" },
    { no: "EK 260", al: "EK", to: "DXB", dep: "10:55", arr: "22:40", gate: "D01", term: "T2", ac: "B777-300ER" },
    { no: "QR 779", al: "QR", to: "DOH", dep: "11:30", arr: "22:15", gate: "D03", term: "T2", ac: "B787-9" },
    { no: "UA 846", al: "UA", to: "IAH", dep: "12:10", arr: "17:35", gate: "D07", term: "T2", ac: "B777-200ER" },
    { no: "AA 999", al: "AA", to: "MIA", dep: "13:25", arr: "17:50", gate: "D09", term: "T2", ac: "B787-9" },
    { no: "AF 458", al: "AF", to: "CDG", dep: "13:40", arr: "05:15", gate: "C02", term: "T2", ac: "B777-300ER" },
    { no: "BA 246", al: "BA", to: "LHR", dep: "14:15", arr: "04:50", gate: "C10", term: "T2", ac: "B777-200ER" },
    { no: "LH 507", al: "LH", to: "FRA", dep: "14:55", arr: "06:35", gate: "C15", term: "T2", ac: "A350-900" },
    { no: "IB 6844", al: "IB", to: "MAD", dep: "16:30", arr: "06:10", gate: "C04", term: "T2", ac: "A330-200" },
    { no: "KL 762", al: "KL", to: "AMS", dep: "16:55", arr: "08:45", gate: "C07", term: "T2", ac: "B777-200ER", cancelado: true },
    { no: "G3 2078", al: "G3", to: "POA", dep: "17:40", arr: "19:15", gate: "A05", term: "T2", ac: "B737 MAX 8" },
    { no: "LA 3456", al: "LA", to: "EZE", dep: "18:20", arr: "21:05", gate: "B11", term: "T2", ac: "A320" },
    { no: "TK 085", al: "TK", to: "IST", dep: "19:10", arr: "12:55", gate: "D05", term: "T2", ac: "B777-300ER" },
    { no: "AD 2983", al: "AD", to: "BEL", dep: "20:05", arr: "22:30", gate: "B02", term: "T1", ac: "E195-E2" },
    { no: "G3 1121", al: "G3", to: "SSA", dep: "21:15", arr: "23:25", gate: "A08", term: "T2", ac: "B737-800" },
    { no: "LX 093", al: "LX", to: "ZRH", dep: "21:50", arr: "13:25", gate: "C09", term: "T2", ac: "B777-300ER" },
    { no: "AM 006", al: "AM", to: "MEX", dep: "22:40", arr: "05:30", gate: "D11", term: "T2", ac: "B737 MAX 8" },
    { no: "AC 076", al: "AC", to: "YYZ", dep: "23:35", arr: "06:50", gate: "D13", term: "T2", ac: "B787-8" },
    { no: "DL 068", al: "DL", to: "ATL", dep: "21:45", arr: "06:10", gate: "D02", term: "T2", ac: "B767-400ER" },
    { no: "AZ 610", al: "AZ", to: "FCO", dep: "22:05", arr: "09:05", gate: "C14", term: "T2", ac: "A330-200" },
    { no: "AR 1300", al: "AR", to: "EZE", dep: "12:35", arr: "14:45", gate: "A07", term: "T1", ac: "B737-800", delay: 20 },
    { no: "CM 303", al: "CM", to: "PTY", dep: "15:30", arr: "21:15", gate: "D12", term: "T2", ac: "B737-800" },
    { no: "LA 3174", al: "LA", to: "FOR", dep: "09:35", arr: "12:15", gate: "B08", term: "T1", ac: "A320" },
    { no: "G3 1436", al: "G3", to: "REC", dep: "05:30", arr: "08:20", gate: "A02", term: "T2", ac: "B737-800" },
    { no: "AD 4076", al: "AD", to: "MAU", dep: "15:10", arr: "17:25", gate: "B06", term: "T1", ac: "E195-E2" },
    { no: "G3 1034", al: "G3", to: "CWB", dep: "14:40", arr: "15:40", gate: "A12", term: "T2", ac: "B737 MAX 8" },
    { no: "LA 3768", al: "LA", to: "CNF", dep: "16:10", arr: "17:45", gate: "B11", gate2: "B14", term: "T1", ac: "A320", delay: 15 },
    { no: "G3 1930", al: "G3", to: "GIG", dep: "20:40", arr: "21:45", gate: "A04", term: "T2", ac: "B737-800" },
    { no: "AA 995", al: "AA", to: "MIA", dep: "21:20", arr: "05:40", gate: "D08", term: "T2", ac: "B787-9" },
    { no: "UA 145", al: "UA", to: "ORD", dep: "23:10", arr: "09:15", gate: "D10", term: "T2", ac: "B787-8" },
    { no: "BA 248", al: "BA", to: "LHR", dep: "23:50", arr: "11:10", gate: "C08", term: "T2", ac: "B777-300ER" },
    { no: "EK 262", al: "EK", to: "DXB", dep: "22:50", arr: "13:00", gate: "D01", term: "T2", ac: "B777-300ER" },
    { no: "TP 044", al: "TP", to: "LIS", dep: "01:15", arr: "11:55", gate: "C10", term: "T2", ac: "A330-900NEO" },
    { no: "AD 4640", al: "AD", to: "BEL", dep: "18:50", arr: "22:00", gate: "B03", term: "T1", ac: "A320NEO" },
    { no: "G3 1450", al: "G3", to: "GIG", dep: "14:20", arr: "15:25", gate: "A04", term: "T2", ac: "B737-800" },
    { no: "AD 4190", al: "AD", to: "GIG", dep: "16:45", arr: "17:50", gate: "B05", term: "T1", ac: "A320NEO" },
    { no: "LA 3572", al: "LA", to: "GIG", dep: "19:30", arr: "20:35", gate: "B12", gate2: "B14", term: "T2", ac: "A320" },
    { no: "G3 1722", al: "G3", to: "GIG", dep: "22:15", arr: "23:20", gate: "A07", term: "T2", ac: "B737 MAX 8" },
    { no: "LA 3110", al: "LA", to: "REC", dep: "13:15", arr: "16:05", gate: "B09", term: "T2", ac: "A320" },
    { no: "G3 1470", al: "G3", to: "REC", dep: "15:55", arr: "18:45", gate: "A11", term: "T2", ac: "B737-800" },
    { no: "AD 2702", al: "AD", to: "REC", dep: "18:15", arr: "21:05", gate: "B02", term: "T1", ac: "A320NEO" },
    { no: "G3 1108", al: "G3", to: "REC", dep: "20:55", arr: "23:40", gate: "A03", term: "T2", ac: "B737-800" },
    { no: "G3 1082", al: "G3", to: "FOR", dep: "13:40", arr: "16:25", gate: "A06", term: "T2", ac: "B737-800" },
    { no: "AD 4304", al: "AD", to: "FOR", dep: "16:20", arr: "19:05", gate: "B07", term: "T1", ac: "E195-E2", delay: 30 },
    { no: "LA 3242", al: "LA", to: "FOR", dep: "19:45", arr: "22:30", gate: "B04", term: "T2", ac: "A320" },
    { no: "AD 4506", al: "AD", to: "BSB", dep: "13:05", arr: "14:55", gate: "B03", term: "T1", ac: "A320NEO" },
    { no: "G3 1544", al: "G3", to: "BSB", dep: "15:35", arr: "17:25", gate: "A09", term: "T2", ac: "B737-800" },
    { no: "LA 3310", al: "LA", to: "BSB", dep: "17:55", arr: "19:45", gate: "C01", term: "T2", ac: "A321" },
    { no: "G3 1622", al: "G3", to: "BSB", dep: "20:25", arr: "22:15", gate: "A05", term: "T2", ac: "B737 MAX 8" },
    { no: "AD 4622", al: "AD", to: "BSB", dep: "22:30", arr: "00:20", gate: "B08", term: "T1", ac: "A320NEO" },
    { no: "G3 1912", al: "G3", to: "CNF", dep: "13:25", arr: "15:05", gate: "A12", term: "T2", ac: "B737-800" },
    { no: "AD 4080", al: "AD", to: "CNF", dep: "14:55", arr: "16:35", gate: "B10", term: "T1", ac: "E195-E2", delay: 30 },
    { no: "LA 3790", al: "LA", to: "CNF", dep: "18:40", arr: "20:20", gate: "B13", term: "T2", ac: "A320" },
    { no: "G3 2054", al: "G3", to: "CNF", dep: "21:05", arr: "22:45", gate: "A08", term: "T2", ac: "B737-800" },
    { no: "LA 3006", al: "LA", to: "SSA", dep: "13:30", arr: "16:10", gate: "C03", term: "T2", ac: "A320" },
    { no: "AD 4552", al: "AD", to: "SSA", dep: "16:05", arr: "18:45", gate: "B11", term: "T1", ac: "A320NEO" },
    { no: "G3 1384", al: "G3", to: "SSA", dep: "18:35", arr: "21:15", gate: "A02", term: "T2", ac: "B737-800" },
    { no: "AD 4030", al: "AD", to: "SSA", dep: "21:40", arr: "00:20", gate: "B06", term: "T1", ac: "E195-E2" },
    { no: "AD 4126", al: "AD", to: "POA", dep: "13:55", arr: "16:25", gate: "B04", term: "T1", ac: "A320NEO" },
    { no: "G3 2044", al: "G3", to: "POA", dep: "17:15", arr: "19:45", gate: "A10", term: "T2", ac: "B737 MAX 8" },
    { no: "LA 3366", al: "LA", to: "POA", dep: "20:10", arr: "22:40", gate: "C06", term: "T2", ac: "A320" },
    { no: "LA 3290", al: "LA", to: "CWB", dep: "13:10", arr: "14:10", gate: "C04", term: "T2", ac: "A320" },
    { no: "G3 1444", al: "G3", to: "CWB", dep: "16:35", arr: "17:35", gate: "A14", term: "T2", ac: "B737-800" },
    { no: "AD 4408", al: "AD", to: "CWB", dep: "19:20", arr: "20:20", gate: "B01", term: "T1", ac: "E195-E2" },
    { no: "G3 1830", al: "G3", to: "BEL", dep: "13:45", arr: "17:15", gate: "A01", term: "T2", ac: "B737-800" },
    { no: "LA 3470", al: "LA", to: "BEL", dep: "17:40", arr: "21:10", gate: "C07", term: "T2", ac: "A320" },
    { no: "AD 4642", al: "AD", to: "BEL", dep: "21:55", arr: "01:25", gate: "B14", term: "T1", ac: "A320NEO", cancelado: true },
    { no: "G3 1340", al: "G3", to: "MAU", dep: "14:15", arr: "17:55", gate: "A13", term: "T2", ac: "B737-800" },
    { no: "AD 4102", al: "AD", to: "MAU", dep: "18:05", arr: "21:45", gate: "B06", term: "T1", ac: "E195-E2", delay: 20 },
    { no: "G3 2660", al: "G3", to: "EZE", dep: "14:30", arr: "17:00", gate: "A04", term: "T2", ac: "B737 MAX 8" },
    { no: "AD 8026", al: "AD", to: "EZE", dep: "17:30", arr: "20:00", gate: "B12", term: "T1", ac: "A320NEO" },
    { no: "LA 3810", al: "LA", to: "EZE", dep: "23:15", arr: "01:45", gate: "C02", term: "T2", ac: "A330-900" },
    { no: "LA 8054", al: "LA", to: "SCL", dep: "14:45", arr: "17:40", gate: "C05", term: "T2", ac: "A321" },
    { no: "G3 2042", al: "G3", to: "SCL", dep: "18:50", arr: "21:45", gate: "A15", term: "T2", ac: "B737-800" },
    { no: "AA 997", al: "AA", to: "MIA", dep: "15:10", arr: "23:10", gate: "D06", term: "T2", ac: "B787-9" },
    { no: "AA 1002", al: "AA", to: "MIA", dep: "14:45", arr: "22:45", gate: "D11", term: "T2", ac: "B767-400ER" },
    { no: "UA 844", al: "UA", to: "IAH", dep: "14:35", arr: "22:35", gate: "D05", term: "T2", ac: "B787-8" },
    { no: "UA 130", al: "UA", to: "IAH", dep: "19:40", arr: "03:40", gate: "D12", term: "T2", ac: "B777-200ER" },
    { no: "UA 840", al: "UA", to: "ORD", dep: "15:05", arr: "23:55", gate: "D13", term: "T2", ac: "B787-8" },
    { no: "AA 66", al: "AA", to: "LAX", dep: "15:40", arr: "03:10", gate: "D15", term: "T2", ac: "B787-9" },
    { no: "LA 8070", al: "LA", to: "LAX", dep: "23:40", arr: "11:10", gate: "C11", term: "T2", ac: "A350-900" },
    { no: "AA 947", al: "AA", to: "JFK", dep: "14:10", arr: "23:40", gate: "D03", term: "T2", ac: "B787-9" },
    { no: "DL 176", al: "DL", to: "JFK", dep: "16:55", arr: "02:30", gate: "D02", term: "T2", ac: "B767-400ER" },
    { no: "LA 8080", al: "LA", to: "JFK", dep: "22:05", arr: "07:40", gate: "C13", term: "T2", ac: "A330-900" },
    { no: "AC 074", al: "AC", to: "YYZ", dep: "14:50", arr: "23:45", gate: "D08", term: "T2", ac: "B787-8" },
    { no: "AC 078", al: "AC", to: "YYZ", dep: "21:30", arr: "06:25", gate: "D10", term: "T2", ac: "B787-8" },
    { no: "DL 066", al: "DL", to: "ATL", dep: "15:25", arr: "00:40", gate: "D07", term: "T2", ac: "B767-400ER" },
    { no: "DL 070", al: "DL", to: "ATL", dep: "22:15", arr: "07:30", gate: "D04", term: "T2", ac: "B777-200ER" },
    { no: "AM 004", al: "AM", to: "MEX", dep: "14:40", arr: "23:30", gate: "D14", term: "T2", ac: "B737 MAX 8" },
    { no: "AM 008", al: "AM", to: "MEX", dep: "21:55", arr: "06:45", gate: "D01", term: "T2", ac: "B737 MAX 8" },
    { no: "CM 308", al: "CM", to: "PTY", dep: "14:25", arr: "22:15", gate: "D09", term: "T2", ac: "B737-800" },
    { no: "CM 300", al: "CM", to: "PTY", dep: "20:45", arr: "04:35", gate: "D10", term: "T2", ac: "B737-800" },
    { no: "QR 781", al: "QR", to: "DOH", dep: "15:20", arr: "04:30", gate: "D03", term: "T2", ac: "B787-9" },
    { no: "EK 264", al: "EK", to: "DXB", dep: "16:15", arr: "06:45", gate: "D01", term: "T2", ac: "B777-300ER" },
    { no: "TK 087", al: "TK", to: "IST", dep: "15:50", arr: "06:10", gate: "D05", term: "T2", ac: "B777-300ER" },
    { no: "LH 505", al: "LH", to: "FRA", dep: "16:40", arr: "06:25", gate: "C16", term: "T2", ac: "A350-900" },
    { no: "AF 456", al: "AF", to: "CDG", dep: "15:35", arr: "05:20", gate: "C04", term: "T2", ac: "B777-300ER" },
    { no: "BA 244", al: "BA", to: "LHR", dep: "16:25", arr: "05:35", gate: "C12", term: "T2", ac: "B777-200ER" },
    { no: "TP 040", al: "TP", to: "LIS", dep: "13:50", arr: "01:45", gate: "C09", term: "T2", ac: "A330-900NEO" },
    { no: "TP 050", al: "TP", to: "LIS", dep: "16:20", arr: "04:15", gate: "C10", term: "T2", ac: "A330-900NEO" },
    { no: "LA 3373", al: "LA", to: "MAD", dep: "14:05", arr: "02:20", gate: "C08", term: "T2", ac: "A330-900" },
    { no: "IB 6846", al: "IB", to: "MAD", dep: "21:15", arr: "09:30", gate: "C05", term: "T2", ac: "A330-200" },
    { no: "KL 764", al: "KL", to: "AMS", dep: "14:20", arr: "03:55", gate: "C07", term: "T2", ac: "B777-200ER" },
    { no: "LX 090", al: "LX", to: "ZRH", dep: "15:05", arr: "04:10", gate: "C15", term: "T2", ac: "B777-300ER" },
    { no: "AZ 608", al: "AZ", to: "FCO", dep: "14:30", arr: "03:40", gate: "C14", term: "T2", ac: "A330-200" },
    { no: "LA 8064", al: "LA", to: "BCN", dep: "23:55", arr: "13:35", gate: "C12", term: "T2", ac: "A330-900" },
    { no: "TP 046", al: "TP", to: "OPO", dep: "13:35", arr: "03:45", gate: "C06", term: "T2", ac: "A330-900NEO" },
    { no: "TP 048", al: "TP", to: "OPO", dep: "20:15", arr: "08:25", gate: "C03", term: "T2", ac: "A330-900NEO" },
    { no: "LH 503", al: "LH", to: "MUC", dep: "15:15", arr: "05:55", gate: "C16", term: "T2", ac: "A350-900" },
    { no: "LH 509", al: "LH", to: "MUC", dep: "22:40", arr: "13:15", gate: "C15", term: "T2", ac: "A350-900" },
    { no: "LA 8086", al: "LA", to: "JNB", dep: "21:40", arr: "06:10", gate: "C11", term: "T2", ac: "A330-900" },
    { no: "LA 2040", al: "LA", to: "LIM", dep: "14:05", arr: "18:35", gate: "B09", term: "T2", ac: "A320" },
    { no: "LA 2042", al: "LA", to: "LIM", dep: "19:15", arr: "23:45", gate: "B11", term: "T2", ac: "A320" },
    { no: "LA 8084", al: "LA", to: "NRT", dep: "23:15", arr: "13:50", gate: "C07", term: "T2", ac: "A350-900" }
  ];

  const ARRIVALS = [
    { no: "AA 998", al: "AA", from: "MIA", arr: "05:10", dep: "01:35", gate: "D10", term: "T2", ac: "B787-9" },
    { no: "LA 3374", al: "LA", from: "MAD", arr: "05:30", dep: "23:40", gate: "B12", term: "T2", ac: "A330-900" },
    { no: "UA 845", al: "UA", from: "IAH", arr: "05:35", dep: "23:50", gate: "D06", term: "T2", ac: "B777-200ER" },
    { no: "AF 459", al: "AF", from: "CDG", arr: "05:50", dep: "23:20", gate: "C01", term: "T2", ac: "B777-300ER" },
    { no: "AD 2642", al: "AD", from: "REC", arr: "06:00", dep: "03:10", gate: "B06", term: "T1", ac: "A320NEO" },
    { no: "TP 041", al: "TP", from: "LIS", arr: "06:05", dep: "22:45", gate: "B09", term: "T2", ac: "A330-900NEO" },
    { no: "BA 247", al: "BA", from: "LHR", arr: "06:20", dep: "23:05", gate: "C11", term: "T2", ac: "B777-200ER" },
    { no: "G3 1401", al: "G3", from: "GIG", arr: "05:55", dep: "04:55", gate: "A02", term: "T2", ac: "B737-800" },
    { no: "LH 506", al: "LH", from: "FRA", arr: "07:05", dep: "23:40", gate: "C14", term: "T2", ac: "A350-900" },
    { no: "EK 261", al: "EK", from: "DXB", arr: "07:40", dep: "22:55", gate: "A01", term: "T2", ac: "B777-300ER" },
    { no: "QR 778", al: "QR", from: "DOH", arr: "08:15", dep: "04:10", gate: "A04", term: "T2", ac: "B787-9" },
    { no: "G3 2079", al: "G3", from: "POA", arr: "08:45", dep: "07:15", gate: "A06", term: "T2", ac: "B737 MAX 8", delay: 20 },
    { no: "IB 6845", al: "IB", from: "MAD", arr: "09:30", dep: "03:45", gate: "C03", term: "T2", ac: "A330-200" },
    { no: "KL 761", al: "KL", from: "AMS", arr: "10:10", dep: "04:30", gate: "C06", term: "T2", ac: "B777-200ER" },
    { no: "LA 8082", al: "LA", from: "SCL", arr: "11:20", dep: "08:05", gate: "B05", term: "T2", ac: "A321" },
    { no: "TK 084", al: "TK", from: "IST", arr: "12:05", dep: "06:30", gate: "D04", term: "T2", ac: "B777-300ER" },
    { no: "G3 1669", al: "G3", from: "BSB", arr: "13:10", dep: "11:20", gate: "A09", term: "T2", ac: "B737-800" },
    { no: "LX 092", al: "LX", from: "ZRH", arr: "13:35", dep: "05:55", gate: "C13", term: "T2", ac: "B777-300ER" },
    { no: "LA 3457", al: "LA", from: "EZE", arr: "14:00", dep: "11:20", gate: "B10", term: "T2", ac: "A320" },
    { no: "AD 4004", al: "AD", from: "CNF", arr: "15:25", dep: "13:45", gate: "B03", term: "T1", ac: "E195-E2" },
    { no: "UA 847", al: "UA", from: "IAH", arr: "17:15", dep: "05:40", gate: "D08", term: "T2", ac: "B787-9" },
    { no: "AA 1000", al: "AA", from: "MIA", arr: "18:40", dep: "14:10", gate: "D12", term: "T2", ac: "B787-8" },
    { no: "G3 1120", al: "G3", from: "SSA", arr: "19:50", dep: "17:40", gate: "A07", term: "T2", ac: "B737-800" },
    { no: "LA 8068", al: "LA", from: "MAD", arr: "21:35", dep: "15:50", gate: "C05", term: "T2", ac: "A330-900" },
    { no: "DL 067", al: "DL", from: "ATL", arr: "05:55", dep: "21:30", gate: "D05", term: "T2", ac: "B767-400ER" },
    { no: "AR 1299", al: "AR", from: "EZE", arr: "09:05", dep: "06:55", gate: "A05", term: "T1", ac: "B737-800" },
    { no: "AZ 611", al: "AZ", from: "FCO", arr: "05:35", dep: "18:15", gate: "C16", term: "T2", ac: "A330-200" },
    { no: "CM 302", al: "CM", from: "PTY", arr: "06:35", dep: "00:40", gate: "D14", term: "T2", ac: "B737-800" },
    { no: "TP 043", al: "TP", from: "LIS", arr: "22:20", dep: "12:20", gate: "B04", term: "T2", ac: "A330-900NEO" },
    { no: "AC 075", al: "AC", from: "YYZ", arr: "05:55", dep: "19:55", gate: "D11", term: "T2", ac: "B787-8" },
    { no: "AD 4077", al: "AD", from: "MAU", arr: "19:05", dep: "17:00", gate: "B09", term: "T1", ac: "E195-E2", delay: 20 },
    { no: "LA 3175", al: "LA", from: "FOR", arr: "23:10", dep: "20:30", gate: "B10", term: "T1", ac: "A320" },
    { no: "G3 1035", al: "G3", from: "CWB", arr: "21:45", dep: "20:45", gate: "A06", term: "T2", ac: "B737 MAX 8" },
    { no: "AA 994", al: "AA", from: "MIA", arr: "06:15", dep: "22:15", gate: "D07", term: "T2", ac: "B787-9" },
    { no: "LA 3573", al: "LA", from: "GIG", arr: "06:25", dep: "05:20", gate: "B07", term: "T2", ac: "A320" },
    { no: "G3 1723", al: "G3", from: "GIG", arr: "09:15", dep: "08:10", gate: "A06", term: "T2", ac: "B737 MAX 8" },
    { no: "AD 4191", al: "AD", from: "GIG", arr: "21:55", dep: "20:50", gate: "B09", term: "T1", ac: "A320NEO" },
    { no: "G3 1451", al: "G3", from: "GIG", arr: "16:45", dep: "15:40", gate: "A11", term: "T2", ac: "B737-800" },
    { no: "LA 3111", al: "LA", from: "REC", arr: "06:15", dep: "03:25", gate: "B10", term: "T2", ac: "A320" },
    { no: "G3 1471", al: "G3", from: "REC", arr: "08:50", dep: "06:00", gate: "A12", term: "T2", ac: "B737-800" },
    { no: "AD 2703", al: "AD", from: "REC", arr: "15:35", dep: "12:45", gate: "B02", term: "T1", ac: "A320NEO" },
    { no: "G3 1109", al: "G3", from: "REC", arr: "23:40", dep: "20:50", gate: "A03", term: "T2", ac: "B737-800" },
    { no: "AD 4305", al: "AD", from: "FOR", arr: "06:30", dep: "03:45", gate: "B03", term: "T1", ac: "E195-E2" },
    { no: "LA 3243", al: "LA", from: "FOR", arr: "14:20", dep: "11:35", gate: "B04", term: "T2", ac: "A320" },
    { no: "G3 1083", al: "G3", from: "FOR", arr: "22:35", dep: "19:50", gate: "A07", term: "T2", ac: "B737-800" },
    { no: "AD 4507", al: "AD", from: "BSB", arr: "06:05", dep: "04:15", gate: "B05", term: "T1", ac: "A320NEO" },
    { no: "G3 1545", al: "G3", from: "BSB", arr: "11:40", dep: "09:50", gate: "A08", term: "T2", ac: "B737-800" },
    { no: "LA 3311", al: "LA", from: "BSB", arr: "17:10", dep: "15:20", gate: "C02", term: "T2", ac: "A321" },
    { no: "G3 1623", al: "G3", from: "BSB", arr: "06:55", dep: "05:05", gate: "A10", term: "T2", ac: "B737 MAX 8" },
    { no: "G3 1913", al: "G3", from: "CNF", arr: "07:10", dep: "05:30", gate: "A13", term: "T2", ac: "B737-800" },
    { no: "LA 3791", al: "LA", from: "CNF", arr: "15:05", dep: "13:25", gate: "B11", term: "T2", ac: "A320" },
    { no: "AD 4081", al: "AD", from: "CNF", arr: "22:50", dep: "21:10", gate: "B12", term: "T1", ac: "E195-E2", delay: 25 },
    { no: "LA 3007", al: "LA", from: "SSA", arr: "07:45", dep: "05:05", gate: "C04", term: "T2", ac: "A320" },
    { no: "AD 4553", al: "AD", from: "SSA", arr: "13:15", dep: "10:35", gate: "B06", term: "T1", ac: "A320NEO" },
    { no: "G3 1385", al: "G3", from: "SSA", arr: "06:40", dep: "04:00", gate: "A02", term: "T2", ac: "B737-800" },
    { no: "AD 4127", al: "AD", from: "POA", arr: "07:20", dep: "04:50", gate: "B08", term: "T1", ac: "A320NEO" },
    { no: "G3 2045", al: "G3", from: "POA", arr: "16:05", dep: "13:35", gate: "A14", term: "T2", ac: "B737 MAX 8" },
    { no: "LA 3291", al: "LA", from: "CWB", arr: "06:40", dep: "05:40", gate: "C06", term: "T2", ac: "A320" },
    { no: "G3 1445", al: "G3", from: "CWB", arr: "14:30", dep: "13:30", gate: "A15", term: "T2", ac: "B737-800" },
    { no: "G3 1831", al: "G3", from: "BEL", arr: "08:15", dep: "04:45", gate: "A04", term: "T2", ac: "B737-800" },
    { no: "LA 3471", al: "LA", from: "BEL", arr: "16:50", dep: "13:20", gate: "C08", term: "T2", ac: "A320" },
    { no: "G3 1341", al: "G3", from: "MAU", arr: "07:50", dep: "04:10", gate: "A09", term: "T2", ac: "B737-800" },
    { no: "AD 4103", al: "AD", from: "MAU", arr: "14:05", dep: "10:25", gate: "B13", term: "T1", ac: "E195-E2" },
    { no: "G3 2661", al: "G3", from: "EZE", arr: "06:15", dep: "03:45", gate: "A05", term: "T2", ac: "B737 MAX 8" },
    { no: "LA 3811", al: "LA", from: "EZE", arr: "16:40", dep: "14:10", gate: "C09", term: "T2", ac: "A330-900" },
    { no: "AR 1301", al: "AR", from: "EZE", arr: "20:15", dep: "17:45", gate: "B14", term: "T1", ac: "B737-800" },
    { no: "LA 8055", al: "LA", from: "SCL", arr: "06:50", dep: "03:55", gate: "C10", term: "T2", ac: "A321" },
    { no: "G3 2043", al: "G3", from: "SCL", arr: "14:15", dep: "11:20", gate: "A12", term: "T2", ac: "B737-800" },
    { no: "AA 996", al: "AA", from: "MIA", arr: "05:30", dep: "21:30", gate: "D06", term: "T2", ac: "B787-9" },
    { no: "UA 131", al: "UA", from: "IAH", arr: "13:35", dep: "05:35", gate: "D09", term: "T2", ac: "B777-200ER" },
    { no: "UA 841", al: "UA", from: "ORD", arr: "08:45", dep: "23:55", gate: "D13", term: "T2", ac: "B787-8" },
    { no: "AA 67", al: "AA", from: "LAX", arr: "06:10", dep: "18:40", gate: "D15", term: "T2", ac: "B787-9" },
    { no: "AA 946", al: "AA", from: "JFK", arr: "05:55", dep: "20:25", gate: "D03", term: "T2", ac: "B787-9" },
    { no: "DL 175", al: "DL", from: "JFK", arr: "12:40", dep: "03:10", gate: "D02", term: "T2", ac: "B767-400ER" },
    { no: "AC 073", al: "AC", from: "YYZ", arr: "06:20", dep: "21:25", gate: "D01", term: "T2", ac: "B787-8" },
    { no: "DL 065", al: "DL", from: "ATL", arr: "05:45", dep: "20:30", gate: "D04", term: "T2", ac: "B767-400ER" },
    { no: "AM 005", al: "AM", from: "MEX", arr: "06:05", dep: "21:15", gate: "D11", term: "T2", ac: "B737 MAX 8" },
    { no: "CM 307", al: "CM", from: "PTY", arr: "10:45", dep: "02:55", gate: "D10", term: "T2", ac: "B737-800" },
    { no: "QR 780", al: "QR", from: "DOH", arr: "05:55", dep: "16:45", gate: "A01", term: "T2", ac: "B787-9" },
    { no: "EK 263", al: "EK", from: "DXB", arr: "06:40", dep: "16:10", gate: "A02", term: "T2", ac: "B777-300ER" },
    { no: "TK 086", al: "TK", from: "IST", arr: "06:50", dep: "16:30", gate: "D08", term: "T2", ac: "B777-300ER" },
    { no: "LH 504", al: "LH", from: "FRA", arr: "06:25", dep: "16:40", gate: "C15", term: "T2", ac: "A350-900" },
    { no: "AF 455", al: "AF", from: "CDG", arr: "06:05", dep: "16:20", gate: "C03", term: "T2", ac: "B777-300ER" },
    { no: "BA 243", al: "BA", from: "LHR", arr: "06:15", dep: "16:05", gate: "C11", term: "T2", ac: "B777-200ER" },
    { no: "TP 039", al: "TP", from: "LIS", arr: "05:50", dep: "17:55", gate: "B01", term: "T2", ac: "A330-900NEO" },
    { no: "LA 3372", al: "LA", from: "MAD", arr: "06:20", dep: "18:05", gate: "B03", term: "T2", ac: "A330-900" },
    { no: "IB 6847", al: "IB", from: "MAD", arr: "14:15", dep: "02:00", gate: "C10", term: "T2", ac: "A330-200" },
    { no: "KL 763", al: "KL", from: "AMS", arr: "06:35", dep: "17:00", gate: "C07", term: "T2", ac: "B777-200ER" },
    { no: "LX 091", al: "LX", from: "ZRH", arr: "06:30", dep: "17:25", gate: "C14", term: "T2", ac: "B777-300ER" },
    { no: "AZ 609", al: "AZ", from: "FCO", arr: "06:45", dep: "17:35", gate: "C16", term: "T2", ac: "A330-200" },
    { no: "LA 8063", al: "LA", from: "BCN", arr: "06:55", dep: "17:15", gate: "C13", term: "T2", ac: "A330-900" },
    { no: "TP 047", al: "TP", from: "OPO", arr: "05:40", dep: "15:40", gate: "B07", term: "T2", ac: "A330-900NEO" },
    { no: "LH 502", al: "LH", from: "MUC", arr: "06:10", dep: "15:30", gate: "C12", term: "T2", ac: "A350-900" },
    { no: "LA 8087", al: "LA", from: "JNB", arr: "07:05", dep: "22:35", gate: "C09", term: "T2", ac: "A330-900" },
    { no: "LA 2041", al: "LA", from: "LIM", arr: "06:45", dep: "02:15", gate: "B08", term: "T2", ac: "A320" },
    { no: "LA 8085", al: "LA", from: "NRT", arr: "07:30", dep: "16:55", gate: "C05", term: "T2", ac: "A350-900" }
  ];

  const AVISOS = [
    "PASSAGEIROS DO VOO G3 1670 COM ATRASO DE 25 MINUTOS",
    "PORTAO C05 ALTERADO PARA C09 NO VOO LA 8081",
    "VOO KL 762 CANCELADO - REEMBOLSO NO GUICHE 42",
    "BAGAGENS DO VOO AD 2642 SERAO ENTREGUES NA ESTEIRA 3",
    "AZUL AD 4076 PARA MANAUS EMBARQUE NO PORTAO B06",
    "TAP TP 042 PARA LISBOA COM CHEGADA NO HORARIO",
    "LATAM LA 3456 PARA BUENOS AIRES - PASSAPORTE OBRIGATORIO",
    "GOL G3 1436 PARA RECIFE - ULTIMAS POLTRONAS A VENDA",
    "AMERICAN AA 999 PARA MIAMI - CHECK-IN NO TERMINAL 2",
    "EMIRATES EK 260 PARA DUBAI - CHEGUE COM 4 HORAS DE ANTECEDENCIA",
    "CHUVA FORTE NA REGIAO SUL - VERIFIQUE O STATUS DO SEU VOO",
    "SALA VIP ABERTA DAS 05H AS 23H - TERMINAL 1, ANDAR SUP"
  ];

  const HOJE = new Date();
  const AGORA = HOJE.getHours() * 60 + HOJE.getMinutes();
  const DELTA = Math.round((AGORA - 720) / 5) * 5;

  const paraMin = (s) => {
    const [h, m] = s.split(":").map(Number);
    return (h * 60 + m + DELTA + 1440 * 4) % 1440;
  };

  const horaMin = (s) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  };

  const duracao = (dep, arr) => {
    let d = (arr - dep + 1440) % 1440;
    if (d === 0) d = 1440;
    return d;
  };

  const preparar = (f, tipo, i) => {
    const o = tipo === "partidas" ? f.to : f.from;
    const origemF = tipo === "partidas" ? "GRU" : f.from;
    const destinoF = tipo === "partidas" ? f.to : "GRU";
    const dep = paraMin(f.dep);
    const arr = paraMin(f.arr);
    const ref = tipo === "partidas" ? dep : arr;
    const h = new Date();
    const data = String(h.getDate()).padStart(2, "0") + "/" + String(h.getMonth() + 1).padStart(2, "0") + "/" + h.getFullYear();
    return {
      ...f,
      tipo,
      dia: 0,
      data,
      origem: origemF,
      destino: destinoF,
      escala: escalasDe(origemF, destinoF, DEST[o].km, i),
      cidade: DEST[o].cidade,
      km: DEST[o].km,
      dep,
      arr,
      ref,
      dur: duracao(dep, arr),
      gateMudaEm: f.gate2 ? (ref - 70 + 1440) % 1440 : null,
      idx: i
    };
  };

  const departures = DEPARTURES.map((f, i) => preparar(f, "partidas", i));
  const arrivals = ARRIVALS.map((f, i) => preparar(f, "chegadas", i));

  const SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
  const MES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const DIAS = 7;

  function diaData(dia) {
    const h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), h.getDate() + dia);
  }

  function dataCurta(dia) {
    const d = diaData(dia);
    return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function dataLonga(dia) {
    const d = diaData(dia);
    return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
  }

  function dataSemana(dia) {
    const d = diaData(dia);
    return SEMANA[d.getDay()] + " " + String(d.getDate()).padStart(2, "0") + " " + MES[d.getMonth()];
  }

  function duracaoVoo(km) {
    return Math.max(50, Math.round((km / 800) * 60) + 45);
  }

  function gerarVoos(tipo, origem, destino, dia, soReais) {
    if (!AEROS[origem] || !AEROS[destino] || origem === destino) return [];
    const base = tipo === "partidas" ? DEPARTURES : ARRIVALS;
    const km = Math.max(25, DIST(origem, destino));
    const desloc = dia === 0 ? DELTA : 0;
    const outro = tipo === "partidas" ? destino : origem;
    const data = dataLonga(dia);
    const semana = dataSemana(dia);
    const itens = [];
    base.forEach((f, i) => {
      const o = tipo === "partidas" ? "GRU" : f.from;
      const d = tipo === "partidas" ? f.to : "GRU";
      if (soReais && (o !== origem || d !== destino)) return;
      itens.push({ f, i });
    });
    return itens.map(({ f, i }) => {
      let dep, arr, dur;
      if (soReais) {
        dep = (horaMin(f.dep) + desloc + 1440) % 1440;
        arr = (horaMin(f.arr) + desloc + 1440) % 1440;
        dur = duracao(dep, arr);
      } else if (tipo === "partidas") {
        dur = duracaoVoo(km);
        dep = (horaMin(f.dep) + desloc + 1440) % 1440;
        arr = (dep + dur) % 1440;
      } else {
        dur = duracaoVoo(km);
        arr = (horaMin(f.arr) + desloc + 1440) % 1440;
        dep = ((arr - dur) % 1440 + 1440) % 1440;
      }
      const ref = tipo === "partidas" ? dep : arr;
      return {
        ...f,
        tipo,
        dia,
        data,
        semana,
        origem: origem,
        destino: destino,
        escala: escalasDe(origem, destino, km, i),
        cidade: AEROS[outro].cidade,
        aero: AEROS[outro].nome,
        km,
        dep,
        arr,
        ref,
        dur,
        cancelado: dia === 0 && !!f.cancelado,
        delay: dia === 0 ? (f.delay || 0) : 0,
        gateMudaEm: dia === 0 && f.gate2 ? (ref - 70 + 1440) % 1440 : null,
        idx: i
      };
    });
  }

  function listaAeroportos(excluir) {
    return Object.keys(AEROS)
      .filter((k) => k !== excluir)
      .sort((a, b) => AEROS[a].cidade.localeCompare(AEROS[b].cidade) || a.localeCompare(b));
  }

  return { AIRLINES, PROGRAMAS, DEST, AEROS, departures, arrivals, AVISOS, DELTA, DIAS, DIST, gerarVoos, listaAeroportos, dataCurta, dataLonga, dataSemana };
})();
