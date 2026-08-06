// testler.js — projenin kendi kendini sınaması.
//
// ÇALIŞTIRMAK İÇİN:  node testler.js
//
// İki iş yapar:
//   1) veri.js'in fonksiyonlarını gerçek değerlerle sınar (hesap doğru mu?)
//   2) index.html / app.js / style.css birbiriyle uyumlu mu diye bakar
//      (JavaScript'in aradığı bir id HTML'de yok mu, script sırası doğru mu...)
//
// Hiçbir kurulum gerekmiyor: sadece Node yeterli, indirilen paket yok.
// Her şey yolundaysa çıkış kodu 0, bir sorun varsa 1 olur.

const fs = require("fs");
const path = require("path");

// ============================================================
// TARAYICI TAKLİDİ
// ============================================================
//
// veri.js tarayıcı için yazıldı ve localStorage kullanıyor.
// Node'da localStorage yok, o yüzden aynı işi yapan minik bir taklit
// koyuyoruz: getItem / setItem. Bu sayede testler gerçek dosyayı
// çalıştırıyor — kopyasını değil.
globalThis.localStorage = {
  _kutu: {},
  getItem(anahtar) {
    return Object.prototype.hasOwnProperty.call(this._kutu, anahtar) ? this._kutu[anahtar] : null;
  },
  setItem(anahtar, deger) {
    this._kutu[anahtar] = String(deger);
  },
  removeItem(anahtar) {
    delete this._kutu[anahtar];
  },
};

const V = require("./veri.js");

function depoyuTemizle() {
  localStorage.removeItem(V.DEPO_ANAHTARI);
}

// ============================================================
// KÜÇÜK TEST ARACI
// ============================================================

let gecen = 0;
let basarisiz = 0;

function baslik(metin) {
  console.log("\n== " + metin + " ==");
}

function esit(ad, gercek, beklenen) {
  // Object.is: NaN === NaN yanlış döner, Object.is(NaN, NaN) doğru döner.
  const ok = Object.is(gercek, beklenen);
  if (ok) {
    gecen++;
    console.log(`  OK    ${ad}  ->  ${gercek}`);
  } else {
    basarisiz++;
    console.log(`  HATA  ${ad}  ->  ${gercek}   (beklenen: ${beklenen})`);
  }
}

function dogru(ad, kosul) {
  esit(ad, kosul === true, true);
}

function hataAtmali(ad, fn) {
  try {
    fn();
    basarisiz++;
    console.log(`  HATA  ${ad}  ->  hata atmasi gerekirdi, atmadi`);
  } catch (e) {
    gecen++;
    console.log(`  OK    ${ad}  ->  "${e.message}"`);
  }
}

// ============================================================
// 1) PARA ÇEVİRME
// ============================================================

baslik("tlToKurus — yazıyı kuruşa çevirme");
esit("1250", V.tlToKurus(1250), 125000);
esit('"1250,50"', V.tlToKurus("1250,50"), 125050);
esit('"1.250,50"', V.tlToKurus("1.250,50"), 125050);
esit('"1250.50"', V.tlToKurus("1250.50"), 125050);
esit("19.99 (ondalık hatası olmamalı)", V.tlToKurus(19.99), 1999);
esit('"  99,9  " (boşluklar)', V.tlToKurus("  99,9  "), 9990);
esit('"" (boş)', V.tlToKurus(""), NaN);
esit('"abc"', V.tlToKurus("abc"), NaN);

baslik("kurusYaz — kuruşu ekran yazısına çevirme");
esit("125050", V.kurusYaz(125050), "1.250,50 ₺");
esit("0", V.kurusYaz(0), "0,00 ₺");
esit("1234567890", V.kurusYaz(1234567890), "12.345.678,90 ₺");
esit("-50000 (eksi)", V.kurusYaz(-50000), "-500,00 ₺");

// ============================================================
// 2) TARİH VE AY
// ============================================================

