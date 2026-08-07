// veri.js — uygulamanın KASASI.
//
// Burada para, tarih, saklama ve hesaplama işleri var.
// Bu dosya ekranı hiç bilmez: içinde tek bir "şunu ekrana yaz" satırı yok.
//
// Neden ayrı dosya: ekranı bilmediği için Node ile doğrudan test edilebiliyor
// (bkz. testler.js). Karışık olsaydı test etmek için koca bir tarayıcı
// taklidi yazmak zorunda kalırdık.

// ============================================================
// SABİTLER
// ============================================================

// localStorage'da verimizin durduğu "raf etiketi".
//
// 2. etapta -v1 rafından -v2 rafına geçtik: v1'de rafta yalnızca kayıt
// listesi vardı, v2'de tek bir kök nesne var (kayıtlar + bütçeler +
// şablonlar bir arada). Eski v1 rafı SİLİNMEZ — o bizim kurtarma
// kopyamız: taşıma bir gün ters giderse veri orada duruyor.
const DEPO_ANAHTARI = "finans-veri-v2";
const ESKI_ANAHTAR = "finans-kayitlar-v1";

// Veri yapısının sürümü. Bu sayı YAPI değişince artar (alan yeniden
// adlandırma, biçim değiştirme). Yeni alan EKLEMEK sürüm artışı
// gerektirmez: bosDepo() eksik alanları varsayılanla tamamlıyor.
// DİKKAT: service-worker.js'teki önbellek sürümüyle (v2, v3...) hiçbir
// ilgisi yok — o dosya sürümü, bu veri sürümü; ayrı ayrı ilerlerler.
const SURUM = 2;

// Kayıt türleri. Türkçe karakter YOK (yatirim), çünkü bunlar ekranda
// gösterilen yazı değil, kodun içinde kullanılan sabit anahtarlar.
const TURLER = ["gelir", "gider", "yatirim"];

// Gider kategorileri. Bunlar ekranda görüneceği için Türkçe yazılıyor.
const KATEGORILER = [
  "Market",
  "Fatura",
  "Ulaşım",
  "Kira",
  "Sağlık",
  "Eğlence",
  "Giyim",
  "Diğer",
];

// ============================================================
// PARA YARDIMCILARI
// ============================================================
//
// Parayı her zaman KURUŞ cinsinden tam sayı olarak saklıyoruz.
// 1.250,50 TL  ->  125050
//
// Neden: bilgisayarlar ondalıklı sayıları tam tutamaz.
// Konsola `0.1 + 0.2` yazıp dene: 0.30000000000000004 çıkar.
// Tam sayılarla çalışırsak bu hata hiç oluşmaz.

// Kullanıcının yazdığı metni kuruşa çevirir.
// Kabul eder: 1250 / 1250.5 / "1250,50" / "1.250,50"
// Çeviremezse NaN döner (NaN = "Not a Number", yani "sayı değil").
function tlToKurus(deger) {
  let metin = String(deger).trim().replace(/\s/g, "");
  if (metin === "") return NaN;

  // Türkçe biçim ("1.250,50"): noktalar binlik ayırıcıdır, atılır;
  // virgül ondalık ayırıcıdır, noktaya çevrilir.
  if (metin.includes(",")) {
    metin = metin.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(metin)) {
    // Virgül yok ama noktalar binlik KALIBINDA: her noktadan sonra tam
    // 3 hane var ("1.250", "12.500", "1.250.000"). Türkçe yazımda bu
    // 1250'dir, 1,25 değil — noktaları atıyoruz. "19.99" bu kalıba
    // uymaz (son grup 2 hane), ondalık nokta olarak kalır.
    metin = metin.replace(/\./g, "");
  }

  const sayi = Number(metin);
  if (!Number.isFinite(sayi)) return NaN;

  // Math.round: 19.99 * 100 aslında 1998.9999... verir, yuvarlayıp 1999 yapıyoruz.
  return Math.round(sayi * 100);
}

// Ekranda göstermek için sayı biçimlendirici.
// Intl.NumberFormat tarayıcının hazır aracı: 125050 -> "1.250,50"
// "tr-TR" dedik, o yüzden binlik ayırıcı nokta, ondalık ayırıcı virgül oluyor.
const SAYI_BICIMI = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Kuruşu ekranda gösterilecek yazıya çevirir: 125050 -> "1.250,50 ₺"
function kurusYaz(kurus) {
  return SAYI_BICIMI.format(kurus / 100) + " ₺";
}

