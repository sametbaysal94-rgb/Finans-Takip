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
  // İki rafı da boşaltıyoruz: v2 (güncel) ve v1 (kurtarma kopyası).
  // Sadece v2'yi silseydik, taşıma testlerinden kalan v1 verisi sonraki
  // testlere sızardı.
  localStorage.removeItem(V.DEPO_ANAHTARI);
  localStorage.removeItem(V.ESKI_ANAHTAR);
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
// Binlik nokta, virgül yok — bir zamanlar 1,25 TL sanılıyordu (bin kat hata!)
esit('"1.250" (binlik nokta, 125 kuruş DEĞİL)', V.tlToKurus("1.250"), 125000);
esit('"12.500"', V.tlToKurus("12.500"), 1250000);
esit('"1.250.000" (milyon, eskiden reddediliyordu)', V.tlToKurus("1.250.000"), 125000000);
esit('"1.5" (binlik kalıbına uymaz, ondalık kalır)', V.tlToKurus("1.5"), 150);
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
// Rafta artık kök nesne duruyor; kayıtlar onun .kayitlar bölümünde.
esit("metinden geri okunan sayı", JSON.parse(ham).kayitlar.length, 4);

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
// 4,5) YEDEKLEME
// ============================================================

baslik("yedekMetni — depo dosya metnine çevriliyor mu?");
depoyuTemizle();
V.kayitEkle({ tur: "gelir", tutar: 1000, tarih: "2026-08-01", aciklama: "Maaş" });
V.kayitEkle({ tur: "gider", tutar: "250,50", tarih: "2026-08-02", kategori: "Market" });
const yedek = V.yedekMetni();
// Yedek artık bir zarf: { surum, olusturma, kayitlar }.
esit("üretilen metin JSON olarak geri okunuyor", JSON.parse(yedek).kayitlar.length, 2);
esit("zarfta sürüm yazıyor", JSON.parse(yedek).surum, V.SURUM);
dogru("zarfta oluşturma tarihi var", /^\d{4}-\d{2}-\d{2}$/.test(JSON.parse(yedek).olusturma));
dogru("insan da okusun diye girintili", yedek.includes("\n  "));

baslik("yedekOku — sağlam yedek doğru okunuyor mu?");
depoyuTemizle(); // depo boşken okuyalım ki "yazmıyor" iddiasını sınayabilelim
const geriGelen = V.yedekOku(yedek);
esit("kayıt sayısı", geriGelen.kayitlar.length, 2);
esit("depoya kendiliğinden YAZMADI (yazma kararı arayüzün)", V.kayitlariOku().length, 0);
esit("kuruş aynen korundu", geriGelen.kayitlar[1].kurus, 25050);
esit("Türkçe açıklama korundu", geriGelen.kayitlar[0].aciklama, "Maaş");
esit("kategori korundu", geriGelen.kayitlar[1].kategori, "Market");
esit(
  "eksik açıklama boşla tamamlanıyor",
  V.yedekOku('[{"id":"x","tur":"gelir","kurus":100,"tarih":"2026-01-01"}]').kayitlar[0].aciklama,
  ""
);

baslik("yedekOku — bozuk yedek reddedilmeli (depo korunur)");
hataAtmali("JSON değil", () => V.yedekOku("bu json degil"));
hataAtmali("liste değil", () => V.yedekOku('{"a":1}'));
hataAtmali("kimlik yok", () => V.yedekOku('[{"tur":"gelir","kurus":100,"tarih":"2026-01-01"}]'));
hataAtmali("geçersiz tür", () => V.yedekOku('[{"id":"x","tur":"hediye","kurus":100,"tarih":"2026-01-01"}]'));
hataAtmali("kuruş ondalıklı", () => V.yedekOku('[{"id":"x","tur":"gelir","kurus":10.5,"tarih":"2026-01-01"}]'));
hataAtmali("kuruş eksi", () => V.yedekOku('[{"id":"x","tur":"gelir","kurus":-5,"tarih":"2026-01-01"}]'));
hataAtmali("kuruş yazı", () => V.yedekOku('[{"id":"x","tur":"gelir","kurus":"100","tarih":"2026-01-01"}]'));
hataAtmali("tarih bozuk", () => V.yedekOku('[{"id":"x","tur":"gelir","kurus":100,"tarih":"01.01.2026"}]'));

baslik("yedekOku — eski biçim kabul, gelecek sürüm ret");
// Eski (1. etap) yedekler çıplak listeydi. Kimsenin eski dosyası çöp olmasın.
const eskiYedek = '[{"id":"e1","tur":"gelir","kurus":500,"tarih":"2026-05-01"}]';
esit("eski biçim okunuyor", V.yedekOku(eskiYedek).kayitlar.length, 1);
esit("eski biçimde bütçeler boş geliyor", Object.keys(V.yedekOku(eskiYedek).butceler).length, 0);
hataAtmali("gelecekten gelen yedek (surum 3)", () => V.yedekOku('{"surum":3,"kayitlar":[]}'));

// ============================================================
// 4,7) DEPO v2 — KÖK NESNE VE TAŞIMA
// ============================================================

baslik("bosDepo — iskelet tam mı?");
const iskelet = V.bosDepo();
esit("surum", iskelet.surum, V.SURUM);
esit("kayitlar boş dizi", Array.isArray(iskelet.kayitlar) && iskelet.kayitlar.length, 0);
dogru("butceler boş nesne", typeof iskelet.butceler === "object" && !Array.isArray(iskelet.butceler));
esit("sablonlar boş dizi", iskelet.sablonlar.length, 0);

baslik("depoyuTasi — rafta ne bulursa bugünün biçimine çevirir");
const tasinan = V.depoyuTasi([{ id: "t1" }]);
esit("düz dizi (v1) kayıtlara giriyor", tasinan.kayitlar.length, 1);
esit("v1'den gelen bütçe boş", Object.keys(tasinan.butceler).length, 0);
esit("null -> boş depo", V.depoyuTasi(null).kayitlar.length, 0);
esit("yazı -> boş depo", V.depoyuTasi("çöp").kayitlar.length, 0);
esit("kayitlar dizi değilse boşlanır", V.depoyuTasi({ kayitlar: "çöp" }).kayitlar.length, 0);
dogru("tanınmayan alan içeri alınmıyor", !("carpik" in V.depoyuTasi({ carpik: 5 })));
esit("bilinen bütçe korunuyor", V.depoyuTasi({ butceler: { Market: 100 } }).butceler.Market, 100);
esit("butceler dizi gelirse reddedilir", Object.keys(V.depoyuTasi({ butceler: [1, 2] }).butceler).length, 0);
esit("sablonlar korunuyor", V.depoyuTasi({ sablonlar: [{ id: "s" }] }).sablonlar.length, 1);

baslik("v1 rafından v2 rafına taşıma");
depoyuTemizle();
const eskiVeri = JSON.stringify([
  { id: "m1", tur: "gelir", kurus: 1000, tarih: "2026-08-01", aciklama: "", kategori: "" },
  { id: "m2", tur: "gider", kurus: 500, tarih: "2026-08-02", aciklama: "", kategori: "Market" },
]);
localStorage.setItem(V.ESKI_ANAHTAR, eskiVeri);
esit("eski kayıtlar okunuyor", V.kayitlariOku().length, 2);
esit("v2 rafı artık dolu", typeof localStorage.getItem(V.DEPO_ANAHTARI), "string");
esit("v1 rafı SİLİNMEDİ (kurtarma kopyası)", localStorage.getItem(V.ESKI_ANAHTAR), eskiVeri);
V.kayitEkle({ tur: "gelir", tutar: 10, tarih: "2026-08-03" });
esit("yeni kayıt v2'ye eklendi", V.kayitlariOku().length, 3);
esit("v1 rafı hâlâ eski hâlinde (yeniden taşıma yok)", localStorage.getItem(V.ESKI_ANAHTAR), eskiVeri);

baslik("kayitlariYaz bütçe ve şablonları SİLMİYOR (oku-değiştir-yaz)");
depoyuTemizle();
const doluDepo = V.bosDepo();
doluDepo.butceler = { Market: 12345 };
doluDepo.sablonlar = [{ id: "s1" }];
V.depoYaz(doluDepo);
V.kayitEkle({ tur: "gider", tutar: 50, tarih: "2026-08-01", kategori: "Market" });
esit("kayıt eklendi", V.kayitlariOku().length, 1);
esit("bütçe hayatta", V.depoOku().butceler.Market, 12345);
esit("şablon hayatta", V.depoOku().sablonlar.length, 1);

baslik("depoYaz — depo doluyken anlaşılır hata");
// Node taklidimizin kotası yok; setItem'ı geçici olarak bozup gerçek
// tarayıcıdaki "depo doldu" durumunu canlandırıyoruz.
const gercekSetItem = localStorage.setItem;
localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
hataAtmali("dolu depoda Türkçe mesaj", () => V.depoYaz(V.bosDepo()));
localStorage.setItem = gercekSetItem;

baslik("kurusSade — işaretsiz yazım");
esit("125050", V.kurusSade(125050), "1.250,50");
esit("0", V.kurusSade(0), "0,00");

// ============================================================
// 4,8) BÜTÇELER
// ============================================================

baslik("butceBelirle ve butceleriOku");
depoyuTemizle();
esit("başta bütçe yok", Object.keys(V.butceleriOku()).length, 0);
esit("limit koy (TL yazısıyla)", V.butceBelirle("Market", "5.000"), 500000);
esit("okunuyor", V.butceleriOku().Market, 500000);
esit("limit güncelle", V.butceBelirle("Market", "6.000"), 600000);
esit("boş yazı limiti siler", V.butceBelirle("Market", ""), 0);
esit("silindi", V.butceleriOku().Market, undefined);
V.butceBelirle("Kira", 2000);
esit('"0" da siler', V.butceBelirle("Kira", "0"), 0);
hataAtmali("bilinmeyen kategori", () => V.butceBelirle("Tatil", 100));
hataAtmali("saçma tutar", () => V.butceBelirle("Market", "abc"));
hataAtmali("eksi limit", () => V.butceBelirle("Market", "-5"));

baslik("butceDurumAdi — üç durum ve sınırları");
esit("uyarı eşiği %80", V.UYARI_ORANI, 0.8);
esit("butceleriDenetle bayat anahtarı atlıyor", Object.keys(V.butceleriDenetle({ Tatil: 5 })).length, 0);
esit("butceleriDenetle eksik bölümü boşluyor", Object.keys(V.butceleriDenetle(undefined)).length, 0);
esit("altında: iyi", V.butceDurumAdi(100, 1000), "iyi");
esit("tam %80 sınırında: uyari", V.butceDurumAdi(800, 1000), "uyari");
esit("limitin tamamı ama aşmadı: uyari", V.butceDurumAdi(1000, 1000), "uyari");
esit("1 kuruş aşınca: asildi", V.butceDurumAdi(1001, 1000), "asildi");