baslik("tarih ve ay yardımcıları");
dogru("bugununTarihi biçimi yyyy-aa-gg", /^\d{4}-\d{2}-\d{2}$/.test(V.bugununTarihi()));
dogru("bugununTarihi bugünün yerel günü", V.bugununTarihi().endsWith(String(new Date().getDate()).padStart(2, "0")));
esit("bugununAyi().ay 1-12 arası", V.bugununAyi().ay >= 1 && V.bugununAyi().ay <= 12, true);
esit("ayEtiketi(2026, 8)", V.ayEtiketi(2026, 8), "2026-08");
esit("ayEtiketi(2026, 12)", V.ayEtiketi(2026, 12), "2026-12");

// Ay adı Türkçe geliyor mu? Büyük/küçük harf tarayıcı sürümüne göre
// değişebiliyor, o yüzden küçük harfe çevirip karşılaştırıyoruz
// (baş harfi büyütme işini CSS yapıyor: text-transform: capitalize).
console.log("        [bilgi] ayAdi(2026, 8) =", JSON.stringify(V.ayAdi(2026, 8)));
esit("ayAdi(2026, 8)", V.ayAdi(2026, 8).toLocaleLowerCase("tr"), "ağustos 2026");
esit("ayAdi(2026, 1)", V.ayAdi(2026, 1).toLocaleLowerCase("tr"), "ocak 2026");

baslik("ayKaydir — yıl geçişi doğru mu?");
esit("Ağustos +1 -> Eylül", V.ayEtiketi(V.ayKaydir(2026, 8, 1).yil, V.ayKaydir(2026, 8, 1).ay), "2026-09");
esit("Aralık +1 -> gelecek yıl Ocak", V.ayEtiketi(V.ayKaydir(2026, 12, 1).yil, V.ayKaydir(2026, 12, 1).ay), "2027-01");
esit("Ocak -1 -> geçen yıl Aralık", V.ayEtiketi(V.ayKaydir(2026, 1, -1).yil, V.ayKaydir(2026, 1, -1).ay), "2025-12");
esit("Ağustos -12 -> bir yıl önce", V.ayEtiketi(V.ayKaydir(2026, 8, -12).yil, V.ayKaydir(2026, 8, -12).ay), "2025-08");

baslik("ayniAy — iki ay nesnesi aynı mı?");
dogru("aynı ay", V.ayniAy({ yil: 2026, ay: 8 }, { yil: 2026, ay: 8 }));
dogru("farklı ay", V.ayniAy({ yil: 2026, ay: 8 }, { yil: 2026, ay: 9 }) === false);
dogru("farklı yıl", V.ayniAy({ yil: 2026, ay: 8 }, { yil: 2025, ay: 8 }) === false);

baslik("tarihYaz — liste satırındaki tarih");
esit('"2026-08-06"', V.tarihYaz("2026-08-06"), "6 Ağustos");
esit('"2026-01-01"', V.tarihYaz("2026-01-01"), "1 Ocak");
esit('"2026-12-31"', V.tarihYaz("2026-12-31"), "31 Aralık");
// Ayın ilk günü, saat dilimi kaymasının en kolay yakalandığı yer:
// yanlış yapılsaydı "31 Temmuz" çıkardı.
esit("ayın 1'i geriye kaymıyor", V.tarihYaz("2026-08-01"), "1 Ağustos");

baslik("turAdi — ekranda gösterilen tür adı");
esit("gelir", V.turAdi("gelir"), "Gelir");
esit("gider", V.turAdi("gider"), "Gider");
esit("yatirim", V.turAdi("yatirim"), "Yatırım");

// ============================================================
// 3) KAYIT EKLEME VE SİLME
// ============================================================

depoyuTemizle();

baslik("boş depo");
esit("başlangıçta kayıt sayısı", V.kayitlariOku().length, 0);
esit("boş depoda toplam varlık", V.toplamVarlik(V.kayitlariOku()), 0);

