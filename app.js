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

// Uygulamanın sürümü — Yedekleme bölümünün altında görünüyor.
//
// NEDEN VAR: telefonda bir sorun konuşurken "sende yeni sürüm mü var?"
// sorusunun cevabı yoktu. Uygulama güncellendi mi güncellenmedi mi tahmin
// ediliyor, bu da her denemeyi belirsiz kılıyordu. Artık bakılıp
// söylenebiliyor.
//
// DİKKAT: bu değer service-worker.js'teki ONBELLEK sürümüyle AYNI olmalı.
// İkisi ayrışırsa gösterilen sürüm yalan söyler; testler.js bunu denetliyor.
const UYGULAMA_SURUMU = "v11";

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

// Sürümü başlığın yanına yazar.
//
// DİKKAT — KENDİ KAZDIĞIM ÇUKUR (2026-08-10): sürüm göstergesini önce
// index.html'e bir öğe koyup buradan doldurarak yaptım. O hâliyle şu
// tuzağa açıktı: tarayıcı ESKİ index.html'i önbellekten verip YENİ app.js'i
// indirirse, aradığımız öğe sayfada olmaz, `null.textContent` hata fırlatır
// ve açılış bloğunun geri kalanı HİÇ çalışmaz — uygulama boş açılırdı.
// Tam da denetimde "kısmi güncelleme" diye uyardığımız tuzak.
//
// Şimdi öğe yoksa kendimiz kuruyoruz. Ayrıca bu, göstergeyi eski HTML'le
// bile çalışır kılıyor: sürüm bilgisine en çok ihtiyaç duyduğumuz an,
// tam da dosyaların birbirini tutmadığı andır.
function surumuGoster() {
  let satir = bul("surum-satiri");
  if (!satir) {
    satir = document.createElement("span");
    satir.id = "surum-satiri";
    satir.className = "surum-satiri";
    const baslik = document.querySelector(".ust-bar h1") || document.querySelector(".ust-bar");
    if (baslik) baslik.appendChild(satir);
    else document.body.insertBefore(satir, document.body.firstChild);
  }
  satir.textContent = UYGULAMA_SURUMU;
}

// Depoya YAZAN her düğme bu kapıdan geçer. İş başarılıysa true döner.
//
// NEDEN GEREKLİ (denetim bulgusu): veri.js/depoYaz üç durumda hata fırlatır —
// cihazın deposu dolu, tarayıcı gizli modda, ya da raftaki veri okunamıyor
// (üzerine yazma koruması). Bu hatalar silme ve atlama düğmelerinde HİÇ
// yakalanmıyordu: kullanıcı çöp kutusuna basıyor, kayıt silinmiyor ve ekranda
// hiçbir açıklama çıkmıyordu. Sessiz başarısızlık, hata mesajından beterdir —
// kullanıcı yanlış bir şey yaptığını sanır ya da işin olduğunu zanneder.
function depoyaYaz(is) {
  try {
    is();
    return true;
  } catch (hata) {
    // Kasadan gelen mesajlar zaten Türkçe ve ne yapılacağını söylüyor.
    alert(hata.message);
    return false;
  }
}

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
    const secili = dugme.dataset.sekme === ad;
    dugme.classList.toggle("aktif", secili);

    // GÖRÜNENİN YANINDA DUYULANI DA GÜNCELLE (denetim bulgusu):
    // "aktif" sınıfı yalnızca bir RENK değişikliği; ekran okuyucu rengi
    // görmez. aria-selected olmadan kullanıcı "Rapor, sekme" duyuyor ama
    // o sekmede olup olmadığını bilmiyordu.
    dugme.setAttribute("aria-selected", secili ? "true" : "false");

    // tabindex: sekme çubuğunda Tab tuşu ÜÇ durak yapmasın, tek durak
    // yapsın; duraklar arasında ok tuşlarıyla gezilir. Sekme düğmeleri
    // için beklenen davranış budur (aşağıdaki ok tuşu dinleyicisi).
    dugme.tabIndex = secili ? 0 : -1;
  });
}

