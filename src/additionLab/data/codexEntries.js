export const CODEX_PAGES = [
  {
    id: 'addition-basics',
    title: 'Dasar Reaksi Adisi',
    chapter: 'BAB 01 // KONSEP',
    icon: 'atom',
    sections: [
      {
        heading: 'Apa itu reaksi adisi?',
        body: 'Reaksi adisi adalah reaksi di mana dua gugus menambahkan melintasi ikatan rangkap (C=C atau C≡C). Satu ikatan π putus, dan dua ikatan σ baru terbentuk. Tidak ada atom yang lepas — semua atom reagen masuk ke produk.',
      },
      {
        heading: 'Alkena vs alkuna',
        body: 'Alkena (C=C) mengalami satu tahap adisi menjadi ikatan tunggal. Alkuna (C≡C) dapat mengalami satu tahap (menjadi C=C) atau dua tahap (menjadi C–C), tergantung jumlah ekuivalen reagen.',
      },
      {
        heading: 'Neraca atom',
        body: 'Produk adisi = reaktan + reagen. Jumlah setiap unsur (C, H, O, Br, Cl, I) harus sama di kedua sisi. Validator memeriksa neraca ini sebelum memeriksa struktur.',
      },
    ],
  },
  {
    id: 'hydrogenation',
    title: 'Hidrogenasi',
    chapter: 'BAB 02 // H₂',
    icon: 'spark',
    sections: [
      {
        heading: 'Hidrogenasi alkena',
        body: 'H₂ dengan katalis logam (Ni, Pt, atau Pd) menambahkan dua atom H melintasi C=C, menghasilkan alkana. Tanpa katalis logam, reaksi tidak berjalan.',
      },
      {
        heading: 'Hidrogenasi alkuna',
        body: 'Alkuna butuh 2 ekuivalen H₂ untuk menjadi alkana penuh. Ekuivalen pertama mengubah C≡C menjadi C=C; ekuivalen kedua mengubah C=C menjadi C–C.',
      },
      {
        heading: 'Katalis Lindlar',
        body: 'Lindlar adalah katalis paladium yang "diracuni" sehingga hanya aktif untuk satu tahap. Ia menghentikan reduksi alkuna pada alkena (C=C), tidak lanjut ke alkana. Ini disebut hidrogenasi selektif.',
      },
    ],
  },
  {
    id: 'halogenation',
    title: 'Halogenasi',
    chapter: 'BAB 03 // X₂',
    icon: 'bond2',
    sections: [
      {
        heading: 'Adisi X₂',
        body: 'Br₂ dan Cl₂ menambahkan satu atom halogen ke tiap karbon ikatan rangkap. Pada alkena, produknya dihalida vicinal (dua X di karbon bersebelahan).',
      },
      {
        heading: 'Alkuna + X₂',
        body: 'Satu ekuivalen X₂ pada alkuna menghasilkan dihaloalkena (C=C dengan dua X). Dua ekuivalen menghasilkan tetrahalida (C–C dengan empat X, dua per karbon).',
      },
      {
        heading: 'Uji bromin',
        body: 'Warna cokelat Br₂ menghilang saat bereaksi dengan ikatan rangkap — ini uji klasik keberadaan alkena/alkuna.',
      },
    ],
  },
  {
    id: 'markovnikov',
    title: 'Markovnikov & Anti',
    chapter: 'BAB 04 // HX',
    icon: 'target',
    sections: [
      {
        heading: 'Aturan Markovnikov',
        body: 'Saat HX menambahkan ke alkena tak simetris, H masuk ke karbon yang sudah punya lebih banyak H, dan X masuk ke karbon yang lebih tersubstitusi (lebih sedikit H). Ini karena karbokation yang lebih tersubstitusi lebih stabil.',
      },
      {
        heading: 'Efek peroksida (anti-Markovnikov)',
        body: 'Khusus HBr, kehadiran peroksida membalik orientasi melalui mekanisme radikal: Br masuk ke karbon yang kurang tersubstitusi. Efek ini HANYA berlaku untuk HBr, bukan HCl atau HI.',
      },
      {
        heading: 'Alkuna + HX',
        body: 'Satu ekuivalen HX (Markovnikov) menghasilkan haloalkena. Dua ekuivalen menghasilkan dihalida geminal — dua X pada karbon yang sama (karbon yang lebih tersubstitusi).',
      },
    ],
  },
  {
    id: 'hydration',
    title: 'Hidrasi & Tautomerisasi',
    chapter: 'BAB 05 // H₂O',
    icon: 'flask',
    sections: [
      {
        heading: 'Hidrasi alkena',
        body: 'H₂O dengan katalis asam (H₂SO₄) menambahkan H dan OH melintasi C=C. OH masuk mengikuti Markovnikov, menghasilkan alkohol pada karbon yang lebih tersubstitusi.',
      },
      {
        heading: 'Hidrasi alkuna',
        body: 'Alkuna butuh katalis HgSO₄ dalam H₂SO₄. Produk awal adalah enol (C=C–OH), yang tidak stabil.',
      },
      {
        heading: 'Tautomerisasi enol-keto',
        body: 'Enol cepat bertautomerisasi menjadi bentuk keto yang lebih stabil: ikatan C–O menjadi C=O (karbonil), dan C=C menjadi C–C. Alkuna terminal menghasilkan aldehida; alkuna internal menghasilkan keton.',
      },
    ],
  },
  {
    id: 'equivalents',
    title: 'Ekuivalen & Selektivitas',
    chapter: 'BAB 06 // KONTROL',
    icon: 'branch',
    sections: [
      {
        heading: 'Apa itu ekuivalen?',
        body: 'Ekuivalen adalah jumlah mol reagen per mol reaktan. Satu ekuivalen menambahkan sekali; dua ekuivalen menambahkan dua kali. Ini penting untuk alkuna yang punya dua ikatan π.',
      },
      {
        heading: 'Mengontrol produk',
        body: 'Dengan memilih ekuivalen dan katalis, kimiawan mengendalikan produk: Lindlar untuk alkena, Ni/Pt/Pd berlebih untuk alkana, 1 ekuivalen X₂ untuk dihaloalkena, 2 ekuivalen untuk tetrahalida.',
      },
      {
        heading: 'Retrosintesis',
        body: 'Dengan melihat produk, kamu bisa menyimpulkan reagen dan kondisi: gugus halogen menunjukkan HX atau X₂; posisi gugus menunjukkan Markovnikov/anti; jumlah gugus menunjukkan ekuivalen.',
      },
    ],
  },
];