baslik("kayitEkle");
const gelir1 = V.kayitEkle({ tur: "gelir", tutar: 45000, tarih: "2026-08-01", aciklama: "Maaş" });
esit("gelir kuruş", gelir1.kurus, 4500000);
esit("gelirde kategori boş", gelir1.kategori, "");
dogru("kimlik üretildi", gelir1.id.length > 5);

const gider1 = V.kayitEkle({ tur: "gider", tutar: "1.250,50", tarih: "2026-08-03", aciklama: "Haftalık", kategori: "Market" });
esit("gider kuruş", gider1.kurus, 125050);
esit("gider kategori", gider1.kategori, "Market");

const gider2 = V.kayitEkle({ tur: "gider", tutar: 300, tarih: "2026-08-04" });
esit("kategori boş bırakılırsa", gider2.kategori, "Diğer");

const yatirim1 = V.kayitEkle({ tur: "yatirim", tutar: 5000, tarih: "2026-08-05" });
esit("yatırım kuruş", yatirim1.kurus, 500000);

dogru("tarih boş -> bugün", /^\d{4}-\d{2}-\d{2}$/.test(V.kayitEkle({ tur: "gelir", tutar: 1 }).tarih));
esit("toplam kayıt", V.kayitlariOku().length, 5);

baslik("bozuk veri reddedilmeli");
hataAtmali("geçersiz tür", () => V.kayitEkle({ tur: "hediye", tutar: 100 }));
hataAtmali("tutar 0", () => V.kayitEkle({ tur: "gelir", tutar: 0 }));
hataAtmali("tutar negatif", () => V.kayitEkle({ tur: "gelir", tutar: -50 }));
hataAtmali("tutar yazı", () => V.kayitEkle({ tur: "gelir", tutar: "abc" }));
hataAtmali("geçersiz tarih biçimi", () => V.kayitEkle({ tur: "gelir", tutar: 10, tarih: "06.08.2026" }));
hataAtmali("geçersiz kategori", () => V.kayitEkle({ tur: "gider", tutar: 10, kategori: "Tatil" }));
esit("bozuklar depoya girmedi", V.kayitlariOku().length, 5);

baslik("kayitSil");
esit("var olanı sil", V.kayitSil(gider1.id), true);
esit("kayıt sayısı azaldı", V.kayitlariOku().length, 4);
esit("olmayanı sil", V.kayitSil("boyle-bir-id-yok"), false);
esit("kayıt sayısı değişmedi", V.kayitlariOku().length, 4);

baslik("kalıcılık (sayfa yenilenmiş gibi)");
const ham = localStorage.getItem(V.DEPO_ANAHTARI);
esit("depoda metin var", typeof ham, "string");
esit("metinden geri okunan sayı", JSON.parse(ham).length, 4);

baslik("bozuk depo uygulamayı çökertmemeli");
localStorage.setItem(V.DEPO_ANAHTARI, "{bu gecerli json degil");
// veri.js burada bilerek console.error basıyor; test çıktısı kirlenmesin
// diye o tek satırı geçici olarak susturuyoruz.
const eskiHataYazici = console.error;
console.error = () => {};
esit("boş dizi dönmeli", V.kayitlariOku().length, 0);
console.error = eskiHataYazici;

localStorage.setItem(V.DEPO_ANAHTARI, JSON.stringify({ dizi: "degil" }));
console.error = () => {};
esit("dizi olmayan veri -> boş dizi", V.kayitlariOku().length, 0);
console.error = eskiHataYazici;

baslik("kayitlariYaz + kayitlariOku — yazılan aynen geri okunuyor mu?");
depoyuTemizle();
V.kayitlariYaz([
  { id: "a1", tur: "gelir", kurus: 123456, tarih: "2026-08-01", aciklama: "elle yazıldı", kategori: "" },
]);
const geriOkunan = V.kayitlariOku();
esit("kayıt sayısı", geriOkunan.length, 1);
esit("kuruş bozulmadı", geriOkunan[0].kurus, 123456);
esit("Türkçe açıklama bozulmadı", geriOkunan[0].aciklama, "elle yazıldı");
esit("kimlik bozulmadı", geriOkunan[0].id, "a1");