// Aynısı ama ₺ işaretsiz: 125050 -> "1.250,50"
// Form alanlarında ve grafik etiketlerinde işaret fazlalık yapıyor.
function kurusSade(kurus) {
  return SAYI_BICIMI.format(kurus / 100);
}

// ============================================================
// TARİH VE AY YARDIMCILARI
// ============================================================

// Bugünün tarihini "2026-08-06" biçiminde verir.
//
// DİKKAT: Buradaki kolay görünen yol `new Date().toISOString()` idi ama
// o tarihi Greenwich saatine göre verir. Türkiye 3 saat ileride olduğu için
// akşam 21:00'den sonra girdiğin kayıt DÜNE yazılırdı. Bu yüzden yıl/ay/günü
// tek tek, yerel saate göre okuyoruz.
function bugununTarihi() {
  const d = new Date();
  const yil = d.getFullYear();
  // getMonth() 0'dan başlar (Ocak = 0), o yüzden +1.
  // padStart(2, "0"): 8 -> "08" (tek haneyi iki haneye tamamlar)
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  const gun = String(d.getDate()).padStart(2, "0");
  return `${yil}-${ay}-${gun}`;
}

// Bugünün ayını { yil, ay } olarak verir. ay 1-12 arası.
function bugununAyi() {
  const d = new Date();
  return { yil: d.getFullYear(), ay: d.getMonth() + 1 };
}

// (2026, 8) -> "2026-08"  — kayıt tarihlerinin başını karşılaştırmak için.
function ayEtiketi(yil, ay) {
  return `${yil}-${String(ay).padStart(2, "0")}`;
}

const AY_BICIMI = new Intl.DateTimeFormat("tr-TR", {
  month: "long",
  year: "numeric",
});

// (2026, 8) -> "Ağustos 2026"
// Ay isimlerini elle listelemiyoruz; tarayıcı zaten Türkçe biliyor.
function ayAdi(yil, ay) {
  return AY_BICIMI.format(new Date(yil, ay - 1, 1));
}

// Ayı ileri/geri kaydırır. ayKaydir(2026, 12, 1) -> { yil: 2027, ay: 1 }
// Yıl geçişini kendimiz hesaplamıyoruz: Date nesnesine 13. ayı verince
// kendisi bir sonraki yılın Ocak'ına geçiyor.
function ayKaydir(yil, ay, adim) {
  const d = new Date(yil, ay - 1 + adim, 1);
  return { yil: d.getFullYear(), ay: d.getMonth() + 1 };
}

// İki ay aynı mı? { yil, ay } nesnelerini doğrudan === ile karşılaştırmak
// çalışmaz: JavaScript'te iki ayrı nesne, içleri aynı olsa da eşit sayılmaz.
function ayniAy(a, b) {
  return a.yil === b.yil && a.ay === b.ay;
}

const GUN_BICIMI = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
});

// "2026-08-06" -> "6 Ağustos"
//
// DİKKAT: new Date("2026-08-06") yazmıyoruz. Tarih metnini bu şekilde
// vermek Greenwich saatine göre yorumlanır ve Türkiye'de bir gün geriye
// kayabilir. Sayıları tek tek ayırıp veriyoruz, o zaman yerel saat kullanılır.
function tarihYaz(tarih) {
  const [yil, ay, gun] = String(tarih).split("-").map(Number);
  return GUN_BICIMI.format(new Date(yil, ay - 1, gun));
}

// Ekranda gösterilecek tür adı: "gelir" -> "Gelir"
const TUR_ADLARI = { gelir: "Gelir", gider: "Gider", yatirim: "Yatırım" };
function turAdi(tur) {
  return TUR_ADLARI[tur] || tur;
}

// ============================================================
// DEPO: OKUMA VE YAZMA (v2 — tek kök nesne)
// ============================================================
//
// Rafta artık tek bir nesne duruyor:
//   { surum: 2, kayitlar: [...], butceler: {...}, sablonlar: [...] }
//
// Neden tek nesne: her parça ayrı rafta dursaydı üç ayrı okuma, üç ayrı
// bozulma ihtimali ve "bu cihaz hangi sürümde?" sorusuna üç ayrı cevap
// olurdu. Tek nesne = tek kapı.

