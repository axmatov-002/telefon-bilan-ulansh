# 📱⇄🖥️ PhoneDisplay Pro — Ikki Tomonlama Ekran Tizimi

**PhoneDisplay Pro** — endi ikki tomonlama to'liq ekran yechimi:
1. 🖥️ ➔ 📱 **Kompyuterni telefonga ikkinchi ekran qilish** (PC to Phone - Second Monitor / Display Extender).
2. 📱 ➔ 🖥️ **Telefon ekranini kompyuterga chiqarish** (Phone to PC - Screen Mirroring & Casting).
3. 📷 ➔ 🖥️ **Telefon kamerasini kompyuterga veb-kamera qilish** (Wireless HD Webcam).

---

## 🌟 Asosiy Imkoniyatlar

### 1. 🖥️ ➔ 📱 Kompyuter Ekrani Telefonda (Ikkinchi Monitor):
- **Ultra-past Kechikish (5–15 ms):** Apparat tezlatgichli (GPU) **WebRTC 60 FPS** uzatish.
- **Haqiqiy 2-Ekran (Virtual Display 2):** Windows'da yangi monitor ochib, noutbukdan xohlagan dasturni (kod muharriri, Telegram, brauzer, video) telefonga alohida sudrab o'tkazish.
- **Sensorli Boshqaruv:** Telefonda barmog'ingiz bilan bosish sichqonchaning chap/o'ng tugmasi, sudrash (drag) va 2 barmoq bilan aylantirish (scroll).
- **Telefon Klaviaturasi:** Telefondan kompyuterga matn yozish va `WIN`, `ESC`, `ALT+TAB`, `CTRL+C`, `CTRL+V` tugmalari.

### 2. 📱 ➔ 🖥️ Telefon Ekrani Kompyuterda (Phone Mirroring):
- **Bir zumda kompyuterga aks ettirish:** Telefoningizdagi o'yinlar (PUBG, Genshin, FIFA), ilovalar (Instagram, TikTok, Telegram) yoki videolarni kompyuteringizning katta monitorida 60 FPS tomosha qiling!
- **Telefon orqali boshqaruv:** Telefondan `getDisplayMedia` orqali to'g'ridan-to'g'ri tizim darajasida uzatiladi.
- **Telefon Ekranini Burish (Rotate):** Portret (vertikal) va Albom (gorizontal/landscape) rejimiga 1 tugma bilan moslash.
- **Skrinshot Olish (PNG):** Telefon ekranini yuqori sifatda 1 bosishda rasm sifatida saqlash.
- **Videoga Yozib Olish (Screen Recording):** Telefon oqimini audio bilan birga `.webm` video fayl qilib kompyuterga yozib olish.
- **Ovoz uzatish:** Telefon ovozi kompyuter karnaylariga uzatiladi.

### 3. 📷 ➔ 🖥️ Simsiz Veb-Kamera (Webcam Mode):
- Telefoningizning orqa yoki old kamerasini kompyuteringiz uchun simsiz, yuqori sifatli veb-kamera sifatida ishlatish (Zoom, Google Meet, Discord, darslar uchun juda qulay).

---

## 🚀 Qanday Ishlatiladi?

### 1-qadam: Dasturni Ishga Tushirish
Papkadagi **`start.bat`** faylini ikki marta bosing!  
Kompyuteringiz brauzerida boshqaruv paneli ochiladi:  
👉 **`http://localhost:3000/host`**

### 2-qadam: Telefonni Ulash
1. Telefoningiz kompyuter bilan **bir xil Wi-Fi** tarmog'iga ulangan bo'lsin.
2. Telefoningiz kamerasi bilan kompyuter ekranidagi **QR-kodni** skanerlang (yoki brauzerda ko'rsatilgan IP-manzilni oching: `http://192.168.x.x:3000`).

### 3-qadam: Rejimni Tanlash:

#### Variant A: Kompyuter ekranini telefonga chiqarish (2-Ekran)
- Kompyuter panelida **"1. Kompyuter Ekrani ➔ Telefonga"** bo'limida **"Share Screen"** tugmasini bosing va kerakli ekran yoki dastur oynasini tanlang.

#### Variant B: Telefon ekranini kompyuterga chiqarish (Phone Mirroring)
1. Telefoningizda sahifaning yuqori qismidagi **"📱 Telefon ➔ PC"** tugmasini bosing.
2. **"▶ Telefon Ekranini Uzatish (Screen Cast)"** tugmasini bosing.
3. Telefoningiz (Android) ruxsat so'raganda **"Boshlash" (Start now)** tugmasini bosing!
4. Kompyuter boshqaruv panelida telefoningiz ekrani jonli paydo bo'ladi!

---

## 📂 Loyiha Tuzilishi

```
telefon bilan ulanish/
├── server.js                     # Ikki tomonlama WebRTC & WebSocket serveri
├── package.json                  # Loyiha konfiguratsiyasi
├── start.bat                     # Windows 1-bosishda ishga tushiruvchi
├── public/                       # Veb frontend fayllari
│   ├── index.html                # Telefon ilovasi (2 ta rejimli)
│   ├── host.html                 # Kompyuter boshqaruv paneli & Telefon monitori
│   ├── css/
│   │   ├── client.css            # Mobil interfeys dizayni
│   │   └── host.css              # Kompyuter paneli & Smartfon maketi dizayni
│   └── js/
│       ├── client.js             # Mobil WebRTC qabul qiluvchi & uzatuvchi
│       └── host.js               # Kompyuter WebRTC uzatuvchi & qabul qiluvchi
├── bin/                          # Windows native tizim yordamchilari
│   ├── input_server.ps1          # Sichqoncha va klaviatura ko'prigi
│   └── get_screens.ps1           # Monitorlar ro'yxatini aniqlovchi
├── driver/                       # Windows Virtual Display Driver qo'llanmasi
│   ├── setup_virtual_display.ps1 # Virtual 2-Ekranni avtomatik o'rnatish
│   └── VIRTUAL_DISPLAY_GUIDE.md  # O'zbekcha batafsil qo'llanma
└── python_version/               # Python muqobil versiyasi
    ├── server.py                 # Flask + PyAutoGUI + MSS server
    └── requirements.txt          # Python kutubxonalari
```

---

## 🔒 Xavfsizlik va Maxfiylik

- Barcha audio, video va sensor ma'lumotlari faqat **sizning shaxsiy mahalliy Wi-Fi tarmog'ingizda** to'g'ridan-to'g'ri (P2P LAN) uzatiladi.
- Internetga yoki uchinchi tomon serverlariga hech qanday ma'lumot yuborilmaydi.