baslik("butceDurumu — ay bazlı bütçe tablosu");
depoyuTemizle();
V.kayitEkle({ tur: "gider", tutar: 1200, tarih: "2026-08-10", kategori: "Market" });
V.kayitEkle({ tur: "gider", tutar: 400, tarih: "2026-08-12", kategori: "Market" });
V.kayitEkle({ tur: "gider", tutar: 300, tarih: "2026-07-10", kategori: "Market" }); // başka ay
V.kayitEkle({ tur: "gelir", tutar: 9999, tarih: "2026-08-11" }); // gelir bütçeye girmez
V.kayitEkle({ tur: "gider", tutar: 50, tarih: "2026-08-11", kategori: "Fatura" }); // limitsiz kategori
const denenecekButceler = { Market: 200000, Kira: 150000, Tatil: 100 }; // Tatil: bayat anahtar
const butceTablosu = V.butceDurumu(V.kayitlariOku(), denenecekButceler, 2026, 8);
esit("sadece limitli VE tanınan kategoriler", butceTablosu.length, 2);
esit("sıra KATEGORILER sırası (Market önce)", butceTablosu[0].kategori, "Market");
esit("harcanan sadece Ağustos gideri", butceTablosu[0].harcanan, 160000);
esit("yüzde tam sayı", butceTablosu[0].yuzde, 80);
esit("tam %80'de durum uyarı", butceTablosu[0].durum, "uyari");
esit("Kira harcaması yok", butceTablosu[1].harcanan, 0);
esit("Kira kalan = limit", butceTablosu[1].kalan, 150000);
esit("Kira durumu iyi", butceTablosu[1].durum, "iyi");
const asilan = V.butceDurumu(
  [{ tur: "gider", kategori: "Market", kurus: 250000, tarih: "2026-08-01" }],
  { Market: 200000 },
  2026,
  8
);
esit("aşınca durum", asilan[0].durum, "asildi");
dogru("kalan eksiye düşüyor", asilan[0].kalan < 0);
esit("yüzde 100'ü aşabiliyor", asilan[0].yuzde, 125);
esit("boş kayıtla boş bütçe", V.butceDurumu([], {}, 2026, 8).length, 0);

baslik("bütçeler yedeğe girip çıkıyor");
depoyuTemizle();
V.butceBelirle("Market", "1.000");
V.kayitEkle({ tur: "gelir", tutar: 10, tarih: "2026-08-01" });
const butceliYedek = V.yedekMetni();
esit("zarfta bütçe var", JSON.parse(butceliYedek).butceler.Market, 100000);
depoyuTemizle();
esit("bütçe geri geliyor", V.yedekOku(butceliYedek).butceler.Market, 100000);
hataAtmali("bozuk bütçe limiti reddedilir", () =>
  V.yedekOku('{"surum":2,"kayitlar":[],"butceler":{"Market":10.5}}')
);
esit(
  "bayat bütçe kategorisi sessizce atlanır",
  Object.keys(V.yedekOku('{"surum":2,"kayitlar":[],"butceler":{"Tatil":100}}').butceler).length,
  0
);
hataAtmali("bütçe bölümü dizi gelirse reddedilir", () =>
  V.yedekOku('{"surum":2,"kayitlar":[],"butceler":[1]}')
);

// ============================================================
// 4,9) YİNELENEN İŞLEMLER
// ============================================================

baslik("ayinGunSayisi — ayın kaç günü var?");
esit("2026 Şubat", V.ayinGunSayisi(2026, 2), 28);
esit("2028 Şubat (artık yıl)", V.ayinGunSayisi(2028, 2), 29);
esit("2026 Nisan", V.ayinGunSayisi(2026, 4), 30);
esit("2026 Aralık", V.ayinGunSayisi(2026, 12), 31);
// Artık yıl kuralının iki uç örneği: 2000 artık yıl, 1900 değil.
esit("2000 Şubat (400'e bölünüyor)", V.ayinGunSayisi(2000, 2), 29);
esit("1900 Şubat (100'e bölünüyor ama 400'e değil)", V.ayinGunSayisi(1900, 2), 28);

baslik("tarihKur — gün ayın son gününe kilitleniyor");
esit("(2026,2,31) -> 28 Şubat", V.tarihKur(2026, 2, 31), "2026-02-28");
esit("(2028,2,31) -> 29 Şubat", V.tarihKur(2028, 2, 31), "2028-02-29");
esit("(2026,4,31) -> 30 Nisan", V.tarihKur(2026, 4, 31), "2026-04-30");
esit("(2026,8,6) olduğu gibi", V.tarihKur(2026, 8, 6), "2026-08-06");
esit("tek haneler iki haneye tamamlanıyor", V.tarihKur(2026, 1, 5), "2026-01-05");

baslik("sonrakiTekrar — KAYMA TUZAĞI (gün şablondan gelir)");
esit("31 Ocak -> 28 Şubat", V.sonrakiTekrar("2026-01-31", 31), "2026-02-28");
// Zincirin can alıcı halkası: 28'e YAPIŞMIYOR, tekrar 31'e dönüyor.
esit("28 Şubat -> 31 Mart", V.sonrakiTekrar("2026-02-28", 31), "2026-03-31");
esit("31 Mart -> 30 Nisan", V.sonrakiTekrar("2026-03-31", 31), "2026-04-30");
esit("30 Nisan -> 31 Mayıs", V.sonrakiTekrar("2026-04-30", 31), "2026-05-31");
esit("yıl devri: 5 Aralık -> 5 Ocak", V.sonrakiTekrar("2026-12-05", 5), "2027-01-05");
esit("düz ay: 15 Ocak -> 15 Şubat", V.sonrakiTekrar("2026-01-15", 15), "2026-02-15");
esit("artık yılda 29 Şubat", V.sonrakiTekrar("2028-01-31", 31), "2028-02-29");

baslik("TEKRAR_AZAMI — güvenlik freni");
esit("değer", V.TEKRAR_AZAMI, 24);

baslik("sablonEkle / sablonlariOku / sablonSil");
depoyuTemizle();
esit("başta şablon yok", V.sablonlariOku().length, 0);
const sablonKira = V.sablonEkle({
  tur: "gider", tutar: "5.000", baslangic: "2026-01-15", aciklama: "Kira", kategori: "Kira",
});
esit("gün başlangıç tarihinden alındı", sablonKira.gun, 15);
esit("kuruş", sablonKira.kurus, 500000);
esit("sonUretim = başlangıç", sablonKira.sonUretim, "2026-01-15");
esit("sıklık aylık", sablonKira.siklik, "aylik");
esit("kategori", sablonKira.kategori, "Kira");
dogru("kimlik üretildi", sablonKira.id.length > 5);
esit("depoya yazıldı", V.sablonlariOku().length, 1);
const sablonMaas = V.sablonEkle({ tur: "gelir", tutar: 30000, baslangic: "2026-01-31", aciklama: "Maaş" });
esit("gelirde kategori boş", sablonMaas.kategori, "");
esit("ayın 31'i", sablonMaas.gun, 31);
esit("iki şablon", V.sablonlariOku().length, 2);
esit("şablon eklemek kayıt üretmiyor", V.kayitlariOku().length, 0);
hataAtmali("geçersiz tür", () => V.sablonEkle({ tur: "hediye", tutar: 10, baslangic: "2026-01-01" }));
hataAtmali("tutar sıfır", () => V.sablonEkle({ tur: "gider", tutar: 0, baslangic: "2026-01-01", kategori: "Market" }));
hataAtmali("geçersiz kategori", () => V.sablonEkle({ tur: "gider", tutar: 10, baslangic: "2026-01-01", kategori: "Tatil" }));
hataAtmali("bozuk başlangıç tarihi", () => V.sablonEkle({ tur: "gelir", tutar: 10, baslangic: "01.01.2026" }));
esit("bozuklar depoya girmedi", V.sablonlariOku().length, 2);
esit("sablonSil var olanı", V.sablonSil(sablonMaas.id), true);
esit("kalan şablon", V.sablonlariOku().length, 1);
esit("sablonSil olmayanı", V.sablonSil("boyle-bir-id-yok"), false);
esit("sayı değişmedi", V.sablonlariOku().length, 1);

baslik("bekleyenTekrarlar — zamanı gelenler");
// Şablonları elle kuruyoruz: fonksiyon SAF, depoya hiç bakmıyor.
const sablonYap = (ek) =>
  Object.assign(
    { id: "s1", tur: "gider", kurus: 100000, gun: 5, aciklama: "Kira", kategori: "Kira", siklik: "aylik", sonUretim: "2026-05-05" },
    ek
  );

const ucAyGeride = V.bekleyenTekrarlar([sablonYap({})], "2026-08-20");
esit("3 ay geride -> 3 bekleyen", ucAyGeride.length, 3);
esit("1. sıra en eski", ucAyGeride[0].tarih, "2026-06-05");
esit("2. sıra", ucAyGeride[1].tarih, "2026-07-05");
esit("3. sıra", ucAyGeride[2].tarih, "2026-08-05");
esit("şablon kimliği taşınıyor", ucAyGeride[0].sablonId, "s1");
esit("kuruş taşınıyor", ucAyGeride[0].kurus, 100000);
esit("kategori taşınıyor", ucAyGeride[0].kategori, "Kira");
esit("açıklama taşınıyor", ucAyGeride[0].aciklama, "Kira");
esit("bugün üretilmiş -> 0 bekleyen", V.bekleyenTekrarlar([sablonYap({ sonUretim: "2026-08-20" })], "2026-08-20").length, 0);
esit("sonUretim GELECEKTE -> 0 bekleyen", V.bekleyenTekrarlar([sablonYap({ sonUretim: "2027-01-05" })], "2026-08-20").length, 0);
esit("tam gününde -> 1 bekleyen", V.bekleyenTekrarlar([sablonYap({ sonUretim: "2026-07-05" })], "2026-08-05").length, 1);
esit("bir gün erken -> 0 bekleyen", V.bekleyenTekrarlar([sablonYap({ sonUretim: "2026-07-05" })], "2026-08-04").length, 0);
esit("boş şablon listesi", V.bekleyenTekrarlar([], "2026-08-20").length, 0);
esit("liste değilse boş", V.bekleyenTekrarlar(null, "2026-08-20").length, 0);

baslik("bekleyenTekrarlar — bozuk şablonlar çökertmiyor");
// Bozuk bir sonUretim (elle düzenleme, bozuk yedek) sonsuz liste üretmesin.
esit(
  "1999'dan kalma sonUretim TEKRAR_AZAMI ile sınırlı",
  V.bekleyenTekrarlar([sablonYap({ sonUretim: "1999-01-01", gun: 1 })], "2026-08-20").length,
  V.TEKRAR_AZAMI
);
esit("bozuk tarih biçimi atlanıyor", V.bekleyenTekrarlar([sablonYap({ sonUretim: "dun" })], "2026-08-20").length, 0);
esit("sonUretim yoksa atlanıyor", V.bekleyenTekrarlar([sablonYap({ sonUretim: undefined })], "2026-08-20").length, 0);
esit("gün 0 ise atlanıyor", V.bekleyenTekrarlar([sablonYap({ gun: 0 })], "2026-08-20").length, 0);
esit("gün 32 ise atlanıyor", V.bekleyenTekrarlar([sablonYap({ gun: 32 })], "2026-08-20").length, 0);
esit("null şablon atlanıyor", V.bekleyenTekrarlar([null, sablonYap({})], "2026-08-20").length, 3);

