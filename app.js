// app.js — uygulamanın ARAYÜZÜ.
//
// Ekranı çizer, düğmeleri dinler. Hesaplamayı ve saklamayı kendisi yapmaz;
// hepsini veri.js'e sorar. Bu yüzden index.html'de veri.js ÖNCE yüklenir.

// ============================================================
// DURUM (state) — uygulamanın o anki hâli
// ============================================================

// Özet ekranında hangi ayı gösteriyoruz? Başlangıçta içinde bulunduğumuz ay.
// "let" kullandık çünkü ay okları bunu değiştirecek (Adım 5).
let secilenAy = bugununAyi();

// ============================================================
// ARAYÜZ YARDIMCILARI
// ============================================================

// Kısa yol: her yerde document.getElementById(...) yazmak yerine bul(...).
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
// ÖZET EKRANI
// ============================================================

function ozetiYenile() {
  const kayitlar = kayitlariOku();

  // --- Üst kutu: TÜM zamanların toplamı, ay seçiminden bağımsız ---
  const varlik = toplamVarlik(kayitlar);
  bul("varlik-tutar").textContent = kurusYaz(varlik);
  // Varlık eksiye düştüyse rakam kırmızı — kartlardaki "kalan" ile aynı davranış.
  bul("varlik-tutar").classList.toggle("eksi", varlik < 0);

  const yatirimda = toplamYatirim(kayitlar);
  bul("varlik-alt").textContent =
    yatirimda > 0
      ? `bunun ${kurusYaz(yatirimda)} kadarı yatırımda`
      : "henüz yatırım kaydı yok";

  // --- Kartlar: sadece seçili ay ---
  bul("ay-basligi").textContent = ayAdi(secilenAy.yil, secilenAy.ay);

  const ozet = ozetHesapla(kayitlar, secilenAy.yil, secilenAy.ay);
  bul("kart-gelir").textContent = kurusYaz(ozet.gelir);
  bul("kart-gider").textContent = kurusYaz(ozet.gider);
  bul("kart-yatirim").textContent = kurusYaz(ozet.yatirim);
  bul("kart-kalan").textContent = kurusYaz(ozet.kalan);

  // Kalan eksiye düştüyse kırmızıya çevir — göz hemen fark etsin.
  bul("kart-kalan").classList.toggle("eksi", ozet.kalan < 0);

  // --- Bütçe çubukları (limit konmuşsa) ---
  butceleriCiz(kayitlar);

  // --- Bu aydan uzaklaştıysak dönüş düğmesini göster ---
  if (ayniAy(secilenAy, bugununAyi())) gizle(bul("bugune-don"));
  else goster(bul("bugune-don"));

  // --- Listeyi çiz ---
  const ayinKayitlari = ayKayitlari(kayitlar, secilenAy.yil, secilenAy.ay);

  // O ayda hiç kayıt yoksa kullanıcı "bozuk mu?" diye düşünmesin.
  if (ayinKayitlari.length === 0) goster(bul("ay-bos"));
  else gizle(bul("ay-bos"));

  listeyiCiz(ayinKayitlari);

  // --- Rapor sekmesindeki grafikler ---
  // Buradan çağırmak ayrı bir tazeleme yolu açmaktan iyi: ay okları,
  // kayıt ekleme, silme, yedekten dönme... hepsi zaten ozetiYenile'ye
  // uğruyor, dolayısıyla grafikler hiçbir yerde bayat kalmıyor.
  raporuYenile(kayitlar);
}

// ============================================================
// BÜTÇELER
// ============================================================

// Özet'teki tek bir bütçe çubuğu satırını üretir.
// Üstte "Market   450,00 / 500,00 ₺", altta dolan bir çubuk.
function butceCubuguYap(durum) {
  const satir = document.createElement("div");
  satir.className = "butce-satir";

  const ust = document.createElement("div");
  ust.className = "butce-ust";

  const ad = document.createElement("span");
  ad.className = "butce-ad";
  ad.textContent = durum.kategori;
  ust.appendChild(ad);

  const sayi = document.createElement("span");
  sayi.className = "butce-sayi";
  sayi.textContent = kurusSade(durum.harcanan) + " / " + kurusSade(durum.limit) + " ₺  (%" + durum.yuzde + ")";
  ust.appendChild(sayi);

  satir.appendChild(ust);

  const cubuk = document.createElement("div");
  cubuk.className = "butce-cubuk";

  const dolgu = document.createElement("div");
  // Durum sınıfı rengi seçiyor: butce-iyi / butce-uyari / butce-asildi.
  dolgu.className = "butce-dolgu butce-" + durum.durum;
  // Genişliği YÜZDE olarak veriyoruz (renk değil — renkler hep CSS'te).
  // %100'ü aşan harcama çubuğu taşırmasın diye kırpılıyor; gerçek yüzde
  // yukarıdaki yazıda zaten görünüyor.
  dolgu.style.width = Math.min(durum.yuzde, 100) + "%";
  cubuk.appendChild(dolgu);

  satir.appendChild(cubuk);
  return satir;
}