// Alt çubuktaki her düğmeye tıklama olayı bağla.
// addEventListener = "bu olay olursa şu işi yap" demek.
document.querySelectorAll(".sekme").forEach((dugme) => {
  dugme.addEventListener("click", () => sekmeGoster(dugme.dataset.sekme));
});

// Sekmeler arasında ok tuşlarıyla gezinme.
//
// NEDEN: role="tab" verdiğimiz anda ekran okuyucu kullanan biri ok
// tuşlarının çalışmasını BEKLER — rolü verip davranışı vermemek, sözü
// tutmamak olurdu. Sona gelince başa dönüyor (modulo işlemi).
document.querySelector(".alt-bar").addEventListener("keydown", (olay) => {
  if (olay.key !== "ArrowRight" && olay.key !== "ArrowLeft") return;
  const dugmeler = [...document.querySelectorAll(".sekme")];
  const simdiki = dugmeler.indexOf(document.activeElement);
  if (simdiki === -1) return;

  olay.preventDefault(); // sayfa yana kaymasın
  const adim = olay.key === "ArrowRight" ? 1 : -1;
  // + dugmeler.length: JavaScript'te -1 % 3 eksi çıkar, bu ekleme onu düzeltir.
  const hedef = dugmeler[(simdiki + adim + dugmeler.length) % dugmeler.length];
  sekmeGoster(hedef.dataset.sekme);
  hedef.focus();
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

  if (!depoyaYaz(() => kayitSil(kayit.id))) return;
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

  // Kasa artık yalnızca SIRADAKİ (en eski bekleyen) dönemi işliyor — aradaki
  // ayların sessizce yok olmaması için (bkz. veri.js/tekrarOnayla). Kullanıcı
  // alttaki bir satıra basarsa iş yapılmaz; bunu SÖYLEMEK zorundayız, yoksa
  // düğme bozukmuş gibi görünür.
  const SIRA_MESAJI = "Önce en üstteki (en eski) satırı işle";

  if (dugme.classList.contains("tekrar-ekle")) {
    try {
      const kayit = tekrarOnayla(sablonId, tarih);
      if (kayit) {
        bildir((kayit.aciklama || turAdi(kayit.tur)) + " eklendi ✓");
      } else {
        bildir(SIRA_MESAJI);
      }
    } catch (hata) {
      // Şablonun kategorisi silinmiş olabilir; kasa Türkçe bir mesajla
      // durduruyor, biz de onu olduğu gibi gösteriyoruz.
      alert(hata.message);
    }
  } else {
    // Atlama da depoya yazıyor: dolu depo ya da bozuk raf hatası buradan da
    // çıkabilir, sessizce yutulmasın.
    let atlandi = false;
    if (!depoyaYaz(() => { atlandi = tekrarAtla(sablonId, tarih); })) return;
    bildir(atlandi ? "Atlandı" : SIRA_MESAJI);
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
  // (Eskiden burada bir uyarı vardı: metin içinde parantez açmaktan kaçın,
  //  yoksa testler.js onu fonksiyon çağrısı sanıyor. O kısıt 2026-08-10'da
  //  kalktı — tarayıcı artık metinleri taramadan önce ayıklıyor. Kullanıcıya
  //  gösterilen cümleyi bir testin sınırına göre eğmek zorunda değiliz.)
  const onay = confirm(
    `"${etiket}" — ${kurusYaz(sablon.kurus)}\n\nBu yinelenen işlem silinsin mi?\n\nDaha önce eklenmiş kayıtlar silinmez.`
  );
  if (!onay) return;

  if (!depoyaYaz(() => sablonSil(sablon.id))) return;
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
  const liste = bul("trend-liste");
  grafik.innerHTML = "";
  liste.innerHTML = "";

  const trend = aylikTrend(kayitlar, secilenAy.yil, secilenAy.ay, TREND_AY_SAYISI);

  // Altı ayın hepsi boşsa çizecek bir şey yok — sıfır çizgisinden
  // ibaret bir grafik kullanıcıya "bozuk mu?" dedirtirdi.
  if (trend.every((a) => a.gelir === 0 && a.gider === 0)) {
    gizle(grafik);
    gizle(liste);
    goster(bul("trend-bos"));
    return;
  }

  gizle(bul("trend-bos"));
  goster(grafik);
  goster(liste);

  // Grafiğin yazılı karşılığı: her ay için bir satır. Çizim aria-hidden
  // olduğu için ekran okuyucunun okuyabildiği TEK kaynak burası; gören
  // kullanıcı da çubukların tam tutarını ancak buradan görüyor.
  for (const ay of trend) {
    const satir = document.createElement("li");
    satir.className = "trend-satir";

    const adYazi = document.createElement("span");
    adYazi.className = "trend-satir-ay";
    // Sondaki boşluk BİLEREK duruyor. Ekranda görünmüyor (iki kutu zaten
    // iki yana yaslı), ama ekran okuyucu iki kutunun yazısını arka arkaya
    // okuyor: boşluk olmasaydı "Mart 2026gelir" diye tek kelime duyulurdu.
    adYazi.textContent = ayAdi(ay.yil, ay.ay) + " ";
    satir.appendChild(adYazi);

    const tutarlar = document.createElement("span");
    tutarlar.className = "trend-satir-tutar";
    tutarlar.textContent = "gelir " + kurusSade(ay.gelir) + " ₺ · gider " + kurusSade(ay.gider) + " ₺";
    satir.appendChild(tutarlar);

    liste.appendChild(satir);
  }

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

  // Hatanın hangi ALANLA ilgili olduğunu da söylüyoruz. aria-invalid:
  // "bu kutudaki değer geçersiz". aria-describedby: "açıklaması şu
  // öğede". İkisi olmadan ekran okuyucu hatayı okuyor ama kullanıcı
  // hangi kutuya döneceğini bilmiyordu. Hatalarımızın hemen hepsi
  // tutar alanından geliyor (tlToKurus), o yüzden işaret oraya.
  const alan = bul("alan-tutar");
  alan.setAttribute("aria-invalid", "true");
  alan.setAttribute("aria-describedby", "form-hata");
}

function hataGizle() {
  gizle(bul("form-hata"));
  const alan = bul("alan-tutar");
  alan.removeAttribute("aria-invalid");
  alan.removeAttribute("aria-describedby");
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
    // Şablon kurulduysa bekleyenler paneli de tazelensin: geçmiş tarihli
    // bir şablonun ("Ocak'tan beri kira") birikmiş tekrarları sayfa
    // yenilenmeden görünmeliydi (usta denetimi bulgusu).
    if (tekrarli) tekrarlariGoster();
    bildir(kurusYaz(kayit.kurus) + " kaydedildi ✓" + (tekrarli ? " · her ay tekrarlanacak" : ""));
  } catch (hata) {
    hataGoster(hata.message);
  }
});

