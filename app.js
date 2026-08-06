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
  bul("varlik-tutar").textContent = kurusYaz(toplamVarlik(kayitlar));

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

  // --- Bu aydan uzaklaştıysak dönüş düğmesini göster ---
  if (ayniAy(secilenAy, bugununAyi())) gizle(bul("bugune-don"));
  else goster(bul("bugune-don"));

  // --- Listeyi çiz ---
  const ayinKayitlari = ayKayitlari(kayitlar, secilenAy.yil, secilenAy.ay);

  // O ayda hiç kayıt yoksa kullanıcı "bozuk mu?" diye düşünmesin.
  if (ayinKayitlari.length === 0) goster(bul("ay-bos"));
  else gizle(bul("ay-bos"));

  listeyiCiz(ayinKayitlari);
}

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

    // Kayıt başka bir aya aitse o aya geç. Yoksa kullanıcı geçen aya
    // bir gider girip Özet'e döndüğünde "kaydettim ama görünmüyor" der.
    secilenAy = {
      yil: Number(kayit.tarih.slice(0, 4)),
      ay: Number(kayit.tarih.slice(5, 7)),
    };

    formuTemizle();
    sekmeGoster("ozet");
    ozetiYenile();
    bildir(kurusYaz(kayit.kurus) + " kaydedildi ✓");
  } catch (hata) {
    hataGoster(hata.message);
  }
});

// ============================================================
// BAŞLANGIÇ — sayfa açıldığında bir kez çalışan satırlar
// ============================================================

kategorileriDoldur();
bul("alan-tarih").value = bugununTarihi(); // tarih varsayılan olarak bugün
kategoriKutusunuGuncelle();
sekmeGoster("ozet");
ozetiYenile();
