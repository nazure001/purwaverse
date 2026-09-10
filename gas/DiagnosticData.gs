function seedOfficialDiagnostic_() {
  OFFICIAL_DIAGNOSTIC_.forEach(item => upsert_('DIAGNOSTIC_ITEMS','item_id',item));
  OFFICIAL_SELF_MAP_.forEach(item => upsert_('SELF_MAP_ITEMS','item_id',item));
  return {diagnostic:OFFICIAL_DIAGNOSTIC_.length,selfMap:OFFICIAL_SELF_MAP_.length};
}

function diagnosticItem_(number,domain,title,story,challenge,anchor,evidence){
  return {
    item_id:'D'+String(number).padStart(2,'0'),
    source_number:number,
    domain,
    prompt:title+'\n\n'+story+'\n\nTantangan: '+challenge,
    rubric_json:JSON.stringify({
      anchor,
      evidence,
      levels:{
        0:'Kosong, tidak relevan, atau menyalin kalimat prompt tanpa gagasan.',
        1:'Tebakan spekulatif atau kesan emosional; alasan sangat lemah atau hanya mengulang cerita.',
        2:'Dugaan masuk akal dengan hubungan logis sederhana; bukti atau konsep masih parsial.',
        3:'Penjelasan koheren berbasis petunjuk cerita atau konsep IPA yang tepat; belum lengkap mengantisipasi variabel lain/keterbatasan.',
        4:'Menangkap petunjuk utama, membandingkan kemungkinan lain, memakai bukti/konsep logis, menyadari keterbatasan, dan merancang uji pembeda bila relevan.'
      }
    }),
    max_score:4,
    active:true,
    source_status:'OFFICIAL_BANK_V3'
  };
}

