# 🖥️ Windows Virtual Ikkinchi Ekran Sozlash Qo'llanmasi

Ushbu qo'llanma kompyuteringizda (hatto bitta monitor yoki noutbuk bo'lsa ham) haqiqiy **Ikkinchi Monitor (Virtual Display 2)** yaratishni tushuntiradi.

---

## 1. Nima uchun Virtual Ekran kerak?

- Odatda telefonni kompyuterga ulasangiz, u faqat kompyuterning mavjud ekranini ko'chiradi (Mirroring).
- Lekin siz **"Ikkinchi Ekran" (Extended Display)** xohlasangiz:
  - Noutbukingizda asosiy ishni qilasiz (masalan, Word yoki Figma).
  - Telefoningizda esa ikkinchi mustaqil dasturni (masalan, Telegram, YouTube, Kod yoki Konsol) ochib qo'yishingiz mumkin.
  - Sichqoncha kursorini noutbuk ekranidan o'ng tomonga sursangiz, u avtomatik ravishda telefoningiz ekraniga o'tadi!

---

## 2. Ikkinchi Ekranni faollashtirishning 3 xil usuli

### 1-usul: Ochiq kodli Windows IddCx Drayveri (Tavsiya etiladi - 100% Bepul)
Bu eng zamonaviy va tezkor usul. Microsoft'ning rasmiy **IddCx (Indirect Display Driver)** texnologiyasi asosida ishlaydi.
1. `driver/setup_virtual_display.ps1` skriptini ishga tushiring:
   ```powershell
   powershell -ExecutionPolicy Bypass -File driver\setup_virtual_display.ps1
   ```
2. Ochilgan papkadagi `VirtualDisplayDriver.inf` fayliga sichqonchaning o'ng tugmasini bosing va **"Install" (O'rnatish)** ni bosing.
3. Klaviaturangizda **`Win + P`** tugmalarini birgalikda bosing.
4. Chiqqan menyudan **"Kengaytirish" (Extend / Расширить)** variantini tanlang.
5. Endi Windows Sozlamalarida (Settings -> Display) **Display 1** va **Display 2** ko'rinadi!

---

### 2-usul: Ixtiyoriy Dastur Oynasini Telefonga Uzatish (Drayversiz!)
Agar hech qanday drayver o'rnatishni istamasangiz ham PhoneDisplay Pro dasturidan to'liq foydalana olasiz:
1. Kompyuter boshqaruv panelida (`http://localhost:3000/host`) **"Ekran Uzatishni Boshlash" (Share Screen)** tugmasini bosing.
2. Brauzer sizdan nimani uzatishni so'raganda, **"Oyna" (Window)** bo'limiga o'ting.
3. O'zingiz xohlagan dasturni (masalan: **VS Code, Telegram, Chrome, YouTube, Spotify**) tanlang.
4. Telefoningizda faqat o'sha dastur to'liq ekranda paydo bo'ladi va siz telefoningizdan turib uni boshqarishingiz mumkin bo'ladi!

---

### 3-usul: HDMI / DisplayPort "Dummy Plug" (Apparat usuli)
- AliExpress yoki mahalliy do'konlarda 1-2 dollarga sotiladigan kichik HDMI uzatgich (Dummy Plug).
- Uni kompyuterning bo'sh HDMI portiga tiqsangiz, Windows uni haqiqiy 4K/1080p ikkinchi monitor deb taniydi.

---

## 3. Ekranlarni Tartibga Solish (Windows Sozlamalari)
1. Ish stolida bo'sh joyga o'ng tugmani bosing -> **Ekran sozlamalari (Display settings)**.
2. Ekranda **1** va **2** raqamli to'rtburchaklar ko'rinadi.
3. 2-ekranni (telefoningizni) stolingizda qayerda turganiga qarab 1-ekranning o'ngiga, chapiga yoki pastiga surib qo'ying.
4. "Apply" (Qo'llash) ni bosing.