// ============================================================
// 4) HESAPLAMALAR
// ============================================================

depoyuTemizle();

// Bilinen bir senaryo kuruyoruz, sonuçları elle hesaplayıp karşılaştırıyoruz.
//
// AĞUSTOS 2026
//   gelir   50.000,00
//   gider    1.200,00 + 800,00 = 2.000,00
//   yatırım 10.000,00
//   kalan   50.000 - 2.000 - 10.000 = 38.000,00
//
// TEMMUZ 2026
//   gelir   40.000,00
//   gider   45.000,00
//   kalan   40.000 - 45.000 = -5.000,00  (eksi!)
//
// TÜM ZAMANLAR
//   varlık  (50.000 + 40.000) - (2.000 + 45.000) = 43.000,00
//   yatırım 10.000,00
V.kayitEkle({ tur: "gelir", tutar: 50000, tarih: "2026-08-01" });
V.kayitEkle({ tur: "gider", tutar: 1200, tarih: "2026-08-10", kategori: "Market" });
V.kayitEkle({ tur: "gider", tutar: 800, tarih: "2026-08-20", kategori: "Fatura" });
V.kayitEkle({ tur: "yatirim", tutar: 10000, tarih: "2026-08-25" });
V.kayitEkle({ tur: "gelir", tutar: 40000, tarih: "2026-07-01" });
V.kayitEkle({ tur: "gider", tutar: 45000, tarih: "2026-07-15", kategori: "Kira" });

const tum = V.kayitlariOku();

baslik("ayKayitlari — doğru ayı süzüyor mu?");
esit("Ağustos 2026 kayıt sayısı", V.ayKayitlari(tum, 2026, 8).length, 4);
esit("Temmuz 2026 kayıt sayısı", V.ayKayitlari(tum, 2026, 7).length, 2);
esit("Eylül 2026 (kayıt yok)", V.ayKayitlari(tum, 2026, 9).length, 0);
esit("2025 Ağustos (yıl karışmasın)", V.ayKayitlari(tum, 2025, 8).length, 0);

baslik("ozetHesapla — Ağustos 2026");
const ag = V.ozetHesapla(tum, 2026, 8);
esit("gelir", V.kurusYaz(ag.gelir), "50.000,00 ₺");
esit("gider", V.kurusYaz(ag.gider), "2.000,00 ₺");
esit("yatırım", V.kurusYaz(ag.yatirim), "10.000,00 ₺");
esit("kalan (gelir-gider-yatırım)", V.kurusYaz(ag.kalan), "38.000,00 ₺");

baslik("ozetHesapla — Temmuz 2026 (kalan eksiye düşüyor)");
const tem = V.ozetHesapla(tum, 2026, 7);
esit("gelir", V.kurusYaz(tem.gelir), "40.000,00 ₺");
esit("gider", V.kurusYaz(tem.gider), "45.000,00 ₺");
esit("yatırım (yok)", tem.yatirim, 0);
esit("kalan eksi", V.kurusYaz(tem.kalan), "-5.000,00 ₺");
dogru("kalan gerçekten sıfırdan küçük", tem.kalan < 0);

baslik("ozetHesapla — kayıt olmayan ay sıfır dönmeli");
const eylul = V.ozetHesapla(tum, 2026, 9);
esit("gelir", eylul.gelir, 0);
esit("gider", eylul.gider, 0);
esit("yatırım", eylul.yatirim, 0);
esit("kalan", eylul.kalan, 0);

baslik("tüm zamanlar");
esit("toplam varlık", V.kurusYaz(V.toplamVarlik(tum)), "43.000,00 ₺");
esit("toplam yatırım", V.kurusYaz(V.toplamYatirim(tum)), "10.000,00 ₺");
esit("turToplami boş dizide", V.turToplami([], "gelir"), 0);