// ============================================================
// YEDEKLEME
// ============================================================

// Kaç gün sonra "yedek almanın zamanı geldi" diye dürtelim?
//
// 30 rastgele değil: tarayıcılar yer sıkışınca site verisini SİLEBİLİR
// ve iOS'ta ana ekrana eklenmemiş bir siteye 7 gün dokunulmazsa verisi
// kendiliğinden gidiyor. Bunun tek gerçek panzehiri elde bir dosya
// olması. 7 gün fazla dırdırcı, 90 gün ise "bir ayda üç kayıp"
// demek — bir ay, hatırlatıcının rahatsız etmeden işe yaradığı yer.
const YEDEK_HATIRLATMA_GUNU = 30;

// Yedek bölümündeki tek satırlık durum yazısı.
// Hiç yedek yok / bugün alınmış / N gün önce alınmış.
function yedekDurumunuGoster() {
  const satir = bul("yedek-durum");
  const sonYedek = sonYedekOku();

  // Boş metin = bu cihazda hiç yedek indirilmemiş. En riskli hâl,
  // o yüzden doğrudan uyarı rengine giriyor.
  if (!sonYedek) {
    satir.textContent = "Henüz hiç yedek almadın.";
    satir.classList.toggle("yedek-eski", true);
    return;
  }

  const fark = gunFarki(sonYedek, bugununTarihi());
  satir.textContent = fark === 0 ? "Son yedek: bugün ✓" : "Son yedek: " + fark + " gün önce";
  satir.classList.toggle("yedek-eski", fark > YEDEK_HATIRLATMA_GUNU);
}

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

  // Damgayı BURADA vuruyoruz, yedekMetni()'nin içinde değil: metni
  // üretmek ile dosyayı indirmek ayrı işler. Kasa metin üretirken
  // damga vursaydı, ileride yedeği başka bir amaçla (önizleme gibi)
  // üreten her yer "yedek alındı" sayılırdı.
  yedekAlindi();
  yedekDurumunuGoster();
  bildir("Yedek indirildi");
});