// Özet'teki bütçe bölümünü çizer. Hiç limit yoksa bölüm tümden gizli —
// bütçe kullanmayan birinin Özet'i kalabalıklaşmasın.
function butceleriCiz(kayitlar) {
  const bolum = bul("butce-ozet");
  const durumlar = butceDurumu(kayitlar, butceleriOku(), secilenAy.yil, secilenAy.ay);

  if (durumlar.length === 0) {
    gizle(bolum);
    return;
  }

  goster(bolum);
  const liste = bul("butce-listesi");
  liste.innerHTML = "";
  for (const durum of durumlar) liste.appendChild(butceCubuguYap(durum));
}

// Rapor sekmesindeki limit formunun tek satırı: kategori adı + kutu.
function butceFormSatiriYap(kategori, kurus) {
  const satir = document.createElement("label");
  satir.className = "butce-form-satir";

  const ad = document.createElement("span");
  ad.className = "butce-form-ad";
  ad.textContent = kategori;
  satir.appendChild(ad);

  const alan = document.createElement("input");
  alan.type = "text";
  alan.inputMode = "decimal";
  alan.autocomplete = "off";
  alan.placeholder = "limit yok";
  alan.className = "butce-form-alan";
  // Hangi kategorinin kutusu olduğunu data-kategori taşıyor. Kutulara
  // ayrı ayrı id VERMİYORUZ: testler id'leri HTML'de arar, dinamik
  // üretilen id'ler o güvenlik ağının dışında kalırdı.
  alan.dataset.kategori = kategori;
  alan.value = kurus ? kurusSade(kurus) : "";
  satir.appendChild(alan);

  return satir;
}

function butceFormunuDoldur() {
  const form = bul("butce-formu");
  form.innerHTML = "";
  const butceler = butceleriOku();
  for (const kategori of KATEGORILER) {
    form.appendChild(butceFormSatiriYap(kategori, butceler[kategori]));
  }
}

// Limit kaydetme: kayıt listesindeki silme gibi olay devriyle —
// 8 kutuya 8 dinleyici yerine forma 1 dinleyici.
bul("butce-formu").addEventListener("change", (olay) => {
  const alan = olay.target.closest(".butce-form-alan");
  if (!alan) return;

  const kategori = alan.dataset.kategori;
  try {
    const kurus = butceBelirle(kategori, alan.value);
    // Kutuyu kasanın kabul ettiği biçimle tazele ("5000" -> "5.000,00").
    alan.value = kurus ? kurusSade(kurus) : "";
    butceleriCiz(kayitlariOku());
    bildir(kurus ? kategori + " limiti: " + kurusYaz(kurus) : kategori + " limiti silindi");
  } catch (hata) {
    alert(hata.message);
    butceFormunuDoldur(); // kutuyu depodaki geçerli değere geri döndür
  }
});

// ============================================================
// AY GEZİNME
// ============================================================

function ayiKaydir(adim) {
  secilenAy = ayKaydir(secilenAy.yil, secilenAy.ay, adim);
  ozetiYenile();
}

bul("ay-geri").addEventListener("click", () => ayiKaydir(-1));
bul("ay-ileri").addEventListener("click", () => ayiKaydir(1));
bul("bugune-don").addEventListener("click", () => {
  secilenAy = bugununAyi();
  ozetiYenile();
});

// ============================================================
// KAYIT LİSTESİ
// ============================================================

// Bir kaydın satırını (<li>) üretir.
//
// innerHTML KULLANMIYORUZ. Açıklama senin yazdığın metin; içinde "<"
// gibi bir karakter olsa tarayıcı onu HTML sanıp düzeni bozardı.
// createElement + textContent ile yazdığımızda metin metin olarak kalıyor.
function kayitSatiriYap(kayit) {
  const satir = document.createElement("li");
  satir.className = "kayit";

  // Sol taraf: açıklama (üstte) + tarih & kategori (altta)
  const sol = document.createElement("div");
  sol.className = "kayit-sol";

  const baslik = document.createElement("span");
  baslik.className = "kayit-aciklama";
  // Açıklama boş bırakılmışsa tür adını yazıyoruz ki satır boş görünmesin.
  baslik.textContent = kayit.aciklama || turAdi(kayit.tur);
  sol.appendChild(baslik);

  const alt = document.createElement("span");
  alt.className = "kayit-alt";
  // Giderde kategori daha bilgilendirici; diğerlerinde tür adını yazıyoruz.
  const etiket = kayit.tur === "gider" ? kayit.kategori : turAdi(kayit.tur);
  alt.textContent = tarihYaz(kayit.tarih) + " · " + etiket;
  sol.appendChild(alt);

  satir.appendChild(sol);

  // Sağ taraf: tutar. Gelir +, gider −, yatırım işaretsiz
  // (yatırım harcanmadı, sadece kenara ayrıldı).
  const tutar = document.createElement("span");
  tutar.className = "kayit-tutar tutar-" + kayit.tur;
  const isaret = kayit.tur === "gelir" ? "+" : kayit.tur === "gider" ? "−" : "";
  tutar.textContent = isaret + kurusYaz(kayit.kurus);
  satir.appendChild(tutar);

  // Silme düğmesi. Hangi kaydı sileceğini data-id'de taşıyor.
  const silDugmesi = document.createElement("button");
  silDugmesi.type = "button";
  silDugmesi.className = "sil";
  silDugmesi.dataset.id = kayit.id;
  silDugmesi.setAttribute("aria-label", "Kaydı sil");
  silDugmesi.textContent = "🗑";
  satir.appendChild(silDugmesi);

  return satir;
}