baslik("yeniyeGoreSirala — liste sıralaması");
// Sırasız bir dizi kuruyoruz; sonuç yeniden eskiye olmalı.
const sirasiz = [
  { id: "a", tarih: "2026-08-05", tur: "gelir", kurus: 100 },
  { id: "b", tarih: "2026-08-20", tur: "gelir", kurus: 100 },
  { id: "c", tarih: "2026-08-01", tur: "gelir", kurus: 100 },
  { id: "d", tarih: "2026-08-20", tur: "gelir", kurus: 100 }, // b ile aynı gün, sonra eklendi
];
const sirali = V.yeniyeGoreSirala(sirasiz);
esit("sıra", sirali.map((k) => k.id).join(""), "dbac");
esit("aynı günde sonra eklenen üstte", sirali[0].id, "d");
esit("en eski en altta", sirali[3].id, "c");
// Sıralama gelen diziyi bozmamalı: dışarıdaki kod "ben sıralamadım ki" demesin.
esit("özgün dizi bozulmadı", sirasiz.map((k) => k.id).join(""), "abcd");
esit("boş dizi", V.yeniyeGoreSirala([]).length, 0);

baslik("kuruş toplama ondalık hatası üretmiyor");
depoyuTemizle();
// 0.1 + 0.2 klasiği: ondalıkla çalışsaydık 0.30000000000000004 çıkardı.
V.kayitEkle({ tur: "gelir", tutar: "0,10", tarih: "2026-08-01" });
V.kayitEkle({ tur: "gelir", tutar: "0,20", tarih: "2026-08-01" });
esit("0,10 + 0,20", V.kurusYaz(V.toplamVarlik(V.kayitlariOku())), "0,30 ₺");
// 100 kere 19,99 -> tam 1.999,00 olmalı
depoyuTemizle();
for (let i = 0; i < 100; i++) V.kayitEkle({ tur: "gelir", tutar: "19,99", tarih: "2026-08-01" });
esit("100 x 19,99", V.kurusYaz(V.toplamVarlik(V.kayitlariOku())), "1.999,00 ₺");

// ============================================================
// 5) DOSYALAR BİRBİRİYLE UYUMLU MU?
// ============================================================
//
// En sinsi hata türü: HTML'de id="alan-tutar" yazıp JavaScript'te
// bul("alan-tutari") demek. Hiçbir hata mesajı çıkmaz, sadece çalışmaz.
// Bu bölüm o tür uyuşmazlıkları yakalar.

const oku = (ad) => fs.readFileSync(path.join(__dirname, ad), "utf8");
const html = oku("index.html");
const css = oku("style.css");

// Yorumları atıyoruz: yorum içinde geçen örnek kod gerçek çağrı sanılmasın.
const js = oku("app.js")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const tumEslesmeler = (metin, kalip) => [...metin.matchAll(kalip)].map((m) => m[1]);

const htmlIdListesi = tumEslesmeler(html, /\sid="([^"]+)"/g);
const htmlIdler = new Set(htmlIdListesi);
const htmlSiniflar = new Set(tumEslesmeler(html, /\sclass="([^"]+)"/g).flatMap((s) => s.split(/\s+/)));
const sekmeAdlari = tumEslesmeler(html, /data-sekme="([^"]+)"/g);

// Sadece JavaScript'in tutunması için var olan sınıflar; CSS kuralı beklemiyoruz.
const SADECE_KANCA = new Set(["sayfa"]);

baslik("script sırası (veri.js app.js'ten önce olmalı)");
const veriSira = html.indexOf('src="veri.js"');
const appSira = html.indexOf('src="app.js"');
dogru("veri.js index.html'de var", veriSira !== -1);
dogru("app.js index.html'de var", appSira !== -1);
dogru("veri.js önce yükleniyor", veriSira !== -1 && appSira !== -1 && veriSira < appSira);

