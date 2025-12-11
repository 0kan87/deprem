# 🌍 Deprem Takip Uygulaması

Kandilli Rasathanesi verilerini kullanarak Türkiye'deki depremleri anlık olarak takip eden PWA uygulaması.

## ✨ Özellikler

- 📡 **Anlık Bildirimler**: WebSocket ile gerçek zamanlı deprem bildirimleri
- 🗺️ **Interaktif Harita**: Leaflet ile deprem konumlarını görüntüleme
- 🌓 **Koyu/Açık Tema**: Göz yormayan tema seçenekleri
- 📱 **PWA Desteği**: Mobil cihazlara kurulabilir
- 🔔 **Push Bildirimleri**: Yeni depremlerden anında haberdar olun
- 🔊 **Sesli Uyarı**: Büyük depremler için sesli bildirim

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- npm veya yarn

### Adımlar

1. **Bağımlılıkları yükleyin:**
```bash
# Frontend
npm install

# Backend
cd server
npm install
```

2. **Uygulamayı başlatın:**

**Windows:**
```bash
start.bat
```

**Manuel:**
```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend
npm run dev
```

3. **Tarayıcıda açın:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 📁 Proje Yapısı

```
deprem/
├── src/
│   ├── components/
│   │   ├── Header.svelte
│   │   ├── EarthquakeMap.svelte
│   │   ├── EarthquakeList.svelte
│   │   └── LastEarthquake.svelte
│   ├── App.svelte
│   ├── app.css
│   └── main.js
├── server/
│   ├── server.js
│   └── package.json
├── public/
│   ├── favicon.svg
│   └── sw.js
├── package.json
└── vite.config.js
```

## 🔧 Yapılandırma

### API
Uygulama varsayılan olarak [Kandilli Rasathanesi API](https://api.orhanaydogdu.com.tr/deprem/kandilli/live) kullanır.

### Bildirim Ayarları
- Büyüklük eşiği: 2.5+ (bildirim)
- Sesli uyarı: 4.0+ (büyük depremler)

## 📱 PWA Kurulumu

1. Uygulamayı tarayıcıda açın
2. Adres çubuğundaki "Yükle" butonuna tıklayın
3. Bildirimlere izin verin

## 🛠️ Teknolojiler

- **Frontend**: Svelte 4, Vite
- **Backend**: Node.js, Express, Socket.io
- **Harita**: Leaflet
- **PWA**: Vite PWA Plugin

## 📄 Lisans

MIT License