// Boş ama İSKELETİ TAM depo. Bütçe ve şablonlar daha eklenmeden de
// burada tanımlı: böylece ileride alan eklemek "eksikse varsayılanla
// tamamla" kuralı sayesinde sürüm artışı gerektirmiyor.
function bosDepo() {
  return { surum: SURUM, kayitlar: [], butceler: {}, sablonlar: [] };
}

// Rafta ne bulursak bulalım, onu bugünün depo biçimine çevirir.
// SAF bir fonksiyondur: localStorage'a dokunmaz, sadece çevirir.
//
// Kurallar:
//   - düz dizi (eski v1 biçimi)  -> kayıtlar olarak alınır
//   - tanınan alanlar            -> tipi doğruysa alınır
//   - eksik alanlar              -> varsayılanla tamamlanır
//   - tanınmayan alanlar         -> alınmaz (çöp birikmesin)
//
// ASLA hata fırlatmaz: buradaki veri kullanıcının TEK kopyası.
// Bozuk parçayı atarız ama uygulamayı asla çökertmeyiz.
function depoyuTasi(ham) {
  const depo = bosDepo();

  // v1 biçimi: rafta çıplak bir kayıt listesi duruyordu.
  if (Array.isArray(ham)) {
    depo.kayitlar = ham;
    return depo;
  }
  if (typeof ham !== "object" || ham === null) return depo;

  if (Array.isArray(ham.kayitlar)) depo.kayitlar = ham.kayitlar;
  // Dizi de bir "object" sayıldığı için ayrıca dizi OLMADIĞINI kontrol
  // ediyoruz: butceler düz bir nesne olmalı ({Market: 100} gibi).
  if (typeof ham.butceler === "object" && ham.butceler !== null && !Array.isArray(ham.butceler)) {
    depo.butceler = ham.butceler;
  }
  if (Array.isArray(ham.sablonlar)) depo.sablonlar = ham.sablonlar;
  return depo;
}

// Depoyu okur. Sıra önemli:
//   1) v2 rafı doluysa onu kullan.
//   2) Değilse eski v1 rafına bak; bulursa v2'ye TAŞI (v1'i silmeden).
//   3) İkisi de boşsa boş depo dön — ama YAZMADAN. Sadece okumak
//      depoyu değiştirmemeli (testler bunu açıkça denetliyor).
function depoOku() {
  const metin = localStorage.getItem(DEPO_ANAHTARI);
  if (metin) {
    try {
      return depoyuTasi(JSON.parse(metin));
    } catch (hata) {
      console.error("Depo okunamadı, boş başlıyorum:", hata);
      return bosDepo();
    }
  }

  const eskiMetin = localStorage.getItem(ESKI_ANAHTAR);
  if (eskiMetin) {
    try {
      const depo = depoyuTasi(JSON.parse(eskiMetin));
      // Taşımayı v2 rafına yazıyoruz ama v1 rafına DOKUNMUYORUZ:
      // eski raf bizim kurtarma kopyamız.
      try {
        depoYaz(depo);
      } catch (hata) {
        // Yazamadıysak bile (depo dolu?) veriyi bellekte kullanmaya
        // devam edebiliriz; okuma asla patlamaz.
        console.error("Taşıma yazılamadı, bellekte devam:", hata);
      }
      return depo;
    } catch (hata) {
      console.error("Eski depo okunamadı, boş başlıyorum:", hata);
      return bosDepo();
    }
  }

  return bosDepo();
}

// Depoyu rafa yazar. localStorage dolunca (genelde ~5 MB) veya Safari
// gizli moddayken setItem hata fırlatır — o kriptik hatayı kullanıcıya
// anlayacağı bir cümleye çeviriyoruz.
function depoYaz(depo) {
  try {
    localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(depo));
  } catch (hata) {
    throw new Error(
      "Kaydedilemedi: cihazın deposu dolu ya da tarayıcı gizli modda. Yedeğini indirip yer açmayı dene."
    );
  }
}

// Tüm kayıtları dizi olarak döner. Hiç kayıt yoksa boş dizi [] döner —
// böylece çağıran yerin "acaba yok mu" diye kontrol etmesi gerekmez.
function kayitlariOku() {
  return depoOku().kayitlar;
}

// Verilen kayıt listesini depoya yazar.
//
// DİKKAT: önce depoyu OKUYUP sonra sadece kayıtlar bölümünü değiştiriyoruz
// (oku-değiştir-yaz). Doğrudan yeni bir depo yazsaydık bütçeler ve
// şablonlar her kayıt eklemede sessizce silinirdi.
function kayitlariYaz(kayitlar) {
  const depo = depoOku();
  depo.kayitlar = kayitlar;
  depoYaz(depo);
}

