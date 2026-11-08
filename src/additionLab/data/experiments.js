import { getZone } from './zones.js';
import { getMolecule } from './molecules.js';
import { getReagent } from './reagents.js';

const E = (config) => ({
  revealReagent: true,
  conditionControls: { catalyst: null, equivalents: null, peroxide: false },
  ...config,
});

export const EXPERIMENTS = [
  // ================= ZONE 1: Alkene Fundamentals =================
  E({
    id: 'AL-01', zone: 'alkene-fundamentals', title: 'Adisi Pertama', difficulty: 1,
    category: 'Hidrogenasi', reactant: 'ethene', targetProduct: 'ethane', reagent: 'H2',
    conditions: { catalyst: 'Ni', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['none', 'Ni', 'Pt', 'Pd'], equivalents: null, peroxide: false },
    ruleId: 'hydrogenation',
    mission: 'Ubah etena (C₂H₄) menjadi etana (C₂H₆) dengan menambahkan hidrogen melintasi ikatan rangkap dua.',
    hints: [
      'Etena punya ikatan rangkap dua C=C. Reaksi adisi memutus satu ikatan π.',
      'Kamu perlu menambahkan dua atom H — satu ke tiap karbon.',
      'Gunakan reagen H₂ (gas hidrogen).',
      'Hidrogenasi butuh katalis logam. Pilih Ni, lalu jalankan reaksi.',
    ],
    explanation: {
      summary: 'H₂ menambahkan melintasi C=C etena dengan katalis Ni, menghasilkan etana (ikatan tunggal C–C).',
      mechanism: ['Ikatan π C=C putus.', 'Satu atom H masuk ke tiap karbon.', 'Terbentuk etana C₂H₆ dengan ikatan tunggal.'],
    },
    learningObjectives: ['Konsep dasar reaksi adisi', 'Peran katalis logam dalam hidrogenasi'],
  }),
  E({
    id: 'AL-02', zone: 'alkene-fundamentals', title: 'Uji Bromin', difficulty: 1,
    category: 'Halogenasi', reactant: 'ethene', targetProduct: '1,2-dibromoethane', reagent: 'Br2',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    ruleId: 'halogenation',
    mission: 'Tambahkan bromin ke etena untuk membentuk 1,2-dibromoetana. Ini adalah uji klasik ikatan rangkap.',
    hints: [
      'Halogenasi menambahkan atom halogen ke kedua karbon rangkap.',
      'Reagen yang dibutuhkan adalah Br₂.',
      'Satu Br masuk ke tiap karbon ikatan rangkap dua.',
      'Pilih Br₂ tanpa katalis, jalankan reaksi, lalu bangun produk dengan dua Br di karbon berbeda.',
    ],
    explanation: {
      summary: 'Br₂ menambahkan satu Br ke tiap karbon C=C etena, menghasilkan 1,2-dibromoetana (dihalida vicinal).',
      mechanism: ['Ikatan π C=C putus.', 'Satu Br masuk ke C pertama, satu ke C kedua.', 'Terbentuk ikatan tunggal dengan dua Br vicinal.'],
    },
    learningObjectives: ['Halogenasi alkena', 'Produk dihalida vicinal'],
  }),
  E({
    id: 'AL-03', zone: 'alkene-fundamentals', title: 'Asam ke Alkena', difficulty: 1,
    category: 'Hidrohalogenasi', reactant: 'ethene', targetProduct: 'chloroethane', reagent: 'HCl',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    ruleId: 'hydrohalogenation',
    mission: 'Tambahkan HCl ke etena untuk membentuk kloroetana.',
    hints: [
      'Hidrohalogenasi menambahkan H dan halogen (X).',
      'Reagen HCl memberi satu H dan satu Cl.',
      'Karena etena simetris, Cl bisa masuk ke karbon mana saja.',
      'Pilih HCl, jalankan reaksi, lalu bangun kloroetana.',
    ],
    explanation: {
      summary: 'HCl menambahkan H dan Cl melintasi C=C etena, menghasilkan kloroetana.',
      mechanism: ['Ikatan π putus.', 'H masuk ke satu karbon, Cl ke karbon lain.', 'Terbentuk kloroetana C₂H₅Cl.'],
    },
    learningObjectives: ['Hidrohalogenasi', 'Adisi pada alkena simetris'],
  }),
  E({
    id: 'AL-04', zone: 'alkene-fundamentals', title: 'Hidrogenasi Propena', difficulty: 1,
    category: 'Hidrogenasi', reactant: 'propene', targetProduct: 'propane', reagent: 'H2',
    conditions: { catalyst: 'Pt', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['none', 'Ni', 'Pt', 'Pd'], equivalents: null, peroxide: false },
    ruleId: 'hydrogenation',
    mission: 'Jenuhkan propena menjadi propana menggunakan hidrogen dan katalis platina.',
    hints: [
      'Propena punya satu ikatan rangkap dua.',
      'Tambahkan H₂ untuk menjenuhkannya.',
      'Katalis yang diminta adalah Pt (platina).',
      'Pilih H₂ dengan katalis Pt, lalu jalankan reaksi.',
    ],
    explanation: {
      summary: 'H₂ dengan katalis Pt menjenuhkan propena menjadi propana.',
      mechanism: ['Ikatan π C=C putus.', 'Dua atom H menambah ke karbon rangkap.', 'Terbentuk propana C₃H₈.'],
    },
    learningObjectives: ['Hidrogenasi alkena tak simetris', 'Pemilihan katalis'],
  }),
  E({
    id: 'AL-05', zone: 'alkene-fundamentals', title: 'Bromin pada Propena', difficulty: 1,
    category: 'Halogenasi', reactant: 'propene', targetProduct: '1,2-dibromopropane', reagent: 'Br2',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    ruleId: 'halogenation',
    mission: 'Tambahkan Br₂ ke propena untuk membentuk 1,2-dibromopropana.',
    hints: [
      'Halogenasi menambah Br ke kedua karbon rangkap.',
      'Ikatan rangkap propena ada di C1–C2.',
      'Satu Br ke C1, satu Br ke C2.',
      'Pilih Br₂, jalankan reaksi, bangun 1,2-dibromopropana.',
    ],
    explanation: {
      summary: 'Br₂ menambahkan ke C1 dan C2 propena, menghasilkan 1,2-dibromopropana.',
      mechanism: ['Ikatan π C1=C2 putus.', 'Br masuk ke C1 dan C2.', 'C3 (gugus metil) tidak berubah.'],
    },
    learningObjectives: ['Halogenasi alkena tak simetris', 'Posisi adisi pada ikatan rangkap'],
  }),

  // ================= ZONE 2: Hydrogenation Lab =================
  E({
    id: 'AL-06', zone: 'hydrogenation-lab', title: 'Menjenuhkan Butena', difficulty: 1,
    category: 'Hidrogenasi', reactant: 'but-1-ene', targetProduct: 'butane', reagent: 'H2',
    conditions: { catalyst: 'Ni', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['none', 'Ni', 'Pt', 'Pd'], equivalents: null, peroxide: false },
    ruleId: 'hydrogenation',
    mission: 'Ubah but-1-ena menjadi butana melalui hidrogenasi.',
    hints: ['But-1-ena punya C=C di ujung rantai.', 'Tambahkan H₂ untuk menjenuhkan.', 'Gunakan katalis Ni.', 'Pilih H₂ + Ni, jalankan reaksi.'],
    explanation: {
      summary: 'H₂/Ni menjenuhkan but-1-ena menjadi butana.',
      mechanism: ['Ikatan π C1=C2 putus.', 'H menambah ke C1 dan C2.', 'Terbentuk butana rantai lurus.'],
    },
    learningObjectives: ['Hidrogenasi alkena terminal'],
  }),
  E({
    id: 'AL-07', zone: 'hydrogenation-lab', title: 'Butena Internal', difficulty: 1,
    category: 'Hidrogenasi', reactant: 'but-2-ene', targetProduct: 'butane', reagent: 'H2',
    conditions: { catalyst: 'Pd', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['none', 'Ni', 'Pt', 'Pd'], equivalents: null, peroxide: false },
    ruleId: 'hydrogenation',
    mission: 'Jenuhkan but-2-ena (ikatan rangkap di tengah) menjadi butana dengan katalis Pd.',
    hints: ['Ikatan rangkap ada di C2–C3.', 'H₂ menjenuhkan ikatan rangkap di mana pun posisinya.', 'Gunakan katalis Pd.', 'Pilih H₂ + Pd, jalankan reaksi.'],
    explanation: {
      summary: 'H₂/Pd menjenuhkan but-2-ena menjadi butana; posisi ikatan rangkap tidak mengubah produk akhir.',
      mechanism: ['Ikatan π C2=C3 putus.', 'H menambah ke C2 dan C3.', 'Terbentuk butana.'],
    },
    learningObjectives: ['Hidrogenasi alkena internal'],
  }),
  E({
    id: 'AL-08', zone: 'hydrogenation-lab', title: 'Alkena Bercabang', difficulty: 2,
    category: 'Hidrogenasi', reactant: '2-methylpropene', targetProduct: '2-methylpropane', reagent: 'H2',
    conditions: { catalyst: 'Ni', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['none', 'Ni', 'Pt', 'Pd'], equivalents: null, peroxide: false },
    ruleId: 'hydrogenation',
    mission: 'Jenuhkan 2-metilpropena menjadi 2-metilpropana (isobutana). Perhatikan kerangka bercabangnya.',
    hints: ['2-metilpropena punya karbon pusat bercabang.', 'Hidrogenasi tidak mengubah kerangka karbon.', 'Tambahkan H₂ ke ikatan rangkap.', 'Pilih H₂ + Ni; produk tetap bercabang.'],
    explanation: {
      summary: 'H₂/Ni menjenuhkan 2-metilpropena menjadi 2-metilpropana tanpa mengubah kerangka cabang.',
      mechanism: ['Ikatan π putus.', 'H menambah ke karbon rangkap.', 'Kerangka cabang tetap.'],
    },
    learningObjectives: ['Hidrogenasi alkena bercabang', 'Kerangka karbon tetap saat adisi'],
  }),
  E({
    id: 'AL-09', zone: 'hydrogenation-lab', title: 'Reduksi Penuh Alkuna', difficulty: 2,
    category: 'Hidrogenasi', reactant: 'ethyne', targetProduct: 'ethane', reagent: 'H2',
    conditions: { catalyst: 'Ni', equivalents: 2, peroxide: false },
    conditionControls: { catalyst: ['none', 'Ni', 'Pt', 'Pd'], equivalents: [1, 2], peroxide: false },
    ruleId: 'hydrogenation',
    mission: 'Reduksi etuna (C≡C) sepenuhnya menjadi etana. Alkuna butuh dua tahap hidrogenasi.',
    hints: ['Etuna punya ikatan rangkap tiga.', 'Satu ekuivalen H₂ hanya menghasilkan alkena.', 'Untuk alkana penuh, butuh 2 ekuivalen H₂.', 'Pilih H₂ + Ni, atur ekuivalen = 2.'],
    explanation: {
      summary: 'Dua ekuivalen H₂ dengan Ni mereduksi etuna (C≡C) sepenuhnya menjadi etana (C–C).',
      mechanism: ['Ekuivalen pertama: C≡C → C=C.', 'Ekuivalen kedua: C=C → C–C.', 'Terbentuk etana.'],
    },
    learningObjectives: ['Hidrogenasi alkuna', 'Konsep ekuivalen'],
  }),
  E({
    id: 'AL-10', zone: 'hydrogenation-lab', title: 'Propuna ke Propana', difficulty: 2,
    category: 'Hidrogenasi', reactant: 'propyne', targetProduct: 'propane', reagent: 'H2',
    conditions: { catalyst: 'Pt', equivalents: 2, peroxide: false },
    conditionControls: { catalyst: ['none', 'Ni', 'Pt', 'Pd'], equivalents: [1, 2], peroxide: false },
    ruleId: 'hydrogenation',
    mission: 'Reduksi propuna sepenuhnya menjadi propana menggunakan 2 ekuivalen H₂ dan katalis Pt.',
    hints: ['Propuna punya C≡C.', 'Butuh 2 ekuivalen H₂ untuk alkana.', 'Gunakan katalis Pt.', 'Pilih H₂ + Pt, ekuivalen = 2.'],
    explanation: {
      summary: 'Dua ekuivalen H₂/Pt mereduksi propuna menjadi propana.',
      mechanism: ['C≡C → C=C (ekuivalen 1).', 'C=C → C–C (ekuivalen 2).', 'Terbentuk propana.'],
    },
    learningObjectives: ['Reduksi penuh alkuna', 'Kontrol ekuivalen'],
  }),

  // ================= ZONE 3: Halogenation Lab =================
  E({
    id: 'AL-11', zone: 'halogenation-lab', title: 'Klorinasi Etena', difficulty: 1,
    category: 'Halogenasi', reactant: 'ethene', targetProduct: '1,2-dichloroethane', reagent: 'Cl2',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    ruleId: 'halogenation',
    mission: 'Tambahkan klorin ke etena untuk membentuk 1,2-dikloroetana.',
    hints: ['Halogenasi menambah X ke kedua karbon rangkap.', 'Gunakan Cl₂.', 'Satu Cl ke tiap karbon.', 'Pilih Cl₂, jalankan reaksi.'],
    explanation: {
      summary: 'Cl₂ menambahkan satu Cl ke tiap karbon etena, menghasilkan 1,2-dikloroetana.',
      mechanism: ['Ikatan π putus.', 'Cl masuk ke kedua karbon.', 'Terbentuk dihalida vicinal.'],
    },
    learningObjectives: ['Klorinasi alkena'],
  }),
  E({
    id: 'AL-12', zone: 'halogenation-lab', title: 'Klorinasi Propena', difficulty: 1,
    category: 'Halogenasi', reactant: 'propene', targetProduct: '1,2-dichloropropane', reagent: 'Cl2',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    ruleId: 'halogenation',
    mission: 'Tambahkan Cl₂ ke propena untuk membentuk 1,2-dikloropropana.',
    hints: ['Ikatan rangkap propena di C1–C2.', 'Cl₂ menambah Cl ke kedua karbon rangkap.', 'C3 tidak berubah.', 'Pilih Cl₂, bangun 1,2-dikloropropana.'],
    explanation: {
      summary: 'Cl₂ menambahkan ke C1 dan C2 propena, menghasilkan 1,2-dikloropropana.',
      mechanism: ['Ikatan π C1=C2 putus.', 'Cl masuk ke C1 dan C2.', 'Gugus metil tetap.'],
    },
    learningObjectives: ['Klorinasi alkena tak simetris'],
  }),
  E({
    id: 'AL-13', zone: 'halogenation-lab', title: 'Brominasi Butena', difficulty: 2,
    category: 'Halogenasi', reactant: 'but-1-ene', targetProduct: '1,2-dibromobutane', reagent: 'Br2',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    ruleId: 'halogenation',
    mission: 'Tambahkan Br₂ ke but-1-ena untuk membentuk 1,2-dibromobutana.',
    hints: ['Ikatan rangkap di C1–C2.', 'Br₂ menambah Br ke kedua karbon rangkap.', 'Rantai C3–C4 tetap.', 'Pilih Br₂, bangun 1,2-dibromobutana.'],
    explanation: {
      summary: 'Br₂ menambahkan ke C1 dan C2 but-1-ena, menghasilkan 1,2-dibromobutana.',
      mechanism: ['Ikatan π C1=C2 putus.', 'Br masuk ke C1 dan C2.', 'Sisa rantai tetap.'],
    },
    learningObjectives: ['Brominasi alkena terminal'],
  }),
  E({
    id: 'AL-14', zone: 'halogenation-lab', title: 'Brominasi Alkena Bercabang', difficulty: 2,
    category: 'Halogenasi', reactant: '2-methylpropene', targetProduct: '1,2-dibromo-2-methylpropane', reagent: 'Br2',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    ruleId: 'halogenation',
    mission: 'Tambahkan Br₂ ke 2-metilpropena. Perhatikan posisi Br pada kerangka bercabang.',
    hints: ['Ikatan rangkap antara karbon pusat dan satu karbon cabang.', 'Br masuk ke kedua karbon ikatan rangkap itu.', 'Kerangka cabang tidak berubah.', 'Pilih Br₂; produk: 1,2-dibromo-2-metilpropana.'],
    explanation: {
      summary: 'Br₂ menambahkan ke karbon pusat dan karbon rangkap 2-metilpropena, menghasilkan 1,2-dibromo-2-metilpropana.',
      mechanism: ['Ikatan π putus.', 'Br masuk ke kedua karbon rangkap.', 'Dua gugus metil lain tetap.'],
    },
    learningObjectives: ['Halogenasi alkena bercabang'],
  }),
  E({
    id: 'AL-15', zone: 'halogenation-lab', title: 'Klorinasi Butena Internal', difficulty: 2,
    category: 'Halogenasi', reactant: 'but-2-ene', targetProduct: '2,3-dichlorobutane', reagent: 'Cl2',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    ruleId: 'halogenation',
    mission: 'Tambahkan Cl₂ ke but-2-ena untuk membentuk 2,3-diklorobutana.',
    hints: ['Ikatan rangkap di C2–C3.', 'Cl masuk ke C2 dan C3.', 'Produk: 2,3-diklorobutana.', 'Pilih Cl₂, jalankan reaksi.'],
    explanation: {
      summary: 'Cl₂ menambahkan ke C2 dan C3 but-2-ena, menghasilkan 2,3-diklorobutana.',
      mechanism: ['Ikatan π C2=C3 putus.', 'Cl masuk ke C2 dan C3.', 'Terbentuk 2,3-diklorobutana.'],
    },
    learningObjectives: ['Halogenasi alkena internal'],
  }),

  // ================= ZONE 4: Hydrohalogenation Lab =================
  E({
    id: 'AL-16', zone: 'hydrohalogenation-lab', title: 'Aturan Markovnikov', difficulty: 2,
    category: 'Hidrohalogenasi', reactant: 'propene', targetProduct: '2-bromopropane', reagent: 'HBr',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: null, equivalents: null, peroxide: true },
    ruleId: 'hydrohalogenation',
    mission: 'Tambahkan HBr ke propena tanpa peroksida. Br harus masuk mengikuti aturan Markovnikov.',
    hints: ['Markovnikov: H masuk ke karbon dengan lebih banyak H.', 'Br masuk ke karbon yang lebih tersubstitusi (C2).', 'Tanpa peroksida, orientasi normal Markovnikov.', 'Pilih HBr, peroksida OFF; produk: 2-bromopropana.'],
    explanation: {
      summary: 'Tanpa peroksida, HBr menambahkan mengikuti Markovnikov: Br ke C2 propena, menghasilkan 2-bromopropana.',
      mechanism: ['H masuk ke C1 (lebih banyak H).', 'Br masuk ke C2 (lebih tersubstitusi).', 'Terbentuk 2-bromopropana.'],
    },
    learningObjectives: ['Aturan Markovnikov', 'Orientasi hidrohalogenasi'],
  }),
  E({
    id: 'AL-17', zone: 'hydrohalogenation-lab', title: 'HCl dan Markovnikov', difficulty: 2,
    category: 'Hidrohalogenasi', reactant: 'propene', targetProduct: '2-chloropropane', reagent: 'HCl',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: null, equivalents: null, peroxide: true },
    ruleId: 'hydrohalogenation',
    mission: 'Tambahkan HCl ke propena menjadi 2-kloropropana. Ingat: peroksida tidak memengaruhi HCl.',
    hints: ['HCl mengikuti Markovnikov.', 'Cl masuk ke C2.', 'Peroksida hanya berlaku untuk HBr, bukan HCl.', 'Pilih HCl, peroksida OFF; produk: 2-kloropropana.'],
    explanation: {
      summary: 'HCl menambahkan Markovnikov ke propena menghasilkan 2-kloropropana; peroksida tidak mengubah orientasi HCl.',
      mechanism: ['H masuk ke C1.', 'Cl masuk ke C2.', 'Terbentuk 2-kloropropana.'],
    },
    learningObjectives: ['Markovnikov untuk HCl', 'Batasan efek peroksida'],
  }),
  E({
    id: 'AL-18', zone: 'hydrohalogenation-lab', title: 'HBr pada Butena', difficulty: 2,
    category: 'Hidrohalogenasi', reactant: 'but-1-ene', targetProduct: '2-bromobutane', reagent: 'HBr',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: null, equivalents: null, peroxide: true },
    ruleId: 'hydrohalogenation',
    mission: 'Tambahkan HBr ke but-1-ena mengikuti Markovnikov untuk membentuk 2-bromobutana.',
    hints: ['Ikatan rangkap di C1–C2.', 'C1 punya 2 H, C2 punya 1 H.', 'Br masuk ke C2 (lebih sedikit H).', 'Pilih HBr, peroksida OFF; produk: 2-bromobutana.'],
    explanation: {
      summary: 'HBr Markovnikov pada but-1-ena menempatkan Br di C2, menghasilkan 2-bromobutana.',
      mechanism: ['H masuk ke C1.', 'Br masuk ke C2.', 'Terbentuk 2-bromobutana.'],
    },
    learningObjectives: ['Markovnikov pada alkena terminal'],
  }),
  E({
    id: 'AL-19', zone: 'hydrohalogenation-lab', title: 'Karbokation Tersier', difficulty: 2,
    category: 'Hidrohalogenasi', reactant: '2-methylpropene', targetProduct: '2-chloro-2-methylpropane', reagent: 'HCl',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    ruleId: 'hydrohalogenation',
    mission: 'Tambahkan HCl ke 2-metilpropena. Cl masuk ke karbon pusat yang paling tersubstitusi.',
    hints: ['Karbon pusat terikat ke tiga karbon lain.', 'Markovnikov: Cl ke karbon paling tersubstitusi.', 'Cl masuk ke karbon pusat.', 'Pilih HCl; produk: 2-kloro-2-metilpropana.'],
    explanation: {
      summary: 'HCl menambahkan Markovnikov: Cl ke karbon pusat 2-metilpropena, menghasilkan 2-kloro-2-metilpropana.',
      mechanism: ['H masuk ke karbon rangkap terminal.', 'Cl masuk ke karbon pusat (tersier).', 'Terbentuk 2-kloro-2-metilpropana.'],
    },
    learningObjectives: ['Markovnikov dan stabilitas karbokation'],
  }),
  E({
    id: 'AL-20', zone: 'hydrohalogenation-lab', title: 'Efek Peroksida', difficulty: 2,
    category: 'Hidrohalogenasi', reactant: 'propene', targetProduct: '1-bromopropane', reagent: 'HBr',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: true },
    conditionControls: { catalyst: null, equivalents: null, peroxide: true },
    ruleId: 'hydrohalogenation-anti',
    mission: 'Tambahkan HBr ke propena DENGAN peroksida untuk menghasilkan 1-bromopropana (anti-Markovnikov).',
    hints: ['Peroksida membalik orientasi HBr.', 'Anti-Markovnikov: Br ke karbon yang kurang tersubstitusi.', 'Br masuk ke C1 (ujung).', 'Pilih HBr, peroksida ON; produk: 1-bromopropana.'],
    explanation: {
      summary: 'Dengan peroksida, HBr menambahkan anti-Markovnikov: Br ke C1 propena, menghasilkan 1-bromopropana.',
      mechanism: ['Peroksida memulai mekanisme radikal.', 'Br masuk ke C1 (kurang tersubstitusi).', 'H masuk ke C2; terbentuk 1-bromopropana.'],
    },
    learningObjectives: ['Efek peroksida', 'Orientasi anti-Markovnikov'],
  }),

  // ================= ZONE 5: Hydration Research =================
  E({
    id: 'AL-21', zone: 'hydration-research', title: 'Hidrasi Etena', difficulty: 2,
    category: 'Hidrasi', reactant: 'ethene', targetProduct: 'ethanol', reagent: 'H2O',
    conditions: { catalyst: 'H2SO4', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['none', 'H2SO4', 'HgSO4/H2SO4'], equivalents: null, peroxide: false },
    ruleId: 'hydration',
    mission: 'Tambahkan air ke etena dengan katalis asam untuk membentuk etanol.',
    hints: ['Hidrasi menambahkan H dan OH.', 'Butuh katalis asam H₂SO₄.', 'Reagen adalah H₂O.', 'Pilih H₂O + H₂SO₄; produk: etanol.'],
    explanation: {
      summary: 'H₂O dengan katalis H₂SO₄ menambahkan H dan OH ke etena, menghasilkan etanol.',
      mechanism: ['Ikatan π putus.', 'OH masuk ke satu karbon, H ke karbon lain.', 'Terbentuk etanol C₂H₅OH.'],
    },
    learningObjectives: ['Hidrasi alkena', 'Katalis asam'],
  }),
  E({
    id: 'AL-22', zone: 'hydration-research', title: 'Propan-2-ol', difficulty: 2,
    category: 'Hidrasi', reactant: 'propene', targetProduct: 'propan-2-ol', reagent: 'H2O',
    conditions: { catalyst: 'H2SO4', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['none', 'H2SO4', 'HgSO4/H2SO4'], equivalents: null, peroxide: false },
    ruleId: 'hydration',
    mission: 'Hidrasi propena mengikuti Markovnikov untuk membentuk propan-2-ol.',
    hints: ['Hidrasi mengikuti Markovnikov.', 'OH masuk ke C2 (lebih tersubstitusi).', 'Gunakan H₂O + H₂SO₄.', 'Produk: propan-2-ol.'],
    explanation: {
      summary: 'H₂O/H₂SO₄ menambahkan Markovnikov: OH ke C2 propena, menghasilkan propan-2-ol.',
      mechanism: ['H masuk ke C1.', 'OH masuk ke C2.', 'Terbentuk propan-2-ol.'],
    },
    learningObjectives: ['Hidrasi Markovnikov', 'Sintesis alkohol sekunder'],
  }),
  E({
    id: 'AL-23', zone: 'hydration-research', title: 'Butan-2-ol', difficulty: 2,
    category: 'Hidrasi', reactant: 'but-1-ene', targetProduct: 'butan-2-ol', reagent: 'H2O',
    conditions: { catalyst: 'H2SO4', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['none', 'H2SO4', 'HgSO4/H2SO4'], equivalents: null, peroxide: false },
    ruleId: 'hydration',
    mission: 'Hidrasi but-1-ena untuk membentuk butan-2-ol (OH di C2).',
    hints: ['Markovnikov: OH ke karbon lebih tersubstitusi.', 'C2 lebih tersubstitusi daripada C1.', 'Gunakan H₂O + H₂SO₄.', 'Produk: butan-2-ol.'],
    explanation: {
      summary: 'H₂O/H₂SO₄ menambahkan OH ke C2 but-1-ena, menghasilkan butan-2-ol.',
      mechanism: ['H masuk ke C1.', 'OH masuk ke C2.', 'Terbentuk butan-2-ol.'],
    },
    learningObjectives: ['Hidrasi alkena terminal'],
  }),
  E({
    id: 'AL-24', zone: 'hydration-research', title: 'Alkohol Tersier', difficulty: 2,
    category: 'Hidrasi', reactant: '2-methylpropene', targetProduct: '2-methylpropan-2-ol', reagent: 'H2O',
    conditions: { catalyst: 'H2SO4', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['none', 'H2SO4', 'HgSO4/H2SO4'], equivalents: null, peroxide: false },
    ruleId: 'hydration',
    mission: 'Hidrasi 2-metilpropena untuk membentuk 2-metilpropan-2-ol (alkohol tersier).',
    hints: ['OH masuk ke karbon paling tersubstitusi.', 'Karbon pusat adalah posisi Markovnikov.', 'Gunakan H₂O + H₂SO₄.', 'Produk: 2-metilpropan-2-ol.'],
    explanation: {
      summary: 'H₂O/H₂SO₄ menambahkan OH ke karbon pusat 2-metilpropena, menghasilkan alkohol tersier.',
      mechanism: ['H masuk ke karbon terminal.', 'OH masuk ke karbon pusat.', 'Terbentuk 2-metilpropan-2-ol.'],
    },
    learningObjectives: ['Sintesis alkohol tersier', 'Markovnikov pada alkena bercabang'],
  }),
  E({
    id: 'AL-25', zone: 'hydration-research', title: 'Hidrasi Simetris', difficulty: 2,
    category: 'Hidrasi', reactant: 'but-2-ene', targetProduct: 'butan-2-ol', reagent: 'H2O',
    conditions: { catalyst: 'H2SO4', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['none', 'H2SO4', 'HgSO4/H2SO4'], equivalents: null, peroxide: false },
    ruleId: 'hydration',
    mission: 'Hidrasi but-2-ena (simetris) untuk membentuk butan-2-ol.',
    hints: ['But-2-ena simetris di C2–C3.', 'OH bisa masuk ke C2 atau C3 — hasilnya sama.', 'Gunakan H₂O + H₂SO₄.', 'Produk: butan-2-ol.'],
    explanation: {
      summary: 'H₂O/H₂SO₄ menghidrasi but-2-ena simetris menjadi butan-2-ol.',
      mechanism: ['H dan OH menambah ke C2/C3.', 'Karena simetris, produk tunggal.', 'Terbentuk butan-2-ol.'],
    },
    learningObjectives: ['Hidrasi alkena simetris'],
  }),

  // ================= ZONE 6: Alkyne Research =================
  E({
    id: 'AL-26', zone: 'alkyne-research', title: 'Katalis Lindlar', difficulty: 2,
    category: 'Hidrogenasi Selektif', reactant: 'ethyne', targetProduct: 'ethene', reagent: 'H2',
    conditions: { catalyst: 'Lindlar', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['Ni', 'Pt', 'Pd', 'Lindlar'], equivalents: null, peroxide: false },
    ruleId: 'hydrogenation-lindlar',
    mission: 'Hentikan reduksi etuna pada tahap etena menggunakan katalis Lindlar.',
    hints: ['Lindlar adalah katalis "teracuni" yang berhenti di alkena.', 'Jangan gunakan Ni/Pt/Pd (reduksi penuh).', 'Pilih H₂ dengan katalis Lindlar.', 'Produk: etena (C=C), bukan etana.'],
    explanation: {
      summary: 'Katalis Lindlar menghentikan hidrogenasi etuna pada etena (C=C), tidak lanjut ke etana.',
      mechanism: ['H₂ menambah satu kali ke C≡C.', 'Lindlar mencegah reduksi kedua.', 'Terbentuk etena.'],
    },
    learningObjectives: ['Hidrogenasi selektif', 'Katalis Lindlar'],
  }),
  E({
    id: 'AL-27', zone: 'alkyne-research', title: 'Brominasi Alkuna Terkontrol', difficulty: 2,
    category: 'Halogenasi', reactant: 'ethyne', targetProduct: '1,2-dibromoethene', reagent: 'Br2',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: null, equivalents: [1, 2], peroxide: false },
    ruleId: 'halogenation',
    mission: 'Tambahkan 1 ekuivalen Br₂ ke etuna untuk membentuk 1,2-dibromoetena (masih ada C=C).',
    hints: ['Alkuna bisa ditambah sekali atau dua kali.', 'Satu ekuivalen Br₂ berhenti di alkena.', 'Atur ekuivalen = 1.', 'Produk: 1,2-dibromoetena dengan ikatan rangkap dua.'],
    explanation: {
      summary: 'Satu ekuivalen Br₂ menambahkan ke etuna menghasilkan 1,2-dibromoetena (C=C tersisa).',
      mechanism: ['C≡C → C=C.', 'Satu Br masuk ke tiap karbon.', 'Terbentuk 1,2-dibromoetena.'],
    },
    learningObjectives: ['Kontrol ekuivalen pada alkuna', 'Produk haloalkena'],
  }),
  E({
    id: 'AL-28', zone: 'alkyne-research', title: 'HCl pada Etuna', difficulty: 2,
    category: 'Hidrohalogenasi', reactant: 'ethyne', targetProduct: 'chloroethene', reagent: 'HCl',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: null, equivalents: [1, 2], peroxide: false },
    ruleId: 'hydrohalogenation',
    mission: 'Tambahkan 1 ekuivalen HCl ke etuna untuk membentuk kloroetena (vinil klorida).',
    hints: ['Satu ekuivalen HCl menambah sekali.', 'C≡C menjadi C=C.', 'Cl masuk ke salah satu karbon (etuna simetris).', 'Atur ekuivalen = 1; produk: kloroetena.'],
    explanation: {
      summary: 'Satu ekuivalen HCl menambahkan ke etuna menghasilkan kloroetena (C=C dengan satu Cl).',
      mechanism: ['C≡C → C=C.', 'H dan Cl menambah.', 'Terbentuk kloroetena.'],
    },
    learningObjectives: ['Hidrohalogenasi alkuna', 'Kontrol ekuivalen'],
  }),
  E({
    id: 'AL-29', zone: 'alkyne-research', title: 'Hidrasi Etuna', difficulty: 3,
    category: 'Hidrasi', reactant: 'ethyne', targetProduct: 'ethanal', reagent: 'H2O',
    conditions: { catalyst: 'HgSO4/H2SO4', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['H2SO4', 'HgSO4/H2SO4'], equivalents: null, peroxide: false },
    ruleId: 'hydration-alkyne',
    mission: 'Hidrasi etuna dengan HgSO₄/H₂SO₄. Enol yang terbentuk bertautomerisasi menjadi etanal.',
    hints: ['Hidrasi alkuna butuh HgSO₄ dalam H₂SO₄.', 'Produk awal adalah enol (C=C–OH).', 'Enol bertautomerisasi menjadi aldehida (C=O).', 'Pilih H₂O + HgSO₄/H₂SO₄; produk akhir: etanal.'],
    explanation: {
      summary: 'H₂O/HgSO₄ menghidrasi etuna menjadi enol, yang bertautomerisasi menjadi etanal (aldehida).',
      mechanism: ['H dan OH menambah ke C≡C → enol.', 'Tautomerisasi: C–O → C=O, C=C → C–C.', 'Terbentuk etanal CH₃CHO.'],
    },
    learningObjectives: ['Hidrasi alkuna', 'Tautomerisasi enol-keto'],
  }),
  E({
    id: 'AL-30', zone: 'alkyne-research', title: 'Propuna ke Propanon', difficulty: 3,
    category: 'Hidrasi', reactant: 'propyne', targetProduct: 'propanone', reagent: 'H2O',
    conditions: { catalyst: 'HgSO4/H2SO4', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['H2SO4', 'HgSO4/H2SO4'], equivalents: null, peroxide: false },
    ruleId: 'hydration-alkyne',
    mission: 'Hidrasi propuna mengikuti Markovnikov; enol bertautomerisasi menjadi propanon (aseton).',
    hints: ['OH masuk ke karbon lebih tersubstitusi (C2).', 'Enol terbentuk lalu bertautomerisasi.', 'Karbonil (C=O) ada di C2.', 'Pilih H₂O + HgSO₄/H₂SO₄; produk: propanon.'],
    explanation: {
      summary: 'Hidrasi Markovnikov propuna menghasilkan enol yang bertautomerisasi menjadi propanon (keton).',
      mechanism: ['OH masuk ke C2 → enol.', 'Tautomerisasi ke bentuk keto.', 'Terbentuk propanon (C=O di C2).'],
    },
    learningObjectives: ['Hidrasi alkuna Markovnikov', 'Sintesis keton'],
  }),

  // ================= ZONE 7: Selective Reaction Lab =================
  E({
    id: 'AL-31', zone: 'selective-reaction-lab', title: 'Tetrabromida', difficulty: 3,
    category: 'Halogenasi', reactant: 'ethyne', targetProduct: '1,1,2,2-tetrabromoethane', reagent: 'Br2',
    conditions: { catalyst: 'none', equivalents: 2, peroxide: false },
    conditionControls: { catalyst: null, equivalents: [1, 2], peroxide: false },
    ruleId: 'halogenation',
    mission: 'Tambahkan 2 ekuivalen Br₂ ke etuna untuk membentuk 1,1,2,2-tetrabromoetana.',
    hints: ['Dua ekuivalen Br₂ menambah empat atom Br.', 'C≡C menjadi C–C tunggal.', 'Dua Br di tiap karbon.', 'Atur ekuivalen = 2; produk: tetrabromoetana.'],
    explanation: {
      summary: 'Dua ekuivalen Br₂ menambahkan empat Br ke etuna, menghasilkan 1,1,2,2-tetrabromoetana.',
      mechanism: ['Ekuivalen 1: C≡C → C=C + 2 Br.', 'Ekuivalen 2: C=C → C–C + 2 Br.', 'Total empat Br (dua per karbon).'],
    },
    learningObjectives: ['Adisi ganda pada alkuna', 'Produk tetrahalida'],
  }),
  E({
    id: 'AL-32', zone: 'selective-reaction-lab', title: 'HBr Selektif pada Propuna', difficulty: 3,
    category: 'Hidrohalogenasi', reactant: 'propyne', targetProduct: '2-bromopropene', reagent: 'HBr',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: null, equivalents: [1, 2], peroxide: false },
    ruleId: 'hydrohalogenation',
    mission: 'Tambahkan 1 ekuivalen HBr ke propuna (Markovnikov) untuk membentuk 2-bromopropena.',
    hints: ['Satu ekuivalen berhenti di alkena.', 'Markovnikov: Br ke C2.', 'C≡C menjadi C=C.', 'Atur ekuivalen = 1; produk: 2-bromopropena.'],
    explanation: {
      summary: 'Satu ekuivalen HBr Markovnikov pada propuna menghasilkan 2-bromopropena (Br di C2, C=C tersisa).',
      mechanism: ['C≡C → C=C.', 'Br masuk ke C2.', 'Terbentuk 2-bromopropena.'],
    },
    learningObjectives: ['Hidrohalogenasi alkuna selektif', 'Markovnikov pada alkuna'],
  }),
  E({
    id: 'AL-33', zone: 'selective-reaction-lab', title: 'Dihalida Geminal', difficulty: 3,
    category: 'Hidrohalogenasi', reactant: 'propyne', targetProduct: '2,2-dibromopropane', reagent: 'HBr',
    conditions: { catalyst: 'none', equivalents: 2, peroxide: false },
    conditionControls: { catalyst: null, equivalents: [1, 2], peroxide: false },
    ruleId: 'hydrohalogenation',
    mission: 'Tambahkan 2 ekuivalen HBr ke propuna untuk membentuk 2,2-dibromopropana (dua Br di karbon yang sama).',
    hints: ['Dua ekuivalen HX pada alkuna → dihalida geminal.', 'Kedua Br masuk ke C2 (Markovnikov).', 'C≡C menjadi C–C.', 'Atur ekuivalen = 2; produk: 2,2-dibromopropana.'],
    explanation: {
      summary: 'Dua ekuivalen HBr menambahkan ke propuna menghasilkan dihalida geminal: dua Br di C2.',
      mechanism: ['Ekuivalen 1: Br ke C2, C≡C → C=C.', 'Ekuivalen 2: Br lagi ke C2, C=C → C–C.', 'Terbentuk 2,2-dibromopropana.'],
    },
    learningObjectives: ['Dihalida geminal', 'Adisi ganda HX'],
  }),
  E({
    id: 'AL-34', zone: 'selective-reaction-lab', title: 'Lindlar pada Propuna', difficulty: 3,
    category: 'Hidrogenasi Selektif', reactant: 'propyne', targetProduct: 'propene', reagent: 'H2',
    conditions: { catalyst: 'Lindlar', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['Ni', 'Pt', 'Pd', 'Lindlar'], equivalents: null, peroxide: false },
    ruleId: 'hydrogenation-lindlar',
    mission: 'Reduksi propuna selektif menjadi propena menggunakan katalis Lindlar.',
    hints: ['Lindlar berhenti di alkena.', 'Jangan reduksi penuh ke propana.', 'Pilih H₂ + Lindlar.', 'Produk: propena.'],
    explanation: {
      summary: 'Lindlar menghentikan reduksi propuna pada propena.',
      mechanism: ['H₂ menambah sekali ke C≡C.', 'Lindlar mencegah reduksi lanjut.', 'Terbentuk propena.'],
    },
    learningObjectives: ['Hidrogenasi selektif alkuna'],
  }),
  E({
    id: 'AL-35', zone: 'selective-reaction-lab', title: 'Butanon dari Butuna', difficulty: 3,
    category: 'Hidrasi', reactant: 'but-1-yne', targetProduct: 'butanone', reagent: 'H2O',
    conditions: { catalyst: 'HgSO4/H2SO4', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['H2SO4', 'HgSO4/H2SO4'], equivalents: null, peroxide: false },
    ruleId: 'hydration-alkyne',
    mission: 'Hidrasi but-1-una (Markovnikov) lalu tautomerisasi untuk membentuk butanon.',
    hints: ['OH masuk ke C2 (lebih tersubstitusi).', 'Enol bertautomerisasi ke keton.', 'C=O di C2.', 'Pilih H₂O + HgSO₄/H₂SO₄; produk: butanon.'],
    explanation: {
      summary: 'Hidrasi Markovnikov but-1-una menghasilkan enol yang bertautomerisasi menjadi butanon.',
      mechanism: ['OH ke C2 → enol.', 'Tautomerisasi ke keto.', 'Terbentuk butanon (C=O di C2).'],
    },
    learningObjectives: ['Hidrasi alkuna terminal', 'Sintesis keton'],
  }),

  // ================= ZONE 8: Master Reaction Chamber =================
  E({
    id: 'AL-36', zone: 'master-reaction-chamber', title: 'Ujian Lindlar', difficulty: 3,
    category: 'Hidrogenasi Selektif', reactant: 'but-2-yne', targetProduct: 'but-2-ene', reagent: 'H2',
    conditions: { catalyst: 'Lindlar', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: ['Ni', 'Pt', 'Pd', 'Lindlar'], equivalents: null, peroxide: false },
    ruleId: 'hydrogenation-lindlar',
    mission: 'Reduksi but-2-una selektif menjadi but-2-ena. Pilih katalis yang tepat.',
    hints: ['Target masih punya C=C (alkena).', 'Berarti reduksi berhenti setengah.', 'Gunakan Lindlar.', 'Pilih H₂ + Lindlar; produk: but-2-ena.'],
    explanation: {
      summary: 'Lindlar mereduksi but-2-una menjadi but-2-ena tanpa lanjut ke butana.',
      mechanism: ['H₂ menambah sekali.', 'Lindlar menghentikan di C=C.', 'Terbentuk but-2-ena.'],
    },
    learningObjectives: ['Selektivitas katalis'],
  }),
  E({
    id: 'AL-37', zone: 'master-reaction-chamber', title: 'Dibromoalkena', difficulty: 3,
    category: 'Halogenasi', reactant: 'but-2-yne', targetProduct: '2,3-dibromobut-2-ene', reagent: 'Br2',
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    conditionControls: { catalyst: null, equivalents: [1, 2], peroxide: false },
    ruleId: 'halogenation',
    mission: 'Tambahkan 1 ekuivalen Br₂ ke but-2-una untuk membentuk 2,3-dibromobut-2-ena.',
    hints: ['Target masih ada C=C → satu ekuivalen.', 'Br masuk ke C2 dan C3.', 'Atur ekuivalen = 1.', 'Produk: 2,3-dibromobut-2-ena.'],
    explanation: {
      summary: 'Satu ekuivalen Br₂ pada but-2-una menghasilkan 2,3-dibromobut-2-ena.',
      mechanism: ['C≡C → C=C.', 'Br ke C2 dan C3.', 'Terbentuk 2,3-dibromobut-2-ena.'],
    },
    learningObjectives: ['Kontrol ekuivalen', 'Analisis produk'],
  }),
  E({
    id: 'AL-38', zone: 'master-reaction-chamber', title: 'Tebak Reagen: Iodida', difficulty: 3,
    category: 'Hidrohalogenasi', reactant: 'but-1-ene', targetProduct: '2-iodobutane', reagent: 'HI',
    revealReagent: false,
    conditions: { catalyst: 'none', equivalents: 1, peroxide: false },
    ruleId: 'hydrohalogenation',
    mission: 'Produk target adalah 2-iodobutana. Analisis produknya dan tentukan reagen yang tepat untuk but-1-ena.',
    hints: ['Produk punya satu atom iodin (I).', 'Berarti reagen mengandung I: HI.', 'I masuk mengikuti Markovnikov (C2).', 'Pilih HI, tanpa peroksida; produk: 2-iodobutana.'],
    explanation: {
      summary: 'Untuk membuat 2-iodobutana dari but-1-ena, gunakan HI (Markovnikov: I ke C2).',
      mechanism: ['Produk mengandung I → reagen HI.', 'H ke C1, I ke C2.', 'Terbentuk 2-iodobutana.'],
    },
    learningObjectives: ['Analisis retrosintetik', 'Pemilihan reagen'],
  }),
  E({
    id: 'AL-39', zone: 'master-reaction-chamber', title: 'Tebak Kondisi: Anti-Markovnikov', difficulty: 3,
    category: 'Hidrohalogenasi', reactant: '2-methylpropene', targetProduct: '1-bromo-2-methylpropane', reagent: 'HBr',
    revealReagent: false,
    conditions: { catalyst: 'none', equivalents: 1, peroxide: true },
    conditionControls: { catalyst: null, equivalents: null, peroxide: true },
    ruleId: 'hydrohalogenation-anti',
    mission: 'Produk target: 1-bromo-2-metilpropana (Br di karbon terminal). Tentukan reagen DAN kondisi yang tepat.',
    hints: ['Br di karbon terminal = anti-Markovnikov.', 'Anti-Markovnikov butuh HBr + peroksida.', 'Tanpa peroksida, Br akan ke karbon pusat.', 'Pilih HBr, peroksida ON.'],
    explanation: {
      summary: 'Br di karbon terminal menandakan anti-Markovnikov: HBr dengan peroksida pada 2-metilpropena.',
      mechanism: ['Produk: Br terminal → anti-Markovnikov.', 'Butuh HBr + peroksida.', 'Terbentuk 1-bromo-2-metilpropana.'],
    },
    learningObjectives: ['Retrosintesis orientasi', 'Efek peroksida'],
  }),
  E({
    id: 'AL-40', zone: 'master-reaction-chamber', title: 'Ujian Akhir: Geminal', difficulty: 3,
    category: 'Hidrohalogenasi', reactant: 'but-1-yne', targetProduct: '2,2-dibromobutane', reagent: 'HBr',
    revealReagent: false,
    conditions: { catalyst: 'none', equivalents: 2, peroxide: false },
    conditionControls: { catalyst: null, equivalents: [1, 2], peroxide: true },
    ruleId: 'hydrohalogenation',
    mission: 'Produk target: 2,2-dibromobutana dari but-1-una. Tentukan reagen, ekuivalen, dan kondisi.',
    hints: ['Dua Br di karbon yang sama = dihalida geminal.', 'Geminal dari alkuna + 2 ekuivalen HX.', 'Reagen HBr, ekuivalen 2, tanpa peroksida.', 'Pilih HBr, ekuivalen = 2, peroksida OFF.'],
    explanation: {
      summary: 'Dua ekuivalen HBr (Markovnikov) pada but-1-una menghasilkan 2,2-dibromobutana (geminal di C2).',
      mechanism: ['Dua Br di C2 → 2 ekuivalen HBr.', 'Markovnikov menempatkan keduanya di C2.', 'Terbentuk 2,2-dibromobutana.'],
    },
    learningObjectives: ['Retrosintesis lengkap', 'Dihalida geminal', 'Kontrol ekuivalen'],
  }),
];

export function getExperiment(id) {
  return EXPERIMENTS.find((experiment) => experiment.id === id) ?? null;
}

export function getExperimentsByZone(zoneId) {
  return EXPERIMENTS.filter((experiment) => experiment.zone === zoneId);
}

export function getExperimentIndex(id) {
  return EXPERIMENTS.findIndex((experiment) => experiment.id === id);
}

export function experimentDetails(experiment) {
  return {
    ...experiment,
    zoneData: getZone(experiment.zone),
    reactantData: getMolecule(experiment.reactant),
    productData: getMolecule(experiment.targetProduct),
    reagentData: getReagent(experiment.reagent),
  };
}