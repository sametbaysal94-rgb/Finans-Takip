// app.js — uygulamanın beyni.
// Adım 2: veri katmanı. Kayıtları saklama, okuma, ekleme, silme.
// Henüz ekran/form yok — bunlar Adım 3'te gelecek.

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
// TARİH YARDIMCISI
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
// cevabı bu. crypto.randomUUID tarayıcının hazır aracı; çok eski bir
// tarayıcıda yoksa elle bir kimlik üretiyoruz (yedek plan).
function yeniId() {
  if (window.crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
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
// ARAYÜZ YARDIMCILARI
// ============================================================

// Kısa yol: her yerde document.getElementById("x") yazmak yerine bul("x").
function bul(id) {
  return document.getElementById(id);
}

// "gizli" sınıfı style.css'te "görünmez ol" demek.
// Öğeleri silmek yerine bu sınıfı ekleyip çıkararak gösterip saklıyoruz.
function goster(oge) { oge.classList.remove("gizli"); }
function gizle(oge) { oge.classList.add("gizli"); }

// ============================================================
// SEKMELER (Özet / Ekle)
// ============================================================

function sekmeGoster(ad) {
  // Önce bütün sayfaları sakla, sonra istenen sayfayı göster.
  document.querySelectorAll(".sayfa").forEach(gizle);
  goster(bul("sayfa-" + ad));

  // Alt çubukta hangi düğme vurgulu görünecek.
  // data-sekme="ozet" yazdığımız yeri JavaScript'te dugme.dataset.sekme diye okuyoruz.
  document.querySelectorAll(".sekme").forEach((dugme) => {
    dugme.classList.toggle("aktif", dugme.dataset.sekme === ad);
  });
}

// Alt çubuktaki her düğmeye tıklama olayı bağla.
// addEventListener = "bu olay olursa şu işi yap" demek.
document.querySelectorAll(".sekme").forEach((dugme) => {
  dugme.addEventListener("click", () => sekmeGoster(dugme.dataset.sekme));
});

// ============================================================
// EKLEME FORMU
// ============================================================

// Kategori kutusunu yukarıdaki KATEGORILER listesinden doldurur.
// Elle 8 tane <option> yazmak yerine döngüyle üretiyoruz: yeni kategori
// gerektiğinde sadece o listeye eklemek yeterli olacak, HTML'e dokunmayacağız.
function kategorileriDoldur() {
  const kutu = bul("alan-kategori");
  kutu.innerHTML = "";
  for (const ad of KATEGORILER) {
    const secenek = document.createElement("option");
    secenek.value = ad;
    secenek.textContent = ad;
    kutu.appendChild(secenek);
  }
}

// Hangi tür seçili? "gelir" | "gider" | "yatirim"
// :checked = "işaretli olan" anlamına gelen CSS seçicisi.
function secilenTur() {
  return document.querySelector('input[name="tur"]:checked').value;
}

// Kategori sadece giderde anlamlı, diğerlerinde kutuyu saklıyoruz.
function kategoriKutusunuGuncelle() {
  const kutu = bul("kutu-kategori");
  if (secilenTur() === "gider") goster(kutu);
  else gizle(kutu);
}

// Tür değiştiğinde kategori kutusu görünsün/kaybolsun.
document.querySelectorAll('input[name="tur"]').forEach((dugme) => {
  dugme.addEventListener("change", kategoriKutusunuGuncelle);
});

function hataGoster(mesaj) {
  const p = bul("form-hata");
  p.textContent = mesaj;
  goster(p);
}

function hataGizle() {
  gizle(bul("form-hata"));
}

// Kaydettikten sonra Özet ekranında 3 saniyelik bir bilgi göster.
let bildirimZamanlayici = null;
function bildir(mesaj) {
  const p = bul("bildirim");
  p.textContent = mesaj;
  goster(p);
  // Önceki sayacı iptal et: iki kaydı hızlı girersen ilk sayaç
  // ikinci mesajı erken silmesin.
  clearTimeout(bildirimZamanlayici);
  bildirimZamanlayici = setTimeout(() => gizle(p), 3000);
}

// Kaydettikten sonra formu temizle.
// Tür ve tarihi bilerek bırakıyoruz: arka arkaya birkaç gider girmek
// en sık yapılan iş, her seferinde yeniden seçmek yorucu olurdu.
function formuTemizle() {
  bul("alan-tutar").value = "";
  bul("alan-aciklama").value = "";
  hataGizle();
}

bul("ekle-formu").addEventListener("submit", (olay) => {
  // preventDefault: formlar varsayılan olarak sayfayı yeniden yükler
  // (eski usul: veri sunucuya gider, sayfa baştan gelir). Bizim tek
  // sayfamız var ve veriyi kendimiz saklıyoruz, o yüzden bunu engelliyoruz.
  olay.preventDefault();
  hataGizle();

  try {
    // Doğrulamayı burada tekrar yazmıyoruz — tek kural yeri kayitEkle.
    // Bozuk veri varsa o throw ediyor, biz de mesajı aşağıda yakalıyoruz.
    const kayit = kayitEkle({
      tur: secilenTur(),
      tutar: bul("alan-tutar").value,
      tarih: bul("alan-tarih").value,
      aciklama: bul("alan-aciklama").value,
      kategori: bul("alan-kategori").value,
    });

    formuTemizle();
    sekmeGoster("ozet");
    ekraniYenile();
    bildir(kurusYaz(kayit.kurus) + " kaydedildi ✓");
  } catch (hata) {
    hataGoster(hata.message);
  }
});

// ============================================================
// EKRANI YENİLEME
// (Adım 4'te özet kartları, Adım 5'te kayıt listesi buraya gelecek)
// ============================================================

function ekraniYenile() {
  const kayitlar = kayitlariOku();
  bul("durum").textContent = `Depoda ${kayitlar.length} kayıt var.`;
}

// ============================================================
// BAŞLANGIÇ — sayfa açıldığında bir kez çalışan satırlar
// ============================================================

kategorileriDoldur();
bul("alan-tarih").value = bugununTarihi(); // tarih varsayılan olarak bugün
kategoriKutusunuGuncelle();
sekmeGoster("ozet");
ekraniYenile();