baslik("app.js'in aradığı id'ler HTML'de var mı?");
const arananIdler = new Set([
  ...tumEslesmeler(js, /\bbul\("([^"]+)"\)/g),
  ...tumEslesmeler(js, /getElementById\("([^"]+)"\)/g),
]);
for (const id of arananIdler) dogru(`bul("${id}")`, htmlIdler.has(id));
for (const ad of sekmeAdlari) dogru(`sayfa-${ad} bölümü var`, htmlIdler.has("sayfa-" + ad));

baslik("app.js'in aradığı sınıflar HTML'de var mı?");
for (const s of new Set(tumEslesmeler(js, /querySelectorAll\("\.([\w-]+)"\)/g))) {
  dogru("." + s, htmlSiniflar.has(s));
}

baslik("HTML sınıfları CSS'te tanımlı mı? (yazım hatası yakalar)");
for (const s of htmlSiniflar) {
  if (SADECE_KANCA.has(s)) {
    console.log(`  ATLA  .${s} (sadece JS kancası, CSS kuralı gerekmiyor)`);
    continue;
  }
  dogru("." + s, css.includes("." + s));
}

baslik("JavaScript'in eklediği sınıflar CSS'te tanımlı mı?");
for (const s of ["gizli", "aktif", "eksi"]) dogru("." + s, css.includes("." + s));

baslik("app.js'in ÜRETTİĞİ satırların sınıfları CSS'te tanımlı mı?");
// Liste satırları createElement ile üretiliyor, yani index.html'de yok.
// Yukarıdaki HTML taraması onları göremez; burada app.js'teki className
// atamalarını tarıyoruz.
const uretilenSiniflar = new Set();
for (const parca of tumEslesmeler(js, /className\s*=\s*"([^"]+)"/g)) {
  for (const ad of parca.trim().split(/\s+/)) {
    // "tutar-" gibi yarım isimler: sonuna değişken ekleniyor, aşağıda ayrı bakıyoruz.
    if (ad.endsWith("-")) continue;
    uretilenSiniflar.add(ad);
  }
}
for (const s of uretilenSiniflar) dogru("." + s, css.includes("." + s));

// Yarım kalan "tutar-" + tur birleşimlerinin üç hâli de tanımlı olmalı.
for (const tur of V.TURLER) dogru(".tutar-" + tur, css.includes(".tutar-" + tur));

baslik("id'ler tekil mi?");
esit(`${htmlIdListesi.length} id`, htmlIdListesi.length, htmlIdler.size);

baslik("form türleri veri.js'teki TURLER ile aynı mı?");
const formTurleri = tumEslesmeler(html, /name="tur" value="([^"]+)"/g);
esit("HTML türleri", formTurleri.join(","), V.TURLER.join(","));

baslik("kategori seçenekleri HTML'e elle yazılmamış mı?");
// Kategoriler tek kaynaktan (veri.js) gelsin; HTML'de <option> olmamalı.
dogru("index.html'de <option> yok", !html.includes("<option"));