function listeyiCiz(kayitlar) {
  const liste = bul("kayit-listesi");
  liste.innerHTML = ""; // eski satırları temizle
  for (const kayit of yeniyeGoreSirala(kayitlar)) {
    liste.appendChild(kayitSatiriYap(kayit));
  }
}

// Silme. Dinleyiciyi her satıra tek tek koymuyoruz; listeye BİR tane
// koyup tıklamanın hangi satırdan geldiğine bakıyoruz. Buna "olay devri"
// (event delegation) deniyor. Satırlar her yenilemede baştan üretildiği
// için bu hem daha az kod hem de daha az iş.
bul("kayit-listesi").addEventListener("click", (olay) => {
  // closest: tıklanan yerden yukarı doğru çıkıp ".sil" bulur.
  // Çöp kutusu simgesine değil de satırın boşluğuna tıklandıysa null döner.
  const dugme = olay.target.closest(".sil");
  if (!dugme) return;

  const kayit = kayitlariOku().find((k) => k.id === dugme.dataset.id);
  if (!kayit) return;

  const etiket = kayit.aciklama || turAdi(kayit.tur);
  const onay = confirm(
    `"${etiket}" — ${kurusYaz(kayit.kurus)}\n\nBu kaydı silmek istiyor musun?`
  );
  if (!onay) return;

  kayitSil(kayit.id);
  ozetiYenile();
  bildir("Kayıt silindi");
});

// ============================================================
// YİNELENEN İŞLEMLER — "zamanı gelenler" paneli
// ============================================================
//
// Kasa (veri.js) bize sadece "şu tarihlerde şunlar bekliyor" listesini
// veriyor; bu liste hiçbir yerde saklanmıyor, her seferinde şablonların
// sonUretim tarihinden yeniden hesaplanıyor. Burada yaptığımız iş onu
// ekrana dökmek ve iki düğmeyi (Ekle / Atla) kasaya bağlamak.

// Panelin tek satırını üretir: solda ne olduğu, sağda iki düğme.
function tekrarSatiriYap(bekleyen) {
  const satir = document.createElement("li");
  satir.className = "tekrar-satir";

  const bilgi = document.createElement("div");
  bilgi.className = "tekrar-bilgi";

  const ad = document.createElement("strong");
  // Açıklama boşsa tür adını yazıyoruz ki satır adsız kalmasın.
  ad.textContent = bekleyen.aciklama || turAdi(bekleyen.tur);
  bilgi.appendChild(ad);

  const tarih = document.createElement("span");
  tarih.className = "tekrar-tarih";
  tarih.textContent = tarihYaz(bekleyen.tarih);
  bilgi.appendChild(tarih);

  // Tutarın işareti kayıt listesindekiyle aynı mantıkta: gelir +,
  // gider −, yatırım işaretsiz. Aynı şey iki yerde farklı görünmesin.
  const tutar = document.createElement("span");
  tutar.className = "tekrar-tutar tutar-" + bekleyen.tur;
  const isaret = bekleyen.tur === "gelir" ? "+" : bekleyen.tur === "gider" ? "−" : "";
  tutar.textContent = isaret + kurusYaz(bekleyen.kurus);
  bilgi.appendChild(tutar);

  satir.appendChild(bilgi);

  // Düğmeler hangi şablonun hangi tarihini işlediklerini kendi
  // üzerlerinde taşıyor. Dinamik id ÜRETMİYORUZ: id'ler HTML'de durur,
  // JavaScript'in uydurduğu id'ler testlerin göremediği bir kör nokta olurdu.
  const ekleDugmesi = document.createElement("button");
  ekleDugmesi.type = "button";
  ekleDugmesi.className = "tekrar-ekle";
  ekleDugmesi.dataset.id = bekleyen.sablonId;
  ekleDugmesi.dataset.tarih = bekleyen.tarih;
  ekleDugmesi.textContent = "Ekle";
  satir.appendChild(ekleDugmesi);

  const atlaDugmesi = document.createElement("button");
  atlaDugmesi.type = "button";
  atlaDugmesi.className = "tekrar-atla";
  atlaDugmesi.dataset.id = bekleyen.sablonId;
  atlaDugmesi.dataset.tarih = bekleyen.tarih;
  atlaDugmesi.textContent = "Atla";
  satir.appendChild(atlaDugmesi);

  return satir;
}