// "Geri yükle" düğmesi gizli dosya seçiciye tıklatıyor (bkz. index.html).
bul("yedek-yukle").addEventListener("click", () => bul("yedek-dosya").click());

bul("yedek-dosya").addEventListener("change", () => {
  const dosya = bul("yedek-dosya").files[0];
  if (!dosya) return; // pencereyi açıp vazgeçti

  // BOYUT SINIRI (denetim bulgusu): dosya önce bütünüyle metne, sonra
  // bütünüyle JavaScript nesnelerine, sonra üçüncü kez temiz kayıt
  // listesine çevriliyor. Yanlışlıkla seçilen 50 MB'lık bir dosya telefonu
  // dakikalarca dondurur ya da işletim sistemi sekmeyi kapatır — üstelik
  // hata mesajı bile göremezsin. Gerçek bir yedek bu kadar büyük olamaz:
  // deponun kendisi zaten ~5 MB ile sınırlı, girintili JSON en kötü onun
  // birkaç katı. 20 MB fazlasıyla geniş bir tavan.
  const AZAMI_YEDEK_BAYT = 20 * 1024 * 1024;
  if (dosya.size > AZAMI_YEDEK_BAYT) {
    const mb = (dosya.size / 1024 / 1024).toFixed(1);
    alert(
      `Bu dosya çok büyük (${mb} MB) ve bir yedek dosyasına benzemiyor. ` +
        `Uygulamanın ürettiği yedekler en fazla birkaç MB olur. Doğru dosyayı seçtiğinden emin ol.`
    );
    bul("yedek-dosya").value = "";
    return;
  }

  // text(): dosyanın içeriğini okur. Disk işi olduğu için anında bitmez;
  // sonucu .then ile bekliyoruz.
  dosya.text().then((metin) => {
    try {
      // Denetim kasada (veri.js/yedekOku). Bozuksa burada durur ve
      // depodaki veriye el sürülmemiş olur. Dönen şey artık tam bir
      // depo nesnesi — onay çıkarsa olduğu gibi rafa yazılıyor.
      const yedek = yedekOku(metin);

      // Onay metni her şeyi açıkça söylüyor (usta denetimi bulgusu):
      // eski (1. etap) yedeklerde bütçe ve şablon bilgisi yok; öyle bir
      // dosya yüklenirse mevcut bütçeler ve yinelenen işlemler de
      // silinir. Kullanıcı bunu onay penceresinde görmeli.
      const mevcutDepo = depoOku();
      const kayiplar = [];
      if (Object.keys(mevcutDepo.butceler).length > 0 && Object.keys(yedek.butceler).length === 0) {
        kayiplar.push("bütçe limitlerin");
      }
      if (mevcutDepo.sablonlar.length > 0 && yedek.sablonlar.length === 0) {
        kayiplar.push("yinelenen işlemlerin");
      }
      const ekUyari = kayiplar.length
        ? "\n\nDİKKAT: bu yedekte bütçe/şablon bilgisi yok; mevcut " + kayiplar.join(" ve ") + " SİLİNECEK."
        : "";

      const eldeki = mevcutDepo.kayitlar.length;
      const onay = confirm(
        `Depodaki ${eldeki} kayıt silinip yerine yedekteki ${yedek.kayitlar.length} kayıt yüklenecek. Bütçeler ve yinelenen işlemler de yedektekiyle değiştirilecek.${ekUyari}\n\nDevam edilsin mi?`
      );
      if (!onay) return;

      // zorla: true — geri yükleme, "üzerine yazma korumasını" bilerek aşan
      // TEK yer. Kullanıcı yukarıdaki onay penceresinde üzerine yazmayı zaten
      // kabul etti; üstelik depo okunamayacak kadar bozuksa geri yükleme tam
      // da bu yüzden yapılıyor olabilir (bkz. veri.js/depoYaz).
      depoYaz(yedek, { zorla: true });
      secilenAy = bugununAyi();
      ozetiYenile();
      // Geri yükleme deponun HER bölümünü değiştirdi; sadece Özet değil,
      // Rapor'daki bütçe formu, şablon listesi ve bekleyenler paneli de
      // tazelenmeli (usta denetimi bulgusu — eskiden bayat kalıyorlardı).
      butceFormunuDoldur();
      sablonlariCiz();
      tekrarlariGoster();
      // Geri yükleme damgayı sıfırlıyor (damga dosyada taşınmıyor, bkz.
      // veri.js/yedekMetni). Satırı hemen tazeliyoruz ki ekranda az
      // önceki bayat "Son yedek: 3 gün önce" yazısı kalmasın.
      yedekDurumunuGoster();
      bildir(yedek.kayitlar.length + " kayıt geri yüklendi ✓");
    } catch (hata) {
      alert("Yedek yüklenemedi.\n\n" + hata.message);
    }
  }).catch((hata) => {
    // Dosyanın kendisi okunamadıysa (telefon dosyayı taşımış, izin
    // kalkmış, bulut dosyası inmemiş) buraya düşüyoruz. Eskiden .catch
    // yoktu: kullanıcı dosyayı seçiyor, hiçbir şey olmuyor, sebebini
    // öğrenemiyordu.
    alert("Dosya okunamadı.\n\n" + hata.message);
  });

  // Seçimi sıfırla: aynı dosya ikinci kez seçilirse tarayıcı
  // "değişmedi ki" deyip change olayını atlamasın.
  bul("yedek-dosya").value = "";
});