// ============================================================
// KAYIT EKLEME / SİLME
// ============================================================

// Her kayda benzersiz bir kimlik üretir. Silerken "hangi kaydı?" sorusunun
// cevabı bu. crypto.randomUUID tarayıcının hazır aracı; bulunmadığı ortamlarda
// elle bir kimlik üretiyoruz (yedek plan).
//
// globalThis: "hangi ortamdaysam oranın ana nesnesi" demek. Tarayıcıda
// window, Node'da global. Böylece bu dosya iki yerde de çalışıyor.
function yeniId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "k" + Date.now() + Math.random().toString(16).slice(2, 8);
}

// Yeni kayıt ekler ve eklenen kaydı döner.
// Beklenen: kayitEkle({ tur, tutar, tarih, aciklama, kategori })
//   tur       : "gelir" | "gider" | "yatirim"   (zorunlu)
//   tutar     : 1500 veya "1.500,50"            (zorunlu, sıfırdan büyük)
//   tarih     : "2026-08-06"                    (boş bırakılırsa bugün)
//   aciklama  : "Maaş"                          (isteğe bağlı)
//   kategori  : "Market"                        (sadece gider için)
//
// Hatalı veri gelirse throw ile duruyoruz. Böylece bozuk kayıt hiç
// depoya girmiyor — sessizce yanlış veri saklamaktan iyidir.
//
// Doğrulama kuralları SADECE burada. Form da, konsol da, ileride
// ekleyeceğimiz başka bir şey de aynı kapıdan geçiyor.
function kayitEkle(yeni) {
  const tur = yeni.tur;
  if (!TURLER.includes(tur)) {
    throw new Error(`Geçersiz tür: "${tur}". Şunlardan biri olmalı: ${TURLER.join(", ")}`);
  }

  const kurus = tlToKurus(yeni.tutar);
  if (!Number.isFinite(kurus) || kurus <= 0) {
    throw new Error(`Geçersiz tutar: "${yeni.tutar}". Sıfırdan büyük bir sayı olmalı.`);
  }

  const tarih = yeni.tarih ? String(yeni.tarih) : bugununTarihi();
  // Basit bir kalıp kontrolü: 4 hane - 2 hane - 2 hane
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) {
    throw new Error(`Geçersiz tarih: "${tarih}". Biçim 2026-08-06 gibi olmalı.`);
  }

  // Kategori sadece giderde anlamlı. Gelir/yatırımda boş bırakıyoruz.
  let kategori = "";
  if (tur === "gider") {
    kategori = yeni.kategori || "Diğer";
    if (!KATEGORILER.includes(kategori)) {
      throw new Error(`Geçersiz kategori: "${kategori}". Şunlardan biri olmalı: ${KATEGORILER.join(", ")}`);
    }
  }

  const kayit = {
    id: yeniId(),
    tur: tur,
    kurus: kurus,
    tarih: tarih,
    aciklama: String(yeni.aciklama || "").trim(),
    kategori: kategori,
  };

  const kayitlar = kayitlariOku();
  kayitlar.push(kayit); // push: dizinin sonuna ekler
  kayitlariYaz(kayitlar);

  return kayit;
}

// Verilen kimliğe sahip kaydı siler.
// Sildiyse true, öyle bir kayıt bulamadıysa false döner.
function kayitSil(id) {
  const kayitlar = kayitlariOku();
  // filter: koşulu sağlayan öğelerden YENİ bir dizi kurar.
  // Burada "id'si silinecek olandan farklı olanlar" kalıyor.
  const kalanlar = kayitlar.filter((k) => k.id !== id);

  if (kalanlar.length === kayitlar.length) return false; // hiçbir şey çıkmadı

  kayitlariYaz(kalanlar);
  return true;
}

// ============================================================
// HESAPLAMALAR
// ============================================================
//
// Yatırım "harcanan" para değil, KENARA AYRILAN para. Kurallar:
//   bu ay kalan   = ayın geliri - gideri - yatırımı   (elinde kalan harcanabilir)
//   toplam varlık = tüm gelir - tüm gider             (yatırım dahil, hâlâ senin paran)
//   toplam yatırım = tüm yatırımlar                   (varlığın yatırımdaki kısmı)