// Paneli baştan çizer. Bekleyen yoksa paneli tümden gizler —
// yinelenen işlem kullanmayan birinin Özet'i kalabalıklaşmasın.
function tekrarlariGoster() {
  const kutu = bul("tekrar-kutusu");
  const liste = bul("tekrar-listesi");
  const bekleyenler = bekleyenTekrarlar(sablonlariOku(), bugununTarihi());

  liste.innerHTML = "";
  if (bekleyenler.length === 0) {
    gizle(kutu);
    return;
  }

  goster(kutu);
  for (const bekleyen of bekleyenler) liste.appendChild(tekrarSatiriYap(bekleyen));
}

// Bir işlemden sonra ekranın tazelenmesi hep aynı üç adım.
function tekrarSonrasiYenile() {
  ozetiYenile();
  tekrarlariGoster();
}

// Tek satırlık onay/atla. Dinleyici LİSTEYE bağlı, satırlara değil:
// her işlemden sonra satırlar baştan üretiliyor, tek tek bağlanan
// dinleyiciler çöpe giderdi (olay devri — kayıt listesindekiyle aynı yöntem).
bul("tekrar-listesi").addEventListener("click", (olay) => {
  const dugme = olay.target.closest("button");
  if (!dugme) return;

  const sablonId = dugme.dataset.id;
  const tarih = dugme.dataset.tarih;
  if (!sablonId || !tarih) return;

  if (dugme.classList.contains("tekrar-ekle")) {
    try {
      const kayit = tekrarOnayla(sablonId, tarih);
      if (!kayit) return;
      bildir((kayit.aciklama || turAdi(kayit.tur)) + " eklendi ✓");
    } catch (hata) {
      // Şablonun kategorisi silinmiş olabilir; kasa Türkçe bir mesajla
      // durduruyor, biz de onu olduğu gibi gösteriyoruz.
      alert(hata.message);
    }
  } else {
    tekrarAtla(sablonId, tarih);
    bildir("Atlandı");
  }

  tekrarSonrasiYenile();
});

// "Hepsini ekle" / "Hepsini atla".
//
// DİKKAT: listeyi baştan sona işliyoruz ve liste eskiden yeniye sıralı.
// Her onay şablonun sonUretim'ini ilerlettiği için sıra ters olsaydı
// (önce en yeni) arkada kalan eski satırlar kaybolurdu.
function tekrarHepsiniIsle(onayla) {
  const bekleyenler = bekleyenTekrarlar(sablonlariOku(), bugununTarihi());
  if (bekleyenler.length === 0) return;

  let sayi = 0;
  for (const bekleyen of bekleyenler) {
    try {
      if (onayla) {
        if (tekrarOnayla(bekleyen.sablonId, bekleyen.tarih)) sayi++;
      } else if (tekrarAtla(bekleyen.sablonId, bekleyen.tarih)) {
        sayi++;
      }
    } catch (hata) {
      // Bozuk bir şablon toplu işlemi tümden durdurmasın: onu atlayıp
      // devam ediyoruz, kullanıcı mesajı görüyor.
      alert(hata.message);
    }
  }

  tekrarSonrasiYenile();
  bildir(sayi + (onayla ? " kayıt eklendi ✓" : " kayıt atlandı"));
}

bul("tekrar-hepsi-ekle").addEventListener("click", () => tekrarHepsiniIsle(true));
bul("tekrar-hepsi-atla").addEventListener("click", () => tekrarHepsiniIsle(false));

// --- Rapor sekmesindeki şablon listesi ---

function sablonSatiriYap(sablon) {
  const satir = document.createElement("li");
  satir.className = "sablon-satir";

  const bilgi = document.createElement("div");
  bilgi.className = "sablon-bilgi";

  const ad = document.createElement("strong");
  ad.textContent = sablon.aciklama || turAdi(sablon.tur);
  bilgi.appendChild(ad);

  const alt = document.createElement("span");
  alt.textContent = kurusYaz(sablon.kurus) + " · her ayın " + sablon.gun + ". günü";
  bilgi.appendChild(alt);

  satir.appendChild(bilgi);

  const silDugmesi = document.createElement("button");
  silDugmesi.type = "button";
  silDugmesi.className = "sablon-sil";
  silDugmesi.dataset.id = sablon.id;
  silDugmesi.setAttribute("aria-label", "Yinelenen işlemi sil");
  silDugmesi.textContent = "🗑";
  satir.appendChild(silDugmesi);

  return satir;
}