// ============================================================
// BAŞLANGIÇ — sayfa açıldığında bir kez çalışan satırlar
// ============================================================

surumuGoster();
kategorileriDoldur();
butceFormunuDoldur();
sablonlariCiz();
bul("alan-tarih").value = bugununTarihi(); // tarih varsayılan olarak bugün
kategoriKutusunuGuncelle();
sekmeGoster("ozet");
ozetiYenile();
yedekDurumunuGoster();
// Panel EN SON çiziliyor: ozetiYenile'den sonra çağırıyoruz ki sıra
// karışıp da az önce onaylanmış bir kayıt eksik görünmesin.
tekrarlariGoster();

// ============================================================
// GÜN DEĞİŞİMİ — gece yarısını geçen uygulama
// ============================================================
//
// DİKKAT (denetim bulgusu): tarih alanı yukarıdaki satırda BİR KEZ dolduruluyor
// ve eskiden bu dosyada sayfanın yeniden görünmesini dinleyen hiçbir şey yoktu.
// Ana ekrana eklenmiş bir uygulama telefonda günlerce bellekte kalır — sayfa
// yeniden yüklenmez. Sonuç: 31 Ağustos akşamı açık bırakılan uygulamada
// 1 Eylül sabahı girilen market harcaması sessizce 31 AĞUSTOS'a yazılıyordu.
// Ağustos'un gideri şişiyor, Eylül'ünki eksik kalıyordu; üstelik formu
// temizlemek tarihi bilerek korudugu için sonraki kayıtlar da yanlış güne
// gidiyordu. Hiçbir uyarı yoktu.