baslik("bekleyenTekrarlar — iki şablon tarihe göre karışıyor");
const ikiSablon = V.bekleyenTekrarlar(
  [
    sablonYap({ id: "kira", gun: 1, sonUretim: "2026-06-01", aciklama: "Kira" }),
    sablonYap({ id: "maas", tur: "gelir", kategori: "", gun: 15, sonUretim: "2026-06-15", aciklama: "Maaş" }),
  ],
  "2026-08-20"
);
esit("toplam bekleyen", ikiSablon.length, 4);
esit("1. sıra", ikiSablon[0].tarih, "2026-07-01");
esit("2. sıra", ikiSablon[1].tarih, "2026-07-15");
esit("3. sıra", ikiSablon[2].tarih, "2026-08-01");
esit("4. sıra", ikiSablon[3].tarih, "2026-08-15");
esit("4. sıranın şablonu", ikiSablon[3].sablonId, "maas");

baslik("bekleyenTekrarlar SAF — depoya dokunmuyor");
depoyuTemizle();
V.kayitEkle({ tur: "gelir", tutar: 10, tarih: "2026-08-01" });
V.bekleyenTekrarlar([sablonYap({ sonUretim: "2026-01-05" })], "2026-08-20");
esit("kayıt sayısı değişmedi", V.kayitlariOku().length, 1);
esit("şablon eklenmedi", V.sablonlariOku().length, 0);

baslik("tekrarOnayla — kayıt üretir, sayacı ilerletir");
depoyuTemizle();
const onaySablonu = V.sablonEkle({
  tur: "gider", tutar: "2.500", baslangic: "2026-05-10", aciklama: "Kira", kategori: "Kira",
});
const bekleyenler = V.bekleyenTekrarlar(V.sablonlariOku(), "2026-08-20");
esit("3 bekleyen var", bekleyenler.length, 3);
const uretilen = V.tekrarOnayla(onaySablonu.id, bekleyenler[0].tarih);
esit("kayıt üretildi", V.kayitlariOku().length, 1);
esit("kaydın tarihi", uretilen.tarih, "2026-06-10");
esit("kuruş TL turuna girmeden korundu", uretilen.kurus, 250000);
esit("kategori korundu", uretilen.kategori, "Kira");
esit("açıklama korundu", uretilen.aciklama, "Kira");
esit("sablonId bağlandı", uretilen.sablonId, onaySablonu.id);
esit("sonUretim ilerledi", V.sablonlariOku()[0].sonUretim, "2026-06-10");
esit("bekleyen sayısı bir azaldı", V.bekleyenTekrarlar(V.sablonlariOku(), "2026-08-20").length, 2);
esit("şablon silinmedi", V.sablonlariOku().length, 1);
esit("bilinmeyen şablon -> null", V.tekrarOnayla("boyle-bir-id-yok", "2026-08-10"), null);
esit("bilinmeyen şablon kayıt üretmedi", V.kayitlariOku().length, 1);

baslik("tekrarAtla — kayıt YOK ama sayaç yine ilerler");
esit("true döndü", V.tekrarAtla(onaySablonu.id, "2026-07-10"), true);
esit("kayıt sayısı artmadı", V.kayitlariOku().length, 1);
esit("sonUretim yine ilerledi", V.sablonlariOku()[0].sonUretim, "2026-07-10");
esit("bekleyen 1 kaldı", V.bekleyenTekrarlar(V.sablonlariOku(), "2026-08-20").length, 1);
esit("bilinmeyen şablon -> false", V.tekrarAtla("boyle-bir-id-yok", "2026-08-10"), false);

baslik("tekrarOnayla — kategorisi silinmiş şablon Türkçe hata veriyor");
depoyuTemizle();
const bozukDepo = V.bosDepo();
bozukDepo.sablonlar = [
  { id: "bozuk", tur: "gider", kurus: 1000, gun: 10, aciklama: "Eski", kategori: "Tatil", siklik: "aylik", sonUretim: "2026-07-10" },
];
V.depoYaz(bozukDepo);
hataAtmali("tanınmayan kategorili şablon", () => V.tekrarOnayla("bozuk", "2026-08-10"));
esit("kayıt üretilmedi", V.kayitlariOku().length, 0);
esit("sayaç ilerlemedi (yarım iş kalmadı)", V.sablonlariOku()[0].sonUretim, "2026-07-10");

baslik("kayitEkle — doğrudan kuruş ve sablonId");
depoyuTemizle();
const dogrudanKurus = V.kayitEkle({ tur: "gelir", kurus: 123456, tarih: "2026-08-01", aciklama: "Doğrudan" });
esit("kuruş aynen alındı", dogrudanKurus.kurus, 123456);
esit("sablonId varsayılanı boş", dogrudanKurus.sablonId, "");
const bagliKayit = V.kayitEkle({ tur: "gelir", tutar: 10, tarih: "2026-08-01", sablonId: "s-42" });
esit("sablonId saklandı", bagliKayit.sablonId, "s-42");
hataAtmali("kuruş 0 reddedilir", () => V.kayitEkle({ tur: "gelir", kurus: 0, tarih: "2026-08-01" }));
hataAtmali("kuruş eksi reddedilir", () => V.kayitEkle({ tur: "gelir", kurus: -5, tarih: "2026-08-01" }));

baslik("kaydiDenetle — ortak doğrulama kapısı");
esit("temiz kuruş dönüyor", V.kaydiDenetle({ tur: "gider", tutar: "12,50", tarih: "2026-08-01", kategori: "Market" }).kurus, 1250);
esit("gelirde kategori boşlanır", V.kaydiDenetle({ tur: "gelir", tutar: 5, tarih: "2026-08-01", kategori: "Market" }).kategori, "");
esit("açıklamanın boşlukları kırpılır", V.kaydiDenetle({ tur: "gelir", tutar: 5, aciklama: "  Maaş  " }).aciklama, "Maaş");
hataAtmali("bozuk türü reddeder", () => V.kaydiDenetle({ tur: "yok", tutar: 5 }));
esit("kaydiDenetle depoya YAZMIYOR", V.kayitlariOku().length, 2);

baslik("şablonlar yedeğe girip çıkıyor");
depoyuTemizle();
V.sablonEkle({ tur: "gider", tutar: "1.000", baslangic: "2026-03-15", aciklama: "Netflix", kategori: "Eğlence" });
V.kayitEkle({ tur: "gelir", tutar: 10, tarih: "2026-08-01" });
const sablonluYedek = V.yedekMetni();
esit("zarfta şablon var", JSON.parse(sablonluYedek).sablonlar.length, 1);
esit("zarftaki şablonun günü", JSON.parse(sablonluYedek).sablonlar[0].gun, 15);
depoyuTemizle();
const geriGelenDepo = V.yedekOku(sablonluYedek);
esit("şablon geri geliyor", geriGelenDepo.sablonlar.length, 1);
esit("açıklama korundu", geriGelenDepo.sablonlar[0].aciklama, "Netflix");
esit("kuruş korundu", geriGelenDepo.sablonlar[0].kurus, 100000);
esit("sonUretim korundu", geriGelenDepo.sablonlar[0].sonUretim, "2026-03-15");
esit(
  "eski düz dizi yedekte şablon boş",
  V.yedekOku('[{"id":"e1","tur":"gelir","kurus":500,"tarih":"2026-05-01"}]').sablonlar.length,
  0
);
esit("şablon bölümü olmayan zarf -> boş", V.yedekOku('{"surum":2,"kayitlar":[]}').sablonlar.length, 0);

baslik("yedekteki bozuk şablon reddediliyor");
const sablonZarfi = (icerik) => '{"surum":2,"kayitlar":[],"sablonlar":[' + icerik + "]}";
hataAtmali("kimlik yok", () =>
  V.yedekOku(sablonZarfi('{"tur":"gelir","kurus":100,"gun":5,"siklik":"aylik","sonUretim":"2026-01-05"}'))
);
hataAtmali("geçersiz tür", () =>
  V.yedekOku(sablonZarfi('{"id":"a","tur":"hediye","kurus":100,"gun":5,"siklik":"aylik","sonUretim":"2026-01-05"}'))
);
hataAtmali("kuruş ondalıklı", () =>
  V.yedekOku(sablonZarfi('{"id":"a","tur":"gelir","kurus":10.5,"gun":5,"siklik":"aylik","sonUretim":"2026-01-05"}'))
);
hataAtmali("gün 32", () =>
  V.yedekOku(sablonZarfi('{"id":"a","tur":"gelir","kurus":100,"gun":32,"siklik":"aylik","sonUretim":"2026-01-05"}'))
);
hataAtmali("tanınmayan sıklık", () =>
  V.yedekOku(sablonZarfi('{"id":"a","tur":"gelir","kurus":100,"gun":5,"siklik":"haftalik","sonUretim":"2026-01-05"}'))
);
hataAtmali("bozuk sonUretim", () =>
  V.yedekOku(sablonZarfi('{"id":"a","tur":"gelir","kurus":100,"gun":5,"siklik":"aylik","sonUretim":"01.01.2026"}'))
);
hataAtmali("giderde tanınmayan kategori", () =>
  V.yedekOku(sablonZarfi('{"id":"a","tur":"gider","kurus":100,"gun":5,"siklik":"aylik","sonUretim":"2026-01-05","kategori":"Tatil"}'))
);
hataAtmali("şablon bölümü liste değil", () => V.yedekOku('{"surum":2,"kayitlar":[],"sablonlar":{"a":1}}'));
esit("sablonlariDenetle eksik bölümü boşluyor", V.sablonlariDenetle(undefined).length, 0);
esit("sablonlariDenetle null -> boş", V.sablonlariDenetle(null).length, 0);

baslik("sablonId yedek turunu atlatıyor (beyaz liste denetimi)");
depoyuTemizle();
V.kayitEkle({ tur: "gider", tutar: 100, tarih: "2026-08-01", kategori: "Market", sablonId: "s-99" });
const bagliYedek = V.yedekMetni();
esit("zarfta sablonId yazıyor", JSON.parse(bagliYedek).kayitlar[0].sablonId, "s-99");
esit("yedekten dönünce hâlâ duruyor", V.yedekOku(bagliYedek).kayitlar[0].sablonId, "s-99");
esit(
  "eski kayıtta sablonId boşla tamamlanıyor",
  V.yedekOku('[{"id":"x","tur":"gelir","kurus":100,"tarih":"2026-01-01"}]').kayitlar[0].sablonId,
  ""
);

// ============================================================
// 4,10) GRAFİKLER
// ============================================================
//
// Grafiklerin doğruluğunu "gözle bakıp beğenmek" ile sınayamayız.
// O yüzden çizimden ÖNCEKİ sayıları sınıyoruz: dilim kaç birim, çubuk
// kaç birim yüksek. Ekranda yanlış görünen bir grafiğin sebebi
// neredeyse her zaman burada yakalanabilecek bir sayıdır.

baslik("HALKA_CEVRESI — yüzdeyi uzunluk yapan numara");
esit("değer 100", V.HALKA_CEVRESI, 100);