function sablonlariCiz() {
  const liste = bul("sablon-listesi");
  const sablonlar = sablonlariOku();

  liste.innerHTML = "";
  if (sablonlar.length === 0) {
    goster(bul("sablon-bos"));
    return;
  }

  gizle(bul("sablon-bos"));
  for (const sablon of sablonlar) liste.appendChild(sablonSatiriYap(sablon));
}

bul("sablon-listesi").addEventListener("click", (olay) => {
  const dugme = olay.target.closest(".sablon-sil");
  if (!dugme) return;

  const sablon = sablonlariOku().find((s) => s.id === dugme.dataset.id);
  if (!sablon) return;

  const etiket = sablon.aciklama || turAdi(sablon.tur);
  // DİKKAT: metnin içinde satır sonundan hemen sonra parantez AÇMIYORUZ.
  // testler.js "isim(" kalıbıyla fonksiyon çağrısı arıyor; "\n(" dizisi
  // ona "n(" diye bir çağrı gibi görünüyor ve boş yere hata veriyor.
  const onay = confirm(
    `"${etiket}" — ${kurusYaz(sablon.kurus)}\n\nBu yinelenen işlem silinsin mi?\n\nDaha önce eklenmiş kayıtlar silinmez.`
  );
  if (!onay) return;

  sablonSil(sablon.id);
  sablonlariCiz();
  tekrarlariGoster();
  bildir("Yinelenen işlem silindi");
});

// ============================================================
// GRAFİKLER (Rapor)
// ============================================================
//
// Grafikleri elle çiziyoruz — hazır kütüphane yok. Çizim dili SVG:
// grafiğin her parçası (daire, dikdörtgen, yazı) sayfadaki bir düğme
// gibi tarayıcının tanıdığı bir ETİKET. Rengini CSS veriyor,
// geometrisini veri.js hesaplıyor; buradaki işimiz sadece
// "hangi etiket, nereye" demek.
//
// Hangi ayı çizdiğimiz Özet'teki seçime bağlı: raporuYenile()
// ozetiYenile()'nin sonundan çağrılıyor, yani ay okları grafikleri de
// bedavaya sürüyor. Ayrı bir "grafiği tazele" düğmesi gerekmiyor.

// SVG'nin "ad alanı" (namespace) adresi. HTML ile SVG ayrı iki dil;
// tarayıcı bir etiketin hangi dile ait olduğunu bu adresten anlıyor.
// Adres gerçek bir siteye gitmiyor, sadece bir kimlik metni.
const SVG_AD_ALANI = "http://www.w3.org/2000/svg";

// SVG öğesi üretir.
//
// DİKKAT — KLASİK TUZAK: document.createElement("circle") HATA VERMEZ.
// Sessizce "circle" adında, hiçbir anlamı olmayan bir HTML öğesi üretir;
// SVG'nin içine koyarsın, ekranda hiçbir şey görünmez, konsolda tek bir
// uyarı bile çıkmaz. Saatlerce "acaba yarıçapı mı yanlış" diye
// aranırsın. SVG öğeleri ad alanı verilerek, createElementNS ile
// üretilmek ZORUNDA.
function svgOge(ad) {
  return document.createElementNS(SVG_AD_ALANI, ad);
}

// --- Halka grafik (gider dağılımı) ---

// Halkanın yarıçapı. Çevre = 2 x pi x yarıçap olduğuna göre, çevrenin
// tam 100 olmasını istiyorsak yarıçap 100 / (2 x pi) ≈ 15,9155 olmalı.
// Neden 100: veri.js'in verdiği dilim uzunlukları doğrudan yüzde oluyor,
// aşağıda hiçbir çevirme yapmadan olduğu gibi yazabiliyoruz.
const HALKA_YARICAP = HALKA_CEVRESI / (2 * Math.PI);

// Halkanın merkezi ve kalınlığı — HTML'deki viewBox 40x40 olduğu için
// merkez 20,20. Kalınlık 7 birim: hem halka gibi duruyor hem ortada
// nefes alacak boşluk kalıyor.
const HALKA_MERKEZ = 20;
const HALKA_KALINLIK = 7;

