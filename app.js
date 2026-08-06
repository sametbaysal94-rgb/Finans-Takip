// app.js — uygulamanın beyni.
// Adım 1: henüz hiçbir iş yapmıyor, sadece "çalışıyorum" diyor.

// document.getElementById: HTML içinde id="durum" olan öğeyi bulur.
const durum = document.getElementById("durum");

// textContent: bulunan öğenin içindeki yazıyı değiştirir.
durum.textContent = "JavaScript çalışıyor ✓";
