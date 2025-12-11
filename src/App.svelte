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
  const SOCKET_URL = import.meta.env.PROD 
    ? 'https://deprem-ten.vercel.app' 
    : (import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001');

  // Yeni deprem animasyonu
  function triggerNewEarthquakeEffect(earthquake) {
    isNewEarthquake = true;
    
    // Haritayı yeni depreme odakla
    focusEarthquake = earthquake;
    
    // Alarm overlay
    const overlay = document.createElement('div');
    overlay.className = 'earthquake-alarm-overlay';
    document.body.appendChild(overlay);
    
    // Sayfa sallama efekti
    document.body.classList.add('page-shake');
    
    // Kırmızı kenar efekti
    const border = document.createElement('div');
    border.className = 'earthquake-border';
    document.body.appendChild(border);

    // Büyüklüğe göre efekt süresi (3 tekrar = 1.5s minimum)
    const duration = earthquake.magnitude >= 4.0 ? 2500 : 1500;
    
    setTimeout(() => {
      document.body.classList.remove('page-shake');
      overlay.remove();
      border.remove();
      isNewEarthquake = false;
    }, duration);

    // Büyük depremler için ekstra efekt
    if (earthquake.magnitude >= 4.0) {
      document.body.classList.add('big-earthquake');
      
      // Ekstra flash
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const flash = document.createElement('div');
          flash.className = 'earthquake-flash-intense';
          document.body.appendChild(flash);
          setTimeout(() => flash.remove(), 200);
        }, i * 300);
      }
      
      setTimeout(() => {
        document.body.classList.remove('big-earthquake');
      }, 2500);
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

    // WebSocket bağlantısı
    connectSocket();

    // İlk yükleme
    fetchEarthquakes();
    
    // Fallback: WebSocket çalışmazsa her 15 saniyede bir güncelle
    intervalId = setInterval(() => {
      if (!connected) {
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

  /* Sayfa sallama efekti - 3 kez tekrar */
  :global(body.page-shake) {
    animation: pageShake 0.5s cubic-bezier(.36,.07,.19,.97) 3;
  }

  @keyframes pageShake {
    0%, 100% { transform: translateX(0) translateY(0); }
    10% { transform: translateX(-6px) translateY(3px); }
    20% { transform: translateX(8px) translateY(-3px); }
    30% { transform: translateX(-10px) translateY(5px); }
    40% { transform: translateX(10px) translateY(-5px); }
    50% { transform: translateX(-8px) translateY(4px); }
    60% { transform: translateX(8px) translateY(-4px); }
    70% { transform: translateX(-6px) translateY(3px); }
    80% { transform: translateX(6px) translateY(-3px); }
    90% { transform: translateX(-3px) translateY(2px); }
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

  /* Alarm overlay efekti */
  :global(.earthquake-alarm-overlay) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, rgba(220, 38, 38, 0.1) 0%, rgba(220, 38, 38, 0.25) 100%);
    pointer-events: none;
    z-index: 9998;
    animation: alarmPulse 0.3s ease-in-out 4;
  }

  @keyframes alarmPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  /* Kırmızı kenar efekti */
  :global(.earthquake-border) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9999;
    border: 6px solid transparent;
    animation: borderFlash 0.25s ease-in-out 5;
    box-shadow: inset 0 0 100px rgba(220, 38, 38, 0.5);
  }

  @keyframes borderFlash {
    0%, 100% { 
      border-color: transparent;
      box-shadow: inset 0 0 50px rgba(220, 38, 38, 0.3);
    }
    50% { 
      border-color: #dc2626;
      box-shadow: inset 0 0 120px rgba(220, 38, 38, 0.7);
    }
  }

  /* Yoğun flash efekti */
  :global(.earthquake-flash-intense) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(220, 38, 38, 0.35);
    pointer-events: none;
    z-index: 10000;
    animation: flashIntense 0.2s ease-out forwards;
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
</style>