// En son hangi günü "bugün" saydığımız. Karşılaştırma noktamız bu.
let sonBilinenGun = bugununTarihi();

function gunDegistiyseTazele() {
  const bugun = bugununTarihi();
  if (bugun === sonBilinenGun) return; // gün değişmemiş, yapacak iş yok

  const eskiGun = sonBilinenGun;
  sonBilinenGun = bugun;

  // Tarih alanını YALNIZCA kullanıcı ona dokunmadıysa güncelliyoruz.
  // Bilerek geçmiş bir tarih seçtiyse onun seçimini ezmek saygısızlık olurdu;
  // alanda hâlâ bizim yazdığımız eski "bugün" duruyorsa serbestiz.
  const alan = bul("alan-tarih");
  if (alan.value === eskiGun) alan.value = bugun;

  // Ekranda "bu ay"a bakılıyorduysa yeni aya geçiyoruz. Kullanıcı ay oklarıyla
  // bilerek eski bir aya gittiyse onu yerinden oynatmıyoruz.
  const eskiAy = { yil: Number(eskiGun.slice(0, 4)), ay: Number(eskiGun.slice(5, 7)) };
  if (ayniAy(secilenAy, eskiAy)) secilenAy = bugununAyi();

  // Gün değiştiyse zamanı gelen yeni tekrarlar ve yedek uyarısı da tazelenmeli.
  ozetiYenile();
  tekrarlariGoster();
  yedekDurumunuGoster();
}

// ============================================================
// KLAVYE AÇIKKEN ALT ÇUBUĞU ÇEK
// ============================================================
//
// Neo'nun bildirdiği sorunun ikinci adayı (2026-08-10, 1. adım çözmedi):
// ana ekrandan açılan iPhone uygulamasında bir kutuya dokununca sayfa
// yakınlaşıyor ve klavye kapanınca eski hâline dönmüyor.
//
// Dipteki sekme çubuğu `position: fixed` — sayfayla birlikte kaymayan,
// ekrana çakılı tek öğemiz. iOS klavyeyi açınca görünen alanı küçültüyor
// ama sayfanın ölçüsünü değiştirmiyor; çakılı öğe bu ikisinin arasında
// kalıyor. Yazı yazılırken çubuğu tümden kaldırıyoruz.

// Bu öğeye yazı yazılıyor mu? Radyo düğmesi ve onay kutusu SAYILMAZ:
// onlara dokununca klavye açılmıyor, çubuğu boş yere gizlemeyelim.
function yaziAlaniMi(oge) {
  if (!oge) return false;
  if (oge.tagName === "TEXTAREA") return true;
  if (oge.tagName !== "INPUT" && oge.tagName !== "SELECT") return false;
  return ["text", "number", "search", "tel", "email", "url", "date", "select-one"].includes(oge.type);
}

// focusin/focusout: focus'un kabarcıklanan (bubbling) hâli. Tek dinleyiciyle
// bütün kutuları yakalıyoruz — her kutuya ayrı dinleyici bağlamak, kutular
// yeniden çizilince (bütçe formu) kopardı.
document.addEventListener("focusin", (olay) => {
  if (yaziAlaniMi(olay.target)) document.body.classList.add("yazi-yaziliyor");
});

