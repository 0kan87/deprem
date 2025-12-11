# 🚀 Vercel'e Deploy Etme Rehberi

## Ön Hazırlık

1. **GitHub Hesabı**: Vercel için GitHub hesabınız olmalı
2. **Vercel Hesabı**: [vercel.com](https://vercel.com) üzerinden ücretsiz hesap oluşturun
3. **Git**: Projenizi Git'e yükleyin

## Adım 1: Projeyi GitHub'a Yükleyin

```bash
# Git başlat
git init

# Dosyaları ekle
git add .

# Commit
git commit -m "Initial commit - Deprem Takip Uygulaması"

# GitHub'a push (önce GitHub'da repo oluşturun)
git remote add origin https://github.com/KULLANICI_ADINIZ/deprem-takip.git
git branch -M main
git push -u origin main
```

## Adım 2: Vercel'e Deploy

### Yöntem 1: Vercel Dashboard (Önerilen)

1. [vercel.com](https://vercel.com) adresine gidin
2. "Add New Project" butonuna tıklayın
3. GitHub repository'nizi seçin
4. Proje ayarları:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. "Deploy" butonuna tıklayın

### Yöntem 2: Vercel CLI

```bash
# Vercel CLI'yi yükleyin
npm i -g vercel

# Projeyi deploy edin
vercel

# Production'a deploy
vercel --prod
```

## Adım 3: Environment Variables (Opsiyonel)

Vercel Dashboard'da:
1. Projenize gidin
2. Settings > Environment Variables
3. Gerekli değişkenleri ekleyin

## Önemli Notlar

### WebSocket Desteği

Vercel'de WebSocket desteği sınırlıdır. Alternatif olarak:

1. **Backend'i ayrı deploy edin**: 
   - Railway.app
   - Render.com
   - Heroku
   
2. **Frontend'de SOCKET_URL'yi güncelleyin**:
   ```javascript
   const SOCKET_URL = process.env.VITE_SOCKET_URL || 'http://localhost:3001';
   ```

3. **Environment Variable ekleyin**:
   - Vercel Dashboard > Settings > Environment Variables
   - `VITE_SOCKET_URL` = `https://your-backend-url.com`

### Backend Deploy (Railway.app örneği)

1. [railway.app](https://railway.app) hesabı oluşturun
2. "New Project" > "Deploy from GitHub repo"
3. `server` klasörünü seçin
4. Environment Variables:
   - `PORT` = `3001`
5. Deploy edin ve URL'yi alın
6. Bu URL'yi Vercel'deki `VITE_SOCKET_URL` olarak ekleyin

## Build Komutları

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Sorun Giderme

### Build Hatası
- `node_modules` ve `dist` klasörlerini silin
- `npm install` ve `npm run build` komutlarını tekrar çalıştırın

### WebSocket Bağlantı Hatası
- Backend URL'sini kontrol edin
- CORS ayarlarını kontrol edin
- Fallback modu otomatik devreye girecektir

### PWA Çalışmıyor
- HTTPS gereklidir (Vercel otomatik sağlar)
- Service Worker kayıt kontrolü yapın

## Performans İpuçları

1. **CDN**: Vercel otomatik CDN sağlar
2. **Caching**: Static dosyalar otomatik cache'lenir
3. **Compression**: Gzip/Brotli otomatik aktif

## Güncelleme

```bash
# Değişiklikleri commit edin
git add .
git commit -m "Update"
git push

# Vercel otomatik deploy edecektir
```

## Özel Domain

1. Vercel Dashboard > Settings > Domains
2. Domain ekleyin
3. DNS ayarlarını yapın

## Destek

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- GitHub Issues: Projenizin issues sayfası
