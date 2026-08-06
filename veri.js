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
// Sonuna -v1 koyduk: ileride veri yapısını değiştirmek zorunda kalırsak
// -v2 diye yeni bir rafa geçip eski veriyi bozmadan taşıyabiliriz.
const DEPO_ANAHTARI = "finans-kayitlar-v1";

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

// ============================================================
// DEPO: OKUMA VE YAZMA
// ============================================================

// Tüm kayıtları localStorage'dan okur, dizi olarak döner.
// Hiç kayıt yoksa boş dizi [] döner — böylece çağıran yerin
// "acaba yok mu" diye kontrol etmesi gerekmez.
function kayitlariOku() {
  const metin = localStorage.getItem(DEPO_ANAHTARI);
  if (!metin) return [];

  // localStorage sadece METİN saklar, dizi/nesne saklayamaz.
  // Bu yüzden yazarken JSON.stringify ile metne, okurken JSON.parse ile
  // geri nesneye çeviriyoruz.
  try {
    const veri = JSON.parse(metin);
    // Beklediğimiz şey bir dizi. Değilse (veri bozulmuşsa) boş dön.
    return Array.isArray(veri) ? veri : [];
  } catch (hata) {
    console.error("Kayıtlar okunamadı, boş liste dönüyorum:", hata);
    return [];
  }
}

// Verilen diziyi localStorage'a yazar (eskisinin üzerine).
function kayitlariYaz(kayitlar) {
  localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(kayitlar));
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
    TURLER,
    KATEGORILER,
    tlToKurus,
    kurusYaz,
    bugununTarihi,
    bugununAyi,
    ayEtiketi,
    ayAdi,
    ayKaydir,
    kayitlariOku,
    kayitlariYaz,
    kayitEkle,
    kayitSil,
    ayKayitlari,
    turToplami,
    ozetHesapla,
    toplamVarlik,
    toplamYatirim,
  };
}