// Belirli bir aya ait kayıtları süzer.
// Tarihler "2026-08-06" biçiminde olduğu için ayı bulmak, metnin
// "2026-08" ile başlayıp başlamadığına bakmak kadar kolay.
function ayKayitlari(kayitlar, yil, ay) {
  const on = ayEtiketi(yil, ay);
  return kayitlar.filter((k) => typeof k.tarih === "string" && k.tarih.startsWith(on));
}

// Verilen kayıtlar içinde belirli bir türün kuruş toplamı.
// reduce: diziyi tek bir değere "indirger" — burada hepsini toplar.
function turToplami(kayitlar, tur) {
  return kayitlar.reduce((toplam, k) => (k.tur === tur ? toplam + k.kurus : toplam), 0);
}

// Bir ayın özeti: { gelir, gider, yatirim, kalan } — hepsi kuruş.
function ozetHesapla(kayitlar, yil, ay) {
  const ayinKayitlari = ayKayitlari(kayitlar, yil, ay);
  const gelir = turToplami(ayinKayitlari, "gelir");
  const gider = turToplami(ayinKayitlari, "gider");
  const yatirim = turToplami(ayinKayitlari, "yatirim");
  return { gelir, gider, yatirim, kalan: gelir - gider - yatirim };
}

// Tüm zamanların toplam varlığı (kuruş). Yatırım burada düşülmez:
// yatırıma ayırdığın para harcanmadı, hâlâ senin.
function toplamVarlik(kayitlar) {
  return turToplami(kayitlar, "gelir") - turToplami(kayitlar, "gider");
}

// Tüm zamanların yatırım toplamı (kuruş).
function toplamYatirim(kayitlar) {
  return turToplami(kayitlar, "yatirim");
}

// Kayıtları yeniden eskiye sıralar (liste için).
//
// Aynı güne birkaç kayıt girilirse en son girdiğin üstte olsun diye
// sıra numarasını (i) da hesaba katıyoruz. Sıralama YENİ bir dizi
// üretiyor; gelen diziyi bozmuyor — dışarıdaki kod "ben sıralamadım ki"
// diye şaşırmasın.
function yeniyeGoreSirala(kayitlar) {
  return kayitlar
    .map((kayit, i) => ({ kayit, i }))
    .sort((a, b) => {
      if (a.kayit.tarih !== b.kayit.tarih) {
        return a.kayit.tarih < b.kayit.tarih ? 1 : -1; // tarihi büyük olan önce
      }
      return b.i - a.i; // aynı gün: sonra eklenen önce
    })
    .map((x) => x.kayit);
}

// ============================================================
// YEDEKLEME
// ============================================================
//
// Kayıtlar yalnızca bu tarayıcının localStorage'ında duruyor. Tarayıcı
// verisi silinirse (cihaz değişimi, "site verilerini temizle") hepsi
// gider. Bu iki fonksiyon sigorta: biri depoyu dosyaya çevirir, öteki
// dosyadan gelen metni DENETLEYİP geri yükler.

// Deponun tamamını, dosyaya yazılacak metin olarak verir.
//
// Dosya bir "zarf": içinde sürüm numarası ve tarih de var. Sürüm
// sayesinde ileride yedeğin hangi çağdan geldiğini bilebiliyoruz.
// JSON.stringify'ın 3. parametresi (2): her satıra 2 boşluk girinti —
// dosyayı bir insan açarsa o da okuyabilsin.
function yedekMetni() {
  const depo = depoOku();
  return JSON.stringify(
    { surum: SURUM, olusturma: bugununTarihi(), kayitlar: depo.kayitlar },
    null,
    2
  );
}

