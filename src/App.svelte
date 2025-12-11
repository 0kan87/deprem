<script>
  import { onMount, onDestroy } from 'svelte';
  import { io } from 'socket.io-client';
  import EarthquakeMap from './components/EarthquakeMap.svelte';
  import EarthquakeList from './components/EarthquakeList.svelte';
  import LastEarthquake from './components/LastEarthquake.svelte';
  import Header from './components/Header.svelte';

  let earthquakes = [];
  let lastEarthquake = null;
  let loading = true;
  let error = null;
  let notificationPermission = 'default';
  let intervalId;
  let lastEarthquakeId = null;
  let darkMode = true;
  let socket = null;
  let connected = false;
  let isNewEarthquake = false;
  let mapComponent;
  let focusEarthquake = null;

  // API URL'leri
  const API_URL = 'https://api.orhanaydogdu.com.tr/deprem/kandilli/live';
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
  const IS_VERCEL = import.meta.env.PROD && window.location.hostname.includes('vercel.app');

  // Deprem animasyonu - şiddetine göre efekt
  function triggerEarthquakeEffect(earthquake, focusMap = true) {
    if (!earthquake) return;
    
    isNewEarthquake = true;
    
    // Haritayı depreme odakla
    if (focusMap) {
      focusEarthquake = earthquake;
    }
    
    // Şiddetine göre efekt seviyesi belirleme
    const magnitude = earthquake.magnitude;
    let intensity = 'low'; // < 3.0
    if (magnitude >= 5.0) intensity = 'extreme';
    else if (magnitude >= 4.0) intensity = 'high';
    else if (magnitude >= 3.0) intensity = 'medium';
    
    // Alarm overlay
    const overlay = document.createElement('div');
    overlay.className = `earthquake-alarm-overlay intensity-${intensity}`;
    document.body.appendChild(overlay);
    
    // Sayfa sallama efekti - şiddetine göre
    document.body.classList.add('page-shake', `shake-${intensity}`);
    
    // Kenar efekti
    const border = document.createElement('div');
    border.className = `earthquake-border intensity-${intensity}`;
    document.body.appendChild(border);

    // Büyüklüğe göre efekt süresi
    let duration = 1000;
    if (magnitude >= 5.0) duration = 3000;
    else if (magnitude >= 4.0) duration = 2500;
    else if (magnitude >= 3.0) duration = 1800;
    else if (magnitude >= 2.0) duration = 1200;
    
    setTimeout(() => {
      document.body.classList.remove('page-shake', 'shake-low', 'shake-medium', 'shake-high', 'shake-extreme');
      overlay.remove();
      border.remove();
      isNewEarthquake = false;
    }, duration);

    // Büyük depremler için ekstra efekt (4.0+)
    if (magnitude >= 4.0) {
      document.body.classList.add('big-earthquake');
      
      // Flash sayısı şiddete göre
      const flashCount = magnitude >= 5.0 ? 5 : 3;
      for (let i = 0; i < flashCount; i++) {
        setTimeout(() => {
          const flash = document.createElement('div');
          flash.className = `earthquake-flash-intense intensity-${intensity}`;
          document.body.appendChild(flash);
          setTimeout(() => flash.remove(), 200);
        }, i * 250);
      }
      
      setTimeout(() => {
        document.body.classList.remove('big-earthquake');
      }, duration);
    }
  }

  // Yeni deprem animasyonu (eski fonksiyon uyumluluğu için)
  function triggerNewEarthquakeEffect(earthquake) {
    triggerEarthquakeEffect(earthquake, true);
  }

  // Widget'tan tıklama ile animasyon tetikleme
  function handleEarthquakeAnimation(event) {
    const earthquake = event.detail;
    if (earthquake) {
      triggerEarthquakeEffect(earthquake, true);
    }
  }

  // WebSocket bağlantısı kur
  function connectSocket() {
    try {
      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket bağlandı');
        connected = true;
      });

      socket.on('disconnect', () => {
        console.log('❌ WebSocket bağlantısı kesildi');
        connected = false;
      });

      socket.on('earthquakes', (data) => {
        if (data && data.length > 0) {
          processEarthquakes(data);
        }
      });

      socket.on('newEarthquake', (earthquake) => {
        console.log('🚨 Yeni deprem:', earthquake);
        
        // Görsel efekt
        triggerNewEarthquakeEffect(earthquake);
        
        // Bildirim
        sendNotification(earthquake);
        
        // Listeyi güncelle
        earthquakes = [earthquake, ...earthquakes.filter(e => e.id !== earthquake.id)].slice(0, 50);
        lastEarthquake = earthquake;
        lastEarthquakeId = earthquake.id;
      });

      // Diğer kullanıcılardan gelen deprem bildirimleri
      socket.on('userEarthquakeReport', (report) => {
        console.log('📍 Kullanıcı bildirimi alındı:', report);
        
        // Bildirim gönder (başkasının bildirimi)
        sendUserReportNotification(report, false);
        
        // Haritada göster
        focusEarthquake = {
          latitude: report.latitude,
          longitude: report.longitude,
          magnitude: 0,
          location: report.locationName,
          isUserReport: true
        };
        
        // Görsel efekt
        triggerUserReportEffect();
      });

      socket.on('connect_error', () => {
        console.log('WebSocket bağlantı hatası, fallback moduna geçiliyor');
        connected = false;
      });
    } catch (err) {
      console.log('WebSocket başlatılamadı:', err);
    }
  }

  function processEarthquakes(data) {
    const previousLastId = lastEarthquakeId;
    earthquakes = data;
    
    if (earthquakes.length > 0) {
      const newLastEarthquake = earthquakes[0];
      
      // Yeni deprem kontrolü
      if (previousLastId && previousLastId !== newLastEarthquake.id) {
        triggerNewEarthquakeEffect(newLastEarthquake);
        if (!connected) {
          sendNotification(newLastEarthquake);
        }
      }
      
      lastEarthquakeId = newLastEarthquake.id;
      lastEarthquake = newLastEarthquake;
    }
    
    loading = false;
    error = null;
  }

  async function fetchEarthquakes() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('API yanıt vermedi');
      
      const data = await response.json();
      
      if (data.status && data.result) {
        const processedData = data.result.slice(0, 50).map(eq => ({
          id: eq.earthquake_id,
          date: eq.date || formatDate(eq.date_time),
          time: eq.time || formatTime(eq.date_time),
          dateTime: eq.date_time,
          latitude: parseFloat(eq.geojson?.coordinates?.[1] || eq.lat),
          longitude: parseFloat(eq.geojson?.coordinates?.[0] || eq.lng),
          depth: parseFloat(eq.depth),
          magnitude: parseFloat(eq.mag),
          location: eq.title || eq.location_properties?.epiCenter?.name || 'Bilinmeyen Konum',
          city: eq.location_properties?.epiCenter?.name || '',
          district: eq.location_properties?.closestCity?.name || ''
        }));

        processEarthquakes(processedData);
      }
    } catch (err) {
      console.error('Deprem verileri alınamadı:', err);
      if (earthquakes.length === 0) {
        error = 'Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.';
      }
      loading = false;
    }
  }

  function formatDate(dateTime) {
    if (!dateTime) return new Date().toLocaleDateString('tr-TR');
    const date = new Date(dateTime);
    return date.toLocaleDateString('tr-TR');
  }

  function formatTime(dateTime) {
    if (!dateTime) return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const date = new Date(dateTime);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  async function requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      notificationPermission = permission;
      
      if (permission === 'granted') {
        new Notification('Deprem Takip', {
          body: 'Bildirimler aktif! Yeni depremlerden anında haberdar olacaksınız.',
          icon: '/icon/android-icon-192x192.png'
        });
      }
    }
  }

  function sendNotification(earthquake) {
    if (notificationPermission === 'granted' && earthquake.magnitude >= 2.5) {
      const notification = new Notification(`🚨 Deprem: ${earthquake.magnitude.toFixed(1)}`, {
        body: `📍 ${earthquake.location}\n⏰ ${earthquake.date} ${earthquake.time}\n📏 Derinlik: ${earthquake.depth} km`,
        icon: '/icon/android-icon-192x192.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: earthquake.id,
        requireInteraction: earthquake.magnitude >= 4.0,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Ses çal
      if (earthquake.magnitude >= 3.5) {
        playAlertSound();
      }
    }
  }

  function playAlertSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 500);
    } catch (e) {
      console.log('Ses çalınamadı');
    }
  }

  function getMagnitudeColor(mag) {
    if (mag >= 6) return '#dc2626';
    if (mag >= 5) return '#ea580c';
    if (mag >= 4) return '#f59e0b';
    if (mag >= 3) return '#eab308';
    if (mag >= 2) return '#84cc16';
    return '#22c55e';
  }

  function toggleTheme() {
    darkMode = !darkMode;
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }

  onMount(() => {
    // Tema kontrolü
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      darkMode = savedTheme === 'dark';
    } else {
      darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');

    // WebSocket bağlantısı (Vercel'de WebSocket desteklenmediği için devre dışı)
    if (!IS_VERCEL) {
      connectSocket();
    }

    // İlk yükleme
    fetchEarthquakes();
    
    // Vercel'de veya WebSocket çalışmazsa her 15 saniyede bir güncelle
    intervalId = setInterval(() => {
      if (IS_VERCEL || !connected) {
        fetchEarthquakes();
      }
    }, 15000);

    // Bildirim izni kontrolü
    if ('Notification' in window) {
      notificationPermission = Notification.permission;
    }

    // PWA Service Worker kaydı
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('Service Worker kaydı başarısız:', err);
      });
    }
  });

  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    if (socket) {
      socket.disconnect();
    }
  });

  let selectedEarthquake = null;

  function handleEarthquakeSelect(event) {
    selectedEarthquake = event.detail;
    focusEarthquake = event.detail;
  }

  // Deprem bildirimi işle
  function handleReportEarthquake(event) {
    const reportData = event.detail;
    console.log('🚨 Deprem bildirimi alındı:', reportData);
    
    // Yer adı veya koordinat
    const locationText = reportData.locationName || `${reportData.latitude.toFixed(4)}°, ${reportData.longitude.toFixed(4)}°`;
    const timeText = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    
    // Kullanıcı bildirimi oluştur
    const userReport = {
      id: `report-${Date.now()}`,
      type: 'user-report',
      latitude: reportData.latitude,
      longitude: reportData.longitude,
      accuracy: reportData.accuracy,
      locationName: locationText,
      timestamp: reportData.timestamp,
      time: timeText
    };

    // 1. Butona basan kişiye bildirim gönder
    sendUserReportNotification(userReport, true);
    
    // 2. WebSocket üzerinden diğer kullanıcılara bildir
    if (socket && connected) {
      socket.emit('earthquakeReport', userReport);
    }

    // 3. Haritada kullanıcının konumunu göster
    focusEarthquake = {
      latitude: reportData.latitude,
      longitude: reportData.longitude,
      magnitude: 0,
      location: locationText,
      isUserReport: true
    };

    // 4. Sayfa efekti (hafif mor titreşim)
    triggerUserReportEffect();
  }

  // Kullanıcı bildirimi için bildirim gönder
  function sendUserReportNotification(report, isSelf = false) {
    // Tarayıcı bildirimi
    if (notificationPermission === 'granted') {
      const title = isSelf 
        ? '✅ Deprem Bildirimi Gönderildi!' 
        : '🚨 Yeni Deprem Bildirimi!';
      
      const body = isSelf
        ? `📍 ${report.locationName}\n⏰ ${report.time}\n🎯 Doğruluk: ±${Math.round(report.accuracy)}m`
        : `📍 ${report.locationName}\n⏰ ${report.time}\nBir kullanıcı bu bölgede deprem hissettiğini bildirdi.`;

      try {
        const notification = new Notification(title, {
          body: body,
          icon: '/icon/android-icon-192x192.png',
          tag: isSelf ? 'earthquake-report-self' : `earthquake-report-${report.id}`,
          vibrate: isSelf ? [100, 50, 100] : [200, 100, 200],
          requireInteraction: !isSelf
        });

        notification.onclick = () => {
          window.focus();
          // Haritada bildirilen konuma git
          focusEarthquake = {
            latitude: report.latitude,
            longitude: report.longitude,
            magnitude: 0,
            location: report.locationName,
            isUserReport: true
          };
          notification.close();
        };
      } catch (e) {
        console.log('Bildirim gönderilemedi:', e);
      }
    }

    // Ses çal (sadece başkasının bildirimi için)
    if (!isSelf) {
      playReportSound();
    }
  }

  // Kullanıcı bildirimi için ses
  function playReportSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Farklı bir ses tonu (mor tema için)
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.2;
      
      oscillator.start();
      setTimeout(() => {
        oscillator.frequency.value = 800;
      }, 150);
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 300);
    } catch (e) {
      // Ses çalınamadı
    }
  }

  // Kullanıcı bildirimi için görsel efekt
  function triggerUserReportEffect() {
    const overlay = document.createElement('div');
    overlay.className = 'user-report-overlay';
    document.body.appendChild(overlay);
    
    setTimeout(() => {
      overlay.remove();
    }, 1000);
  }
