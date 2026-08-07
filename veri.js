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

// Aynı işin kısa hâli. Grafiğin altındaki ay etiketleri için:
// "Ağustos 2026" bir çubuğun altına sığmaz, "Ağu" sığar.
const KISA_AY_BICIMI = new Intl.DateTimeFormat("tr-TR", { month: "short" });

// (2026, 8) -> "Ağu"
//
// DİKKAT: bunun tam çıktısına GÜVENMİYORUZ. Tarayıcının içindeki dil
// veritabanı (ICU) sürümüne göre "Ağu" da gelebilir "Ağu." da. Bu yüzden
// testte eşitlik değil "ağu ile başlıyor mu" diye bakıyoruz — yoksa
// Node sürümü değişince testler sebepsiz kırmızıya dönerdi.
function ayKisaAdi(yil, ay) {
  return KISA_AY_BICIMI.format(new Date(yil, ay - 1, 1));
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

// Bir ayın kaç gün sürdüğünü verir. ayinGunSayisi(2026, 2) -> 28
//
// Buradaki numara: Date'e ayın SIFIRINCI gününü sorarsan, sana bir
// önceki ayın SON gününü verir. Date ayları 0'dan saydığı için bizim
// "ay" değerimiz (1-12) onun gözünde zaten bir sonraki aydır — yani
// (yil, ay, 0) tam olarak "bizim ayımızın son günü" demek oluyor.
//
// Artık yıl kuralını (4'e bölünen ama 100'e bölünüp 400'e bölünmeyen
// hariç) kendimiz yazmıyoruz: takvimi tarayıcı zaten biliyor.
function ayinGunSayisi(yil, ay) {
  return new Date(yil, ay, 0).getDate();
}

// Yıl / ay / günden "YYYY-MM-DD" metni kurar. Gün, o ayın son gününü
// aşıyorsa oraya KİLİTLENİR:  tarihKur(2026, 2, 31) -> "2026-02-28"
//
// DİKKAT: kilitlemeseydik ne olurdu? new Date(2026, 1, 31) hata vermez,
// sessizce 3 Mart'a taşar (JavaScript taşan tarihleri ileri kaydırır).
// Yani "her ayın 31'inde" diye kurduğun bir kira ödemesi Şubat'ta
// Mart'a atlar, sonra da yanlış aya yazılırdı.
function tarihKur(yil, ay, gun) {
  const sonGun = ayinGunSayisi(yil, ay);
  // Math.min: ikisinden küçüğünü seçer. 31 istendi ama ay 28 çekiyorsa 28.
  const guvenliGun = Math.min(gun, sonGun);
  return `${yil}-${String(ay).padStart(2, "0")}-${String(guvenliGun).padStart(2, "0")}`;
}

// Bir tarih metni hem BİÇİM hem TAKVİM olarak geçerli mi?
//
// DİKKAT: "2026-02-31" kalıba uyar ama takvimde yoktur. Sadece kalıba
// bakan eski denetim onu içeri alıyordu; sonra new Date sessizce
// 3 Mart'a taşırıp ekranda başka, hesapta başka bir ay gösterebilirdi
// (usta denetimi bulgusu). Artık günün o ayda gerçekten var olduğuna
// da bakıyoruz.
function gecerliTarih(tarih) {
  if (typeof tarih !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return false;
  const [yil, ay, gun] = tarih.split("-").map(Number);
  if (ay < 1 || ay > 12) return false;
  return gun >= 1 && gun <= ayinGunSayisi(yil, ay);
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

// İki "YYYY-MM-DD" tarihi arasında kaç gün var? (b eksi a)
//   gunFarki("2026-08-01", "2026-08-31") -> 30
//   aynı gün                             -> 0
//   sıra tersse                          -> eksi (-30)
//
// DİKKAT: burada da new Date("2026-08-01") YAZMIYORUZ (bkz. tarihYaz).
// Tarihi metin olarak vermek Greenwich saatine göre yorumlanır, sayı
// olarak vermek yerel saate göre. İkisini karıştırmak bir günlük sapma
// demek — hatırlatıcının bir gün erken/geç konuşması buradan gelirdi.
//
// Math.round neden şart: bir gün 86.400.000 milisaniye SAYILIR ama yaz
// saati uygulayan bir ülkede bir gün 23 ya da 25 saat sürebilir. Bölme
// 29,96 verirse yuvarlama onu 30'a çeker; aşağı kesme (floor) 29 derdi.
function gunFarki(a, b) {
  const [y1, a1, g1] = String(a).split("-").map(Number);
  const [y2, a2, g2] = String(b).split("-").map(Number);
  const ilk = new Date(y1, a1 - 1, g1);
  const son = new Date(y2, a2 - 1, g2);
  return Math.round((son - ilk) / 86400000);
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
//
// sonYedek TAM OLARAK BUNUN MEYVESİ: 5. adımda eklenen yepyeni bir alan
// olmasına rağmen SURUM'a dokunmadık. Eski bir cihazın rafında bu alan
// yok; depoyuTasi onu boş metinle tamamlıyor ve hiçbir şey kırılmıyor.
// (sonYedek = en son ne zaman yedek indirildiği, "YYYY-MM-DD"; hiç
// indirilmediyse boş metin.)
function bosDepo() {
  return { surum: SURUM, kayitlar: [], butceler: {}, sablonlar: [], sonYedek: "" };
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
  // Yedek damgası: yalnızca doğru biçimdeki bir tarih metnini alıyoruz.
  // Rafta sayı, null ya da "dün" gibi bir şey bulursak boş metinde
  // bırakıyoruz — bozuk bir damga, gunFarki'ye NaN yedirip hatırlatıcıyı
  // sessizce susturacak tek şeydi.
  if (typeof ham.sonYedek === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ham.sonYedek)) {
    depo.sonYedek = ham.sonYedek;
  }
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
      const ham = JSON.parse(metin);
      // Yalnızca gerçek bir nesneyi kabul ediyoruz; "çöp" gibi geçerli
      // JSON ama saçma değerlerde aşağıya, v1 kopyasına düşüyoruz.
      if (typeof ham === "object" && ham !== null) return depoyuTasi(ham);
      console.error("v2 rafında beklenmeyen içerik, v1 kopyasına bakıyorum.");
    } catch (hata) {
      // DİKKAT: eskiden burada hemen boş depo dönüyorduk. Usta denetimi
      // haklı çıktı: v2 bozulmuşsa elimizde hâlâ sağlam bir v1 kurtarma
      // kopyası olabilir — boş dönmek onu yok saymak olurdu. Şimdi
      // düşüp v1'e bakıyoruz; o da yoksa zaten boş döneceğiz.
      console.error("v2 rafı bozuk, v1 kurtarma kopyasına bakıyorum:", hata);
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

// Bir kayıt adayını DENETLER ve temiz hâlini döner:
//   { tur, kurus, tarih, aciklama, kategori }
//
// Depoya dokunmaz, kimlik üretmez, hiçbir şey kaydetmez — tek işi
// "bu veri sağlam mı?" sorusunu cevaplamak. Bozuksa throw ile durur.
//
// NEDEN AYRI BİR FONKSİYON: aynı kuralları hem kayitEkle hem sablonEkle
// kullanıyor. Kural iki yere kopyalansaydı biri güncellenip öteki
// unutulurdu; kayıtta reddedilen bir tutar şablonda kabul görürdü.
// Doğrulama kuralları SADECE burada. Form da, konsol da, şablon da
// aynı kapıdan geçiyor.
function kaydiDenetle(yeni) {
  const tur = yeni.tur;
  if (!TURLER.includes(tur)) {
    throw new Error(`Geçersiz tür: "${tur}". Şunlardan biri olmalı: ${TURLER.join(", ")}`);
  }

  // Tutar iki yoldan gelebiliyor:
  //   kurus: 125050        -> zaten kuruş, olduğu gibi alınır
  //   tutar: "1.250,50"    -> kullanıcının yazdığı metin, çevrilir
  //
  // DİKKAT: kuruş yolu şablondan kayıt üretirken lazım. Olmasaydı
  // şablondaki 125050'yi önce "1.250,50" metnine çevirip sonra geri
  // okumak gerekirdi — her turda yuvarlama riski taşıyan gereksiz bir
  // gidiş-dönüş. Number.isInteger ile "kuruş verilmiş mi" diye bakıyoruz;
  // 0 da tam sayıdır, o yüzden aşağıdaki sıfır denetimi yine çalışıyor.
  const kurusVerildi = Number.isInteger(yeni.kurus);
  const kurus = kurusVerildi ? yeni.kurus : tlToKurus(yeni.tutar);
  if (!Number.isFinite(kurus) || kurus <= 0) {
    throw new Error(
      `Geçersiz tutar: "${kurusVerildi ? yeni.kurus : yeni.tutar}". Sıfırdan büyük bir sayı olmalı.`
    );
  }

  const tarih = yeni.tarih ? String(yeni.tarih) : bugununTarihi();
  // Hem biçim hem takvim denetimi ("2026-02-31" biçime uyar ama yoktur).
  if (!gecerliTarih(tarih)) {
    throw new Error(`Geçersiz tarih: "${tarih}". Biçim 2026-08-06 gibi olmalı ve takvimde bulunmalı.`);
  }

  // Kategori sadece giderde anlamlı. Gelir/yatırımda boş bırakıyoruz.
  let kategori = "";
  if (tur === "gider") {
    kategori = yeni.kategori || "Diğer";
    if (!KATEGORILER.includes(kategori)) {
      throw new Error(`Geçersiz kategori: "${kategori}". Şunlardan biri olmalı: ${KATEGORILER.join(", ")}`);
    }
  }

  return {
    tur: tur,
    kurus: kurus,
    tarih: tarih,
    aciklama: String(yeni.aciklama || "").trim(),
    kategori: kategori,
  };
}

// Yeni kayıt ekler ve eklenen kaydı döner.
// Beklenen: kayitEkle({ tur, tutar, tarih, aciklama, kategori, sablonId })
//   tur       : "gelir" | "gider" | "yatirim"   (zorunlu)
//   tutar     : 1500 veya "1.500,50"            (zorunlu, sıfırdan büyük)
//               — ya da doğrudan kurus: 150000
//   tarih     : "2026-08-06"                    (boş bırakılırsa bugün)
//   aciklama  : "Maaş"                          (isteğe bağlı)
//   kategori  : "Market"                        (sadece gider için)
//   sablonId  : "abc-123"                       (yinelenen bir işlemden
//               üretildiyse hangi şablondan geldiği; yoksa boş)
//
// Hatalı veri gelirse (kaydiDenetle sayesinde) throw ile duruyoruz.
// Böylece bozuk kayıt hiç depoya girmiyor — sessizce yanlış veri
// saklamaktan iyidir.
function kayitEkle(yeni) {
  const temiz = kaydiDenetle(yeni);

  const kayit = {
    id: yeniId(),
    tur: temiz.tur,
    kurus: temiz.kurus,
    tarih: temiz.tarih,
    aciklama: temiz.aciklama,
    kategori: temiz.kategori,
    // Bu kayıt bir şablondan mı doğdu? Elle girilen kayıtlarda boş kalır.
    // İleride "bu kira ödemesi hangi yinelenen işlemden geldi?" sorusunun
    // cevabı bu alan olacak.
    sablonId: typeof yeni.sablonId === "string" ? yeni.sablonId : "",
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
// BÜTÇELER
// ============================================================
//
// Bütçe = bir gider kategorisine koyduğun AYLIK harcama limiti.
// Depoda şöyle durur:  butceler: { "Market": 500000, "Kira": 1500000 }
// (değerler kuruş; yalnızca limit konan kategoriler listede).
// Limit her ay için aynıdır — "Ekim'e özel limit" diye bir şey yok,
// basit kalsın diye bilerek böyle.

// Limitin bu oranı aşılınca çubuk "uyarı" rengine döner.
const UYARI_ORANI = 0.8;

// Bir bütçenin olabileceği üç durum. Testler ve CSS sınıfları
// (butce-iyi, butce-uyari, butce-asildi) bu listeden türetiliyor.
const BUTCE_DURUMLARI = ["iyi", "uyari", "asildi"];

function butceleriOku() {
  return depoOku().butceler;
}

// Bir kategoriye limit koyar, günceller ya da siler.
// Boş yazı veya 0 -> limit silinir (0 döner). Yoksa kuruş döner.
function butceBelirle(kategori, tutar) {
  if (!KATEGORILER.includes(kategori)) {
    throw new Error(`Geçersiz kategori: "${kategori}".`);
  }

  const metin = String(tutar === undefined || tutar === null ? "" : tutar).trim();
  const depo = depoOku();

  if (metin === "") {
    delete depo.butceler[kategori];
    depoYaz(depo);
    return 0;
  }

  const kurus = tlToKurus(metin);
  if (!Number.isFinite(kurus) || kurus < 0) {
    throw new Error(`Geçersiz limit: "${tutar}". Bir tutar yaz ya da silmek için boş bırak.`);
  }
  if (kurus === 0) {
    delete depo.butceler[kategori];
    depoYaz(depo);
    return 0;
  }

  depo.butceler[kategori] = kurus;
  depoYaz(depo);
  return kurus;
}

// Harcama, limitin neresinde? "iyi" | "uyari" | "asildi"
// Limitin TAMAMINI harcamak henüz aşmak değildir: 1000/1000 "uyari",
// 1001/1000 "asildi".
function butceDurumAdi(harcanan, limit) {
  if (harcanan > limit) return "asildi";
  if (harcanan >= limit * UYARI_ORANI) return "uyari";
  return "iyi";
}

// Bir ayın bütçe tablosu. SAF fonksiyondur: depoya dokunmaz, verilenle
// hesaplar — o yüzden Node'da rahatça test edilebiliyor.
//
// Dönen her satır: { kategori, limit, harcanan, kalan, yuzde, durum }
// - KATEGORILER sırasıyla döner (ekranda sıra hep aynı kalsın).
// - Limiti olmayan (veya bozuk/bayat anahtarlı) kategoriler atlanır.
// - yuzde TAM SAYI (63 gibi): ondalık yüzde ekranda gürültü, testte
//   kırılganlık demek. 100'ü aşabilir (125 = %25 aşım) — kırpma işi
//   çubuğu çizenin.
function butceDurumu(kayitlar, butceler, yil, ay) {
  const ayinKayitlari = ayKayitlari(kayitlar, yil, ay);
  const sonuc = [];

  for (const kategori of KATEGORILER) {
    const limit = butceler[kategori];
    if (!Number.isInteger(limit) || limit <= 0) continue;

    const harcanan = ayinKayitlari.reduce(
      (toplam, k) => (k.tur === "gider" && k.kategori === kategori ? toplam + k.kurus : toplam),
      0
    );

    sonuc.push({
      kategori: kategori,
      limit: limit,
      harcanan: harcanan,
      kalan: limit - harcanan,
      yuzde: Math.round((harcanan / limit) * 100),
      durum: butceDurumAdi(harcanan, limit),
    });
  }

  return sonuc;
}

// Yedekten gelen bütçe bölümünü denetler, temizini döner.
// - bölüm hiç yoksa (eski yedek) -> boş nesne
// - tanınmayan kategori -> SESSİZCE atlanır (bayat bir anahtar yüzünden
//   koca yedek reddedilmesin)
// - bozuk limit -> HATA (yanlış limit yanlış uyarı üretir; bu, açıklama
//   gibi "süs" değil, hesaba giren veri)
function butceleriDenetle(ham) {
  if (ham === undefined || ham === null) return {};
  if (typeof ham !== "object" || Array.isArray(ham)) {
    throw new Error("Yedekteki bütçe bölümü bozuk: liste değil nesne olmalı.");
  }

  const temiz = {};
  for (const kategori of Object.keys(ham)) {
    if (!KATEGORILER.includes(kategori)) continue;
    const kurus = ham[kategori];
    if (!Number.isInteger(kurus) || kurus <= 0) {
      throw new Error(`Yedekteki "${kategori}" bütçesi bozuk: limit pozitif tam sayı olmalı.`);
    }
    temiz[kategori] = kurus;
  }
  return temiz;
}

// ============================================================
// YİNELENEN İŞLEMLER (ŞABLONLAR)
// ============================================================
//
// Kira, maaş, abonelik... her ay aynı gün tekrarlayan işlemler.
// Depoda bir "şablon" olarak duruyorlar:
//
//   { id, tur, kurus, gun, aciklama, kategori,
//     siklik: "aylik", sonUretim: "2026-07-05" }
//
// TASARIM KARARI — arka planda kimse kayıt üretmiyor.
// Uygulama açıldığında "zamanı gelenler" listesi HESAPLANIR ve sana
// onayla/atla diye sorulur. Neden: bir tarayıcı uygulaması kapalıyken
// çalışamaz; "otomatik ekledim" desek, üç ay açmadığın uygulama bir
// gün açılınca sana sormadan 3 kira gideri yazardı. Onaylamak senin işin.
//
// sonUretim = en son ÜRETİLEN ya da ATLANAN tekrarın tarihi. Tek
// idempotens (aynı işi iki kez yapmama) mekanizması budur: hem onay
// hem atlama bu tarihi ilerlettiği için aynı ay iki kez üretilemez.
// "Bekleyenler" hiçbir yerde SAKLANMAZ, her seferinde sonUretim'den
// yeniden hesaplanır — saklansaydı iki liste birbirini tutmayabilirdi.

// Bir şablon için tek seferde en fazla kaç tekrar üretilebilir?
//
// DİKKAT: bu bir güvenlik freni. Şablonun sonUretim'i bir şekilde
// "1999-01-01" olursa (bozuk yedek, elle düzenleme) döngü 300'den fazla
// satır üretip ekranı kilitlerdi. 24 = iki yıl; bundan eskisi zaten
// onaylanacak bir şey değil.
const TEKRAR_AZAMI = 24;

// Bir tekrardan sonrakinin tarihini verir.
//
// DİKKAT — KAYMA TUZAĞI: günü ÖNCEKİ tarihten değil, şablonun `gun`
// alanından alıyoruz. Kolay görünen yol "önceki tarihe bir ay ekle"
// idi ama şu zinciri üretirdi:
//     31 Ocak -> 28 Şubat -> 28 Mart -> 28 Nisan...
// Kira her ayın 31'inde olmasına rağmen ayın 28'ine yapışıp kalırdı.
// Doğrusu her ay şablonun gününe geri dönüp o ayın sonuna göre
// kilitlemek:
//     31 Ocak -> 28 Şubat -> 31 Mart -> 30 Nisan -> 31 Mayıs...
function sonrakiTekrar(tarih, gun) {
  const yil = Number(String(tarih).slice(0, 4));
  const ay = Number(String(tarih).slice(5, 7));
  // Yıl devrini ayKaydir hallediyor: Aralık +1 -> gelecek yılın Ocak'ı.
  const sonraki = ayKaydir(yil, ay, 1);
  return tarihKur(sonraki.yil, sonraki.ay, gun);
}

// Depodaki şablon listesi. Hiç yoksa boş dizi döner.
function sablonlariOku() {
  return depoOku().sablonlar;
}

// Yeni bir yinelenen işlem kurar ve şablonu döner.
// Beklenen: sablonEkle({ tur, tutar, baslangic, aciklama, kategori })
//   baslangic : "2026-08-05" — hem ayın kaçında tekrarlanacağını
//               (gun = 5) hem de sayacın nereden başlayacağını
//               (sonUretim) belirler.
//
// Doğrulamayı kendisi yazmıyor, kaydiDenetle'ye soruyor: bir kayıt
// olarak geçerli olmayan şey şablon olarak da geçerli değil.
function sablonEkle(yeni) {
  const temiz = kaydiDenetle({
    tur: yeni.tur,
    tutar: yeni.tutar,
    kurus: yeni.kurus,
    tarih: yeni.baslangic,
    aciklama: yeni.aciklama,
    kategori: yeni.kategori,
  });

  // Ayın kaçında tekrarlanacak? Başlangıç tarihinin gün kısmı.
  // slice(8, 10): "2026-08-05" metninin son iki hanesi -> "05" -> 5
  const gun = Number(temiz.tarih.slice(8, 10));
  if (!Number.isInteger(gun) || gun < 1 || gun > 31) {
    throw new Error(`Geçersiz gün: "${temiz.tarih}" tarihinden ayın günü okunamadı.`);
  }

  const sablon = {
    id: yeniId(),
    tur: temiz.tur,
    kurus: temiz.kurus,
    gun: gun,
    aciklama: temiz.aciklama,
    kategori: temiz.kategori,
    // Şimdilik tek sıklık var. Alanı yine de yazıyoruz: ileride
    // "haftalik" eklenirse eski şablonların ne olduğu belli olsun.
    siklik: "aylik",
    // İlk tekrar bir SONRAKİ ay çıksın diye başlangıcı "üretilmiş" sayıyoruz;
    // bugünkü kaydı zaten formdan kendin girdin.
    sonUretim: temiz.tarih,
  };

  // Oku-değiştir-yaz: doğrudan yeni depo yazsaydık kayıtlar silinirdi.
  const depo = depoOku();
  depo.sablonlar.push(sablon);
  depoYaz(depo);
  return sablon;
}

// Şablonu siler. Sildiyse true, bulamadıysa false döner.
// Şablondan daha önce üretilmiş KAYITLAR silinmez — onlar gerçekten
// olmuş harcamalar; şablonun silinmesi sadece "bundan sonra sorma" demek.
function sablonSil(id) {
  const depo = depoOku();
  const kalanlar = depo.sablonlar.filter((s) => s.id !== id);
  if (kalanlar.length === depo.sablonlar.length) return false;

  depo.sablonlar = kalanlar;
  depoYaz(depo);
  return true;
}

// Zamanı gelmiş ama henüz onaylanmamış/atlanmamış tekrarların listesi.
//
// SAF fonksiyondur: depoya dokunmaz, hiçbir şey kaydetmez, verilen
// şablon listesiyle ve verilen "bugün" ile hesaplar. Bu yüzden Node'da
// istediğimiz tarihi vererek test edebiliyoruz.
//
// Dönen her satır:
//   { sablonId, tur, kurus, tarih, aciklama, kategori }
//
// DİKKAT: tarihleri metin olarak `<=` ile karşılaştırıyoruz. Bu, sadece
// "YYYY-MM-DD" biçiminde doğru çalışır — çünkü o biçimde alfabetik sıra
// ile takvim sırası aynıdır ("2026-09-01" > "2026-08-31"). "01.09.2026"
// gibi bir biçimde bu numara çöker.
function bekleyenTekrarlar(sablonlar, bugun) {
  const bekleyen = [];
  if (!Array.isArray(sablonlar)) return bekleyen;

  for (const sablon of sablonlar) {
    // Bozuk bir şablon yüzünden uygulama açılmamazlık etmesin: burada
    // asla fırlatmıyoruz, tanımadığımızı sessizce atlıyoruz.
    if (!sablon || typeof sablon !== "object") continue;
    if (typeof sablon.sonUretim !== "string") continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sablon.sonUretim)) continue;
    if (!Number.isInteger(sablon.gun) || sablon.gun < 1 || sablon.gun > 31) continue;

    let tarih = sonrakiTekrar(sablon.sonUretim, sablon.gun);
    let sayac = 0;
    while (tarih <= bugun && sayac < TEKRAR_AZAMI) {
      bekleyen.push({
        sablonId: sablon.id,
        tur: sablon.tur,
        kurus: sablon.kurus,
        tarih: tarih,
        aciklama: sablon.aciklama,
        kategori: sablon.kategori,
      });
      sayac++;
      tarih = sonrakiTekrar(tarih, sablon.gun);
    }
  }

  // Eskiden yeniye sıralıyoruz. Sadece görüntü için değil: "hepsini
  // ekle" düğmesi listeyi baştan sona işliyor ve her onay sonUretim'i
  // ilerletiyor — sıra karışık olsaydı ileri bir tarih onaylandığında
  // arkada kalanlar kaybolurdu.
  bekleyen.sort((a, b) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : 0));
  return bekleyen;
}

// Bekleyen bir tekrarı ONAYLAR: gerçek kaydı üretir ve şablonun
// sayacını (sonUretim) o tarihe ilerletir. Üretilen kaydı döner.
// Böyle bir şablon yoksa null döner (arayüz bunu sessizce yutabilir).
function tekrarOnayla(sablonId, tarih) {
  const sablon = depoOku().sablonlar.find((s) => s && s.id === sablonId);
  if (!sablon) return null;

  // DİKKAT — ÇİFT ONAY KORUMASI (usta denetimi bulgusu): bu tarih zaten
  // üretilmiş ya da atlanmışsa ikinci kez üretmiyoruz. İki pencere
  // açıkken birinde onaylanan tekrar, ötekinin bayat "Ekle" düğmesinden
  // bir daha eklenemesin. Tarihler "YYYY-MM-DD" olduğu için <= güvenli.
  if (tarih <= sablon.sonUretim) return null;

  let kayit;
  try {
    kayit = kayitEkle({
      tur: sablon.tur,
      kurus: sablon.kurus, // TL metnine çevirip geri okumuyoruz
      tarih: tarih,
      aciklama: sablon.aciklama,
      kategori: sablon.kategori,
      sablonId: sablon.id,
    });
  } catch (hata) {
    // Buraya en çok şu yüzden düşeriz: şablon eski bir kategoriyle
    // kurulmuş, o kategori sonradan listeden çıkmış. Sessizce yutmak
    // en kötüsü olurdu — kullanıcı "ekle" der, hiçbir şey olmaz.
    throw new Error(
      `Şablonun kategorisi artık yok ya da bilgileri bozuk. Rapor sekmesinden bu yinelenen işlemi silip yeniden oluştur. (${hata.message})`
    );
  }

  // DİKKAT: depoyu BURADA yeniden okuyoruz. Yukarıda okuduğumuz kopyayı
  // yazsaydık kayitEkle'nin az önce eklediği kayıt üzerine yazılır ve
  // yeni kayıt kaybolurdu (klasik "bayat kopya" tuzağı).
  const depo = depoOku();
  const hedef = depo.sablonlar.find((s) => s && s.id === sablonId);
  if (hedef) {
    hedef.sonUretim = tarih;
    depoYaz(depo);
  }

  return kayit;
}

// Bekleyen bir tekrarı ATLAR: kayıt üretmez ama sayacı yine ilerletir.
// "Bu ay bu ödeme olmadı" durumunun cevabı bu — ilerletmeseydik aynı
// satır her açılışta karşımıza çıkardı.
function tekrarAtla(sablonId, tarih) {
  if (!gecerliTarih(tarih)) {
    throw new Error(`Geçersiz tarih: "${tarih}". Biçim 2026-08-06 gibi olmalı ve takvimde bulunmalı.`);
  }

  const depo = depoOku();
  const sablon = depo.sablonlar.find((s) => s && s.id === sablonId);
  if (!sablon) return false;

  // Sayaç ASLA geriye gitmez (usta denetimi bulgusu): bayat bir ekrandan
  // eski tarihli "Atla" gelirse yok sayıyoruz — geri giden sayaç, aynı
  // tekrarların yeniden "bekleyen" olarak dirilmesi demekti.
  if (tarih <= sablon.sonUretim) return false;

  sablon.sonUretim = tarih;
  depoYaz(depo);
  return true;
}

// Yedekten gelen şablon bölümünü denetler, temizini döner.
// - bölüm hiç yoksa (eski yedek) -> boş dizi
// - bozuk şablon -> HATA
//
// Neden bütçelerdeki gibi "sessizce atla" değil de sert ret: bozuk bir
// şablon her ay yanlış tutarda kayıt üretmeye aday. Bir kere göz ardı
// edilen hata aylarca sessizce yanlış veri üretirdi.
function sablonlariDenetle(ham) {
  if (ham === undefined || ham === null) return [];
  if (!Array.isArray(ham)) {
    throw new Error("Yedekteki yinelenen işlem bölümü bozuk: liste olmalı.");
  }

  return ham.map((s, sira) => {
    const yer = `Yedekteki ${sira + 1}. yinelenen işlem`;
    if (typeof s !== "object" || s === null) {
      throw new Error(`${yer} bozuk: bu bir şablon değil.`);
    }
    if (typeof s.id !== "string" || s.id === "") {
      throw new Error(`${yer} bozuk: kimlik (id) eksik.`);
    }
    if (!TURLER.includes(s.tur)) {
      throw new Error(`${yer} bozuk: tür "${s.tur}" tanınmadı.`);
    }
    if (!Number.isInteger(s.kurus) || s.kurus <= 0) {
      throw new Error(`${yer} bozuk: tutar (kurus) pozitif tam sayı olmalı.`);
    }
    if (!Number.isInteger(s.gun) || s.gun < 1 || s.gun > 31) {
      throw new Error(`${yer} bozuk: ayın günü 1-31 arası bir tam sayı olmalı.`);
    }
    if (s.siklik !== "aylik") {
      throw new Error(`${yer} bozuk: sıklık "${s.siklik}" tanınmadı (şimdilik yalnız "aylik").`);
    }
    if (!gecerliTarih(s.sonUretim)) {
      throw new Error(`${yer} bozuk: sonUretim "${s.sonUretim}" beklenen biçimde değil ya da takvimde yok.`);
    }

    // Kategori kuralı kayıtlardaki gibi: yalnız giderde anlamlı ve
    // tanınan bir kategori olmalı. Tanınmayan kategoriyle geri yüklenen
    // bir şablon, her onayda hata verecek ölü bir şablon olurdu.
    let kategori = "";
    if (s.tur === "gider") {
      kategori = typeof s.kategori === "string" ? s.kategori : "";
      if (!KATEGORILER.includes(kategori)) {
        throw new Error(`${yer} bozuk: kategori "${s.kategori}" tanınmadı.`);
      }
    }

    return {
      id: s.id,
      tur: s.tur,
      kurus: s.kurus,
      gun: s.gun,
      aciklama: typeof s.aciklama === "string" ? s.aciklama : "",
      kategori: kategori,
      siklik: "aylik",
      sonUretim: s.sonUretim,
    };
  });
}

// ============================================================
// GRAFİKLER — SAF GEOMETRİ
// ============================================================
//
// Bu bölümde tek bir "çiz" satırı yok; burada yalnızca SAYILAR var.
// "Bu dilim halkanın yüzde kaçı?", "bu çubuk kaç birim yüksek olmalı?"
// sorularını burada cevaplıyoruz, çizme işini app.js yapıyor.
//
// NEDEN HAZIR GRAFİK KÜTÜPHANESİ KULLANMIYORUZ (Chart.js gibi):
// üçü bir arada bir sorun çıkarıyordu — 200 KB'ın üzerinde bir dosya
// (çevrimdışı önbelleğe de girmesi gerekir), yeni bir bağımlılık
// (anayasamız "bağımlılık yok" diyor) ve çizimi <canvas> içine yaptığı
// için testlerimizin göremediği bir kör nokta. Geometriyi kendimiz
// hesaplayınca grafiğin doğruluğu, Node'da sınanabilen düz aritmetiğe
// dönüşüyor: aşağıdaki her satırın testi var.
//
// Grafikler VERİ DEĞİL, TÜRETME: depoda hiçbir şey saklanmıyor,
// hepsi eldeki kayıtlardan her seferinde yeniden hesaplanıyor.

// Halkanın çevresi (SVG biriminde). 100 seçmemiz bilinçli bir numara:
// çevre 100 olunca bir yayın UZUNLUĞU doğrudan YÜZDE demek oluyor.
// %25'lik dilim = 25 birimlik yay. Böylece hiçbir yerde "2 * pi * r"
// hesabı taşımıyoruz; o hesap yalnız bir kez, app.js'te yarıçapı
// bulurken geçiyor (r = 100 / (2 * pi)).
const HALKA_CEVRESI = 100;

// Virgülden sonra iki hane bırakacak şekilde yuvarlar: 33.3333 -> 33.33
// SVG'ye 15 haneli ondalık yazmanın anlamı yok; hem dosya şişer hem
// testte karşılaştırması kâbus olur.
function yuvarla2(sayi) {
  return Math.round(sayi * 100) / 100;
}

// Bir ayın gider dağılımı: hangi kategoriye ne kadar gitmiş?
//
// Dönen her satır: { kategori, sira, kurus, yuzde }
//   - Liste kuruşa göre BÜYÜKTEN KÜÇÜĞE sıralı (en çok yiyen üstte).
//   - `sira` = kategorinin KATEGORILER listesindeki yeri + 1. Rengi bu
//     belirliyor (.dilim-1 ... .dilim-8). NEDEN sıralamadaki yer değil:
//     Market bu ay birinci, gelecek ay üçüncü olabilir; rengi listedeki
//     sabit yerinden alırsak kategori ay değişse de aynı renkte kalır.
//     Sıralamadan alsaydık her ay bütün renkler yer değiştirirdi.
//   - Eşitlikte yine `sira` karar veriyor: aynı tutarlı iki kategorinin
//     sırası tarayıcıya göre değişmesin, sonuç her yerde aynı olsun.
//   - `yuzde` TAM SAYI ve yalnızca ETİKET içindir; çizim ondan değil,
//     aşağıdaki halkaDilimleri'nin ondalıklı uzunluklarından gelir.
//   - Geliri ve yatırımı hiç saymıyoruz: bu grafik "param nereye gitti"
//     sorusunun cevabı. Harcaması sıfır olan kategori listeye girmez.
function kategoriDagilimi(kayitlar, yil, ay) {
  const ayinKayitlari = ayKayitlari(kayitlar, yil, ay);
  const satirlar = [];
  let toplam = 0;

  // KATEGORILER üzerinde dönüyoruz, kayıtlar üzerinde değil: böylece
  // artık listede olmayan (eski, silinmiş) bir kategori kendiliğinden
  // dışarıda kalıyor — rengi olmayan bir dilim çizmek zorunda kalmıyoruz.
  for (let i = 0; i < KATEGORILER.length; i++) {
    const kategori = KATEGORILER[i];
    const kurus = ayinKayitlari.reduce(
      (t, k) => (k.tur === "gider" && k.kategori === kategori ? t + k.kurus : t),
      0
    );
    if (kurus <= 0) continue;

    toplam += kurus;
    satirlar.push({ kategori: kategori, sira: i + 1, kurus: kurus, yuzde: 0 });
  }

  if (toplam === 0) return [];

  for (const satir of satirlar) {
    satir.yuzde = Math.round((satir.kurus / toplam) * 100);
  }

  // Büyükten küçüğe; eşitlerde KATEGORILER sırası.
  satirlar.sort((a, b) => (b.kurus !== a.kurus ? b.kurus - a.kurus : a.sira - b.sira));
  return satirlar;
}

// Dağılımı halka grafiğin geometrisine çevirir.
//
// Dönen her satır: { kategori, sira, uzunluk, kayma }
//   uzunluk -> SVG'de "stroke-dasharray"in dolu kısmı (yayın boyu)
//   kayma   -> "stroke-dashoffset" (yayın nereden başlayacağı, EKSİ)
//
// Halka aslında TEK BİR ÇEMBER değil: üst üste binmiş birkaç çember,
// her birinin sadece bir parçası çizili. Kesikli çizgi ayarını
// "şu kadar çiz, sonrasını boş bırak" diye kurup her dilimi kendi
// başlangıç noktasına kaydırıyoruz.
//
// DİKKAT — DİKİŞ TUZAĞI: kaymayı hesaplarken YUVARLANMIŞ uzunlukları
// toplamıyoruz, HAM oranları topluyoruz; yuvarlamayı en son, çıkışta
// yapıyoruz. Üç eşit dilimde yuvarlanmışları toplasaydık
// 33,33 + 33,33 = 66,66 çıkardı ve üçüncü dilim 0,01 birim erken
// başlayıp halkada gözle görülür ince bir dikiş bırakırdı.
function halkaDilimleri(dagilim) {
  const dilimler = [];
  if (!Array.isArray(dagilim) || dagilim.length === 0) return dilimler;

  let toplam = 0;
  for (const d of dagilim) toplam += d.kurus;
  if (toplam <= 0) return dilimler;

  let kumulatif = 0; // HAM oranların toplamı (0 ile 1 arası)
  for (const d of dagilim) {
    const oran = d.kurus / toplam;
    const kayma = yuvarla2(kumulatif * HALKA_CEVRESI);

    dilimler.push({
      kategori: d.kategori,
      sira: d.sira,
      uzunluk: yuvarla2(oran * HALKA_CEVRESI),
      // DİKKAT: JavaScript'te "eksi sıfır" (-0) diye ayrı bir sayı var
      // ve Object.is(-0, 0) YANLIŞ döner — testler bunu yakalıyor.
      // İlk dilimde kayma sıfırdır; başına eksi koymadan bırakıyoruz.
      kayma: kayma === 0 ? 0 : -kayma,
    });

    kumulatif += oran;
  }

  return dilimler;
}

// Son `adet` ayın gelir/gider özeti — verilen (yil, ay) DAHİL, eskiden
// yeniye sıralı. Kayıt olmayan aylar listeden düşmez, sıfırlı satır
// olarak durur: grafikte "o ay hiç yoktu" değil, "o ay boştu" görünsün.
//
// Yıl devrini kendimiz hesaplamıyoruz, ayKaydir hallediyor:
// 2027 Ocak'tan 6 ay geriye gidince 2026 Ağustos'ta çıkıyoruz.
function aylikTrend(kayitlar, yil, ay, adet) {
  const trend = [];
  const sayi = Number.isInteger(adet) && adet > 0 ? adet : 0;

  // i, "kaç ay geriye" demek: en eskiden başlayıp 0'a (seçilen aya) iniyoruz.
  for (let i = sayi - 1; i >= 0; i--) {
    const o = ayKaydir(yil, ay, -i);
    const ozet = ozetHesapla(kayitlar, o.yil, o.ay);
    trend.push({
      yil: o.yil,
      ay: o.ay,
      etiket: ayKisaAdi(o.yil, o.ay),
      gelir: ozet.gelir,
      gider: ozet.gider,
    });
  }

  return trend;
}

// Trend satırlarını ÇUBUK YÜKSEKLİKLERİNE çevirir.
//
// Ölçek, aylardaki TÜM gelir ve gider değerlerinin en büyüğüne göre:
// en yüksek çubuk tam boy olur, ötekiler ona oranlanır. Gelir ve gider
// ayrı ayrı ölçeklenseydi (her biri kendi maksimumuna) 1.000 TL'lik
// gider, 50.000 TL'lik gelirle aynı boyda görünürdü — grafik yalan söylerdi.
//
// DİKKAT: hiç kayıt yoksa en büyük değer 0 olur ve bölme NaN üretirdi
// ("Not a Number"). NaN bir SVG özniteliğine yazıldığında çubuk sessizce
// kaybolur, hata da vermez. O yüzden bölmeden önce sıfırı ayıklıyoruz.
function trendCubuklari(trend, yukseklik) {
  let enBuyuk = 0;
  for (const t of trend) {
    if (t.gelir > enBuyuk) enBuyuk = t.gelir;
    if (t.gider > enBuyuk) enBuyuk = t.gider;
  }

  return trend.map((t) => ({
    etiket: t.etiket,
    // Yükseklikler TAM SAYI: SVG'ye 61.33333 yazmanın kimseye faydası yok.
    gelirYuksek: enBuyuk === 0 ? 0 : Math.round((t.gelir / enBuyuk) * yukseklik),
    giderYuksek: enBuyuk === 0 ? 0 : Math.round((t.gider / enBuyuk) * yukseklik),
  }));
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
//
// DİKKAT: sonYedek bilerek zarfa GİRMİYOR. O senin VERİN değil, BU
// CİHAZIN notu ("ben en son ne zaman yedeklendim?"). Dosyaya girseydi,
// eski bir yedeği yeni bir telefona yüklediğinde o telefon "yedeğim
// güncel" sanır ve hatırlatıcı susardı.
//
// Bu fonksiyon YAN ETKİSİZ: sadece metin üretir, damgaya dokunmaz.
// Damgayı vurmak yedekAlindi()'nin işi ve onu arayüz, dosya gerçekten
// indirildikten sonra çağırıyor.
function yedekMetni() {
  const depo = depoOku();
  return JSON.stringify(
    {
      surum: SURUM,
      olusturma: bugununTarihi(),
      kayitlar: depo.kayitlar,
      butceler: depo.butceler,
      sablonlar: depo.sablonlar,
    },
    null,
    2
  );
}

// "Yedek indirildi" damgasını bugüne çeker ve o tarihi döner.
//
// Oku-değiştir-yaz: deponun tamamını okuyup sadece bu alanı
// değiştiriyoruz. Doğrudan yeni bir depo yazsaydık kayıtlar, bütçeler
// ve şablonlar bir yedek indirme yüzünden silinirdi.
function yedekAlindi() {
  const depo = depoOku();
  const bugun = bugununTarihi();
  depo.sonYedek = bugun;
  depoYaz(depo);
  return bugun;
}

// En son ne zaman yedek indirildi? Hiç indirilmediyse boş metin döner.
function sonYedekOku() {
  return depoOku().sonYedek;
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
    if (!gecerliTarih(k.tarih)) {
      throw new Error(`${yer} bozuk: tarih "${k.tarih}" beklenen biçimde değil ya da takvimde yok.`);
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
      // Hangi yinelenen işlemden doğduğu. Eski yedeklerde bu alan yok,
      // boşla tamamlanıyor. Buraya YAZILMASAYDI bir yedek turundan sonra
      // kayıt-şablon bağı sessizce kopardı.
      sablonId: typeof k.sablonId === "string" ? k.sablonId : "",
    };
  });

  // Temiz parçaları tam bir depo iskeletine koyup dönüyoruz: arayüz
  // onaylarsa bu nesne olduğu gibi depoYaz'a verilebilir.
  // (Eski biçim çıplak listeydi; onda bütçe ve şablon bölümü yok,
  //  boş kalırlar.)
  //
  // Not: iskelet bosDepo()'dan geldiği için geri yükleme sonYedek'i
  // sıfırlar — yani geri yükledikten sonra "henüz yedek almadın" görürsün.
  // Bilerek böyle bırakıldı: taze yüklenen bu cihazın gerçekten de kendi
  // yedeği yok, üstelik damga zaten dosyada taşınmıyor.
  const depo = bosDepo();
  depo.kayitlar = kayitlar;
  if (!Array.isArray(veri)) {
    depo.butceler = butceleriDenetle(veri.butceler);
    depo.sablonlar = sablonlariDenetle(veri.sablonlar);
  }
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
    UYARI_ORANI,
    BUTCE_DURUMLARI,
    butceleriOku,
    butceBelirle,
    butceDurumAdi,
    butceDurumu,
    butceleriDenetle,
    tlToKurus,
    kurusYaz,
    kurusSade,
    bugununTarihi,
    bugununAyi,
    gecerliTarih,
    ayEtiketi,
    ayAdi,
    ayKisaAdi,
    ayKaydir,
    ayniAy,
    ayinGunSayisi,
    tarihKur,
    tarihYaz,
    gunFarki,
    turAdi,
    kayitlariOku,
    kayitlariYaz,
    kaydiDenetle,
    kayitEkle,
    kayitSil,
    TEKRAR_AZAMI,
    sonrakiTekrar,
    sablonlariOku,
    sablonEkle,
    sablonSil,
    bekleyenTekrarlar,
    tekrarOnayla,
    tekrarAtla,
    sablonlariDenetle,
    HALKA_CEVRESI,
    kategoriDagilimi,
    halkaDilimleri,
    aylikTrend,
    trendCubuklari,
    yedekMetni,
    yedekAlindi,
    sonYedekOku,
    yedekOku,
    ayKayitlari,
    turToplami,
    ozetHesapla,
    toplamVarlik,
    toplamYatirim,
    yeniyeGoreSirala,
  };
}