// Tek bir dilimi (yani kesik çizgili bir çemberi) üretir.
function halkaDilimiYap(dilim) {
  const daire = svgOge("circle");
  daire.setAttribute("cx", String(HALKA_MERKEZ));
  daire.setAttribute("cy", String(HALKA_MERKEZ));
  daire.setAttribute("r", String(HALKA_YARICAP));
  // fill="none": çemberin İÇİ boyanmasın, sadece çizgisi görünsün.
  daire.setAttribute("fill", "none");
  daire.setAttribute("stroke-width", String(HALKA_KALINLIK));
  // stroke-dasharray = "şu kadar çiz, şu kadar boş bırak". Çevre 100
  // olduğu için "25 75" demek "çemberin dörtte biri" demek.
  daire.setAttribute("stroke-dasharray", dilim.uzunluk + " " + (HALKA_CEVRESI - dilim.uzunluk));
  // stroke-dashoffset = deseni kaydır. Her dilim, kendinden öncekilerin
  // toplamı kadar geriye kayıyor; böylece uç uca ekleniyorlar.
  daire.setAttribute("stroke-dashoffset", String(dilim.kayma));
  // RENK YOK: sınıfı veriyoruz, rengi style.css'teki .dilim-N seçiyor.
  //
  // DİKKAT: SVG öğelerinde "oge.className = ..." ÇALIŞMAZ. Orada
  // className salt okunur özel bir nesnedir; atama sessizce yutulur.
  // setAttribute ile yazmak her yerde çalışan yol.
  daire.setAttribute("class", "dilim-" + dilim.sira);
  return daire;
}

// Lejantın (renk açıklama listesi) tek satırı: nokta + kategori + tutar.
// Grafiğin okunabilir olması buna bağlı — SVG ekran okuyucuya kapalı,
// bilgi bu listeden geliyor.
function halkaSatiriYap(pay) {
  const satir = document.createElement("li");
  satir.className = "halka-satir";

  const nokta = document.createElement("span");
  // Aynı .dilim-N sınıfı: halkada çizgi rengi, burada zemin rengi oluyor.
  nokta.className = "halka-nokta dilim-" + pay.sira;
  satir.appendChild(nokta);

  const ad = document.createElement("span");
  ad.className = "halka-ad";
  ad.textContent = pay.kategori;
  satir.appendChild(ad);

  const tutar = document.createElement("span");
  tutar.className = "halka-tutar";
  tutar.textContent = kurusSade(pay.kurus) + " ₺ · %" + pay.yuzde;
  satir.appendChild(tutar);

  return satir;
}

function halkayiCiz(kayitlar) {
  const kutu = bul("halka-dilimler");
  const liste = bul("halka-liste");
  kutu.innerHTML = "";
  liste.innerHTML = "";

  const dagilim = kategoriDagilimi(kayitlar, secilenAy.yil, secilenAy.ay);

  // Gider yoksa boş bir çember çizmenin anlamı yok: grafiği tümden
  // saklayıp tek satırlık açıklamayı gösteriyoruz.
  if (dagilim.length === 0) {
    gizle(bul("halka-grafik"));
    goster(bul("halka-bos"));
    return;
  }

  gizle(bul("halka-bos"));
  goster(bul("halka-grafik"));

  for (const dilim of halkaDilimleri(dagilim)) kutu.appendChild(halkaDilimiYap(dilim));
  for (const pay of dagilim) liste.appendChild(halkaSatiriYap(pay));
}

// --- Trend grafiği (son 6 ayın geliri ve gideri) ---
//
// Bütün ölçüler index.html'deki viewBox'a göre: 300 birim genişlik,
// 140 birim yükseklik. Kâğıt değişirse buradaki sayılar da değişmeli.

const TREND_AY_SAYISI = 6;
// Bir ayın yatay şeridi. 6 x 50 = 300, yani viewBox'ın tam genişliği.
const TREND_SERIT = 50;
// En yüksek çubuk kaç birim olacak (taban çizgisinden yukarı).
const TREND_YUKSEKLIK = 100;
// Taban çizgisinin yüksekliği: çubuklar buradan yukarı doğru büyüyor.
const TREND_TABAN = 120;
// Ay adlarının yazıldığı satır — taban çizgisinin biraz altı.
const TREND_ETIKET_Y = 134;
const CUBUK_GENISLIK = 14;
const CUBUK_ARASI = 4;
// İkili çubuk grubunu şeridin ortasına yaslamak için soldan boşluk.
const CUBUK_SOL = (TREND_SERIT - (CUBUK_GENISLIK * 2 + CUBUK_ARASI)) / 2;

// Tek bir çubuk (dikdörtgen).
//
// DİKKAT — TERS DÜNYA: SVG'de y AŞAĞI doğru artar, yani 0 en üst nokta.
// Bu yüzden çubuğun üst kenarı "taban - yükseklik" oluyor; okulda
// öğrendiğimiz grafik mantığının tersi.
function trendCubuguYap(x, yuksek, sinif) {
  const kutu = svgOge("rect");
  kutu.setAttribute("x", String(x));
  kutu.setAttribute("y", String(TREND_TABAN - yuksek));
  kutu.setAttribute("width", String(CUBUK_GENISLIK));
  kutu.setAttribute("height", String(yuksek));
  kutu.setAttribute("class", sinif);
  return kutu;
}