// Yedek dosyasının metnini alır, denetler ve TEMİZ bir depo nesnesi
// döner. Depoya YAZMAZ — "üzerine yazılsın mı?" diye sormak arayüzün işi.
// Bozuk bir şey varsa throw ile durur; böylece bozuk bir yedek,
// depodaki sağlam verinin üstüne asla yazılamaz.
//
// İki biçimi de kabul eder:
//   - eski (1. etap) yedekler: çıplak kayıt listesi  [...]
//   - yeni zarf: { surum, olusturma, kayitlar: [...] }
// Kimsenin eski yedek dosyası çöpe dönmesin.
//
// Buradaki "hata fırlatabilir" tavrı, depoOku'nun "asla fırlatmaz"
// tavrının tam tersi ve bu BİLEREK böyle: dosya yüklemek tekrar
// denenebilir bir kullanıcı işlemi, ama rafta duran veri tek kopya.
function yedekOku(metin) {
  let veri;
  try {
    veri = JSON.parse(metin);
  } catch (hata) {
    throw new Error("Dosya okunamadı: bu bir JSON dosyası değil.");
  }

  let hamListe;
  if (Array.isArray(veri)) {
    hamListe = veri; // eski biçim
  } else if (typeof veri === "object" && veri !== null && Array.isArray(veri.kayitlar)) {
    // Zarfın sürümü bizden yeniyse kayıt yapısını tanımıyor olabiliriz.
    // Denemek yerine dürüstçe durup kullanıcıyı güncellemeye yolluyoruz.
    if (Number.isInteger(veri.surum) && veri.surum > SURUM) {
      throw new Error(
        `Bu yedek uygulamanın daha yeni bir sürümünden (${veri.surum}) geliyor. Önce uygulamayı güncelle.`
      );
    }
    hamListe = veri.kayitlar;
  } else {
    throw new Error("Bu dosya bir yedeğe benzemiyor: içinde kayıt listesi yok.");
  }

  const kayitlar = hamListe.map((k, sira) => {
    const yer = `Yedekteki ${sira + 1}. kayıt`;
    if (typeof k !== "object" || k === null) {
      throw new Error(`${yer} bozuk: bu bir kayıt değil.`);
    }
    if (typeof k.id !== "string" || k.id === "") {
      throw new Error(`${yer} bozuk: kimlik (id) eksik.`);
    }
    if (!TURLER.includes(k.tur)) {
      throw new Error(`${yer} bozuk: tür "${k.tur}" tanınmadı.`);
    }
    // Hesapları bozacak her şey sert reddedilir: kuruş pozitif TAM sayı olmalı.
    if (!Number.isInteger(k.kurus) || k.kurus <= 0) {
      throw new Error(`${yer} bozuk: tutar (kurus) pozitif tam sayı olmalı.`);
    }
    if (typeof k.tarih !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(k.tarih)) {
      throw new Error(`${yer} bozuk: tarih "${k.tarih}" beklenen biçimde değil.`);
    }
    // Açıklama ve kategori süs: eksikse boşla tamamlanır, hesap bozulmaz.
    // Tanımadığımız fazladan alanları da içeri almıyoruz.
    //
    // BU LİSTE KAYIT ŞEMASININ TEK GERÇEĞİ: buraya eklenmeyen yeni bir
    // alan, yedekten geri yüklemede sessizce kaybolur.
    return {
      id: k.id,
      tur: k.tur,
      kurus: k.kurus,
      tarih: k.tarih,
      aciklama: typeof k.aciklama === "string" ? k.aciklama : "",
      kategori: typeof k.kategori === "string" ? k.kategori : "",
    };
  });

  // Temiz kayıtları tam bir depo iskeletine koyup dönüyoruz: arayüz
  // onaylarsa bu nesne olduğu gibi depoYaz'a verilebilir.
  const depo = bosDepo();
  depo.kayitlar = kayitlar;
  return depo;
}

// ============================================================
// NODE KÖPRÜSÜ
// ============================================================
//
// Bu dosya iki yerde çalışıyor:
//   1) Tarayıcıda  -> <script src="veri.js"> ile yüklenir, fonksiyonlar
//      doğrudan app.js'in erişebileceği yerde durur.
//   2) Node'da     -> testler.js içinden require("./veri.js") ile alınır.
//
// Tarayıcıda "module" diye bir şey yoktur, o yüzden aşağıdaki blok
// yalnızca Node'da devreye girer. typeof ile kontrol etmek şart:
// tanımsız bir ismi doğrudan okumak hata verirdi.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DEPO_ANAHTARI,
    ESKI_ANAHTAR,
    SURUM,
    TURLER,
    KATEGORILER,
    bosDepo,
    depoyuTasi,
    depoOku,
    depoYaz,
    tlToKurus,
    kurusYaz,
    kurusSade,
    bugununTarihi,
    bugununAyi,
    ayEtiketi,
    ayAdi,
    ayKaydir,
    ayniAy,
    tarihYaz,
    turAdi,
    kayitlariOku,
    kayitlariYaz,
    kayitEkle,
    kayitSil,
    yedekMetni,
    yedekOku,
    ayKayitlari,
    turToplami,
    ozetHesapla,
    toplamVarlik,
    toplamYatirim,
    yeniyeGoreSirala,
  };
}