baslik("kategoriDagilimi — ayın gider dağılımı");
depoyuTemizle();
V.kayitEkle({ tur: "gider", tutar: 300, tarih: "2026-08-02", kategori: "Market" });
V.kayitEkle({ tur: "gider", tutar: 200, tarih: "2026-08-05", kategori: "Market" });
V.kayitEkle({ tur: "gider", tutar: 1000, tarih: "2026-08-07", kategori: "Kira" });
V.kayitEkle({ tur: "gider", tutar: 250, tarih: "2026-08-09", kategori: "Fatura" });
V.kayitEkle({ tur: "gelir", tutar: 9999, tarih: "2026-08-10" }); // gelir hesaba girmemeli
V.kayitEkle({ tur: "yatirim", tutar: 8888, tarih: "2026-08-11" }); // yatırım da girmemeli
V.kayitEkle({ tur: "gider", tutar: 7777, tarih: "2026-07-10", kategori: "Market" }); // başka ay
const dagilim = V.kategoriDagilimi(V.kayitlariOku(), 2026, 8);
// Ağustos gideri: Kira 1.000 + Market 500 + Fatura 250 = 1.750 TL
esit("harcama yapılan kategori sayısı", dagilim.length, 3);
esit("en büyük en üstte (Kira)", dagilim[0].kategori, "Kira");
esit("ikinci (Market)", dagilim[1].kategori, "Market");
esit("üçüncü (Fatura)", dagilim[2].kategori, "Fatura");
esit("Kira kuruşu", dagilim[0].kurus, 100000);
esit("Market iki kaydı toplandı", dagilim[1].kurus, 50000);
esit("Fatura kuruşu", dagilim[2].kurus, 25000);
esit("gelir ve yatırım toplama girmedi", dagilim[0].kurus + dagilim[1].kurus + dagilim[2].kurus, 175000);
// sira = KATEGORILER'deki yer + 1 → renk sınıfı (.dilim-N) buradan geliyor
esit("Kira sırası", dagilim[0].sira, V.KATEGORILER.indexOf("Kira") + 1);
esit("Market sırası (listenin 1.'si)", dagilim[1].sira, 1);
esit("Fatura sırası (listenin 2.'si)", dagilim[2].sira, 2);
dogru("sıra, sıralamadaki yerden BAĞIMSIZ", dagilim[0].sira !== 1);
esit("Kira yüzdesi (tam sayı)", dagilim[0].yuzde, 57);
esit("Market yüzdesi", dagilim[1].yuzde, 29);
esit("Fatura yüzdesi", dagilim[2].yuzde, 14);
esit("harcaması olmayan kategori listede yok", V.KATEGORILER.length - dagilim.length, 5);
esit("kayıt olmayan ay boş", V.kategoriDagilimi(V.kayitlariOku(), 2026, 9).length, 0);
esit("boş kayıt listesi", V.kategoriDagilimi([], 2026, 8).length, 0);
esit(
  "sadece gelir olan ay boş",
  V.kategoriDagilimi([{ tur: "gelir", kurus: 5000, tarih: "2026-08-01", kategori: "" }], 2026, 8).length,
  0
);
// DENETİM BULGUSU — İKİ EKRAN ÇELİŞİYORDU:
// Tanınmayan kategori eskiden halkadan ATILIYORDU. Ama Özet'teki gider kartı
// bütün giderleri topluyor. Sonuç: aynı para Özet'te 1.000,00 TL, Rapor'daki
// halkada 500,00 TL görünüyordu. Artık böyle bir kayıt "Diğer"e sayılıyor:
// para kaybolmuyor ve iki ekran her zaman aynı toplamı veriyor.
const tanınmayanKategoriliAy = [
  { tur: "gider", kurus: 50000, tarih: "2026-08-01", kategori: "Market" },
  { tur: "gider", kurus: 50000, tarih: "2026-08-02", kategori: "Tatil" }, // artık yok
];
const tanınmayanDagilim = V.kategoriDagilimi(tanınmayanKategoriliAy, 2026, 8);
esit("tanınmayan kategori atılmıyor, sayılıyor", tanınmayanDagilim.length, 2);
dogru(
  "tanınmayan kategori 'Diğer' dilimine yazılıyor",
  tanınmayanDagilim.some((d) => d.kategori === "Diğer" && d.kurus === 50000)
);

baslik("DEĞİŞMEZ: halkanın toplamı ile Özet'teki gider toplamı HER ZAMAN eşit");
// Bu iki sayı kullanıcıya iki ayrı ekranda gösteriliyor. Farklı çıkarlarsa
// kullanıcının hangisine inanacağını bilmesi imkânsız. Bu yüzden eşitliği
// tek tek örneklerle değil, bir KURAL olarak sınıyoruz.
const celiskiOrnekleri = [
  [{ tur: "gider", kurus: 50000, tarih: "2026-08-01", kategori: "Tatil" }],
  [{ tur: "gider", kurus: 12345, tarih: "2026-08-01", kategori: "" }],
  [{ tur: "gider", kurus: 700, tarih: "2026-08-01" }], // kategori alanı hiç yok
  [
    { tur: "gider", kurus: 50000, tarih: "2026-08-01", kategori: "Market" },
    { tur: "gider", kurus: 50000, tarih: "2026-08-02", kategori: "Tatil" },
    { tur: "gelir", kurus: 900000, tarih: "2026-08-03", kategori: "" },
  ],
];
for (let i = 0; i < celiskiOrnekleri.length; i++) {
  const ornek = celiskiOrnekleri[i];
  const halkaToplam = V.kategoriDagilimi(ornek, 2026, 8).reduce((t, d) => t + d.kurus, 0);
  esit(
    `${i + 1}. örnekte halka toplamı = aylık gider`,
    halkaToplam,
    V.ozetHesapla(ornek, 2026, 8).gider
  );
}

baslik("kategoriDagilimi — eşitlikte sıra hep aynı (kararlılık)");
// İki kategori tıpatıp aynı tutarda: hangisi önce gelecek? Cevabı
// tarayıcıya bırakmıyoruz, KATEGORILER sırasına bağlıyoruz.
const esitPaylar = V.kategoriDagilimi(
  [
    { tur: "gider", kurus: 5000, tarih: "2026-08-01", kategori: "Eğlence" },
    { tur: "gider", kurus: 5000, tarih: "2026-08-01", kategori: "Market" },
  ],
  2026,
  8
);
esit("iki dilim", esitPaylar.length, 2);
esit("önce Market (KATEGORILER'de daha önce)", esitPaylar[0].kategori, "Market");
esit("sonra Eğlence", esitPaylar[1].kategori, "Eğlence");
esit("ikisi de %50", esitPaylar[0].yuzde, 50);

baslik("halkaDilimleri — iki eşit dilim");
const ikiDilim = V.halkaDilimleri([
  { kategori: "Market", sira: 1, kurus: 5000 },
  { kategori: "Kira", sira: 4, kurus: 5000 },
]);
esit("1. dilim uzunluğu", ikiDilim[0].uzunluk, 50);
esit("1. dilim kayması", ikiDilim[0].kayma, 0);
esit("2. dilim uzunluğu", ikiDilim[1].uzunluk, 50);
esit("2. dilim kayması (eksi = geriye kaydır)", ikiDilim[1].kayma, -50);
esit("kategori taşınıyor", ikiDilim[1].kategori, "Kira");
esit("sıra (renk) taşınıyor", ikiDilim[1].sira, 4);

baslik("halkaDilimleri — tek dilim ve boş girdi");
const tekDilim = V.halkaDilimleri([{ kategori: "Market", sira: 1, kurus: 1234 }]);
esit("tek dilim halkanın tamamı", tekDilim[0].uzunluk, 100);
// DİKKAT: JavaScript'te -0 diye ayrı bir sayı var ve Object.is(-0, 0)
// YANLIŞ döner. Bu satır tam olarak onu yakalıyor.
esit("kayma tam sıfır (eksi sıfır değil)", tekDilim[0].kayma, 0);
esit("boş girdi -> boş liste", V.halkaDilimleri([]).length, 0);
esit("liste değilse boş", V.halkaDilimleri(null).length, 0);
esit("toplamı sıfır olan girdi -> boş", V.halkaDilimleri([{ kategori: "a", sira: 1, kurus: 0 }]).length, 0);

baslik("halkaDilimleri — üç eşit dilim (DİKİŞ testi)");
const ucEsit = V.halkaDilimleri([
  { kategori: "a", sira: 1, kurus: 100 },
  { kategori: "b", sira: 2, kurus: 100 },
  { kategori: "c", sira: 3, kurus: 100 },
]);
esit("1. uzunluk", ucEsit[0].uzunluk, 33.33);
esit("3. uzunluk", ucEsit[2].uzunluk, 33.33);
esit("1. kayma", ucEsit[0].kayma, 0);
esit("2. kayma", ucEsit[1].kayma, -33.33);
// Can alıcı satır: kümülatifi YUVARLANMIŞ uzunluklardan toplasaydık
// 33,33 + 33,33 = 66,66 çıkardı; son dilim erken başlar, halkada ince
// bir dikiş görünürdü. Ham orandan hesapladığımız için 66,67.
esit("3. kayma (ham orandan)", ucEsit[2].kayma, -66.67);
dogru(
  "son dilim halkayı kapatıyor (±0,01)",
  Math.abs(ucEsit[2].uzunluk + Math.abs(ucEsit[2].kayma) - 100) <= 0.01
);

baslik("aylikTrend — son N ay, eskiden yeniye");
depoyuTemizle();
V.kayitEkle({ tur: "gelir", tutar: 1000, tarih: "2026-08-01" });
V.kayitEkle({ tur: "gider", tutar: 400, tarih: "2026-08-02", kategori: "Market" });
V.kayitEkle({ tur: "gelir", tutar: 500, tarih: "2026-06-01" });
const trend = V.aylikTrend(V.kayitlariOku(), 2026, 8, 6);
esit("6 satır", trend.length, 6);
esit("ilk satır en eski ay", V.ayEtiketi(trend[0].yil, trend[0].ay), "2026-03");
esit("son satır seçilen ay", V.ayEtiketi(trend[5].yil, trend[5].ay), "2026-08");
esit("seçilen ayın geliri", trend[5].gelir, 100000);
esit("seçilen ayın gideri", trend[5].gider, 40000);
esit("Haziran geliri", trend[3].gelir, 50000);
esit("boş ay listeden düşmüyor (gelir)", trend[4].gelir, 0);
esit("boş ay listeden düşmüyor (gider)", trend[4].gider, 0);
dogru("etiket boş değil", trend[0].etiket.length > 0);
esit("adet 0 verilirse boş", V.aylikTrend(V.kayitlariOku(), 2026, 8, 0).length, 0);

baslik("aylikTrend — yıl devri");
const devir = V.aylikTrend([], 2027, 1, 6);
esit("2027 Ocak'tan 6 ay geriye ilk satır", V.ayEtiketi(devir[0].yil, devir[0].ay), "2026-08");
esit("son satır", V.ayEtiketi(devir[5].yil, devir[5].ay), "2027-01");
esit("kayıt yokken hepsi sıfır", devir.reduce((t, a) => t + a.gelir + a.gider, 0), 0);

baslik("trendCubuklari — çubuk yükseklikleri");
const cubuklar = V.trendCubuklari(
  [
    { etiket: "Oca", gelir: 100000, gider: 50000 },
    { etiket: "Şub", gelir: 0, gider: 0 },
    { etiket: "Mar", gelir: 25000, gider: 100000 },
  ],
  100
);
esit("en büyük değer tam boy", cubuklar[0].gelirYuksek, 100);
esit("yarısı yarım boy", cubuklar[0].giderYuksek, 50);
esit("boş ay sıfır", cubuklar[1].gelirYuksek, 0);
esit("çeyrek", cubuklar[2].gelirYuksek, 25);
// Ölçek gelir ve giderin ORTAK maksimumundan: ayrı ölçeklenseydi
// 1.000 TL'lik gider, 50.000 TL'lik gelirle aynı boyda görünürdü.
esit("gider de en büyükse tam boy", cubuklar[2].giderYuksek, 100);
esit("etiket taşınıyor", cubuklar[2].etiket, "Mar");
dogru(
  "yükseklikler tam sayı",
  cubuklar.every((c) => Number.isInteger(c.gelirYuksek) && Number.isInteger(c.giderYuksek))
);

