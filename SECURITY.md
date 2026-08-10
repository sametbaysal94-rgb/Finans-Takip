# Güvenlik

Bu belge Finans Takip'in **güven modelini** anlatır: verinin nerede
durduğunu, kimin erişebileceğini ve neyin korunmadığını.

Kısa cevap arıyorsanız: **veriniz yalnızca kendi cihazınızda durur,
hiçbir sunucuya gitmez** — ama cihazınıza erişen herkes onu okuyabilir.

## 1. Güven modeli

Finans Takip'in sunucusu yok, hesabı yok, veritabanı yok. Sade HTML, CSS
ve JavaScript'ten oluşur; kurulum, paket ve derleme adımı içermez.

Bunun doğrudan sonucu şudur: **ele geçirilecek bir sunucu yoktur, çalınacak
bir parola yoktur.** Klasik web uygulaması saldırılarının çoğu burada
karşılıksızdır.

Buna karşılık koruma da tamamen cihazınıza dayanır. Telefonunuzun kilidi
açıkken uygulamayı açan herkes bütün finans kaydınızı görür. Uygulama ayrı
bir parola sormaz ve veriyi şifreli saklamaz.

## 2. Veri nerede duruyor

Kayıtlarınız tarayıcının **`localStorage`** deposunda, düz metin olarak
tutulur. Bu depo:

- Cihazdan çıkmaz. Ağ üzerinden hiçbir yere gönderilmez.
- Tarayıcı verilerini temizlerseniz **silinir**.
- Şifreli değildir. Cihaza erişen bir yazılım ya da kişi okuyabilir.

## 3. Bilmeniz gereken en önemli şey — paylaşılan adres

GitHub Pages, bir kullanıcının bütün projelerini **aynı adres altında**
yayınlar:

```
https://KULLANICI.github.io/Finans-Takip/
https://KULLANICI.github.io/baska-proje/
```

Tarayıcı için bunlar farklı klasörler ama **aynı köken** (origin).
`localStorage` klasöre göre değil kökene göre ayrılır. Sonuç:

> **Aynı GitHub Pages hesabında yayınlanan başka bir sayfa, Finans
> Takip'in verisini okuyabilir ve değiştirebilir.**

Bu teorik bir uyarı değil; aynı kökten kaynaklanan gerçek bir hata bu
projede yaşandı ve düzeltildi: servis işçisi (service worker) önbelleği
temizlerken **aynı adresteki bütün uygulamaların** önbelleğini siliyordu.
Düzeltme önbellek adını bu uygulamaya özel hale getirdi.

**Uygulama kuralı:** aynı GitHub Pages hesabına, kaynağına güvenmediğiniz
bir sayfa yayınlamayın. Gerçekten ayırmak isterseniz uygulamayı kendi alan
adında ya da kendi hesabında yayınlayın.

## 4. Yedek dosyası

"Yedeği indir" düğmesi bütün kayıtlarınızı **şifresiz bir JSON dosyası**
olarak indirir. Bu dosya:

- Herhangi bir metin düzenleyicide okunabilir.
- İndirilenler klasöründe durur; o klasör buluta eşitleniyorsa finans
  verisi de buluta gider.
- Paylaşılırsa geri alınamaz.

Yedek almak doğru bir alışkanlıktır — dosyayı nerede sakladığınız sizin
kararınız, ama bilerek verin.

Geri yükleme tarafında: yüklenen dosya önce **denetlenir**, geçerli
değilse reddedilir ve depoya yazılmaz. Yazma kararı ayrıca onaylanır.
Yine de bilinmeyen bir yedek dosyasını yüklemek mevcut kayıtlarınızın
yerine geçebilir.

## 5. Kaynak kodun açık olması

Depo herkese açıktır. Bu bir zayıflık değildir: uygulamanın güvenliği
kodun gizli kalmasına dayanmaz. Kodun açık olması, verinin gerçekten
cihazdan çıkmadığını **herkesin kendi gözüyle doğrulayabilmesi** demektir.

## 6. Neyi korumuyoruz

Açıkça söylenmesi gerekenler:

- **Cihazınıza erişen birine karşı koruma yok.** Kilidi açık telefon,
  paylaşılan bilgisayar, cihaza bulaşmış bir yazılım — hepsi veriye ulaşır.
- **Şifreleme yok.** Ne depoda ne yedek dosyasında.
- **Kimlik doğrulama yok.** Uygulama kimin açtığını sormaz.
- **Aynı kökendeki diğer sayfalara karşı koruma yok** (3. bölüm).
- **Cihaz kaybolursa veri de kaybolur.** Tek savunma yedek dosyanızdır.

Bu eksikler kusur değil, bilinçli bir takas: uygulama tek kişilik, kişisel
ve sunucusuz olacak şekilde tasarlandı. Hesap ve şifreleme eklemek onu
başka bir şey yapardı.

## 7. Bir sorun bildirmek

Depoda issue açın. Eğer bildireceğiniz şey sıradan bir hata değil bir
**güvenlik açığı** ise — örneğin verinin cihazdan çıktığı bir yol ya da
başka bir sayfanın veriye ulaşmasını sağlayan bir kusur — bunu başlıkta
belirtin ve kendi kurulumunuzun ayrıntılarını paylaşmayın.