</script>

<main class:dark={darkMode}>
  <Header 
    {notificationPermission} 
    {darkMode}
    {connected}
    on:requestPermission={requestNotificationPermission}
    on:toggleTheme={toggleTheme}
  />

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Deprem verileri yükleniyor...</p>
    </div>
  {:else if error}
    <div class="error">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{error}</p>
      <button on:click={fetchEarthquakes}>Tekrar Dene</button>
    </div>
  {:else}
    <div class="content">
      <!-- Üst Widget Satırı -->
      <LastEarthquake 
        earthquake={lastEarthquake} 
        {earthquakes}
        {getMagnitudeColor} 
        {darkMode}
        {isNewEarthquake}
        on:select={handleEarthquakeSelect}
        on:animate={handleEarthquakeAnimation}
        on:reportEarthquake={handleReportEarthquake}
      />
      
      <!-- Ana İçerik: Harita ve Liste -->
      <div class="main-grid">
        <div class="map-container">
          <EarthquakeMap 
            bind:this={mapComponent}
            {earthquakes} 
            selectedEarthquake={focusEarthquake}
            {getMagnitudeColor}
            {darkMode}
            {lastEarthquake}
            {isNewEarthquake}
          />
        </div>
        
        <div class="list-container">
          <EarthquakeList 
            {earthquakes} 
            {getMagnitudeColor}
            {darkMode}
            on:select={handleEarthquakeSelect}
            on:animate={handleEarthquakeAnimation}
          />
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(:root) {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-card: #334155;
    --bg-hover: #475569;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --border-color: #475569;
    --accent: #3b82f6;
    --accent-hover: #2563eb;
    --success: #22c55e;
  }

  :global([data-theme="light"]) {
    --bg-primary: #f1f5f9;
    --bg-secondary: #e2e8f0;
    --bg-card: #ffffff;
    --bg-hover: #f1f5f9;
    --text-primary: #0f172a;
    --text-secondary: #64748b;
    --border-color: #cbd5e1;
    --accent: #2563eb;
    --accent-hover: #1d4ed8;
    --success: #16a34a;
  }

  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
    transition: background 0.3s, color 0.3s;
  }

  /* Sayfa sallama efekti - şiddetine göre */
  :global(body.page-shake.shake-low) {
    animation: shakeLow 0.4s cubic-bezier(.36,.07,.19,.97) 2;
  }

  :global(body.page-shake.shake-medium) {
    animation: shakeMedium 0.5s cubic-bezier(.36,.07,.19,.97) 3;
  }

  :global(body.page-shake.shake-high) {
    animation: shakeHigh 0.5s cubic-bezier(.36,.07,.19,.97) 4;
  }

  :global(body.page-shake.shake-extreme) {
    animation: shakeExtreme 0.6s cubic-bezier(.36,.07,.19,.97) 5;
  }

  /* Düşük şiddet (< 3.0) */
  @keyframes shakeLow {
    0%, 100% { transform: translateX(0) translateY(0); }
    25% { transform: translateX(-2px) translateY(1px); }
    50% { transform: translateX(2px) translateY(-1px); }
    75% { transform: translateX(-1px) translateY(1px); }
  }

  /* Orta şiddet (3.0 - 4.0) */
  @keyframes shakeMedium {
    0%, 100% { transform: translateX(0) translateY(0); }
    10% { transform: translateX(-4px) translateY(2px); }
    20% { transform: translateX(5px) translateY(-2px); }
    30% { transform: translateX(-6px) translateY(3px); }
    40% { transform: translateX(6px) translateY(-3px); }
    50% { transform: translateX(-5px) translateY(2px); }
    60% { transform: translateX(5px) translateY(-2px); }
    70% { transform: translateX(-4px) translateY(2px); }
    80% { transform: translateX(3px) translateY(-1px); }
    90% { transform: translateX(-2px) translateY(1px); }
  }

  /* Yüksek şiddet (4.0 - 5.0) */
  @keyframes shakeHigh {
    0%, 100% { transform: translateX(0) translateY(0); }
    10% { transform: translateX(-8px) translateY(4px); }
    20% { transform: translateX(10px) translateY(-4px); }
    30% { transform: translateX(-12px) translateY(6px); }
    40% { transform: translateX(12px) translateY(-6px); }
    50% { transform: translateX(-10px) translateY(5px); }
    60% { transform: translateX(10px) translateY(-5px); }
    70% { transform: translateX(-8px) translateY(4px); }
    80% { transform: translateX(6px) translateY(-3px); }
    90% { transform: translateX(-4px) translateY(2px); }
  }

  /* Aşırı şiddet (5.0+) */
  @keyframes shakeExtreme {
    0%, 100% { transform: translateX(0) translateY(0); }
    5% { transform: translateX(-12px) translateY(6px) rotate(-1deg); }
    10% { transform: translateX(14px) translateY(-6px) rotate(1deg); }
    15% { transform: translateX(-16px) translateY(8px) rotate(-1.5deg); }
    20% { transform: translateX(16px) translateY(-8px) rotate(1.5deg); }
    25% { transform: translateX(-14px) translateY(7px) rotate(-1deg); }
    30% { transform: translateX(14px) translateY(-7px) rotate(1deg); }
    35% { transform: translateX(-12px) translateY(6px) rotate(-0.5deg); }
    40% { transform: translateX(12px) translateY(-6px) rotate(0.5deg); }
    45% { transform: translateX(-10px) translateY(5px); }
    50% { transform: translateX(10px) translateY(-5px); }
    55% { transform: translateX(-8px) translateY(4px); }
    60% { transform: translateX(8px) translateY(-4px); }
    65% { transform: translateX(-6px) translateY(3px); }
    70% { transform: translateX(6px) translateY(-3px); }
    75% { transform: translateX(-4px) translateY(2px); }
    80% { transform: translateX(4px) translateY(-2px); }
    85% { transform: translateX(-3px) translateY(1px); }
    90% { transform: translateX(2px) translateY(-1px); }
    95% { transform: translateX(-1px) translateY(1px); }
  }

  /* Büyük deprem efekti */
  :global(body.big-earthquake) {
    animation: bigShake 1.2s cubic-bezier(.36,.07,.19,.97) both;
  }

  @keyframes bigShake {
    0%, 100% { transform: translateX(0) translateY(0); }
    5% { transform: translateX(-10px) translateY(5px); }
    10% { transform: translateX(10px) translateY(-5px); }
    15% { transform: translateX(-12px) translateY(8px); }
    20% { transform: translateX(12px) translateY(-8px); }
    25% { transform: translateX(-10px) translateY(6px); }
    30% { transform: translateX(10px) translateY(-6px); }
    35% { transform: translateX(-8px) translateY(5px); }
    40% { transform: translateX(8px) translateY(-5px); }
    45% { transform: translateX(-6px) translateY(4px); }
    50% { transform: translateX(6px) translateY(-4px); }
    55% { transform: translateX(-5px) translateY(3px); }
    60% { transform: translateX(5px) translateY(-3px); }
    65% { transform: translateX(-4px) translateY(2px); }
    70% { transform: translateX(4px) translateY(-2px); }
    75% { transform: translateX(-3px) translateY(2px); }
    80% { transform: translateX(3px) translateY(-2px); }
    85% { transform: translateX(-2px) translateY(1px); }
    90% { transform: translateX(2px) translateY(-1px); }
    95% { transform: translateX(-1px) translateY(1px); }
  }

  /* Alarm overlay efekti - şiddetine göre */
  :global(.earthquake-alarm-overlay) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9998;
  }

  :global(.earthquake-alarm-overlay.intensity-low) {
    background: radial-gradient(circle at center, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0.15) 100%);
    animation: alarmPulseLow 0.4s ease-in-out 2;
  }

  :global(.earthquake-alarm-overlay.intensity-medium) {
    background: radial-gradient(circle at center, rgba(234, 179, 8, 0.08) 0%, rgba(234, 179, 8, 0.2) 100%);
    animation: alarmPulseMedium 0.35s ease-in-out 3;
  }

  :global(.earthquake-alarm-overlay.intensity-high) {
    background: radial-gradient(circle at center, rgba(249, 115, 22, 0.1) 0%, rgba(249, 115, 22, 0.25) 100%);
    animation: alarmPulseHigh 0.3s ease-in-out 4;
  }

  :global(.earthquake-alarm-overlay.intensity-extreme) {
    background: radial-gradient(circle at center, rgba(220, 38, 38, 0.15) 0%, rgba(220, 38, 38, 0.35) 100%);
    animation: alarmPulseExtreme 0.25s ease-in-out 6;
  }

  @keyframes alarmPulseLow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.7; }
  }

  @keyframes alarmPulseMedium {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.85; }
  }

  @keyframes alarmPulseHigh {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  @keyframes alarmPulseExtreme {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  /* Kenar efekti - şiddetine göre */
  :global(.earthquake-border) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9999;
    border: 4px solid transparent;
  }

  :global(.earthquake-border.intensity-low) {
    animation: borderFlashLow 0.4s ease-in-out 2;
    box-shadow: inset 0 0 40px rgba(34, 197, 94, 0.3);
  }

  :global(.earthquake-border.intensity-medium) {
    border-width: 5px;
    animation: borderFlashMedium 0.35s ease-in-out 3;
    box-shadow: inset 0 0 60px rgba(234, 179, 8, 0.4);
  }

  :global(.earthquake-border.intensity-high) {
    border-width: 6px;
    animation: borderFlashHigh 0.3s ease-in-out 4;
    box-shadow: inset 0 0 80px rgba(249, 115, 22, 0.5);
  }

  :global(.earthquake-border.intensity-extreme) {
    border-width: 8px;
    animation: borderFlashExtreme 0.25s ease-in-out 6;
    box-shadow: inset 0 0 120px rgba(220, 38, 38, 0.6);
  }

  @keyframes borderFlashLow {
    0%, 100% { border-color: transparent; box-shadow: inset 0 0 20px rgba(34, 197, 94, 0.2); }
    50% { border-color: #22c55e; box-shadow: inset 0 0 50px rgba(34, 197, 94, 0.4); }
  }

  @keyframes borderFlashMedium {
    0%, 100% { border-color: transparent; box-shadow: inset 0 0 30px rgba(234, 179, 8, 0.25); }
    50% { border-color: #eab308; box-shadow: inset 0 0 70px rgba(234, 179, 8, 0.5); }
  }

  @keyframes borderFlashHigh {
    0%, 100% { border-color: transparent; box-shadow: inset 0 0 40px rgba(249, 115, 22, 0.3); }
    50% { border-color: #f97316; box-shadow: inset 0 0 100px rgba(249, 115, 22, 0.6); }
  }

  @keyframes borderFlashExtreme {
    0%, 100% { border-color: transparent; box-shadow: inset 0 0 60px rgba(220, 38, 38, 0.4); }
    50% { border-color: #dc2626; box-shadow: inset 0 0 150px rgba(220, 38, 38, 0.8); }
  }

  /* Yoğun flash efekti - şiddetine göre */
  :global(.earthquake-flash-intense) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 10000;
    animation: flashIntense 0.2s ease-out forwards;
  }

  :global(.earthquake-flash-intense.intensity-high) {
    background: rgba(249, 115, 22, 0.3);
  }

  :global(.earthquake-flash-intense.intensity-extreme) {
    background: rgba(220, 38, 38, 0.4);
  }

  @keyframes flashIntense {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }

  main {
    min-height: 100vh;
    background: var(--bg-primary);
    transition: background 0.3s;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: calc(100vh - 60px);
    gap: 1rem;
  }

  .spinner {
    width: 44px;
    height: 44px;
    border: 3px solid var(--border-color);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: calc(100vh - 60px);
    gap: 1rem;
    text-align: center;
    padding: 2rem;
  }

  .error-icon {
    width: 44px;
    height: 44px;
    color: #f59e0b;
  }

  .error button {
    padding: 0.625rem 1.25rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.2s;
  }

  .error button:hover {
    background: var(--accent-hover);
  }

  .content {
    padding: 0.75rem;
    max-width: 1800px;
    margin: 0 auto;
  }

  .main-grid {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .map-container {
    background: var(--bg-card);
    border-radius: 12px;
    overflow: hidden;
    min-height: 480px;
    border: 1px solid var(--border-color);
  }

  .list-container {
    background: var(--bg-card);
    border-radius: 12px;
    overflow: hidden;
    max-height: calc(100vh - 220px);
    border: 1px solid var(--border-color);
  }

  @media (max-width: 1024px) {
    .main-grid {
      grid-template-columns: 1fr;
    }

    .list-container {
      max-height: 350px;
    }
  }

  @media (max-width: 768px) {
    .content {
      padding: 0.5rem;
    }

    .map-container {
      min-height: 320px;
    }
  }

  :global(::-webkit-scrollbar) {
    width: 6px;
  }

  :global(::-webkit-scrollbar-track) {
    background: var(--bg-secondary);
  }

  :global(::-webkit-scrollbar-thumb) {
    background: var(--border-color);
    border-radius: 3px;
  }

  :global(::-webkit-scrollbar-thumb:hover) {
    background: var(--text-secondary);
  }

  /* Kullanıcı bildirimi overlay efekti */
  :global(.user-report-overlay) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9998;
    background: radial-gradient(circle at center, rgba(168, 85, 247, 0.1) 0%, rgba(168, 85, 247, 0.2) 100%);
    animation: userReportPulse 0.5s ease-in-out 2;
  }

  @keyframes userReportPulse {
    0%, 100% { opacity: 0; }
    50% { opacity: 1; }
  }
</style>