baslik("renkler tek yerde mi?");
// Kural: her renk :root bloğunda tanımlanır, aşağıda var(--isim) ile
// çağrılır. Böylece ana rengi değiştirmek tek satırlık iş oluyor.
// Bu denetim olmasa zamanla renkler dosyaya dağılır ve bir gün
// "mavi yaptım ama bir yer hâlâ yeşil" diye uğraşırız.
const cssYorumsuz = css.replace(/\/\*[\s\S]*?\*\//g, "");
const cssRootsuz = cssYorumsuz.replace(/:root\s*\{[\s\S]*?\}/, "");
const kacakRenkler = [...cssRootsuz.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
esit(":root dışında ham renk kodu", kacakRenkler.length, 0);
if (kacakRenkler.length > 0) console.log("        kaçaklar:", kacakRenkler.join(", "));
dogru(":root bloğu var", /:root\s*\{/.test(cssYorumsuz));

baslik("CSS'te kullanılmayan sınıf kalmış mı?");
// Ters yön denetim: CSS'te kural yazdığımız her sınıf gerçekten
// bir yerde kullanılıyor mu? Ölü kod birikmesini engelliyor.
const cssSiniflar = new Set([...cssYorumsuz.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
// JavaScript'te parça parça kurulan sınıflar ("tutar-" + tur) düz
// arama ile bulunamaz; onları yukarıda ayrıca doğruladık.
const DINAMIK_SINIFLAR = new Set(V.TURLER.map((t) => "tutar-" + t));
const kullanilmayanCss = [...cssSiniflar].filter(
  (s) => !DINAMIK_SINIFLAR.has(s) && !html.includes(s) && !js.includes(s)
);
esit("kullanılmayan CSS sınıfı", kullanilmayanCss.length, 0);
if (kullanilmayanCss.length > 0) console.log("        kullanılmayanlar:", kullanilmayanCss.join(", "));

baslik("app.js'in çağırdığı her fonksiyon gerçekten var mı?");
//
// Dosyaları ikiye ayırınca yeni bir hata riski doğdu: veri.js'te bir
// fonksiyonun adını değiştirirsem app.js eski adı çağırmaya devam eder.
// Tarayıcı bunu ancak o satıra gelince fark eder — yani belki hiç.
// Burada app.js'teki tüm fonksiyon çağrılarını toplayıp, her birinin
// ya app.js'in kendisinde ya veri.js'te ya da tarayıcının hazır
// araçları arasında olduğunu doğruluyoruz.

// Tarayıcının/JavaScript'in hazır sundukları — bunlar zaten var.
const HAZIR_OLANLAR = new Set([
  "document", "setTimeout", "clearTimeout", "console", "alert", "confirm",
  "Number", "String", "Boolean", "Object", "Array", "JSON", "Math", "Date", "Intl",
  // dil anahtar kelimeleri (parantezle geldikleri için çağrı gibi görünüyorlar)
  "if", "for", "while", "switch", "catch", "function", "return", "typeof", "new",
]);

// app.js'in kendi içinde tanımladığı fonksiyonlar
const appYerelleri = new Set(tumEslesmeler(js, /function\s+(\w+)\s*\(/g));
// veri.js'in dışa açtığı isimler
const veriIsimleri = new Set(Object.keys(V));

// "isim(" kalıbı — ama başında nokta olmayanlar (yani .forEach( sayılmaz)
const cagrilar = new Set(tumEslesmeler(js, /(?:^|[^.\w$])(\w+)\s*\(/gm));

let bilinmeyen = [];
for (const ad of cagrilar) {
  if (HAZIR_OLANLAR.has(ad) || appYerelleri.has(ad) || veriIsimleri.has(ad)) continue;
  bilinmeyen.push(ad);
}
esit("tanımı bulunamayan çağrı sayısı", bilinmeyen.length, 0);
if (bilinmeyen.length > 0) console.log("        bulunamayanlar:", bilinmeyen.join(", "));

// Ters yön: veri.js'in dışa açtığı ama app.js'te de testlerde de hiç
// kullanılmayan bir şey var mı? (ölü kod uyarısı — hata değil, bilgi)
const testKodu = oku("testler.js");
const kullanilmayan = [...veriIsimleri].filter(
  (ad) => !js.includes(ad) && !testKodu.includes("V." + ad)
);
if (kullanilmayan.length > 0) {
  console.log("        [bilgi] veri.js'te kullanılmayan:", kullanilmayan.join(", "));
} else {
  console.log("        [bilgi] veri.js'te kullanılmayan fonksiyon yok");
}

// ============================================================
// SONUÇ
// ============================================================

console.log("\n" + "-".repeat(52));
if (basarisiz === 0) {
  console.log(`TÜMÜ GEÇTİ — ${gecen} test`);
  process.exit(0);
} else {
  console.log(`GEÇEN: ${gecen}   BAŞARISIZ: ${basarisiz}`);
  process.exit(1);
}
