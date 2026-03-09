/* ═══════════════════════════════════════════
   RCT — Mapowanie ulic na dzielnice
   Trójmiasto + okolice
   ═══════════════════════════════════════════ */

const DISTRICT_MAP = {

  "Gdańsk": {
    // --- Śródmieście ---
    "Ogarna": "Śródmieście", "Piwna": "Śródmieście", "Szeroka": "Śródmieście",
    "Szafarnia": "Śródmieście", "Chmielna": "Śródmieście", "Łąkowa": "Śródmieście",
    "Długie Ogrody": "Śródmieście", "Piekarnicza": "Śródmieście",
    "Stara Stocznia": "Śródmieście", "Kotwiczników": "Śródmieście",
    "Reformacka": "Śródmieście", "Lektykarska": "Śródmieście",
    "Przetoczna": "Śródmieście", "Tamka": "Śródmieście",
    "Kamienna Grobla": "Śródmieście", "Angielska Grobla": "Śródmieście",
    "Sienna Grobla": "Śródmieście", "Ksawerego Dunikowskiego": "Śródmieście",
    "Dąbrówki": "Śródmieście", "Przyokopowa": "Śródmieście",
    "Rajska": "Śródmieście", "Świętojańska": "Śródmieście",
    "Mariacka": "Śródmieście", "Chlebnicka": "Śródmieście",
    "Długa": "Śródmieście", "Grodzka": "Śródmieście",
    "Grobla I": "Śródmieście", "Grobla II": "Śródmieście",
    "Grobla III": "Śródmieście", "Rycerska": "Śródmieście",
    "Wały Jagiellońskie": "Śródmieście", "Podwale Grodzkie": "Śródmieście",
    "Podwale Staromiejskie": "Śródmieście", "Targ Drzewny": "Śródmieście",
    "Targ Węglowy": "Śródmieście", "Kowalska": "Śródmieście",
    "Świętego Ducha": "Śródmieście", "Wartka": "Śródmieście",
    "Motławska": "Śródmieście", "Stągiewna": "Śródmieście",
    "Tokarska": "Śródmieście", "Św. Barbary": "Śródmieście",
    "Olejarnia": "Śródmieście", "Ołowianka": "Śródmieście",
    "Warzywnicza": "Śródmieście",

    // --- Wrzeszcz ---
    "Do Studzienki": "Wrzeszcz",
    "Partyzantów": "Wrzeszcz", "Jana Pestalozziego": "Wrzeszcz",
    "Juliusza Słowackiego": "Wrzeszcz", "Stefana Batorego": "Wrzeszcz",
    "Joachima Lelewela": "Wrzeszcz", "Jana Kochanowskiego": "Wrzeszcz",
    "Elizy Orzeszkowej": "Wrzeszcz", "Władysława Reymonta": "Wrzeszcz",
    "Juliana Tuwima": "Wrzeszcz", "Franciszka Liszta": "Wrzeszcz",
    "Pohulanka": "Wrzeszcz", "Bernarda Chrzanowskiego": "Wrzeszcz",
    "Mikołaja Reja": "Wrzeszcz", "Sebastiana Klonowicza": "Wrzeszcz",
    "Politechniczna": "Wrzeszcz", "Antoniego Słonimskiego": "Wrzeszcz",
    "marsz. Ferdynanda Focha": "Wrzeszcz", "Władysława Broniewskiego": "Wrzeszcz",
    "ks. Jerzego Popiełuszki": "Wrzeszcz", "Tadeusza Kościuszki": "Wrzeszcz",
    "Jana Sobieskiego": "Wrzeszcz", "Konstantego Ildefonsa Gałczyńskiego": "Wrzeszcz",
    "Aleja Grunwaldzka": "Wrzeszcz",
    "Władysława Cieszyńskiego": "Wrzeszcz",
    "Żywiecka": "Wrzeszcz", "Grażyny": "Wrzeszcz",
    "Klonowa": "Wrzeszcz", "Miszewskiego": "Wrzeszcz",
    "Waryńskiego": "Wrzeszcz", "Legionów": "Wrzeszcz",
    "Uphagena": "Wrzeszcz",
    "Sobótki": "Wrzeszcz", "Kołłątaja": "Wrzeszcz",
    "Jaśkowa Dolina": "Wrzeszcz", "Konopnickiej": "Wrzeszcz",
    "Dmowskiego": "Wrzeszcz", "Trawki": "Wrzeszcz",
    "Aldony": "Wrzeszcz", "Matejki": "Wrzeszcz",

    // --- Oliwa ---
    "Artura Grottgera": "Oliwa", "Cedrowa": "Oliwa", "Opacka": "Oliwa",
    "Subisława": "Oliwa", "Piastowska": "Oliwa", "Tatrzańska": "Oliwa",
    "Floriana Ceynowy": "Oliwa", "Bolesława Chrobrego": "Oliwa",
    "Mściwoja II": "Oliwa", "Walecznych": "Oliwa", "Sosnowa": "Oliwa",
    "Leśna Góra": "Oliwa", "Jana Ostroroga": "Oliwa", "Łużycka": "Oliwa",
    "Derdowskiego": "Oliwa", "Opata Rybińskiego": "Oliwa",
    "Nowotna": "Oliwa", "Bytowska": "Oliwa", "Spacerowa": "Oliwa",
    "Wąsowicza": "Oliwa", "Jeleniogórska": "Oliwa", "Bażyńskiego": "Oliwa",
    "Polanki": "Oliwa", "Wita Stwosza": "Oliwa",
    "Buraczana": "Oliwa", "Olgierda": "Oliwa",

    // --- Przymorze ---
    "Jagiellońska": "Przymorze", "Śląska": "Przymorze",
    "Obrońców Wybrzeża": "Przymorze", "Prezydenta Lecha Kaczyńskiego": "Przymorze",
    "Kołobrzeska": "Przymorze", "Aleja Rzeczypospolitej": "Przymorze",
    "Warneńska": "Przymorze", "Magellana": "Przymorze",
    "Chłopska": "Przymorze", "Dąbrowszczaków": "Przymorze",

    // --- Zaspa ---
    "Pilotów": "Zaspa", "Dywizjonu": "Zaspa", "Czarny Dwór": "Przymorze",
    "Aleja Jana Pawła II": "Zaspa", "Startowa": "Zaspa",
    "Żwirki i Wigury": "Zaspa", "Lecha Wałęsy": "Zaspa", "Hynka": "Zaspa",
    "Janusza Meissnera": "Zaspa",

    // --- Brzeźno / Jelitkowo ---
    "Dworska": "Brzeźno", "Jelitkowski Dwór": "Jelitkowo",
    "Aleja gen. Józefa Hallera": "Brzeźno", "Krasickiego": "Brzeźno",
    "Drzymały": "Brzeźno", "Jantarowa": "Brzeźno", "Gdańska": "Brzeźno",
    "Nadmorski Dwór": "Jelitkowo", "Jelitkowska": "Jelitkowo",
    "Brzeźnieńska": "Brzeźno",

    // --- Piecki-Migowo ---
    "Morenowe Wzgórze": "Piecki-Migowo", "Franciszka Rakoczego": "Piecki-Migowo",
    "Myśliwska": "Piecki-Migowo",

    // --- Strzyża ---
    "Chopina": "Strzyża", "Aleja Wojska Polskiego": "Strzyża",

    // --- Suchanino ---
    "Schuberta": "Suchanino", "Beethovena": "Suchanino",
    "Macieja Kamieńskiego": "Suchanino",

    // --- Chełm ---
    "Głęboka": "Chełm", "Koralowa": "Chełm", "Rogalińska": "Chełm",
    "Belgradzka": "Chełm", "Częstochowska": "Chełm", "Legnicka": "Chełm",
    "Olsztyńska": "Chełm", "Toruńska": "Chełm", "Zielony Stok": "Chełm",
    "Słoneczna Dolina": "Chełm", "Cienista": "Chełm", "Witosa": "Chełm",
    "Platynowa": "Chełm", "Srebrna": "Chełm", "Złota": "Chełm",
    "Diamentowa": "Chełm", "Jaskółcza": "Chełm", "Wawelska": "Chełm",

    // --- Jasień ---
    "Jabłoniowa": "Jasień",
    "Lawendowe Wzgórze": "Jasień", "Stanisława Lema": "Jasień",
    "Krzysztofa Kamila Baczyńskiego": "Jasień", "Zbigniewa Burzyńskiego": "Jasień",
    "Morelowa": "Jasień", "Turzycowa": "Jasień",
    "Lawendowa": "Jasień",

    // --- Łostowice / Ujeścisko ---
    "Przemyska": "Łostowice", "Aleksandra Rożankowskiego": "Łostowice",
    "Pobiedzisko": "Łostowice", "Siennicka": "Łostowice",
    "Jaglana": "Łostowice", "Kampinoska": "Łostowice",
    "Niepołomicka": "Łostowice", "Świętokrzyska": "Łostowice",

    // --- Siedlce ---
    "Kartuska": "Siedlce", "Anny Jagiellonki": "Siedlce", "Zakopiańska": "Siedlce",
    "Franciszka Bohomolca": "Siedlce", "Grudziądzka": "Siedlce",
    "Orańska": "Siedlce", "Ptasia": "Siedlce", "Sadowa": "Siedlce",
    "Starowiejska": "Siedlce", "Zamiejska": "Siedlce",
    "Cygańska Góra": "Siedlce", "Wilhelma Stryjewskiego": "Siedlce",
    "Maurycego Beniowskiego": "Siedlce",

    // --- Piecki-Migowo ---
    "Dolne Migowo": "Piecki-Migowo", "Piecewska": "Piecki-Migowo",

    // --- Aniołki ---
    "Królewskie Wzgórze": "Aniołki", "Tytusa Chałubińskiego": "Aniołki",
    "prof. Stefana Hausbrandta": "Aniołki", "Śniadeckich": "Aniołki",
    "Płowce": "Aniołki", "Kopernika": "Aniołki",
    "Powstańców Warszawskich": "Aniołki",

    // --- Suchanino ---
    "Spadzista": "Suchanino",

    // --- Letnica / Nowy Port ---
    "Letnicka": "Letnica", "Marynarki Polskiej": "Letnica",
    "Konrada Korzeniowskiego": "Nowy Port", "Oliwska": "Nowy Port",
    "Wyzwolenia": "Nowy Port",

    // --- Stogi ---
    "Skiby": "Stogi",

    // --- Orunia ---
    "Antoniego Suchanka": "Orunia", "Trakt Św. Wojciecha": "Orunia",

    // --- Przeróbka ---
    "Marcina Dragana": "Przeróbka",

    // --- Żabianka-Wejhera-Jelitkowo-Tysiąclecia ---
    "Jakuba Wejhera": "Żabianka", "Tysiąclecia": "Żabianka",
    "Obodrzyców": "Żabianka", "Gospody": "Żabianka",

    // --- Osowa ---
    "Mariana Seredyńskiego": "Osowa", "Galaktyczna": "Osowa",
    "Barniewicka": "Osowa", "Antygony": "Osowa", "Junony": "Osowa",
    "Feniksa": "Osowa", "Homera": "Osowa",
  },

  "Sopot": {
    // --- Dolny Sopot ---
    "Bohaterów Monte Cassino": "Dolny Sopot", "Dworcowa": "Dolny Sopot",
    "Jana Jerzego Haffnera": "Dolny Sopot", "Tadeusza Kościuszki": "Dolny Sopot",
    "Podjazd": "Dolny Sopot", "Aleja Niepodległości": "Dolny Sopot",
    "Stefana Żeromskiego": "Dolny Sopot", "Jakuba Goyki": "Dolny Sopot",
    "Jana Sobieskiego": "Dolny Sopot", "Jana Winieckiego": "Dolny Sopot",
    "Sopocka": "Dolny Sopot", "Bałtycka": "Dolny Sopot",
    "Bitwy pod Płowcami": "Dolny Sopot", "Parkowa": "Dolny Sopot",
    "Polskiego Czerwonego Krzyża": "Dolny Sopot",
    "Zwycięstwa": "Dolny Sopot", "Gdyńska": "Dolny Sopot",
    "Druskiennicka": "Dolny Sopot", "Gen. Józefa Wybickiego": "Dolny Sopot",
    "Gryfa Pomorskiego": "Dolny Sopot", "Karola Chodkiewicza": "Dolny Sopot",
    "Kwietna": "Dolny Sopot", "Lipowa": "Dolny Sopot",
    "ks. Jana Majdera": "Dolny Sopot",

    // --- Górny Sopot ---
    "Józefa Czyżewskiego": "Górny Sopot", "Armii Krajowej": "Górny Sopot",
    "Polna": "Górny Sopot", "Podleśna": "Górny Sopot",
    "Leśna": "Górny Sopot", "Fryderyka Chopina": "Górny Sopot",
    "Władysława Orkana": "Górny Sopot", "Podhalańska": "Górny Sopot",
    "Kameralna": "Górny Sopot", "Strzelców": "Górny Sopot",
    "Wzgórze Bernadowo": "Górny Sopot", "Bernadowska": "Górny Sopot",
    "Spokojna": "Górny Sopot", "Wschodnia": "Górny Sopot",
    "Nowodworcowa": "Górny Sopot", "Smolna": "Górny Sopot",
    "Bzowa": "Górny Sopot", "Świerkowa": "Górny Sopot",
    "Józefa Kiedronia": "Górny Sopot", "Józefa Kraszewskiego": "Górny Sopot",
    "Oskara Kolberga": "Górny Sopot", "Witosławy": "Górny Sopot",
    "Władysława Łokietka": "Górny Sopot", "Łamana": "Górny Sopot",

    // --- Kamienny Potok ---
    "Orłowska": "Kamienny Potok", "Karlikowska": "Kamienny Potok",
    "Krynicka": "Kamienny Potok", "Południowa": "Kamienny Potok",
    "Małopolska": "Kamienny Potok", "Kujawska": "Kamienny Potok",
    "Kurpiowska": "Kamienny Potok", "Opolska": "Kamienny Potok",
    "Pomorska": "Kamienny Potok", "Wielkopolska": "Kamienny Potok",
    "Morawska": "Kamienny Potok", "Bursztynowa": "Kamienny Potok",
    "Karwieńska": "Kamienny Potok", "Przebendowskich": "Kamienny Potok",
    "Sochaczewska": "Kamienny Potok", "Wrocławska": "Kamienny Potok",
    "Szczecińska": "Kamienny Potok", "Słupska": "Kamienny Potok",

    // --- Brodwino ---
    "Jana Husa": "Brodwino", "Kazimierza Kruczkowskiego": "Brodwino",
    "Leopolda Staffa": "Brodwino", "Kornela Makuszyńskiego": "Brodwino",
    "Zofii Nałkowskiej": "Brodwino", "Jana Brzechwy": "Brodwino",
    "Janiny Porazińskiej": "Brodwino", "Miernicza": "Brodwino",
    "Pawła Gdańca": "Brodwino", "Poli Gojawiczyńskiej": "Brodwino",
    "Stanisławy Fleszarowej-Muskat": "Brodwino",

    // --- Centrum ---
    "Aleja Grunwaldzka": "Centrum", "Grunwaldzka": "Centrum",
    "Króla Jana Kazimierza": "Centrum",
  },

  "Gdynia": {
    // --- Śródmieście ---
    "Świętojańska": "Śródmieście", "10 Lutego": "Śródmieście",
    "Starowiejska": "Śródmieście", "Abrahama": "Śródmieście",
    "Skwer Kościuszki": "Śródmieście", "Waszyngtona": "Śródmieście",
    "Armii Krajowej": "Śródmieście", "Jana z Kolna": "Śródmieście",
    "Batorego": "Śródmieście", "Piłsudskiego": "Śródmieście",
    "Władysława IV": "Śródmieście", "Portowa": "Śródmieście",
    "Plac Kaszubski": "Śródmieście", "Dworcowa": "Śródmieście",
    "3 Maja": "Śródmieście", "1 Maja": "Śródmieście",
    "23 Marca": "Śródmieście",

    // --- Orłowo ---
    "Orłowska": "Orłowo", "Kasztanowa": "Orłowo",
    "Sieradzka": "Orłowo", "Perkuna": "Orłowo",
    "Króla Jana III Sobieskiego": "Orłowo", "Szturmanów": "Orłowo",
    "Kombatantów": "Orłowo", "Architektów": "Orłowo",

    // --- Redłowo ---
    "Legionów": "Redłowo", "Redłowska": "Redłowo",
    "Powstania Styczniowego": "Redłowo", "Korzeniowskiego": "Redłowo",
    "Bolesława Krzywoustego": "Redłowo", "Gen. Stanisława Fiszera": "Redłowo",

    // --- Wzgórze Św. Maksymiliana ---
    "Partyzantów": "Wzgórze Św. Maksymiliana",
    "Wyspiańskiego": "Wzgórze Św. Maksymiliana",
    "Sienkiewicza": "Wzgórze Św. Maksymiliana",
    "Mickiewicza": "Wzgórze Św. Maksymiliana",
    "Słowackiego": "Wzgórze Św. Maksymiliana",
    "Szymanowskiego": "Wzgórze Św. Maksymiliana",

    // --- Działki Leśne ---
    "Śląska": "Działki Leśne", "Warszawska": "Działki Leśne",
    "Pomorska": "Działki Leśne", "Kielecka": "Działki Leśne",

    // --- Grabówek ---
    "Morska": "Grabówek", "Łowicka": "Grabówek",
    "Raduńska": "Grabówek",

    // --- Chylonia ---
    "Chylońska": "Chylonia", "Gniewska": "Chylonia",
    "Helska": "Chylonia", "Kartuska": "Chylonia",
    "Pucka": "Chylonia",

    // --- Cisowa ---
    "Chełmińska": "Cisowa", "Morska": "Cisowa",

    // --- Obłuże ---
    "Bosmańska": "Obłuże", "Benisławskiego": "Obłuże",
    "Płk. Dąbka": "Obłuże",

    // --- Oksywie ---
    "Dickmana": "Oksywie", "Śmidowicza": "Oksywie",
    "Bosmańska": "Oksywie",

    // --- Witomino ---
    "Chwarznieńska": "Witomino", "Rolnicza": "Witomino",
    "Nauczycielska": "Witomino", "Uczniowska": "Witomino",

    // --- Mały Kack ---
    "Łużycka": "Mały Kack", "Wieluńska": "Mały Kack",
    "Stryjska": "Mały Kack", "Sandomierska": "Mały Kack",

    // --- Wielki Kack ---
    "Chwarznieńska": "Wielki Kack", "Źródło Marii": "Wielki Kack",
    "Starochwaszczyńska": "Wielki Kack",

    // --- Karwiny ---
    "Makuszyńskiego": "Karwiny", "Brzechwy": "Karwiny",

    // --- Dąbrowa ---
    "Rdestowa": "Dąbrowa", "Lukrecjowa": "Dąbrowa",
    "Gorczycowa": "Dąbrowa", "Miętowa": "Dąbrowa",

    // --- Pogórze ---
    "Żeliwna": "Pogórze", "Aluminiowa": "Pogórze",
    "Stalowa": "Pogórze", "Kazimierska": "Pogórze",
  },

  // Mniejsze miasta — bez podziału na dzielnice
  "Pruszcz Gdański": {},
  "Elbląg": {},
  "Rumia": {},
  "Reda": {},
  "Wejherowo": {},
};


