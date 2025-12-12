<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  
  export let earthquake = null;
  export let earthquakes = [];
  export let getMagnitudeColor;
  export let darkMode = true;
  export let isNewEarthquake = false;

  const dispatch = createEventDispatcher();

  let locationPermission = 'prompt'; // 'granted', 'denied', 'prompt'
  let userLocation = null;
  let isReporting = false;
  let reportSuccess = false;
  let reportCooldown = false;
  
  // Dinamik saat
  let currentTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  let clockInterval;

  function handleEarthquakeClick(eq) {
    if (eq) {
      dispatch('select', eq);
      dispatch('animate', eq);
    }
  }

  // Konum izni kontrolü ve saat başlatma
  onMount(async () => {
    // Dinamik saat başlat
    clockInterval = setInterval(() => {
      currentTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }, 1000);

    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        locationPermission = result.state;
        
        result.addEventListener('change', () => {
          locationPermission = result.state;
          // İzin verilirse konumu al
          if (result.state === 'granted' && !userLocation) {
            getCurrentLocation().catch(() => {});
          }
        });

        // Eğer izin verilmişse konumu al
        if (result.state === 'granted') {
          getCurrentLocation().catch(() => {});
        }
      } catch (e) {
        // permissions API desteklenmiyorsa prompt olarak kabul et
        locationPermission = 'prompt';
      }
    }
  });

  onDestroy(() => {
    if (clockInterval) {
      clearInterval(clockInterval);
    }
  });

  // Mevcut konumu al
  function getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation desteklenmiyor'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            locationName: null
          };
          
          locationPermission = 'granted';
          
          // Yer adını al (arka planda)
          getLocationName(position.coords.latitude, position.coords.longitude)
            .then(name => {
              if (name) userLocation.locationName = name;
            })
            .catch(() => {});
          
          resolve(userLocation);
        },
        (error) => {
          // Hata kodlarına göre işle
          if (error.code === 1) { // PERMISSION_DENIED
            locationPermission = 'denied';
          }
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );
    });
  }

  // Koordinatlardan yer adı al (Reverse Geocoding)
  async function getLocationName(lat, lng) {
    try {
      // Nominatim OpenStreetMap API kullanıyoruz (ücretsiz)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1&accept-language=tr`,
        {
          headers: {
            'User-Agent': 'DepremTakip/1.0'
          }
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        // Öncelik sırasına göre yer adı oluştur
        const parts = [];
        
        if (addr.neighbourhood || addr.suburb || addr.quarter) {
          parts.push(addr.neighbourhood || addr.suburb || addr.quarter);
        }
        if (addr.town || addr.district || addr.county) {
          parts.push(addr.town || addr.district || addr.county);
        }
        if (addr.city || addr.province || addr.state) {
          parts.push(addr.city || addr.province || addr.state);
        }
        
        if (parts.length > 0) {
          return parts.join(', ');
        }
        
        // Fallback: display_name'in kısa versiyonu
        if (data.display_name) {
          return data.display_name.split(',').slice(0, 3).join(',').trim();
        }
      }
      
      return null;
    } catch (e) {
      return null;
    }
  }

  // Deprem bildir
  async function reportEarthquake() {
    if (reportCooldown || isReporting) return;

    // Konum izni reddedilmişse uyarı göster
    if (locationPermission === 'denied') {
      alert('Deprem bildirmek için konum izni gereklidir.\n\nTarayıcı ayarlarından bu site için konum iznini sıfırlayıp sayfayı yenileyin.');
      return;
    }

    isReporting = true;

    try {
      // Konum al (izin yoksa tarayıcı otomatik soracak)
      if (!userLocation) {
        try {
          await getCurrentLocation();
        } catch (error) {
          isReporting = false;
          
          if (error.code === 1) { // PERMISSION_DENIED
            locationPermission = 'denied';
            alert('Konum izni reddedildi.\n\nDeprem bildirmek için konum izni gereklidir. Tarayıcı ayarlarından izni etkinleştirip sayfayı yenileyin.');
          } else if (error.code === 2) { // POSITION_UNAVAILABLE
            alert('Konum bilgisi alınamadı. Lütfen GPS\'inizin açık olduğundan emin olun.');
          } else if (error.code === 3) { // TIMEOUT
            alert('Konum alınırken zaman aşımı oluştu. Lütfen tekrar deneyin.');
          } else {
            alert('Konum alınamadı. Lütfen tekrar deneyin.');
          }
          return;
        }
      }

      if (!userLocation) {
        isReporting = false;
        alert('Konumunuz alınamadı. Lütfen tekrar deneyin.');
        return;
      }

      // Eğer yer adı henüz alınmadıysa bekle
      if (!userLocation.locationName) {
        try {
          const name = await getLocationName(userLocation.latitude, userLocation.longitude);
          if (name) userLocation.locationName = name;
        } catch (e) {
          // Yer adı alınamazsa koordinatları kullan
        }
      }

      // Bildirimi gönder
      dispatch('reportEarthquake', {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        accuracy: userLocation.accuracy,
        locationName: userLocation.locationName || `${userLocation.latitude.toFixed(4)}°, ${userLocation.longitude.toFixed(4)}°`,
        timestamp: new Date().toISOString()
      });

      reportSuccess = true;
      reportCooldown = true;

      // 3 saniye sonra başarı mesajını kaldır
      setTimeout(() => {
        reportSuccess = false;
      }, 3000);

      // 30 saniye cooldown
      setTimeout(() => {
        reportCooldown = false;
      }, 30000);

    } catch (e) {
      alert('Bildirim gönderilemedi. Lütfen tekrar deneyin.');
    }

    isReporting = false;
  }

  // Bugünün en büyük depremi
  $: todaysBiggest = getTodaysBiggest(earthquakes);

  function getTodaysBiggest(list) {
    if (!list || list.length === 0) return null;
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatında
    const todaysEarthquakes = list.filter(eq => {
      const eqDateStr = eq.dateTime ? eq.dateTime.split(' ')[0] : ''; // YYYY-MM-DD kısmını al
      return eqDateStr === today;
    });

    if (todaysEarthquakes.length === 0) return null;
    
    return todaysEarthquakes.reduce((max, eq) => 
      eq.magnitude > max.magnitude ? eq : max
    , todaysEarthquakes[0]);
  }

  function formatTimeAgo(dateTime, date, time) {
    let earthquakeDate;
    
    if (dateTime) {
      earthquakeDate = new Date(dateTime);
    } else if (date && time) {
      earthquakeDate = new Date(`${date} ${time}`);
    } else {
      return '-';
    }

    if (isNaN(earthquakeDate.getTime())) return '-';

    const now = new Date();
    const diffMs = now - earthquakeDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dk`;
    if (diffHours < 24) return `${diffHours} sa`;
    return date || '-';
  }

  function getDisplayTime(eq) {
    if (!eq) return '-';
    if (eq.time && eq.time !== 'undefined') return eq.time;
    if (eq.dateTime) return new Date(eq.dateTime).toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
    return '-';
  }

  // Bugün kaç deprem oldu
  $: todaysCount = earthquakes.filter(eq => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatında
    const eqDateStr = eq.dateTime ? eq.dateTime.split(' ')[0] : ''; // YYYY-MM-DD kısmını al
    
    return eqDateStr === today;
  }).length;

  // Son 24 saatteki ortalama büyüklük
  $: avgMagnitude = earthquakes.length > 0 
    ? (earthquakes.slice(0, 20).reduce((sum, eq) => sum + eq.magnitude, 0) / Math.min(20, earthquakes.length)).toFixed(1)
    : '0.0';
</script>

<div class="widgets-row" class:shake={isNewEarthquake}>
  <!-- Widget 1: Son Deprem -->
  {#if earthquake}
    <button class="widget clickable" class:alert={isNewEarthquake} on:click={() => handleEarthquakeClick(earthquake)}>
      <div class="widget-header">
        <div class="widget-icon pulse">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <span class="widget-title">Son Deprem</span>
        <span class="widget-badge">{formatTimeAgo(earthquake.dateTime, earthquake.date, earthquake.time)}</span>
      </div>
      <div class="widget-content">
        <div class="mag-circle" style="--mag-color: {getMagnitudeColor(earthquake.magnitude)}">
          {earthquake.magnitude.toFixed(1)}
        </div>
        <div class="widget-details">
          <span class="location-text">{earthquake.location || 'Bilinmeyen'}</span>
          <span class="sub-text">{earthquake.depth} km • {getDisplayTime(earthquake)}</span>
        </div>
      </div>
    </button>
  {/if}

  <!-- Widget 2: Bugünün En Büyüğü -->
  <button class="widget" class:clickable={todaysBiggest} on:click={() => handleEarthquakeClick(todaysBiggest)} disabled={!todaysBiggest}>
    <div class="widget-header">
      <div class="widget-icon star">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
      </div>
      <span class="widget-title">En Büyük</span>
      <span class="widget-badge">Bugün</span>
    </div>
    <div class="widget-content">
      {#if todaysBiggest}
        <div class="mag-circle" style="--mag-color: {getMagnitudeColor(todaysBiggest.magnitude)}">
          {todaysBiggest.magnitude.toFixed(1)}
        </div>
        <div class="widget-details">
          <span class="location-text">{todaysBiggest.location}</span>
          <span class="sub-text">{todaysBiggest.depth} km • {getDisplayTime(todaysBiggest)}</span>
        </div>
      {:else}
        <div class="mag-circle empty">-</div>
        <div class="widget-details">
          <span class="location-text">Veri yok</span>
          <span class="sub-text">Bugün deprem kaydedilmedi</span>
        </div>
      {/if}
    </div>
  </button>

  <!-- Widget 3: Bugünkü Sayı + Saat -->
  <div class="widget stat-widget">
    <div class="widget-header">
      <div class="widget-icon chart">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
      </div>
      <span class="widget-title">Bugün</span>
      <span class="widget-badge clock-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        {currentTime}
      </span>
    </div>
    <div class="widget-content centered">
      <div class="big-stat">{todaysCount}</div>
      <span class="stat-label">deprem</span>
    </div>
  </div>

  <!-- Widget 4: Ortalama -->
  <div class="widget stat-widget">
    <div class="widget-header">
      <div class="widget-icon avg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 12h8M12 8v8"/>
        </svg>
      </div>
      <span class="widget-title">Ortalama</span>
    </div>
    <div class="widget-content centered">
      <div class="big-stat" style="color: {getMagnitudeColor(parseFloat(avgMagnitude))}">{avgMagnitude}</div>
      <span class="stat-label">büyüklük</span>
    </div>
  </div>

  <!-- Widget 5: Deprem Bildir -->
  <button 
    class="widget report-widget" 
    class:success={reportSuccess}
    class:disabled={locationPermission === 'denied'}
    on:click={reportEarthquake}
    disabled={isReporting || reportCooldown || locationPermission === 'denied'}
  >
    <div class="widget-header">
      <div class="widget-icon report" class:granted={locationPermission === 'granted'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <span class="widget-title">Deprem Bildir</span>
      {#if locationPermission === 'granted'}
        <span class="widget-badge location-active">
          <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
            <circle cx="12" cy="12" r="4"/>
          </svg>
          Konum Aktif
        </span>
      {/if}
    </div>
    <div class="widget-content report-content">
      {#if reportSuccess}
        <div class="report-success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>Bildirildi!</span>
        </div>
      {:else if locationPermission === 'denied'}
        <div class="report-denied">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
          <span class="report-text">Konum izni gerekli</span>
        </div>
      {:else if isReporting}
        <div class="report-loading">
          <div class="mini-spinner"></div>
          <span>Gönderiliyor...</span>
        </div>
      {:else if reportCooldown}
        <div class="report-cooldown">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Bekleyin...</span>
        </div>
      {:else}
        <div class="report-button-content">
          <div class="report-icon-large">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div class="report-text-container">
            <span class="report-main-text">Deprem Hissettim</span>
            <span class="report-sub-text">
              {#if locationPermission === 'granted'}
                Tıklayarak herkese bildirin
              {:else}
                Konum izni vererek bildirin
              {/if}
            </span>
          </div>
        </div>
      {/if}
    </div>
  </button>
</div>

<style>
  .widgets-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.75rem;
  }

  .widgets-row.shake {
    animation: rowShake 0.5s cubic-bezier(.36,.07,.19,.97) 3;
  }

  @keyframes rowShake {
    0%, 100% { transform: translateX(0); }
    15% { transform: translateX(-5px); }
    30% { transform: translateX(6px); }
    45% { transform: translateX(-6px); }
    60% { transform: translateX(5px); }
    75% { transform: translateX(-4px); }
    90% { transform: translateX(3px); }
  }

  .widget {
    background: var(--bg-card);
    border-radius: 12px;
    padding: 0.875rem;
    border: 1px solid var(--border-color);
    transition: all 0.2s ease;
    text-align: left;
    font-family: inherit;
    color: inherit;
    width: 100%;
  }

  button.widget {
    cursor: default;
  }

  button.widget.clickable {
    cursor: pointer;
  }

  button.widget.clickable:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  button.widget.clickable:active {
    transform: translateY(0);
  }

  button.widget:disabled {
    cursor: default;
    opacity: 0.7;
  }

  /* Report Widget Styles */
  .report-widget {
    cursor: pointer;
    border-color: rgba(168, 85, 247, 0.3);
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(168, 85, 247, 0.05) 100%);
  }

  .report-widget:hover:not(:disabled) {
    border-color: #a855f7;
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(168, 85, 247, 0.25);
  }

  .report-widget:active:not(:disabled) {
    transform: translateY(0);
  }

  .report-widget.success {
    border-color: #22c55e;
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(34, 197, 94, 0.1) 100%);
  }

  .report-widget.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .widget-icon.report {
    background: rgba(168, 85, 247, 0.15);
    color: #a855f7;
  }

  .widget-icon.report.granted {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .widget-badge.location-active {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .widget-badge.location-active svg {
    width: 8px;
    height: 8px;
  }

  .report-content {
    min-height: 52px;
  }

  .report-button-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
  }

  .report-icon-large {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .report-icon-large svg {
    width: 22px;
    height: 22px;
    color: white;
  }

  .report-text-container {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
    flex: 1;
  }

  .report-main-text {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .report-sub-text {
    font-size: 0.65rem;
    color: var(--text-secondary);
    line-height: 1.3;
  }

  .report-success {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #22c55e;
    font-weight: 600;
    font-size: 0.9rem;
    height: 100%;
  }

  .report-success svg {
    width: 24px;
    height: 24px;
  }

  .report-denied {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
  }

  .report-denied svg {
    width: 20px;
    height: 20px;
    opacity: 0.6;
  }

  .report-loading, .report-cooldown {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
    height: 100%;
  }

  .report-cooldown svg {
    width: 18px;
    height: 18px;
  }

  .mini-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid var(--border-color);
    border-top-color: #a855f7;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .widget.alert {
    border-color: #dc2626;
    box-shadow: 0 0 20px rgba(220, 38, 38, 0.4);
    animation: alertGlow 0.5s ease-in-out 2;
  }

  @keyframes alertGlow {
    0%, 100% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.4); }
    50% { box-shadow: 0 0 35px rgba(220, 38, 38, 0.6); }
  }

  .widget-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .widget-icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .widget-icon svg {
    width: 14px;
    height: 14px;
  }

  .widget-icon.pulse {
    background: rgba(220, 38, 38, 0.15);
    color: #dc2626;
  }

  .widget-icon.star {
    background: rgba(234, 179, 8, 0.15);
    color: #eab308;
  }

  .widget-icon.chart {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
  }

  .widget-icon.avg {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .widget-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .widget-badge {
    margin-left: auto;
    font-size: 0.65rem;
    padding: 0.2rem 0.5rem;
    background: var(--bg-hover);
    border-radius: 4px;
    color: var(--text-secondary);
  }

  .widget-badge.clock-badge {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--accent);
    background: rgba(59, 130, 246, 0.1);
  }

  .widget-badge.clock-badge svg {
    width: 10px;
    height: 10px;
    flex-shrink: 0;
  }

  .widget-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .widget-content.centered {
    flex-direction: column;
    text-align: center;
    gap: 0.25rem;
  }

  .mag-circle {
    width: 52px;
    height: 52px;
    background: var(--mag-color);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 800;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  }

  .mag-circle.empty {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .widget-details {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
    flex: 1;
  }

  .location-text {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sub-text {
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  .big-stat {
    font-size: 2rem;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1;
  }

  .stat-label {
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  @media (max-width: 1100px) {
    .widgets-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .widgets-row {
      grid-template-columns: 1fr;
      gap: 0.625rem;
    }

    /* Widget 3 ve 4'ü (Bugün ve Ortalama) yan yana koy */
    .widget:nth-child(3),
    .widget:nth-child(4) {
      grid-column: span 1;
    }

    .widget:nth-child(3) {
      grid-row: 3;
      grid-column: 1;
    }

    .widget:nth-child(4) {
      grid-row: 3;
      grid-column: 2;
    }

    /* Grid'i yeniden düzenle */
    .widgets-row {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto auto auto auto;
    }

    /* Widget 1 ve 2 full width */
    .widget:nth-child(1),
    .widget:nth-child(2) {
      grid-column: 1 / -1;
    }

    /* Widget 5 full width */
    .widget:nth-child(5) {
      grid-column: 1 / -1;
    }

    .widget {
      padding: 0.75rem;
    }

    .widget-content {
      gap: 0.625rem;
    }

    .mag-circle {
      width: 48px;
      height: 48px;
      font-size: 1.15rem;
    }

    .location-text {
      font-size: 0.8rem;
    }

    .sub-text {
      font-size: 0.7rem;
    }

    .big-stat {
      font-size: 1.75rem;
    }

    .widget-badge {
      font-size: 0.6rem;
      padding: 0.15rem 0.4rem;
    }
  }

  @media (max-width: 480px) {
    .widgets-row {
      gap: 0.5rem;
    }

    .widget {
      padding: 0.625rem;
    }

    .widget-header {
      margin-bottom: 0.5rem;
      gap: 0.4rem;
    }

    .widget-icon {
      width: 20px;
      height: 20px;
    }

    .widget-icon svg {
      width: 12px;
      height: 12px;
    }

    .widget-title {
      font-size: 0.7rem;
    }

    .mag-circle {
      width: 42px;
      height: 42px;
      font-size: 1rem;
    }

    .location-text {
      font-size: 0.75rem;
    }

    .sub-text {
      font-size: 0.65rem;
    }

    .big-stat {
      font-size: 1.5rem;
    }

    .stat-label {
      font-size: 0.65rem;
    }
  }
</style>