baslik("trendCubuklari — hepsi sıfırken NaN üretmiyor");
const sifirlar = V.trendCubuklari(
  [
    { etiket: "Oca", gelir: 0, gider: 0 },
    { etiket: "Şub", gelir: 0, gider: 0 },
  ],
  100
);
esit("1. gelir yüksekliği", sifirlar[0].gelirYuksek, 0);
esit("1. gider yüksekliği", sifirlar[0].giderYuksek, 0);
dogru(
  "hiçbiri NaN değil (sıfıra bölme yakalandı)",
  sifirlar.every((c) => Number.isFinite(c.gelirYuksek) && Number.isFinite(c.giderYuksek))
);
esit("boş trend -> boş çubuk", V.trendCubuklari([], 100).length, 0);

baslik("ayKisaAdi — çubukların altındaki kısa ay adı");
console.log("        [bilgi] ayKisaAdi(2026, 8) =", JSON.stringify(V.ayKisaAdi(2026, 8)));
// Eşitlik ARAMIYORUZ: dil veritabanı sürümüne göre "Ağu" da gelebilir
// "Ağu." da. Testin Node sürümüne takılıp kırmızıya dönmesini istemiyoruz.
dogru("Ağustos -> ağu...", V.ayKisaAdi(2026, 8).toLocaleLowerCase("tr").startsWith("ağu"));
dogru("Ocak -> oca...", V.ayKisaAdi(2026, 1).toLocaleLowerCase("tr").startsWith("oca"));
dogru("Aralık -> ara...", V.ayKisaAdi(2026, 12).toLocaleLowerCase("tr").startsWith("ara"));
dogru("uzun addan kısa", V.ayKisaAdi(2026, 8).length < V.ayAdi(2026, 8).length);

// ============================================================
// 4,11) DAYANIKLILIK — yedek hatırlatıcısı
// ============================================================
//
// Hatırlatıcının tek işi doğru günü saymak. Yanlış sayarsa ya boş yere
// dırdır eder ya da asıl gerektiği anda susar; ikisi de sessiz hatadır.

baslik("gunFarki — iki tarih arasındaki gün sayısı");
esit("aynı gün", V.gunFarki("2026-08-08", "2026-08-08"), 0);
esit("1 Ağustos -> 31 Ağustos", V.gunFarki("2026-08-01", "2026-08-31"), 30);
esit("ay sınırı (31 Temmuz -> 1 Ağustos)", V.gunFarki("2026-07-31", "2026-08-01"), 1);
esit("yıl sınırı (31 Aralık -> 1 Ocak)", V.gunFarki("2025-12-31", "2026-01-01"), 1);
esit("artık yılda 29 Şubat atlanmıyor", V.gunFarki("2028-02-28", "2028-03-01"), 2);
esit("sıra tersse eksi çıkar", V.gunFarki("2026-08-31", "2026-08-01"), -30);

baslik("sonYedek — yedek damgası");
depoyuTemizle();
esit("hiç yedek alınmamış -> boş metin", V.sonYedekOku(), "");
esit("bosDepo iskeletinde alan var", V.bosDepo().sonYedek, "");
const yedekGunu = V.yedekAlindi();
dogru("dönen tarih biçimi yyyy-aa-gg", /^\d{4}-\d{2}-\d{2}$/.test(yedekGunu));
esit("bugünü damgaladı", yedekGunu, V.bugununTarihi());
esit("depodan geri okunuyor", V.sonYedekOku(), yedekGunu);
// REGRESYON: kayitEkle oku-değiştir-yaz yapmasaydı, bir kayıt eklemek
// az önce vurulan damgayı sessizce siler ve hatırlatıcı sıfırlanırdı.
V.kayitEkle({ tur: "gelir", tutar: 10, tarih: "2026-08-01" });
esit("kayıt eklemek damgayı silmiyor", V.sonYedekOku(), yedekGunu);
// yedekMetni SAF olmalı: damgayı arayüz, dosya indikten sonra vuruyor.
const damgaliYedek = V.yedekMetni();
esit("yedekMetni damgaya dokunmuyor", V.sonYedekOku(), yedekGunu);
dogru("yedek dosyasında sonYedek YOK (cihaza özel not)", !damgaliYedek.includes("sonYedek"));

baslik("depoyuTasi — sonYedek varsayılanla doluyor (SÜRÜM ARTIŞI YOK)");
esit("geçerli tarih korunuyor", V.depoyuTasi({ sonYedek: "2026-01-02" }).sonYedek, "2026-01-02");
esit("sayı gelirse boşlanır", V.depoyuTasi({ sonYedek: 5 }).sonYedek, "");
esit("bozuk biçim boşlanır", V.depoyuTasi({ sonYedek: "02.01.2026" }).sonYedek, "");
esit("alan hiç yoksa (eski cihaz) boş", V.depoyuTasi({}).sonYedek, "");

// ============================================================
// 4,12) USTA DENETİMİ DÜZELTMELERİ
// ============================================================
//
// Bu bölümdeki testler, 2. etap bittikten sonra yapılan bağımsız kod
// denetiminin bulgularına karşılık geliyor. Her biri gerçek bir açığı
// kapatan yamanın bekçisi.

baslik("gecerliTarih — biçim yetmez, takvimde de olmalı");
dogru("2026-02-28 geçerli", V.gecerliTarih("2026-02-28"));
dogru("2026-02-31 takvimde yok", V.gecerliTarih("2026-02-31") === false);
dogru("2028-02-29 artık yıl, geçerli", V.gecerliTarih("2028-02-29"));
dogru("2026-02-29 artık yıl değil", V.gecerliTarih("2026-02-29") === false);
dogru("2026-13-01 diye ay yok", V.gecerliTarih("2026-13-01") === false);
dogru("2026-04-31 diye gün yok", V.gecerliTarih("2026-04-31") === false);
dogru("2026-00-10 sıfırıncı ay olmaz", V.gecerliTarih("2026-00-10") === false);
dogru("biçim bozuksa zaten geçersiz", V.gecerliTarih("31.02.2026") === false);

baslik("hayalet tarihler kapıdan giremiyor");
depoyuTemizle();
hataAtmali("kayitEkle 31 Şubat'ı reddediyor", () =>
  V.kayitEkle({ tur: "gelir", tutar: 10, tarih: "2026-02-31" })
);
hataAtmali("yedekOku 31 Şubat'lı kaydı reddediyor", () =>
  V.yedekOku('[{"id":"x","tur":"gelir","kurus":100,"tarih":"2026-02-31"}]')
);

baslik("çift onay ve geriye atlama koruması");
depoyuTemizle();
const korumaSablonu = V.sablonEkle({
  tur: "gider", tutar: 100, baslangic: "2026-05-10", kategori: "Kira", aciklama: "Kira",
});
esit("iki bekleyen var", V.bekleyenTekrarlar(V.sablonlariOku(), "2026-07-15").length, 2);
dogru("ilk onay kayıt üretiyor", V.tekrarOnayla(korumaSablonu.id, "2026-06-10") !== null);
esit("AYNI tarihe ikinci onay: null (çift kayıt yok)", V.tekrarOnayla(korumaSablonu.id, "2026-06-10"), null);
esit("kayıt sayısı hâlâ 1", V.kayitlariOku().length, 1);
esit("geriye tarihli atlama reddediliyor", V.tekrarAtla(korumaSablonu.id, "2026-05-15"), false);
esit("sonUretim geriye gitmedi", V.sablonlariOku()[0].sonUretim, "2026-06-10");
dogru("ileri atlama çalışıyor", V.tekrarAtla(korumaSablonu.id, "2026-07-10"));
esit("sonUretim ilerledi", V.sablonlariOku()[0].sonUretim, "2026-07-10");

baslik("bozuk v2 rafı sağlam v1 kopyasını gölgelemiyor");
depoyuTemizle();
localStorage.setItem(
  V.ESKI_ANAHTAR,
  JSON.stringify([{ id: "kurtar1", tur: "gelir", kurus: 777, tarih: "2026-08-01", aciklama: "", kategori: "" }])
);
localStorage.setItem(V.DEPO_ANAHTARI, "{bozuk json");
console.error = () => {};
esit("v1'den kurtarıldı", V.kayitlariOku().length, 1);
esit("kurtarılan kuruş bozulmadı", V.kayitlariOku()[0].kurus, 777);
console.error = eskiHataYazici;

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
for (const parca of [
  ...tumEslesmeler(js, /className\s*=\s*"([^"]+)"/g),
  // SVG öğelerinde className ATANMAZ (orada salt okunur bir nesnedir),
  // sınıf setAttribute ile veriliyor. Bu kalıbı da taramasaydık grafiğin
  // sınıfları güvenlik ağının dışında kalırdı.
  ...tumEslesmeler(js, /setAttribute\("class",\s*"([^"]+)"/g),
]) {
  for (const ad of parca.trim().split(/\s+/)) {
    // "tutar-" gibi yarım isimler: sonuna değişken ekleniyor, aşağıda ayrı bakıyoruz.
    if (ad.endsWith("-")) continue;
    uretilenSiniflar.add(ad);
  }
}
for (const s of uretilenSiniflar) dogru("." + s, css.includes("." + s));

// Yarım kalan "tutar-" + tur birleşimlerinin üç hâli de tanımlı olmalı.
for (const tur of V.TURLER) dogru(".tutar-" + tur, css.includes(".tutar-" + tur));

// Aynı oyun bütçe çubuğunda: "butce-" + durum birleşiminin üç hâli.
for (const durum of V.BUTCE_DURUMLARI) dogru(".butce-" + durum, css.includes(".butce-" + durum));

// Halka dilimlerinin renkleri: "dilim-" + sıra. Her kategorinin bir
// rengi olmak ZORUNDA — biri eksik kalsa o dilim boyasız (siyah) çıkar
// ve hangi kategori olduğu anlaşılmaz. Kategori eklenirse bu döngü
// hemen uyarır.
for (let i = 1; i <= V.KATEGORILER.length; i++) {
  dogru(".dilim-" + i, css.includes(".dilim-" + i));
}

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
// JavaScript'te parça parça kurulan sınıflar ("tutar-" + tur,
// "butce-" + durum) düz arama ile bulunamaz; onları yukarıda ayrıca
// doğruladık.
const DINAMIK_SINIFLAR = new Set([
  ...V.TURLER.map((t) => "tutar-" + t),
  ...V.BUTCE_DURUMLARI.map((d) => "butce-" + d),
  ...V.KATEGORILER.map((_, i) => "dilim-" + (i + 1)),
]);
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
  "Number", "String", "Boolean", "Object", "Array", "JSON", "Math", "Date", "Intl", "Blob",
  // dil anahtar kelimeleri (parantezle geldikleri için çağrı gibi görünüyorlar)
  "if", "for", "while", "switch", "catch", "function", "return", "typeof", "new",
]);