const OFFICIAL_DIAGNOSTIC_ = [
  // ==========================================
  // DOMAIN 1: OBSERVE & INFER (5 Butir)
  // ==========================================
  diagnosticItem_(
    1,
    'observe_infer',
    'Lift yang Terlalu Tinggi',
    'Raka tinggal di apartemen lantai 8. Setiap pulang sekolah ia masuk lift sambil membawa payung kecil, bahkan saat cuaca sangat cerah. Anehnya, payung itu tidak pernah dibawa keluar gedung. Di dalam lift, Raka selalu memegangnya tegak lalu tersenyum ketika lift mulai bergerak naik.',
    'Menurutmu, untuk apa payung itu sebenarnya digunakan? Petunjuk apa dari cerita yang membuatmu berpikir begitu?',
    'Payung dipakai sebagai alat bantu menjangkau atau menekan tombol lantai atas lift yang letaknya terlalu tinggi bagi tinggi badan Raka.',
    'Menghubungkan petunjuk bahwa payung tidak dipakai keluar saat hujan dan posisi memegang tegak di dalam lift dengan fungsi mekanik penekan tombol.'
  ),
  diagnosticItem_(
    2,
    'observe_infer',
    'Misteri Sepeda Berdecit',
    'Sepeda milik Doni bersuara decitan mencurigakan setiap kali ia membonceng adiknya yang bertubuh gempal. Begitu adiknya turun dan Doni bersepeda sendirian, bunyi decitan itu hilang total, padahal rantai sepedanya sudah dilumasi oli basah sampai berkilau.',
    'Di bagian mana kemungkinan besar bunyi decitan itu muncul dan mengapa? Mengapa oli rantai tidak menyelesaikan masalahnya?',
    'Decitan berasal dari gesekan akibat tekanan beban berlebih, misalnya gesekan ban dengan rangka/sepatu rem atau per sadel/bearing roda yang tertekan.',
    'Mengidentifikasi bahwa bunyi hanya muncul saat ada beban tambahan (bukan dari rantai) dan menyadari titik gesek struktural pada sepeda.'
  ),
  diagnosticItem_(
    4,
    'observe_infer',
    'Jejak Embun di Kaca Kelas',
    'Pagi-pagi saat udara luar sangat dingin, kaca jendela kelas 8A bagian dalam dipenuhi titik-titik embun basah sampai bisa digambari jari. Namun anehnya, kaca jendela kelas 8B di sebelahnya kering bersih. Padahal kedua ruang kelas sama-sama ditutup semalaman.',
    'Apa yang mungkin berbeda di dalam ruangan kelas 8A semalam dibanding kelas 8B sehingga embun terbentuk? Berikan alasanmu.',
    'Ruang kelas 8A memiliki kelembapan udara dalam ruangan yang lebih tinggi (misalnya ada tanaman basah, ember air, lantai baru dipel sore, atau sirkulasi tertutup rapat) saat udara luar mendinginkan kaca.',
    'Menjelaskan proses pengembunan (kondensasi) dari uap air hangat di dalam ruangan yang menyentuh permukaan kaca dingin, serta membandingkan variabel kelembapan antar dua kelas.'
  ),
  diagnosticItem_(
    5,
    'observe_infer',
    'Kecambah yang Menang Tinggi',
    'Dua biji kacang hijau ditanam di wadah yang sama persis. Biji A disimpan di dalam lemari gelap gulita, sedangkan Biji B diletakkan di dekat jendela terbuka. Seminggu kemudian, kecambah A batangnya kurus pucat tetapi tingginya 15 cm. Kecambah B tingginya hanya 7 cm, namun daunnya hijau lebat dan batangnya kokoh gemuk.',
    'Apakah kecambah A yang lebih tinggi itu bisa dibilang tanaman yang lebih sehat dan subur? Gunakan petunjuk dari cerita untuk menjelaskan pendapatmu.',
    'Tidak lebih sehat. Tanaman A mengalami etiolasi (memanjang mencari cahaya) sehingga kekurangan zat hijau daun dan rapuh.',
    'Menyimpulkan bahwa tinggi semata bukan tanda sehat, dan menggunakan perbedaan warna hijau daun serta kekokohan batang sebagai bukti kebutuhan cahaya.'
  ),
  diagnosticItem_(
    6,
    'observe_infer',
    'Kucing di Ubin Kamar Mandi',
    'Saat siang hari yang sangat terik dan menyengat, seekor kucing berbulu lebat selalu menempelkan perutnya di atas lantai semen kamar mandi yang teduh. Karpet bulu empuk di ruang tengah sama sekali tidak ia sentuh seharian.',
    'Mengapa lantai semen terasa lebih menyejukkan bagi kucing daripada karpet empuk, padahal keduanya berada di suhu ruangan yang sama? Jelaskan alasannya.',
    'Lantai semen/ubin menyerap dan menghantarkan panas tubuh kucing jauh lebih cepat (konduktivitas lebih baik) dibanding karpet yang merupakan penyekat (isolator) penahan panas.',
    'Membedakan laju perpindahan panas (penghantar vs isolator) tanpa terjebak anggapan bahwa lantai secara mandiri "menghasilkan es".'
  ),

  // ==========================================
  // DOMAIN 2: EVIDENCE & EXPERIMENT (5 Butir)
  // ==========================================
  diagnosticItem_(
    7,
    'evidence_experiment',
    'Rahasia Es Teh Kantin',
    'Siti membeli dua gelas es teh yang takarannya sama di kantin. Gelas pertama plastik bening tipis terbuka. Gelas kedua dari kertas tebal dan ditutup selembar tisu. Sepuluh menit kemudian, es pada gelas plastik sudah mencair habis menjadi air, sedangkan di gelas kertas es batunya masih tersisa banyak.',
    'Seorang teman berkata: "Tisu penutupnya yang mendinginkan es!" Apakah klaim itu benar? Bagaimana kamu membuktikannya lewat pengujian sederhana?',
    'Klaim keliru; tisu bukan pendingin, melainkan penghambat udara hangat masuk. Pengujian adil dilakukan dengan membandingkan gelas kertas bertutup vs tanpa tutup, dan gelas plastik bertutup vs tanpa tutup.',
    'Menyusun variabel kontrol (jenis wadah dibuat sama) untuk menguji secara adil pengaruh penutup tisu vs bahan dinding gelas.'
  ),
  diagnosticItem_(
    8,
    'evidence_experiment',
    'Balapan Dua Mobil Mainan',
    'Dua mobil mainan dilepas bersamaan dari puncak lintasan papan miring yang sama. Mobil A lebih berat dari besi. Mobil B lebih ringan dari plastik. Mobil A tiba di garis akhir lebih dulu. Seorang siswa langsung menyimpulkan: "Benda yang lebih berat pasti selalu meluncur lebih cepat!"',
    'Apakah kesimpulan siswa itu sudah sah dan meyakinkan? Sebutkan hal-hal lain pada kedua mobil yang harus diperiksa sebelum kita mempercayai kesimpulannya!',
    'Belum sah karena massa bukan satu-satunya faktor penentu gerak luncurnya.',
    'Meminta pemeriksaan variabel roda (kehalusan putaran/gesekan bantalan), hambatan udara (bentuk aerodinamis), dan bahan permukaan roda mobil mainan.'
  ),
  diagnosticItem_(
    9,
    'evidence_experiment',
    'Tanaman Pilihan Kelas',
    'Kelompok 1 ingin mengetahui pupuk terbaik untuk tomat. Mereka memberi pupuk kompos pada pot tomat di dekat jendela luar yang terang. Kelompok 2 memberi pupuk kandang pada pot tomat di sudut kelas yang agak gelap. Sebulan kemudian, tomat dekat jendela tumbuh dua kali lebih banyak buahnya.',
    'Mengapa perbandingan ini belum adil (belum fair)? Bagaimana cara mengatur percobaan yang benar-benar adil agar kita tahu pupuk mana yang juara?',
    'Tidak adil karena jumlah cahaya yang diterima kedua tanaman berbeda jauh, sehingga buah banyak belum tentu karena jenis pupuknya.',
    'Merancang percobaan adil di mana jenis pupuk adalah satu-satunya perbedaan (variabel bebas), sedangkan cahaya, air, jenis pot, tanah dasar, dan umur bibit dibuat sama persis (variabel kontrol).'
  ),
  diagnosticItem_(
    14,
    'evidence_experiment',
    'Pelarut Gula Misterius',
    'Budi mengklaim: "Gula pasir akan lebih cepat larut di air dingin kalau diaduk sangat kencang, daripada ditaruh di air panas tanpa diaduk!" Temannya tidak percaya.',
    'Rancanglah satu percobaan sederhana untuk menguji apakah klaim Budi benar atau salah. Hal apa saja yang wajib kamu samakan, dan apa yang kamu ubah?',
    'Uji perbandingan langsung: Satu gelas air dingin diaduk cepat vs satu gelas air panas tanpa aduk dengan jumlah air dan massa gula yang sama, lalu catat waktu sampai butir gula hilang sepenuhnya.',
    'Menentukan waktu larut sebagai ukuran terukur, menyamakan takaran air dan gula, serta mencatat batasan perlakuan suhu vs pengadukan mekanik.'
  ),
  diagnosticItem_(
    24,
    'evidence_experiment',
    'Kelas Paling Sejuk',
    'Kelas 8A mengaku paling sejuk karena punya 4 kipas angin. Kelas 8B mengaku paling sejuk karena punya 6 jendela lebar. Kelas 8C mengaku paling sejuk karena dinaungi pohon rindang. Kamu diberi tugas mencari tahu kebenarannya, tetapi kamu hanya memegang 2 termometer ruangan dan waktu pengujian hanya 1 hari sekolah.',
    'Bagaimana caramu mengatur waktu, tempat, dan cara mengukur agar perbandingan suhu ketiga kelas itu adil dan tidak ada kelas yang merasa dicurangi?',
    'Pengukuran harus dilakukan di jam yang sama (misal pagi, siang, sore), titik letak termometer di tiap kelas harus setara (ketinggian sama, tidak tepat di bawah kipas atau sinar langsung), dan termometer dirotasi/dikalibrasi antar kelas.',
    'Menyadari keterbatasan alat (2 termometer untuk 3 kelas), merancang jadwal sampling serentak, dan mengontrol posisi penempatan alat ukur.'
  ),

  // ==========================================
  // DOMAIN 3: MODEL CONCEPT (5 Butir)
  // ==========================================
  diagnosticItem_(
    3,
    'model_concept',
    'Bayangan yang Kabur',
    'Di dinding kamar yang gelap, Naya menyorotkan senter ke tangannya. Ketika tangan didekatkan ke dinding, bayangan tangan tampak kecil dan tepinya sangat tajam. Namun saat tangan digeser mendekati senter menjauhi dinding, bayangannya membesar raksasa tetapi tepinya menjadi kabur dan buram.',
    'Tanpa memakai rumus hafalan, gambarkan dengan kata-katamu apa yang terjadi pada lintasan sinar cahaya senter sehingga tepinya jadi kabur saat tangan mendekati lampu senter!',
    'Lampu senter bukan satu titik cahaya tunggal melainkan memiliki luasan kaca sumber, sehingga saat benda mendekat, timbul daerah bayangan kabur (penumbra) di samping bayangan gelap inti.',
    'Menjelaskan arah berkas cahaya yang terhalang dari berbagai sudut sumber cahaya ke layar dinding.'
  ),
  diagnosticItem_(
    11,
    'model_concept',
    'Termos Nenek yang Dingin',
    'Sebuah termos tua milik nenek biasanya tahan menyimpan air mendidih sampai 24 jam. Suatu hari termos itu terbentur meja. Kaca luarnya tidak pecah, tetapi lapisan perak mengilap di dinding dalamnya retak dan udara masuk ke celah dinding gandanya. Sejak hari itu, air panas di dalamnya cepat dingin dalam 2 jam.',
    'Ke mana panas air itu kabur dan bagian termos mana yang sebenarnya gagal bekerja? Jelaskan aliran panasnya dengan bahasa sederhana!',
    'Panas kabur ke udara luar karena ruang hampa udara (vakum) pada dinding ganda termos telah bocor sehingga panas bisa merambat lewat konduksi dan konveksi udara, serta hilangnya pantulan radiasi dari lapisan perak.',
    'Menjelaskan fungsi lapisan perak sebagai pemantul radiasi dan ruang hampa sebagai pemutus rambatan panas ke lingkungan.'
  ),
  diagnosticItem_(
    13,
    'model_concept',
    'Air Panas yang Berhenti Naik',
    'Saat air di panci dipanaskan, termometer menunjukkan angka yang naik terus: 30°C, 50°C, 80°C, hingga menyentuh 100°C. Api kompor tetap menyala besar dan air menggelegak hebat menghasilkan banyak uap, tetapi ajaibnya jarum termometer tidak mau naik lagi melewati angka 100°C.',
    'Ke mana larinya energi panas dari api kompor yang terus membakar itu jika suhu airnya tidak mau bertambah panas lagi? Jelaskan!',
    'Energi panas dari kompor tidak lagi digunakan untuk menaikkan suhu, melainkan diserap untuk merenggangkan ikatan antar-partikel air cair agar bisa berubah wujud menjadi gas uap air (kalor laten penguapan).',
    'Menjelaskan konsep perubahan wujud zat dari cair ke gas yang membutuhkan energi tanpa menaikkan suhu termometer.'
  ),
  diagnosticItem_(
    15,
    'model_concept',
    'Balon Meletus di Lapangan',
    'Dua balon karet yang ditiup dengan ukuran sama persis diikat di tiang lapangan pada siang hari bolong. Balon pertama berwarna hitam pekat, balon kedua berwarna putih bersih. Setelah 10 menit, balon hitam tiba-tiba meletus keras "DOR!", sedangkan balon putih masih tenang mengembang.',
    'Apa yang membedakan cara warna hitam dan putih menyerap sinar matahari sehingga balon hitam meletus lebih dulu? Jelaskan apa yang terjadi pada udara di dalam balon!',
    'Warna hitam menyerap hampir seluruh radiasi sinar matahari dan mengubahnya jadi panas, sehingga udara di dalamnya cepat memuai dan menekan dinding karet yang melemah sampai meletus. Warna putih memantulkan sebagian besar cahaya.',
    'Menghubungkan sifat serapan warna terhadap radiasi cahaya dengan pemuaian partikel gas di dalam ruang tertutup.'
  ),
  diagnosticItem_(
    16,
    'model_concept',
    'Gema Suara di Aula Sekolah',
    'Ketika Edo berteriak di dalam gedung aula sekolah yang luas dan kosong melompong tanpa perabot, suaranya terdengar memantul berulang-ulang "Halo... lo... lo...". Tetapi ketika ia berteriak dengan kekuatan sama di dalam ruang perpustakaan yang penuh rak buku dan karpet, suaranya terdengar kering dan langsung padam.',
    'Mengapa suara bisa memantul panjang di aula tetapi cepat padam di perpustakaan? Bagaimana bunyi merambat dan berinteraksi dengan benda-benda itu?',
    'Dinding keras, halus, dan lantai luas aula memantulkan gelombang bunyi bolak-balik tanpa banyak kehilangan energi. Sebaliknya, buku, karpet, dan kertas di perpustakaan memiliki pori-pori yang menyerap energi gelombang bunyi.',
    'Menjelaskan interaksi gelombang bunyi (pemantulan pada permukaan keras vs penyerapan pada permukaan berpori lunak).'
  ),

  // ==========================================
  // DOMAIN 4: SYSTEMS & CAUSALITY (5 Butir)
  // ==========================================
  diagnosticItem_(
    12,
    'systems_causality',
    'Tikus yang Mendadak Banyak',
    'Warga di dekat persawahan merasa takut dengan keberadaan ular sawah, lalu mereka beramai-ramai memburu dan membunuh semua ular yang terlihat. Dua bulan kemudian, jumlah tikus meledak drastis dan gabah padi habis dimakan tikus. Pada saat yang sama, musim hujan datang lebih cepat.',
    'Apakah hilangnya ular adalah satu-satunya penyebab meledaknya jumlah tikus? Bagaimana cara membedakan antara akibat ulah manusia dengan pengaruh musim hujan?',
    'Hilangnya ular sebagai pemangsa alami (predator) adalah penyebab utama runtuhnya rantai makanan tikus, namun musim hujan juga bisa menyediakan genangan dan makanan lebih banyak.',
    'Menganalisis hubungan sebab-akibat rantai makanan dan membandingkannya dengan faktor lingkungan lain (kondisi sawah di desa lain yang ularnya tidak diburu).'
  ),
  diagnosticItem_(
    17,
    'systems_causality',
    'Ikan Parit yang Menghilang',
    'Di selokan alami belakang sekolah, biasanya banyak anak ikan guppy dan lumut air jernih. Setelah dibangun kantin baru yang membuang sisa air cucian sabun dan piring ke selokan tersebut, seminggu kemudian airnya berbusa dan semua ikan menghilang mati.',
    'Jelaskan rantai peristiwa yang terjadi di dalam air sejak sabun masuk sampai ikan-ikan itu tidak bisa bertahan hidup!',
    'Bahan kimia sabun/detergen merusak lapisan insang ikan, menghalangi penyerapan oksigen, dan membuat air keruh sehingga tanaman air tidak bisa fotosintesis, menyebabkan pasokan oksigen terlarut habis.',
    'Menjelaskan rangkaian dampak polutan terhadap ekosistem air secara runut (lapisan insang rusak -> kadar oksigen anjlok -> kematian organisme).'
  ),
  diagnosticItem_(
    18,
    'systems_causality',
    'Rumput Lapangan yang Menguning',
    'Rumput di lapangan upacara sekolah tiba-tiba mati menguning dan gundul, tetapi anehnya pola gundulnya hanya membentuk garis lurus memanjang dari gerbang utama ke arah kantin. Bagian tengah lapangan tetap hijau tebal.',
    'Menurut analisismu, apa penyebab utama matinya rumput pada jalur tersebut? Mengapa tanah di jalur itu biasanya juga menjadi keras seperti batu saat musim kemarau?',
    'Penyebabnya adalah injakan kaki siswa terus-menerus (jalur jalan pintas harian) yang memadatkan partikel tanah, merusak akar, dan membuat air hujan sulit meresap ke dalam pori tanah.',
    'Menghubungkan tekanan mekanik akibat aktivitas manusia dengan kepadatan tanah (hilangnya aerasi/infiltrasi air) dan kesehatan tumbuhan.'
  ),
  diagnosticItem_(
    22,
    'systems_causality',
    'Kolam yang Tiba-tiba Hijau',
    'Kolam ikan sekolah mendadak berubah warna menjadi hijau pekat berlumpur setelah beberapa minggu. Di dekatnya ada taman toga yang baru saja dipupuk berlebihan. Ikan-ikan terlihat lesu dan sering mengapung di permukaan air sambil membuka mulutnya terengah-engah.',
    'Apa hubungan antara pupuk di taman dengan air kolam yang menghijau dan perilaku ikan yang terengah-engah di permukaan? Jelaskan rantai kejadiannya!',
    'Zat hara dari pupuk tersapu air hujan ke kolam (eutrofikasi) menyuburkan alga air secara liar; saat alga mati dan membusuk, bakteri pembusuk menguras oksigen terlarut di air sehingga ikan terengah-engah mencari oksigen di permukaan udara.',
    'Merangkai hubungan limpasan pupuk (nutrisi berlebih) -> ledakan alga -> penurunan oksigen terlarut -> perilaku ikan kekurangan napas.'
  ),
  diagnosticItem_(
    23,
    'systems_causality',
    'Dua Pohon Mangga Tetangga',
    'Pak Budi dan Pak Joko menanam bibit pohon mangga dari jenis yang sama di batas pagar mereka. Pohon milik Pak Budi rajin disiram pupuk daun dan setiap bulan daunnya dipangkas habis agar rapi; hasilnya pohonnya rimbun daun tapi 3 tahun tidak pernah berbuah. Pohon milik Pak Joko dibiarkan liar dan jarang dipangkas; hasilnya buahnya bergantungan lebat.',
    'Mengapa pemangkasan terus-menerus dan pupuk daun justru membuat pohon mangga Pak Budi "malas" berbunga dan berbuah? Jelaskan keseimbangan energi tumbuhan tersebut!',
    'Tumbuhan membagi energinya: pupuk daun dan pemangkasan rutin memaksa tanaman menghabiskan seluruh energi untuk memulihkan daun dan ranting baru (fase vegetatif) sehingga tidak ada cadangan energi untuk membentuk bunga dan buah (fase generatif).',
    'Menjelaskan alokasi cadangan energi tumbuhan antara pertumbuhan daun (vegetatif) vs pembentukan bunga/buah (generatif).'
  ),

  // ==========================================
  // DOMAIN 5: TECHNOLOGY & DESIGN (5 Butir)
  // ==========================================
  diagnosticItem_(
    10,
    'technology_design',
    'Lampu Kelas Misterius',
    'Setiap jam istirahat dan pulang sekolah, lampu kelas sering dibiarkan menyala terang meskipun ruangannya kosong melompong. Ada 3 usulan solusi: (1) Menempel stiker pengingat di pintu, (2) Menunjuk 1 siswa piket khusus mematikan saklar, (3) Memasang sensor gerak otomatis yang mematikan lampu jika tak ada orang.',
    'Jika kamu kepala sekolah yang bijak, data apa saja yang perlu kamu kumpulkan terlebih dahulu untuk memilih solusi terbaik? Jelaskan kelebihan dan kelemahan salah satu opsi di atas!',
    'Perlu data: biaya pemasangan sensor vs penghematan tagihan listrik per bulan, tingkat kepatuhan siswa membaca stiker, dan risiko siswa piket lupa atau tidak masuk.',
    'Membandingkan pertimbangan biaya, keandalan manusia vs teknologi, dan menetapkan parameter keputusan berbasis data.'
  ),
  diagnosticItem_(
    19,
    'technology_design',
    'Saringan Air Darurat Kemah',
    'Saat kegiatan kemah Pramuka di hutan, sumber air satu-satunya adalah sungai kecil yang airnya keruh berlumpur cokelat. Regumu hanya memiliki botol plastik 1,5 liter bekas, arang sisa api unggun, pasir sungai, kerikil kecil, dan sehelai kain kasa.',
    'Bagaimana susunan lapisan bahan yang paling efektif dari atas ke bawah di dalam botol saringanmu? Mengapa arang diletakkan di dalam susunan tersebut?',
    'Susunan dari atas ke bawah: kerikil (menyaring kotoran besar/daun), pasir halus (menyaring lumpur halus), kain/ijuk, arang (menyerap bau dan zat kimia/warna), dan kain kasa penahan di bagian corong leher botol.',
    'Menjelaskan fungsi mekanik penyaringan bertingkat dari partikel besar ke kecil, serta fungsi penyerapan (adsorpsi) oleh pori-pori arang.'
  ),
  diagnosticItem_(
    20,
    'technology_design',
    'Alarm Pintu Sederhana',
    'Kamu ingin membuat alarm mekanik sederhana di pintu kamar tanpa kabel listrik rumit. Alat yang tersedia: baterai 9V, bel dengung kecil (buzzer), jepitan jemuran kayu, seutas benang kasur, dan sepotong plastik bekas bungkus makanan.',
    'Jelaskan bagaimana cara merangkai jepitan jemuran dan plastik tipis itu agar bel otomatis berbunyi kencang saat daun pintu dibuka orang!',
    'Jepitan jemuran diberi plat konduktor di kedua ujung giginya yang terhubung kabel bel dan baterai. Plastik tipis diselipkan di antara gigi jepitan sebagai penyekat (saklar terbuka). Benang diikatkan dari plastik ke pintu. Saat pintu terbuka, benang menarik plastik lepas, gigi jepitan menutup, arus listrik terhubung, dan bel berbunyi.',
    'Menjelaskan prinsip rangkaian listrik terbuka/tertutup dengan memanfaatkan penyekat mekanik yang ditarik saat pintu bergerak.'
  ),
  diagnosticItem_(
    21,
    'technology_design',
    'Kotak Pendingin Tanpa Listrik',
    'Kamu harus membawa es krim dari rumah ke sekolah dengan waktu perjalanan 2 jam jalan kaki di bawah terik matahari tanpa kulkas. Tersedia bahan: kardus mie instan, lembaran aluminium foil, kain handuk bekas, koran bekas, botol plastik, dan selotip.',
    'Pilih bahan-bahan terbaik dan jelaskan bagaimana kamu menyusun wadah pelindung tersebut agar es krim tidak mencair sampai di sekolah! Sebutkan alasan ilmiah di balik pilihan bahanmu!',
    'Bungkus es krim dengan aluminium foil (memantulkan radiasi panas), masukkan ke dalam ruang udara berlapisan koran/kain handuk tebal (menahan konduksi dan konveksi udara), lalu masukkan ke dalam kardus tertutup rapat selotip.',
    'Memadukan bahan pemantul radiasi dengan bahan isolator berpori udara untuk menghambat tiga cara perpindahan panas (konduksi, konveksi, radiasi).'
  ),
  diagnosticItem_(
    28,
    'technology_design',
    'Satu Botol Air untuk Tanaman',
    'Selama libur sekolah 3 hari, pot tanaman cabai di depan kelas rawan mati kekeringan jika tidak disiram. Kamu hanya diperbolehkan memakai 1 botol air mineral 1,5 liter bekas, sumbu kompor atau kain flanel bekas, serta kawat jemuran.',
    'Rancanglah alat penyiram tanaman otomatis sederhana menggunakan bahan-bahan tersebut! Jelaskan prinsip sains yang membuat air bisa mengalir perlahan sendiri, dan sebutkan 1 kemungkinan alatmu gagal berfungsi!',
    'Menggunakan sistem sumbu kapiler (kain flanel/sumbu kompor dimasukkan dari botol air ke tanah dekat akar tanaman) memanfaatkan gaya kapilaritas serat kain. Kemungkinan gagal: sumbu kering karena jarak terlalu panjang, air menguap di tengah jalan, atau aliran air terlalu deras membuat botol habis di hari pertama.',
    'Menjelaskan prinsip kerja kapilaritas fluida, perancangan laju alir yang sesuai kebutuhan tanaman, dan identifikasi titik kegagalan (*failure mode*).'
  )
];

const OFFICIAL_SELF_MAP_ = [
  ['SM01','curiosity','Aku biasanya penasaran ketika menemukan sesuatu yang aneh.'],
  ['SM02','epistemic_humility','Aku nyaman mengatakan belum tahu lalu mencari bukti.'],
  ['SM03','pattern_causality','Aku suka mencari pola atau hubungan sebab-akibat.'],
  ['SM04','making_experiment','Aku menikmati percobaan, membongkar cara kerja benda, atau membuat sesuatu.'],
  ['SM05','evidence_revision','Aku mau mengubah pendapat jika bukti baru lebih kuat.'],
  ['SM06','science_interest','Aku tertarik pada alam, teknologi, angka, atau cara kerja dunia.']
].map(x=>({item_id:x[0],dimension:x[1],prompt:x[2],active:true,source_status:'OFFICIAL_BOOKLET_V2'}));
