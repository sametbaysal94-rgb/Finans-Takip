// service-worker.js — çevrimdışı bekçisi.
//
// Service worker, sayfanın ARKA PLANINDA duran küçük bir programdır.
// Sayfa kapalıyken de tarayıcıda kayıtlı kalır ve uygulamanın yaptığı
// her dosya isteğini araya girip cevaplayabilir.
//
// Bizim işimiz için: dosyaları bir kez indirip saklıyor, internet
// yoksa saklananları veriyor. Uygulamanın uçak modunda açılmasını
// sağlayan şey bu.
//
// ÖNEMLİ: service worker yalnızca https:// veya localhost adreslerinde
// çalışır. Dosyayı çift tıklayıp (file://) açtığında kaydolmaz —
// tarayıcı güvenlik kuralı, aşılamıyor.

// Önbelleğin adı. Sonundaki sürüm numarasını değiştirdiğimizde
// tarayıcı eski önbelleği çöpe atıp yenisini kuruyor.
//
// DİKKAT: buradaki sürüm DOSYALARIN sürümü. veri.js'teki SURUM ise
// VERİNİN yapısı. İkisi ayrı ayrı ilerler; sayıları zamanla birbirini
// tutmayacak ve bu bir hata değil.
const ONBELLEK = "finans-takip-v8";

// Bu uygulamanın önbelleklerini tanıtan ön ek. Temizlik yaparken NİYE gerekli:
// aynı adreste (github.io) yayınlanan başka uygulamaların önbellekleri de
// aynı listede görünüyor. Ön ek olmadan yapılan temizlik onları da siliyordu
// (denetim bulgusu) — Finans Takip açılınca komşu uygulamalar çevrimdışı
// çalışamaz hâle geliyordu.
const ONEK = "finans-takip-";

// Uygulamanın çalışması için gereken dosyalar.
//
// DİKKAT: buradaki yollardan biri yanlışsa addAll tamamen başarısız
// olur ve service worker HİÇ kurulmaz — çevrimdışı çalışma sessizce
// çalışmaz. Bu yüzden testler.js bu listedeki her dosyanın gerçekten
// var olduğunu kontrol ediyor.
//
// NEDEN "./index.html" YOK: "./" zaten index.html'i getiriyor, ikisi
// aynı dosya. Üstelik bazı sunucular "/index.html" isteğini "/" adresine
// YÖNLENDİRİYOR (301) — yönlendirilmiş yanıtı önbelleğe koymak sorun
// çıkarabiliyor. Tek ve kesin adres kullanıyoruz: "./"
const DOSYALAR = [
  "./",
  "./style.css",
  "./veri.js",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/icon-180.png",
];

// ============================================================
// KURULUM — dosyaları önbelleğe indir
// ============================================================

self.addEventListener("install", (olay) => {
  // waitUntil: "ben bitirene kadar beni kapatma" demek.
  olay.waitUntil(
    caches.open(ONBELLEK).then((onbellek) => onbellek.addAll(DOSYALAR))
  );
  // skipWaiting: yeni sürüm hazır olunca eskisinin kapanmasını bekleme,
  // hemen devral. Yoksa güncelleme bir sonraki açılışa kalıyor.
  self.skipWaiting();
});

// ============================================================
// ETKİNLEŞME — eski önbellekleri temizle
// ============================================================

self.addEventListener("activate", (olay) => {
  olay.waitUntil(
    caches
      .keys()
      .then((adlar) =>
        // Yalnızca BİZİM eski önbelleklerimizi sil.
        //
        // DİKKAT: burada eskiden sadece "ad !== ONBELLEK" yazıyordu ve bu,
        // aynı adreste yayınlanan HER uygulamanın önbelleğini siliyordu.
        // localStorage gibi Cache Storage da adres (origin) başınadır, klasör
        // başına değil — yani github.io hesabındaki bütün projeler aynı rafı
        // paylaşıyor. Ön ek denetimi olmadan Finans Takip her açılışta
        // komşularının çevrimdışı kopyasını çöpe atıyordu.
        Promise.all(
          adlar
            .filter((ad) => ad.startsWith(ONEK) && ad !== ONBELLEK)
            .map((ad) => caches.delete(ad))
        )
      )
      // clients.claim: açık olan sayfayı da hemen bu sürüme bağla.
      .then(() => self.clients.claim())
  );
});

// ============================================================
// İSTEKLERİ KARŞILAMA
// ============================================================
//
// Strateji: ÖNCE İNTERNET, olmazsa önbellek.
//
// Neden bu sıra: tersi (önce önbellek) daha hızlı açılır ama
// uygulamayı güncellediğimizde telefonda günlerce eski sürüm
// görünür — PWA'ların en klasik baş ağrısı. Böyle yapınca internet
// varken her zaman en yeni sürümü, yokken saklanan sürümü alıyorsun.

self.addEventListener("fetch", (olay) => {
  const istek = olay.request;

  // Sadece sayfa/dosya çekme isteklerine karışıyoruz.
  if (istek.method !== "GET") return;

  // Başka sitelere giden istekleri kendi önbelleğimize sokmuyoruz.
  if (new URL(istek.url).origin !== self.location.origin) return;

  olay.respondWith(
    fetch(istek)
      .then((yanit) => {
        // Sadece başarılı yanıtları saklıyoruz; 404'ü önbelleğe
        // koymak hatayı kalıcı hâle getirirdi.
        if (yanit.ok) {
          // clone(): bir yanıt yalnızca bir kez okunabilir. Biri
          // önbelleğe, biri tarayıcıya gitsin diye kopyalıyoruz.
          const kopya = yanit.clone();
          caches.open(ONBELLEK).then((onbellek) => onbellek.put(istek, kopya));
          return yanit;
        }

        // DİKKAT — SUNUCU ARIZASI (denetim bulgusu): fetch YALNIZCA bağlantı
        // kopunca hata sayılır. Sunucu "503 Servis kullanılamıyor" derse fetch
        // BAŞARILI sayılır ve aşağıdaki .catch hiç çalışmaz. Eskiden bu yanıt
        // olduğu gibi kullanıcıya gidiyordu: elinde çalışan bir çevrimdışı
        // kopya dururken GitHub'ın geçici arızasında uygulama açılmıyordu.
        // Artık önce önbelleğe bakıyoruz; orada da yoksa hatayı geçiriyoruz.
        return caches.match(istek).then((saklanan) => saklanan || caches.match("./").then((ana) => ana || yanit));
      })
      .catch(() =>
        // İnternet yok: önbellekten ver. Tam eşleşme yoksa uygulamanın
        // ana sayfasını ver, böylece en azından açılır.
        caches.match(istek).then((yanit) => yanit || caches.match("./"))
      )
  );
});