// app.js'in kendi içinde tanımladığı fonksiyonlar
const appYerelleri = new Set(tumEslesmeler(js, /function\s+(\w+)\s*\(/g));

// Fonksiyonların PARAMETRELERİ de bu listeye giriyor. Neden: bir fonksiyon
// dışarıdan iş alıp onu çağırabiliyor (depoyaYaz(is) -> is()). Tarayıcı
// yalnızca "function ad(" kalıbını bildiği için böyle bir parametreyi
// "tanımı bulunamayan çağrı" sanıyordu — yanlış alarm.
for (const imza of tumEslesmeler(js, /function\s+\w+\s*\(([^)]*)\)/g)) {
  for (const parca of imza.split(",")) {
    const ad = parca.trim().split(/[\s=]/)[0];
    if (/^\w+$/.test(ad)) appYerelleri.add(ad);
  }
}
// veri.js'in dışa açtığı isimler
const veriIsimleri = new Set(Object.keys(V));

// DİKKAT — METİNLERİ ÖNCE ÇIKARIYORUZ: bu tarayıcı eskiden kaynağın
// TAMAMINI, kullanıcıya gösterilen Türkçe cümleler dahil, çağrı arıyormuş
// gibi okuyordu. `\w` Türkçe harfleri saymadığı için "üstteki (en eski)"
// cümlesi "stteki(" diye bölünüyor ve olmayan bir fonksiyon çağrısı gibi
// görünüyordu — testi Türkçe bir mesaj yüzünden kırmızıya çeviren yanlış
// alarm. Fonksiyon çağrısı hiçbir zaman metin İÇİNDE olmaz; o yüzden tırnak
// içindeki her şeyi taramadan önce siliyoruz.
const jsMetinsiz = js
  .replace(/'(?:\\.|[^'\\])*'/g, "''")
  .replace(/"(?:\\.|[^"\\])*"/g, '""')
  .replace(/`(?:\\.|[^`\\])*`/g, "``");

// "isim(" kalıbı — ama başında nokta olmayanlar (yani .forEach( sayılmaz)
const cagrilar = new Set(tumEslesmeler(jsMetinsiz, /(?:^|[^.\w$])(\w+)\s*\(/gm));

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
// 6) PWA — kimlik kartı, ikonlar ve çevrimdışı bekçisi
// ============================================================

baslik("manifest.json geçerli mi?");
let manifest = null;
try {
  manifest = JSON.parse(oku("manifest.json"));
  gecen++;
  console.log("  OK    JSON okunabildi");
} catch (e) {
  basarisiz++;
  console.log("  HATA  manifest.json bozuk: " + e.message);
}

if (manifest) {
  for (const alan of ["name", "short_name", "start_url", "scope", "display", "icons", "theme_color", "background_color"]) {
    dogru(`"${alan}" alanı var`, manifest[alan] !== undefined);
  }
  esit('display "standalone"', manifest.display, "standalone");
  esit('lang "tr"', manifest.lang, "tr");

  // GitHub Pages adresi site.github.io/proje-adi/ şeklinde, yani
  // uygulama kök dizinde DEĞİL. Yollar "/" ile başlarsa yayında kırılır.
  dogru('start_url göreli ("./" ile başlıyor)', String(manifest.start_url).startsWith("./"));
  dogru('scope göreli ("./" ile başlıyor)', String(manifest.scope).startsWith("./"));

  baslik("manifest'teki ikon dosyaları gerçekten var mı?");
  for (const ikon of manifest.icons) {
    const varMi = fs.existsSync(path.join(__dirname, ikon.src));
    dogru(`${ikon.src} (${ikon.sizes}, ${ikon.purpose})`, varMi);
    dogru(`${ikon.src} yolu göreli`, !ikon.src.startsWith("/"));
  }
  // Telefonun ikonu daire/kare kırpması için maskable şart, yoksa
  // ikon kenarlarından kesilir.
  dogru("maskable ikon var", manifest.icons.some((i) => String(i.purpose).includes("maskable")));

  baslik("theme_color üç yerde de aynı mı?");
  // Aynı renk manifest'te, index.html'de ve style.css'te yazılı.
  // Biri değişip diğerleri kalırsa durum çubuğu uygulamayla uyumsuz görünür.
  const metaRenk = (html.match(/name="theme-color"\s+content="([^"]+)"/) || [])[1];
  const cssVurgu = (css.match(/--vurgu:\s*(#[0-9a-fA-F]{3,8})/) || [])[1];
  esit("manifest.json theme_color", String(manifest.theme_color).toLowerCase(), String(metaRenk).toLowerCase());
  esit("style.css --vurgu", String(cssVurgu).toLowerCase(), String(metaRenk).toLowerCase());
}

// service-worker.js'in önbellek listesini bir kez ayrıştırıp aşağıdaki
// birkaç denetimde kullanıyoruz.
const swKod = oku("service-worker.js");
const listeMetni = (swKod.match(/const DOSYALAR = \[([\s\S]*?)\]/) || [])[1] || "";
const swDosyalar = [...listeMetni.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

baslik("yollar göreli mi? (GitHub Pages alt dizinde yayınlıyor)");
// GitHub Pages siteyi kullanici.github.io/depo-adi/ altında yayınlıyor.
// href="/style.css" gibi bir yol sitenin KÖKÜNE bakar, yani
// kullanici.github.io/style.css — orada dosya yok. Yayında her şey
// kırılır ve yerelde çalıştığı için sebebini bulmak zordur.
const mutlakYollar = [
  ...tumEslesmeler(html, /\shref="(\/[^/][^"]*)"/g),
  ...tumEslesmeler(html, /\ssrc="(\/[^/][^"]*)"/g),
];
esit("index.html'de / ile başlayan yol", mutlakYollar.length, 0);
if (mutlakYollar.length > 0) console.log("        mutlak yollar:", mutlakYollar.join(", "));

const swMutlak = swDosyalar.filter((y) => y.startsWith("/"));
esit("service worker listesinde / ile başlayan yol", swMutlak.length, 0);

dogru(".nojekyll dosyası var", fs.existsSync(path.join(__dirname, ".nojekyll")));

baslik("index.html PWA bağlantıları");
dogru("manifest.json bağlanmış", /rel="manifest"\s+href="manifest\.json"/.test(html));
dogru("apple-touch-icon var", html.includes('rel="apple-touch-icon"'));
dogru("theme-color meta var", html.includes('name="theme-color"'));

baslik("service worker dosya listesi doğru mu?");
// EN KRİTİK DENETİM: addAll listesindeki tek bir yol yanlışsa
// service worker HİÇ kurulmaz ve çevrimdışı çalışma sessizce çalışmaz.
dogru("DOSYALAR listesi bulundu", swDosyalar.length > 0);
for (const yol of swDosyalar) {
  if (yol === "./") {
    console.log('  ATLA  "./" (kök dizin, dosya değil)');
    continue;
  }
  dogru(yol, fs.existsSync(path.join(__dirname, yol.replace(/^\.\//, ""))));
}

baslik("önbelleğe alınması gereken hiçbir dosya atlanmamış mı?");
// Ters yön: projede olup listede olmayan bir dosya varsa o dosya
// çevrimdışıyken gelmez ve uygulama yarım açılır.
const ikonlar = fs
  .readdirSync(path.join(__dirname, "icons"))
  .filter((d) => d.endsWith(".png"))
  .map((d) => "icons/" + d);
const gerekenler = ["style.css", "veri.js", "app.js", "manifest.json", ...ikonlar];
const listedekiler = new Set(swDosyalar.map((y) => y.replace(/^\.\//, "")));
for (const d of gerekenler) dogru(d + " listede", listedekiler.has(d));

// index.html'i ayrı beklemiyoruz: "./" zaten onu getiriyor. Ama biri
// mutlaka listede olmalı, yoksa uygulama çevrimdışı hiç açılmaz.
dogru('ana sayfa listede ("./" veya index.html)', listedekiler.has("") || listedekiler.has("index.html"));
// Aynı dosyayı iki adresle saklamak yönlendirme sorunlarına yol açıyor.
dogru('"./" ve "index.html" ikisi birden yok', !(listedekiler.has("") && listedekiler.has("index.html")));

baslik("service worker kaydı ve önbellek yönetimi");
dogru("app.js service-worker.js'i kaydediyor", js.includes('register("./service-worker.js")'));
// DİKKAT: burada eskiden `register(...).catch` diye BİTİŞİK bir kalıp
// aranıyordu. Kayıt zincirine araya bir `.then(...)` eklendiği anda test
// kırıldı — oysa hata yakalama yerli yerindeydi. Test, kodun ne YAPTIĞINI
// değil nasıl YAZILDIĞINI denetliyordu. Artık zincirin sonunda bir .catch
// bulunmasına bakıyoruz: kayıt zinciri file:// üzerinde her hâlükârda
// hata verir, yakalanmazsa uygulama açılışta konsola çöp döker.
const kayitZinciri = js.slice(js.indexOf('register("./service-worker.js")'));
dogru(
  "kayıt hatası yakalanıyor (file:// çökmesin)",
  /\.catch\(\(hata\)/.test(kayitZinciri.slice(0, 1400))
);
dogru("önbellek adı sürümlü", /const ONBELLEK = "[^"]*v\d+"/.test(swKod));
dogru("install olayı var", swKod.includes('addEventListener("install"'));
dogru("activate olayı var", swKod.includes('addEventListener("activate"'));
dogru("fetch olayı var", swKod.includes('addEventListener("fetch"'));
dogru("eski önbellekler siliniyor", swKod.includes("caches.delete"));
dogru("sadece başarılı yanıtlar önbelleğe giriyor", swKod.includes("yanit.ok"));
dogru("çevrimdışı yedek olarak önbelleğe düşülüyor", swKod.includes("caches.match"));

// ============================================================
// DENETİM 2026-08-10 — BULUNAN HATALARIN NÖBETÇİLERİ
// ============================================================
//
// Aşağıdaki her blok, dört şeritli bir denetimde bulunup ÖLÇÜLEREK
// doğrulanmış bir hataya aittir. Her biri düzeltildi; buradaki testler
// hatanın geri gelmesini engelliyor. Bir testi silmeden önce, altındaki
// hatanın neden bir daha olamayacağını söyleyebiliyor olman gerekir.

baslik("Güvenli tam sayı sınırı — sessizce değişen tutar");
// Ölçüm: "9007199254740993" giriliyordu, ekranda ...992 çıkıyordu.
// JavaScript bu büyüklükten sonra tam sayıları saklayamaz.
esit("güvenli sınırın üstü reddediliyor", V.tlToKurus("99999999999999999999"), NaN);
esit("bilimsel gösterimle de aşılamıyor", V.tlToKurus("1e21"), NaN);
esit("sınırın altı hâlâ kabul", V.tlToKurus("1.000.000"), 100000000);
hataAtmali("kayıt: güvensiz büyüklükte kuruş reddediliyor", () =>
  V.kaydiDenetle({ tur: "gelir", kurus: Number.MAX_SAFE_INTEGER + 2 })
);
hataAtmali("yedek: güvensiz büyüklükte kuruş reddediliyor", () =>
  V.yedekOku(
    JSON.stringify({
      surum: V.SURUM,
      kayitlar: [{ id: "a", tur: "gelir", kurus: 9007199254740993, tarih: "2026-08-01" }],
    })
  )
);

baslik("Bozuk kayıt toplamı zehirlemiyor");
// Ölçüm: rafta `kurus` alanı METİN olan tek bir kayıt, 1.200,00 TL'lik
// aylık gideri 12.000.099,00 TL gösteriyordu (metin birleştirme).
// Alan hiç yoksa ekranda "NaN ₺" yazıyordu.
const zehirli = [
  { id: "1", tur: "gelir", kurus: 5000000, tarih: "2026-08-01", kategori: "" },
  { id: "2", tur: "gider", kurus: 120000, tarih: "2026-08-03", kategori: "Market" },
  { id: "3", tur: "gider", kurus: "9900", tarih: "2026-08-05", kategori: "Market" }, // metin
  { id: "4", tur: "gider", tarih: "2026-08-06", kategori: "Market" }, // alan yok
];
const zehirliOzet = V.ozetHesapla(zehirli, 2026, 8);
esit("metin tutar toplama karışmıyor", zehirliOzet.gider, 120000);
esit("gelir bozulmuyor", zehirliOzet.gelir, 5000000);
esit("kalan NaN olmuyor", zehirliOzet.kalan, 4880000);
esit("toplam varlık NaN olmuyor", V.toplamVarlik(zehirli), 4880000);
esit(
  "bütçe tablosu da etkilenmiyor",
  V.butceDurumu(zehirli, { Market: 500000 }, 2026, 8)[0].harcanan,
  120000
);

baslik("Bozuk deponun üzerine yazılmıyor");
// Ölçüm: 620 kayıtlık 70.526 karakterlik veri, ekranda "0 kayıt" görünüyor
// ve eklenen İLK kayıt onu 210 karaktere düşürüyordu — geri dönüşü yok.
depoyuTemizle();
const bozukMetin = '{"surum":2,"kayitlar":[{"id":"1","tur":"gelir","kurus":100000';
localStorage.setItem(V.DEPO_ANAHTARI, bozukMetin);
// veri.js burada bilerek console.error basıyor; test çıktısı kirlenmesin.
console.error = () => {};
esit("bozuk depo boş görünüyor (eski davranış korunuyor)", V.kayitlariOku().length, 0);
hataAtmali("bozuk deponun üstüne kayıt eklenemiyor", () =>
  V.kayitEkle({ tur: "gelir", tutar: "100" })
);
console.error = eskiHataYazici;
esit("ham veri hâlâ olduğu gibi duruyor", localStorage.getItem(V.DEPO_ANAHTARI), bozukMetin);
// Kaçış kapısı: geri yükleme bilerek üzerine yazabilmeli, yoksa kullanıcı
// bozuk depodan hiç kurtulamazdı.
V.depoYaz(V.bosDepo(), { zorla: true });
esit("geri yükleme (zorla) yazabiliyor", V.kayitlariOku().length, 0);
dogru("zorla yazdıktan sonra depo okunabilir", localStorage.getItem(V.DEPO_ANAHTARI) !== bozukMetin);
depoyuTemizle();

baslik("Tekrarlarda sıra koruması — atlanan aylar kaybolmuyor");
// Ölçüm: üç ay bekleyen kirada kullanıcı EN ALTTAKİ satırın "Ekle"sine
// basınca 20.000 TL'lik iki kira geri dönüşü olmadan siliniyordu.
depoyuTemizle();
const kiraSablonu = V.sablonEkle({
  tur: "gider",
  tutar: "10.000",
  baslangic: "2026-05-05",
  aciklama: "Kira",
  kategori: "Kira",
});
const bekleyenUc = V.bekleyenTekrarlar(V.sablonlariOku(), "2026-08-10");
esit("üç dönem bekliyor", bekleyenUc.length, 3);
esit("sıradaki dönem en eskisi", V.siradakiTekrar(V.sablonlariOku()[0]), "2026-06-05");
// EN YENİ satıra basmak: iş yapılmamalı.
esit("ileri tarihli onay reddediliyor", V.tekrarOnayla(kiraSablonu.id, "2026-08-05"), null);
esit("hiçbir kayıt üretilmedi", V.kayitlariOku().length, 0);
esit("bekleyenler duruyor", V.bekleyenTekrarlar(V.sablonlariOku(), "2026-08-10").length, 3);
esit("ileri tarihli atlama da reddediliyor", V.tekrarAtla(kiraSablonu.id, "2026-08-05"), false);
esit("atlama sonrası da bekleyenler duruyor", V.bekleyenTekrarlar(V.sablonlariOku(), "2026-08-10").length, 3);
// Doğru sırayla ilerleyince her şey çalışıyor.
dogru("sıradaki dönem onaylanabiliyor", V.tekrarOnayla(kiraSablonu.id, "2026-06-05") !== null);
esit("kayıt üretildi", V.kayitlariOku().length, 1);
esit("Haziran gideri artık görünüyor", V.ozetHesapla(V.kayitlariOku(), 2026, 6).gider, 1000000);
esit("geri kalan iki dönem hâlâ bekliyor", V.bekleyenTekrarlar(V.sablonlariOku(), "2026-08-10").length, 2);
esit("aynı dönem ikinci kez onaylanamıyor", V.tekrarOnayla(kiraSablonu.id, "2026-06-05"), null);
depoyuTemizle();

baslik("Yedekte çift kimlik reddediliyor");
// Ölçüm: aynı kimlikli iki kayıt kabul ediliyordu; tek satırı silmek
// 300,00 TL'nin tamamını siliyordu.
hataAtmali("aynı kimlikli iki kayıt", () =>
  V.yedekOku(
    JSON.stringify({
      surum: V.SURUM,
      kayitlar: [
        { id: "x", tur: "gelir", kurus: 10000, tarih: "2026-08-01" },
        { id: "x", tur: "gelir", kurus: 20000, tarih: "2026-08-02" },
      ],
    })
  )
);
hataAtmali("aynı kimlikli iki şablon", () =>
  V.sablonlariDenetle([
    { id: "s", tur: "gider", kurus: 1000, gun: 5, siklik: "aylik", sonUretim: "2026-08-05", kategori: "Kira" },
    { id: "s", tur: "gider", kurus: 2000, gun: 6, siklik: "aylik", sonUretim: "2026-08-06", kategori: "Kira" },
  ])
);

baslik("Service worker — komşu uygulamaların önbelleği ve sunucu arızası");
// Ölçüm/okuma: temizlik "adı bizimkinden farklı olan her şeyi sil" diyordu.
// Cache Storage adres başınadır: aynı github.io hesabındaki BÜTÜN projeler
// aynı rafı paylaşır, yani Finans Takip komşularını siliyordu.
dogru("silme yalnız kendi ön ekiyle sınırlı", swKod.includes("startsWith(ONEK)"));
dogru("ön ek tanımlı", /const ONEK = "finans-takip-"/.test(swKod));
// fetch YALNIZCA bağlantı kopunca hata sayılır; 503 "başarılı" gelir ve
// eskiden olduğu gibi kullanıcıya giderdi.
dogru(
  "başarısız HTTP yanıtında önbelleğe düşülüyor",
  /return caches\.match\(istek\)/.test(swKod)
);

baslik("Yazma hataları artık sessizce yutulmuyor");
// depoYaz üç durumda hata fırlatır (dolu depo, gizli mod, okunamayan raf).
// Silme ve atlama düğmelerinde hiç yakalanmıyordu: kullanıcı basıyor,
// hiçbir şey olmuyor, hiçbir açıklama çıkmıyordu.
dogru("ortak yazma kapısı var", js.includes("function depoyaYaz("));
dogru("kayıt silme kapıdan geçiyor", js.includes("depoyaYaz(() => kayitSil("));
dogru("şablon silme kapıdan geçiyor", js.includes("depoyaYaz(() => sablonSil("));
dogru("tekrar atlama kapıdan geçiyor", /depoyaYaz\(\(\) => \{ atlandi = tekrarAtla\(/.test(js));

baslik("Gün değişimi — gece yarısını geçen uygulama");
// Ölçüm/okuma: tarih alanı yalnızca açılışta dolduruluyordu ve app.js'te
// sayfanın geri gelişini dinleyen hiçbir şey yoktu. 31 Ağustos'ta açık
// bırakılan uygulamada 1 Eylül'de girilen kayıt Ağustos'a yazılıyordu.
dogru("sayfaya dönüş dinleniyor", js.includes('addEventListener("visibilitychange"'));
dogru("bellekten dönüş de dinleniyor", js.includes('addEventListener("pageshow"'));
dogru("gün değişimini işleyen fonksiyon var", js.includes("function gunDegistiyseTazele("));
dogru("tarih alanı elle değiştirilmişse korunuyor", js.includes("alan.value === eskiGun"));

baslik("Renk kontrastı — yazılar okunabiliyor mu? (HESAPLANIYOR)");
//
// Bu blok renkleri gözle değil FORMÜLLE denetliyor. Bir yazının zeminiyle
// arasındaki kontrast oranı en az 4,5 olmalı; altına düşen yazı güneşte,
// yorgun gözle ya da ucuz bir ekranda okunmuyor.
//
// NEDEN TEST: denetimde altı rengin ölçütü karşılamadığı bulundu (en
// kötüsü 2,90). Renkler tek yerde (:root) durduğu için değiştirmesi kolay
// — ve tam bu yüzden ileride biri "şu ton daha hoş" deyip farkında olmadan
// okunurluğu bozabilir. Bu test onu anında yakalar.
function renkAyir(hex) {
  const h = hex.replace("#", "").trim();
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
function gorecelParlaklik(hex) {
  const [r, g, b] = renkAyir(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function kontrast(a, b) {
  const x = gorecelParlaklik(a);
  const y = gorecelParlaklik(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
// :root içindeki değişkenleri CSS'ten okuyoruz — testte elle kopyalasaydık
// renk değişince test eski değeri denetlemeye devam ederdi.
function cssRenk(ad) {
  const m = cssYorumsuz.match(new RegExp("--" + ad + "\\s*:\\s*(#[0-9a-fA-F]{6})"));
  return m ? m[1] : null;
}
const ZEMINLER = { zemin: cssRenk("zemin"), kart: cssRenk("kart"), solgun: cssRenk("vurgu-solgun") };
dogru("zemin renkleri okunabildi", Object.values(ZEMINLER).every(Boolean));

// Bu renkler YAZI olarak kullanılıyor: üçünün üstünde de okunmalılar.
for (const ad of ["yazi", "yazi-soluk", "yazi-cok-soluk", "vurgu", "gelir", "gider", "uyari", "yatirim"]) {
  const renk = cssRenk(ad);
  const enKotu = Math.min(...Object.values(ZEMINLER).map((z) => kontrast(renk, z)));
  dogru(`--${ad} (${renk}) yazı olarak okunuyor · en kötü oran ${enKotu.toFixed(2)}`, enKotu >= 4.5);
}
// Bu renkler beyaz yazı TAŞIYAN zeminler (düğmeler).
for (const ad of ["vurgu", "vurgu-koyu"]) {
  const renk = cssRenk(ad);
  const o = kontrast(cssRenk("kart"), renk);
  dogru(`--${ad} üstündeki beyaz yazı okunuyor · oran ${o.toFixed(2)}`, o >= 4.5);
}
// Koyu varlık kutusundaki soluk yazı.
dogru(
  "koyu kutudaki --koyu-yazi okunuyor",
  kontrast(cssRenk("koyu-yazi"), cssRenk("koyu")) >= 4.5
);
// theme-color üç yerde birden yazılı; biri unutulursa telefonun üst
// çubuğu uygulamanın geri kalanından farklı renkte kalır.
dogru("index.html theme-color = --vurgu", html.includes('content="' + cssRenk("vurgu") + '"'));

baslik("Dokunma hedefleri en az 44 piksel");
// Yürürken telefona basan bir parmağın hata payı var. 44 önerilen taban.
for (const [ad, kalip] of [
  [".ay-ok", /\.ay-ok\s*\{[^}]*width:\s*(\d+)px/],
  [".sil", /\.sil\s*\{[^}]*width:\s*(\d+)px/],
  [".sablon-sil", /\.sablon-sil\s*\{[^}]*width:\s*(\d+)px/],
  [".tekrar-ekle/.tekrar-atla", /\.tekrar-atla\s*\{[^}]*min-height:\s*(\d+)px/],
  [".bugune-don", /\.bugune-don\s*\{[^}]*min-height:\s*(\d+)px/],
]) {
  const m = cssYorumsuz.match(kalip);
  dogru(`${ad} en az 44px  (${m ? m[1] : "bulunamadı"})`, Boolean(m) && Number(m[1]) >= 44);
}

baslik("Girdi puntosu — iPhone'un yakınlaştırma eşiği");
//
// Neo telefonda bildirdi (2026-08-10): yazı yazmak için bir kutuya
// dokununca sayfa yakınlaşıyor ve klavye kapanınca eski hâline dönmüyor.
// Ölçüldü: yazı yazılan 12 kutunun 12'si de tam 16px'ti, yani kuralın
// TAM SINIRINDA duruyorduk. iPhone "16'nın altındaysa yakınlaştır" der;
// sınırda durmak, yuvarlama yüzünden sınırın altına düşme riskini
// taşır. 17'ye çıkarıldı ve değer tek bir yerde toplandı.
//
// Bu test, o değerin ileride "biraz küçültelim" diye geri çekilmesini
// engelliyor. Bir kutu küçülürse telefonda yaşanan rahatsızlık geri gelir
// ve sebebi kimsenin aklına gelmez.
const girdiPunto = cssYorumsuz.match(/--girdi-punto\s*:\s*(\d+(?:\.\d+)?)px/);
dogru("girdi puntosu tek yerde tanımlı", Boolean(girdiPunto));
dogru(
  `girdi puntosu 16'nın üstünde (${girdiPunto ? girdiPunto[1] : "?"}px)`,
  Boolean(girdiPunto) && Number(girdiPunto[1]) > 16
);
// Yazı yazılan her kutu bu değişkeni kullanmalı; biri elle 14px yazarsa
// yukarıdaki denetim onu göremezdi.
for (const secici of [".alan input,\n.alan select", ".butce-form-alan"]) {
  const blok = cssYorumsuz.slice(cssYorumsuz.indexOf(secici));
  const kural = blok.slice(0, blok.indexOf("}"));
  dogru(
    `${secici.replace(/\n/g, " ")} değişkeni kullanıyor`,
    kural.includes("font-size: var(--girdi-punto)")
  );
}
// Ham "font-size: 16px" bir daha girdi kurallarına sızmasın.
dogru(
  "girdi kurallarında elle yazılmış 16px kalmadı",
  !/\.(alan input|butce-form-alan)[^}]*font-size:\s*16px/s.test(cssYorumsuz)
);