function trendiCiz(kayitlar) {
  const grafik = bul("trend-grafik");
  grafik.innerHTML = "";

  const trend = aylikTrend(kayitlar, secilenAy.yil, secilenAy.ay, TREND_AY_SAYISI);

  // Altı ayın hepsi boşsa çizecek bir şey yok — sıfır çizgisinden
  // ibaret bir grafik kullanıcıya "bozuk mu?" dedirtirdi.
  if (trend.every((a) => a.gelir === 0 && a.gider === 0)) {
    gizle(grafik);
    goster(bul("trend-bos"));
    return;
  }

  gizle(bul("trend-bos"));
  goster(grafik);

  // Taban çizgisi. Çubuklar havada durmasın, oturacakları bir zemin olsun.
  const eksen = svgOge("line");
  eksen.setAttribute("x1", "0");
  eksen.setAttribute("y1", String(TREND_TABAN));
  eksen.setAttribute("x2", String(TREND_AY_SAYISI * TREND_SERIT));
  eksen.setAttribute("y2", String(TREND_TABAN));
  eksen.setAttribute("class", "eksen");
  grafik.appendChild(eksen);

  const cubuklar = trendCubuklari(trend, TREND_YUKSEKLIK);
  for (let i = 0; i < cubuklar.length; i++) {
    const sol = i * TREND_SERIT + CUBUK_SOL;
    grafik.appendChild(trendCubuguYap(sol, cubuklar[i].gelirYuksek, "cubuk-gelir"));
    grafik.appendChild(
      trendCubuguYap(sol + CUBUK_GENISLIK + CUBUK_ARASI, cubuklar[i].giderYuksek, "cubuk-gider")
    );

    // Ay adı. Renk tek kanal olmasın diye her grubun altında YAZIYOR.
    const etiket = svgOge("text");
    etiket.setAttribute("x", String(i * TREND_SERIT + TREND_SERIT / 2));
    etiket.setAttribute("y", String(TREND_ETIKET_Y));
    etiket.setAttribute("class", "cubuk-etiket");
    etiket.textContent = cubuklar[i].etiket;
    grafik.appendChild(etiket);
  }
}

// Rapor sekmesinin grafik bölümünü baştan çizer.
// Kayıt listesini parametreyle alıyoruz: ozetiYenile zaten okumuştu,
// aynı depoyu bir daha okumanın anlamı yok.
function raporuYenile(kayitlar) {
  bul("rapor-ay").textContent = ayAdi(secilenAy.yil, secilenAy.ay) + " görünümü";
  halkayiCiz(kayitlar);
  trendiCiz(kayitlar);
}

// ============================================================
// EKLEME FORMU
// ============================================================

// Kategori kutusunu veri.js'teki KATEGORILER listesinden doldurur.
// Elle 8 tane <option> yazmak yerine döngüyle üretiyoruz: yeni kategori
// gerektiğinde sadece o listeye eklemek yeterli, HTML'e dokunmayacağız.
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
  // Tekrar kutusunu MUTLAKA sıfırlıyoruz: işaretli kalsaydı sonraki
  // kayıt da farkında olmadan yinelenen işleme dönüşürdü.
  bul("alan-tekrar").checked = false;
  hataGizle();
}

bul("ekle-formu").addEventListener("submit", (olay) => {
  // preventDefault: formlar varsayılan olarak sayfayı yeniden yükler
  // (eski usul: veri sunucuya gider, sayfa baştan gelir). Bizim tek
  // sayfamız var ve veriyi kendimiz saklıyoruz, o yüzden bunu engelliyoruz.
  olay.preventDefault();
  hataGizle();

  try {
    // Doğrulamayı burada tekrar yazmıyoruz — tek kural yeri veri.js/kayitEkle.
    // Bozuk veri varsa o throw ediyor, biz de mesajı aşağıda yakalıyoruz.
    const kayit = kayitEkle({
      tur: secilenTur(),
      tutar: bul("alan-tutar").value,
      tarih: bul("alan-tarih").value,
      aciklama: bul("alan-aciklama").value,
      kategori: bul("alan-kategori").value,
    });

    // "Her ay tekrarlansın" işaretliyse aynı bilgilerden bir de şablon
    // kuruyoruz. Kaydın kendisi zaten girildi; şablon BUGÜNDEN SONRASI
    // için — o yüzden başlangıç tarihi bu kaydın tarihi ve ilk tekrar
    // gelecek ay çıkıyor.
    const tekrarli = bul("alan-tekrar").checked;
    if (tekrarli) {
      sablonEkle({
        tur: kayit.tur,
        kurus: kayit.kurus,
        baslangic: kayit.tarih,
        aciklama: kayit.aciklama,
        kategori: kayit.kategori,
      });
      sablonlariCiz();
    }

    // Kayıt başka bir aya aitse o aya geç. Yoksa kullanıcı geçen aya
    // bir gider girip Özet'e döndüğünde "kaydettim ama görünmüyor" der.
    secilenAy = {
      yil: Number(kayit.tarih.slice(0, 4)),
      ay: Number(kayit.tarih.slice(5, 7)),
    };

    formuTemizle();
    sekmeGoster("ozet");
    ozetiYenile();
    bildir(kurusYaz(kayit.kurus) + " kaydedildi ✓" + (tekrarli ? " · her ay tekrarlanacak" : ""));
  } catch (hata) {
    hataGoster(hata.message);
  }
});