/**
 * Przypisz dzielnicę na podstawie miasta i adresu.
 * ZAWSZE szuka w mapie TEGO miasta z transakcji (nie z zapytania).
 * Partial match tylko w obrębie tego samego miasta.
 */
function getDistrict(city, address) {
  if (!city || !address) return null;

  // Wyciągnij nazwę ulicy (bez numeru domu)
  const street = address.replace(/\s+\d+[\w\/\-]*\s*$/, '').trim();

  // Szukaj mapy dla TEGO miasta (z transakcji)
  const cityMap = DISTRICT_MAP[city];

  // Małe miasta bez mapowania — zwróć nazwę miasta
  if (cityMap && Object.keys(cityMap).length === 0) return city;

  // 1. Exact match w mapie tego miasta
  if (cityMap && cityMap[street]) return cityMap[street];

  // 2. Partial match — TYLKO w mapie tego miasta
  if (cityMap) {
    for (const [key, district] of Object.entries(cityMap)) {
      if (street.includes(key) || key.includes(street)) return district;
    }
  }

  // 3. Miasto nieznane? Szukaj exact we wszystkich
  if (!cityMap) {
    for (const [, map] of Object.entries(DISTRICT_MAP)) {
      if (Object.keys(map).length === 0) continue;
      if (map[street]) return map[street];
    }
  }

  return null;
}

/**
 * Wzbogać transakcje o pole 'district'
 */
function enrichWithDistricts(transactions) {
  return transactions.map(tx => ({
    ...tx,
    // Zachowaj dzielnicę z serwera (districts_data.json) jeśli istnieje
    district: tx.district || getDistrict(tx.city, tx.address) || "Inne"
  }));
}

/**
 * Oblicz statystyki per dzielnica
 */
function computeDistrictStats(transactions) {
  const districts = {};
  transactions.forEach(tx => {
    const d = tx.district || "Inne";
    if (!districts[d]) districts[d] = [];
    districts[d].push(tx.priceM2);
  });

  return Object.entries(districts)
    .map(([name, prices]) => {
      prices.sort((a, b) => a - b);
      const n = prices.length;
      const median = n % 2 === 1 ? prices[n >> 1] : ((prices[(n >> 1) - 1] + prices[n >> 1]) >> 1);
      return {
        name,
        count: n,
        avg: Math.round(prices.reduce((a, b) => a + b, 0) / n),
        median,
        min: prices[0],
        max: prices[n - 1],
      };
    })
    .filter(d => d.count >= 2) // Minimum 2 transakcje
    .sort((a, b) => b.avg - a.avg); // Od najdroższej
}