baslik("Klavye açıkken alt çubuk çekiliyor");
// Neo'nun telefonda bildirdiği yakınlaşma sorununun 2. adımı. Dipteki
// sekme çubuğu tek `position: fixed` öğemiz; iOS klavyeyi açınca görünen
// alanı küçültüyor ama sayfanın ölçüsünü değiştirmiyor ve çakılı öğe
// arada kalıyor.
dogru("yazı alanı ayırt ediliyor", js.includes("function yaziAlaniMi("));
dogru("odaklanınca işaret konuyor", js.includes('classList.add("yazi-yaziliyor")'));
dogru("odak çıkınca işaret kalkıyor", js.includes('classList.remove("yazi-yaziliyor")'));
dogru("çubuk gizleniyor", /body\.yazi-yaziliyor \.alt-bar\s*\{[^}]*display:\s*none/.test(cssYorumsuz));
// Radyo ve onay kutusu klavye açmaz; onlarda çubuğu gizlemek boş yere
// ekranı oynatırdı.
dogru(
  "radyo/onay kutusu yazı alanı sayılmıyor",
  /yaziAlaniMi[\s\S]{0,400}?"select-one"/.test(js) && !/yaziAlaniMi[\s\S]{0,400}?"checkbox"/.test(js)
);

baslik("Sürüm göstergesi — telefonda hangi sürüm var?");
// Telefonda sorun konuşurken "sende yeni sürüm mü var?" sorusunun cevabı
// yoktu; her deneme belirsiz kalıyordu.
dogru("sürüm satırı HTML'de var", html.includes('id="surum-satiri"'));
dogru("sürüm satırı dolduruluyor", js.includes('bul("surum-satiri")'));
const appSurum = js.match(/const UYGULAMA_SURUMU = "(v\d+)"/);
const swSurum = swKod.match(/const ONBELLEK = "finans-takip-(v\d+)"/);
dogru("app.js sürümü tanımlı", Boolean(appSurum));
dogru("service worker sürümü tanımlı", Boolean(swSurum));
// İkisi ayrışırsa ekranda yazan sürüm YALAN söyler ve teşhis çöker.
esit(
  "gösterilen sürüm ile önbellek sürümü aynı",
  appSurum ? appSurum[1] : "?",
  swSurum ? swSurum[1] : "??"
);