document.addEventListener("focusout", () => {
  // Bir kutudan ötekine geçerken çubuk yanıp sönmesin: focusout, yeni
  // kutunun focusin'inden ÖNCE geliyor. Sıfır gecikmeli setTimeout ile
  // sıranın sonuna geçip "gerçekten bir yazı alanından çıktık mı?" diye
  // soruyoruz.
  setTimeout(() => {
    if (!yaziAlaniMi(document.activeElement)) {
      document.body.classList.remove("yazi-yaziliyor");
    }
  }, 0);
});

// visibilitychange: uygulamaya/sekmeye geri dönüldüğünde çalışır — telefonu
// cebe koyup ertesi gün açmanın yakalandığı yer burası.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) gunDegistiyseTazele();
});
// pageshow: tarayıcının "geri" tuşuyla bellekten geri getirdiği sayfayı da
// yakalar; visibilitychange orada her zaman çalışmıyor.
window.addEventListener("pageshow", gunDegistiyseTazele);

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
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((kayit) => {
        // GÜNCELLEMEYİ KENDİMİZ SORUYORUZ (2026-08-10).
        //
        // NEDEN: kayıt tek başına "yeni sürüm var mı?" diye sormuyor;
        // tarayıcı kendi bildiği zamanlarda soruyor. Ana ekrana eklenmiş
        // bir iPhone uygulaması ise günlerce hiç sormayabiliyor — kullanıcı
        // uygulamayı açıp kapatsa bile eski sürümde kalıyor ve gönderilen
        // düzeltmeler ona hiç ulaşmıyor. Bu, "düzelttim ama düzelmedi"
        // tablosunun sessiz sebebi.
        kayit.update();

        // Uygulamaya her geri dönüldüğünde de bir kez soruyoruz. Maliyeti
        // küçük bir istek; karşılığı, düzeltmelerin cihaza gerçekten inmesi.
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) kayit.update();
        });
      })
      .catch((hata) => {
        console.log("Service worker kaydolmadı (localhost veya https gerekir):", hata.message);
      });
  });

  // Yeni sürüm devraldığı anda sayfayı BİR KEZ yeniliyoruz.
  //
  // Olmasaydı: yeni dosyalar inip devreye girerdi ama ekranda hâlâ eski
  // kod çalışıyor olurdu — kullanıcı uygulamayı tekrar açana kadar
  // güncellemeyi görmezdi. `yenilendi` bayrağı sonsuz yenileme döngüsünü
  // engelliyor (yenileme yeni bir devralmayı tetikleyebilir).
  let yenilendi = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (yenilendi) return;
    yenilendi = true;
    location.reload();
  });
}

// ============================================================
// KALICI DEPO İSTEĞİ
// ============================================================
//
// Tarayıcı, cihazda yer sıkışınca site verilerini SİLEBİLİR — kimseye
// sormadan. iOS'ta ayrıca şöyle bir kural var: ana ekrana eklenmemiş
// bir siteye 7 gün girmezsen verisi kendiliğinden temizlenir.
//
// persist() tarayıcıya "benimkini silme" diye NAZİKÇE rica eder.
// Cevabı garanti değil: tarayıcı uygulamayı ne kadar sahiplendiğine
// bakıp (ana ekrana eklenmiş mi, sık mı giriliyor) kendi karar verir.
// İşte bu yüzden yukarıdaki yedek hatırlatıcısı var — asıl sigorta
// elde duran dosya, bu rica sadece ek bir önlem.
//
// Ekranda hiçbir şey göstermiyoruz, izin penceresi de açtırmıyoruz:
// cevabı ne olursa olsun kullanıcının yapacağı bir şey yok. Sonuç
// yalnızca konsola not düşülüyor (F12 ile bakılabilir).
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then((verildi) => {
    console.log(
      verildi
        ? "Kalıcı depo izni verildi: tarayıcı verimizi kendiliğinden silmeyecek."
        : "Kalıcı depo izni verilmedi; yedek almak daha da önemli."
    );
  });
}