// ============================================================
// YEDEKLEME
// ============================================================

// Yedeği dosya olarak indirt. Tarayıcıda "dosya kaydet" işleminin
// standart yolu üç adımlık bir oyun:
//   1) Metinden bir Blob yap (Blob = bellekte duran dosya taslağı),
//   2) createObjectURL ile ona geçici bir adres ver,
//   3) o adrese işaret eden görünmez bir bağlantıya kendi kendine tıklat.
// download özelliği tarayıcıya "bunu açma, bu adla kaydet" diyor.
bul("yedek-indir").addEventListener("click", () => {
  const dosya = new Blob([yedekMetni()], { type: "application/json" });
  const adres = URL.createObjectURL(dosya);
  const baglanti = document.createElement("a");
  baglanti.href = adres;
  baglanti.download = "finans-yedek-" + bugununTarihi() + ".json";
  baglanti.click();
  // Geçici adresi geri veriyoruz; bırakılırsa sekme kapanana dek bellekte kalır.
  URL.revokeObjectURL(adres);
  bildir("Yedek indirildi");
});

// "Geri yükle" düğmesi gizli dosya seçiciye tıklatıyor (bkz. index.html).
bul("yedek-yukle").addEventListener("click", () => bul("yedek-dosya").click());

bul("yedek-dosya").addEventListener("change", () => {
  const dosya = bul("yedek-dosya").files[0];
  if (!dosya) return; // pencereyi açıp vazgeçti

  // text(): dosyanın içeriğini okur. Disk işi olduğu için anında bitmez;
  // sonucu .then ile bekliyoruz.
  dosya.text().then((metin) => {
    try {
      // Denetim kasada (veri.js/yedekOku). Bozuksa burada durur ve
      // depodaki veriye el sürülmemiş olur. Dönen şey artık tam bir
      // depo nesnesi — onay çıkarsa olduğu gibi rafa yazılıyor.
      const yedek = yedekOku(metin);

      const eldeki = kayitlariOku().length;
      const onay = confirm(
        `Depodaki ${eldeki} kayıt silinip yerine yedekteki ${yedek.kayitlar.length} kayıt yüklenecek.\n\nDevam edilsin mi?`
      );
      if (!onay) return;

      depoYaz(yedek);
      secilenAy = bugununAyi();
      ozetiYenile();
      bildir(yedek.kayitlar.length + " kayıt geri yüklendi ✓");
    } catch (hata) {
      alert("Yedek yüklenemedi.\n\n" + hata.message);
    }
  });

  // Seçimi sıfırla: aynı dosya ikinci kez seçilirse tarayıcı
  // "değişmedi ki" deyip change olayını atlamasın.
  bul("yedek-dosya").value = "";
});

// ============================================================
// BAŞLANGIÇ — sayfa açıldığında bir kez çalışan satırlar
// ============================================================

kategorileriDoldur();
butceFormunuDoldur();
sablonlariCiz();
bul("alan-tarih").value = bugununTarihi(); // tarih varsayılan olarak bugün
kategoriKutusunuGuncelle();
sekmeGoster("ozet");
ozetiYenile();
// Panel EN SON çiziliyor: ozetiYenile'den sonra çağırıyoruz ki sıra
// karışıp da az önce onaylanmış bir kayıt eksik görünmesin.
tekrarlariGoster();

// ============================================================
// SERVICE WORKER — çevrimdışı çalışma
// ============================================================
//
// service-worker.js dosyasını tarayıcıya kaydediyoruz. O dosya
// arka planda durup uygulamanın internetsiz de açılmasını sağlıyor.
//
// Yalnızca https:// veya localhost adreslerinde çalışır. Dosyayı
// çift tıklayıp (file://) açtığında kaydolmaz; aşağıdaki catch
// bunu hata olarak göstermeyip sadece konsola not düşüyor.
if ("serviceWorker" in navigator) {
  // load olayını bekliyoruz: service worker'ın indirilmesi, sayfanın
  // ilk açılışıyla yarışıp onu yavaşlatmasın.
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((hata) => {
      console.log("Service worker kaydolmadı (localhost veya https gerekir):", hata.message);
    });
  });
}