baslik("Uygulama kendi güncellemesini arıyor mu?");
// 2026-08-10: iki düzeltme üst üste gönderildi ve telefonda "değişmedi"
// çıktı. Ortaya çıkan asıl şüphe: güncelleme cihaza hiç inmiyor olabilir.
// Kayıt tek başına "yeni sürüm var mı?" diye SORMAZ; ana ekrana eklenmiş
// bir iPhone uygulaması günlerce sormayabiliyor.
dogru("kayıttan sonra güncelleme soruluyor", js.includes("kayit.update()"));
dogru("uygulamaya dönünce de soruluyor", /!document\.hidden\) kayit\.update\(\)/.test(js));
dogru("yeni sürüm devralınca sayfa yenileniyor", js.includes('"controllerchange"'));
// Yenileme yeni bir devralmayı tetikleyebilir; bayrak olmazsa sonsuz döngü.
dogru("sonsuz yenileme döngüsüne karşı bayrak var", /let yenilendi = false/.test(js) && /if \(yenilendi\) return/.test(js));

baslik("Ekran okuyucu — duyulmayan hiçbir şey kalmasın");
dogru("bildirim canlı bölge", /id="bildirim"[^>]*role="status"/.test(html));
dogru("bildirim kibarca okunuyor", /id="bildirim"[^>]*aria-live="polite"/.test(html));
dogru("form hatası uyarı rolünde", /id="form-hata"[^>]*role="alert"/.test(html));
dogru("sekme çubuğu tablist", /<nav[^>]*role="tablist"/.test(html));
esit("üç sekmenin de tab rolü var", (html.match(/class="sekme"[^>]*role="tab"/g) || []).length, 3);
esit("üç bölümün de tabpanel rolü var", (html.match(/role="tabpanel"/g) || []).length, 3);
dogru("sekme hangi bölümü açtığını söylüyor", html.includes('aria-controls="sayfa-ozet"'));
dogru("seçili sekme işaretleniyor", js.includes('setAttribute("aria-selected"'));
dogru("sekmelerde ok tuşuyla gezinme var", js.includes('olay.key !== "ArrowRight"'));
dogru("hatalı alan işaretleniyor", js.includes('setAttribute("aria-invalid", "true")'));
dogru("hata giderilince işaret kalkıyor", js.includes('removeAttribute("aria-invalid")'));
dogru("trend grafiğinin yazılı karşılığı var", html.includes('id="trend-liste"'));
dogru("yazılı karşılık dolduruluyor", js.includes('bul("trend-liste")'));
// Ay adıyla tutarlar bitişik okunmasın diye araya boşluk konuyor.
dogru("ay adı ile tutarlar bitişik okunmuyor", js.includes('ayAdi(ay.yil, ay.ay) + " "'));

baslik("Yüzdelerin toplamı her zaman 100");
// Ölçüm: sekiz kategoride de 1'er lira harcandığında her pay %12,5 iken
// ekranda sekizi de %13 yazıyor, toplam %104 görünüyordu.
const sekizEsit = V.KATEGORILER.map((k, i) => ({
  tur: "gider", kurus: 100, tarih: "2026-08-0" + ((i % 9) + 1), kategori: k,
}));
const sekizDagilim = V.kategoriDagilimi(sekizEsit, 2026, 8);
esit("sekiz kategori de listede", sekizDagilim.length, V.KATEGORILER.length);
esit("yüzdeler toplamı 100", sekizDagilim.reduce((t, d) => t + d.yuzde, 0), 100);
// Üç ve iki kategorili eski örneklerin sonucu DEĞİŞMEMELİ.
esit(
  "üç kategoride toplam yine 100",
  V.kategoriDagilimi(
    [
      { tur: "gider", kurus: 40000, tarih: "2026-08-01", kategori: "Market" },
      { tur: "gider", kurus: 20000, tarih: "2026-08-02", kategori: "Fatura" },
      { tur: "gider", kurus: 10000, tarih: "2026-08-03", kategori: "Ulaşım" },
    ],
    2026, 8
  ).reduce((t, d) => t + d.yuzde, 0),
  100
);

baslik("Depolama tamamen kapalıysa uygulama ayakta kalıyor");
// Kullanıcı tarayıcı ayarlarından site verilerini kapatırsa getItem'in
// KENDİSİ hata atar. Eskiden bu hata açılıştaki ilk okumada patlıyor ve
// uygulama hiç çizilmiyordu.
depoyuTemizle();
const gercekGetItem = localStorage.getItem;
localStorage.getItem = () => {
  throw new Error("SecurityError: depolama kapalı");
};
console.error = () => {};
let patladiMi = false;
let okunan = null;
try {
  okunan = V.kayitlariOku();
} catch (e) {
  patladiMi = true;
}
console.error = eskiHataYazici;
localStorage.getItem = gercekGetItem;
dogru("okuma hata fırlatmıyor", patladiMi === false);
esit("boş liste dönüyor", Array.isArray(okunan) ? okunan.length : -1, 0);

baslik("Yedeğin sürüm alanı metinle atlatılamıyor");
hataAtmali("sürüm metin olarak gelirse reddediliyor", () =>
  V.yedekOku(JSON.stringify({ surum: "3", kayitlar: [] }))
);
hataAtmali("sürüm sayı ama gelecekten ise reddediliyor", () =>
  V.yedekOku(JSON.stringify({ surum: V.SURUM + 1, kayitlar: [] }))
);
esit(
  "sürüm alanı hiç yoksa (eski zarf) kabul ediliyor",
  V.yedekOku(JSON.stringify({ kayitlar: [] })).kayitlar.length,
  0
);

baslik("Dev yedek dosyası telefonu dondurmadan reddediliyor");
dogru("boyut sınırı tanımlı", js.includes("AZAMI_YEDEK_BAYT"));
dogru("dosya boyutu okunmadan önce sınanıyor", /dosya\.size > AZAMI_YEDEK_BAYT/.test(js));
dogru("dosya okunamazsa sebebi söyleniyor", js.includes('alert("Dosya okunamadı'));

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
