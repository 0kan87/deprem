<script>
  import { onMount, onDestroy } from 'svelte';
  import L from 'leaflet';
  import HistoricEarthquakesWidget from './HistoricEarthquakesWidget.svelte';

  export let earthquakes = [];
  export let selectedEarthquake = null;
  export let getMagnitudeColor;
  export let darkMode = true;
  export let lastEarthquake = null;
  export let isNewEarthquake = false;

  let mapContainer;
  let map;
  let markersLayer;
  let tileLayer;
  let tectonicLayer;
  let markers = new Map();
  let initialized = false;
  let currentLastId = null;
  let userReportMarker = null;
  let userReportTimeout = null;
  let currentZoom = DEFAULT_ZOOM;
  let isMobile = false;

  const TURKEY_CENTER = [38.5, 35.5];
  const DEFAULT_ZOOM = 7;

  // Çalışan Tektonik ve Jeoloji Servisleri
  const tectonicServices = {
    // ÇALIŞAN Alternatif servisler
    working: {
      // Çalışan tektonik levha katmanları
      plates: 'https://services.arcgisonline.com/ArcGIS/rest/services/Specialty/World_Geological_Map/MapServer',
      // OpenStreetMap tabanlı jeoloji
      geology: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      // Terrain katmanı
      terrain: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg'
    },
    // GitHub'daki açık veri kaynakları
    github: {
      boundaries: 'https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json'
    }
  };

  // Optimize tile providers for better performance and WebP support
  const lightTile = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  
  // Alternative fast tile providers (backup)
  const fastTileProviders = {
    light: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  // Seçili deprem değiştiğinde haritayı güncelle
  $: if (map && selectedEarthquake && selectedEarthquake.latitude) {
    if (selectedEarthquake.isUserReport) {
      // Kullanıcı bildirimi için özel marker
      showUserReportMarker(selectedEarthquake);
    } else {
      flyToAndOpenPopup(selectedEarthquake);
    }
  }

  // Yeni deprem geldiğinde otomatik odaklan
  $: if (map && isNewEarthquake && lastEarthquake && lastEarthquake.id !== currentLastId) {
    currentLastId = lastEarthquake.id;
    setTimeout(() => {
      flyToAndOpenPopup(lastEarthquake);
    }, 300);
  }

  function flyToAndOpenPopup(earthquake) {
    if (!map || !earthquake || !earthquake.latitude) return;
    
    map.flyTo([earthquake.latitude, earthquake.longitude], 10, {
      duration: 1.2
    });

    setTimeout(() => {
      const marker = markers.get(earthquake.id);
      if (marker) {
        marker.openPopup();
      }
    }, 1300);
  }

  // Kullanıcı bildirimi için özel marker göster
  function showUserReportMarker(report) {
    if (!map || !report || !report.latitude) return;

    // Önceki marker'ı temizle
    if (userReportMarker) {
      map.removeLayer(userReportMarker);
      userReportMarker = null;
    }
    if (userReportTimeout) {
      clearTimeout(userReportTimeout);
    }

    // Haritayı konuma götür
    map.flyTo([report.latitude, report.longitude], 12, {
      duration: 1.2
    });

    // Kırmızı marker oluştur - HİS yazısı ile
    const icon = L.divIcon({
      className: 'custom-marker user-report-marker',
      html: `
        <div class="user-report-wrapper">
          <div class="user-report-ring ring-1"></div>
          <div class="user-report-ring ring-2"></div>
          <div class="user-report-ring ring-3"></div>
          <div class="user-report-dot">HİS</div>
        </div>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 25]
    });

    userReportMarker = L.marker([report.latitude, report.longitude], { icon });

    const timeNow = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const popupContent = `
      <div class="eq-popup user-report-popup">
        <div class="popup-mag" style="background: #dc2626">HİS</div>
        <div class="popup-info">
          <div class="popup-title">🚨 Kullanıcı Bildirimi</div>
          <div class="popup-meta">
            <span>📍 ${report.location || 'Bilinmeyen Konum'}</span>
            <span>⏰ ${timeNow}</span>
            <span>🌍 ${report.latitude.toFixed(4)}°, ${report.longitude.toFixed(4)}°</span>
            <span style="color: #f59e0b;">⚠️ Şiddet bilinmiyor</span>
          </div>
        </div>
      </div>
    `;

    userReportMarker.bindPopup(popupContent, {
      className: 'custom-popup user-report-popup-container',
      maxWidth: 300,
      autoPan: true
    });

    userReportMarker.addTo(map);

    // Popup'ı aç
    setTimeout(() => {
      if (userReportMarker) {
        userReportMarker.openPopup();
      }
    }, 1300);

    // 30 saniye sonra marker'ı kaldır
    userReportTimeout = setTimeout(() => {
      if (userReportMarker) {
        map.removeLayer(userReportMarker);
        userReportMarker = null;
      }
    }, 30000);
  }

  function updateTileLayer() {
    if (!map) return;
    
    if (tileLayer) {
      map.removeLayer(tileLayer);
    }
    
    tileLayer = L.tileLayer(darkMode ? darkTile : lightTile, {
      attribution: '© CARTO, © OpenStreetMap',
      maxZoom: 18,
      minZoom: 5,
      // Performance optimizations
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 2,
      // Reduce tile requests
      subdomains: ['a', 'b', 'c', 'd'],
      // Browser caching
      crossOrigin: true,
      // Reduce memory usage
      reuseTiles: true,
      // Improve loading performance
      detectRetina: window.devicePixelRatio > 1
    }).addTo(map);
  }

  // Fay hatları için değişkenler  
  let showFaultLines = false;
  let faultsLayer = null;
  
  // Tarihi depremler için değişkenler
  let historicEarthquakeMarker = null;
  let selectedHistoricEarthquake = null;



  // Fay hatlarını yükle (GeoJSON)
  async function addFaultLines() {
    if (!map || faultsLayer) return;

    try {
      console.log('🔄 Fay hatları yükleniyor...');
      
      // GitHub'dan sınır verisi çek (fay hatları)
      const response = await fetch(tectonicServices.github.boundaries);
      const faultsData = await response.json();
      
      faultsLayer = L.geoJSON(faultsData, {
        style: {
          color: '#dc2626',
          weight: 2,
          opacity: 0.9,
          dashArray: '5, 5'
        },
        onEachFeature: function(feature, layer) {
          layer.bindPopup(`
            <div class="fault-popup">
              <h4>⚡ Fay Hattı</h4>
              <p>Tektonik Sınır</p>
              <small>Deprem Riski: Yüksek</small>
            </div>
          `);
        }
      });
      
      faultsLayer.addTo(map);
      console.log('✅ Fay hatları yüklendi');
    } catch (error) {
      console.error('❌ Fay hatları yükleme hatası:', error);
    }
  }



  // Fay hatlarını toggle  
  function toggleFaultLines() {
    showFaultLines = !showFaultLines;
    
    if (showFaultLines) {
      addFaultLines();
    } else {
      removeFaultLines();
    }
  }

  // Tarihi deprem seçildiğinde çağrılır
  function handleHistoricEarthquakeSelected(event) {
    const earthquake = event.detail;
    selectedHistoricEarthquake = earthquake;
    
    // Önceki marker'ı temizle
    if (historicEarthquakeMarker) {
      map.removeLayer(historicEarthquakeMarker);
    }
    
    // Yeni marker ekle
    addHistoricEarthquakeMarker(earthquake);
    
    // Haritayı o bölgeye götür
    map.setView([earthquake.coordinates[0], earthquake.coordinates[1]], 8);
  }
  
  // Deprem efekti tetikle
  function handleEarthquakeEffect(event) {
    const earthquake = event.detail;
    triggerEarthquakeEffect(earthquake);
  }
  
  function triggerEarthquakeEffect(earthquake) {
    if (!earthquake) return;
    
    const magnitude = earthquake.magnitude;
    
    // Şiddet seviyesi belirleme (eşitli aralıklar)
    let intensity = 'low'; // 0-1.4 (Koyu Yeşil)
    if (magnitude >= 4.5) intensity = 'extreme'; // 4.5+ (Turuncu-Kırmızı)
    else if (magnitude >= 3.5) intensity = 'high'; // 3.5-4.4 (Sarı-Turuncu)
    else if (magnitude >= 2.5) intensity = 'medium'; // 2.5-3.4 (Sarı)
    else if (magnitude >= 1.5) intensity = 'mid'; // 1.5-2.4 (Açık Yeşil)
    
    // Alarm overlay (renk efekti)
    const overlay = document.createElement('div');
    overlay.className = `earthquake-alarm-overlay intensity-${intensity}`;
    document.body.appendChild(overlay);
    
    // Sayfa sallama efekti
    document.body.classList.remove('shake-light', 'shake-moderate', 'shake-major');
    document.body.classList.add('page-shake', `shake-${intensity}`);
    
    // Border efekti kaldırıldı

    // Büyüklüğe göre efekt süresi
    let duration = 1000;
    if (magnitude >= 8.0) duration = 4000;
    else if (magnitude >= 7.0) duration = 3000;
    else if (magnitude >= 6.0) duration = 2500;

    // Temizlik işlemi
    setTimeout(() => {
      document.body.classList.remove('page-shake', 'shake-low', 'shake-mid', 'shake-medium', 'shake-high', 'shake-extreme');
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, duration);
  }

  function addHistoricEarthquakeMarker(earthquake) {
    if (!map) return;

    // Doğru renk ve animasyon için
    const color = getMagnitudeColor(earthquake.magnitude);
    const sizeMultiplier = Math.max(1.2, earthquake.magnitude * 0.15);
    const pulseClass = earthquake.magnitude >= 7.0 ? 'extreme-pulse' : earthquake.magnitude >= 5.0 ? 'strong-pulse' : 'normal-pulse';
    
    // Tarihi deprem için özel ikon
    const historicIcon = L.divIcon({
      html: `
        <div class="historic-marker ${pulseClass}" data-magnitude="${earthquake.magnitude}" style="--marker-color: ${color}; --marker-size: ${sizeMultiplier};">
          <div class="historic-marker-inner">
            <div class="historic-magnitude">${earthquake.magnitude}</div>
            <div class="historic-year">${earthquake.date.split(' ').pop()}</div>
          </div>
          <div class="historic-pulse-1"></div>
          <div class="historic-pulse-2"></div>
          <div class="historic-pulse-3"></div>
        </div>
      `,
      className: 'historic-earthquake-marker',
      iconSize: [60, 60],
      iconAnchor: [30, 30]
    });

    historicEarthquakeMarker = L.marker([earthquake.coordinates[0], earthquake.coordinates[1]], { 
      icon: historicIcon,
      zIndexOffset: 2000 // En üstte göster
    });

    // Detaylı popup
    const popupContent = `
      <div class="historic-popup">
        <div class="historic-popup-header">
          <div class="historic-popup-title">⚡ ${earthquake.name}</div>
          <div class="historic-popup-magnitude" style="background: ${color}">
            ${earthquake.magnitude}
          </div>
        </div>
        
        <div class="historic-popup-content">
          <div class="historic-detail-row">
            <span class="detail-icon">📅</span>
            <span><strong>Tarih:</strong> ${earthquake.date}</span>
          </div>
          <div class="historic-detail-row">
            <span class="detail-icon">📍</span>
            <span><strong>Konum:</strong> ${earthquake.location}</span>
          </div>
          <div class="historic-detail-row">
            <span class="detail-icon">🌍</span>
            <span><strong>Koordinat:</strong> ${earthquake.coordinates[0].toFixed(3)}, ${earthquake.coordinates[1].toFixed(3)}</span>
          </div>
          <div class="historic-detail-row">
            <span class="detail-icon">💀</span>
            <span><strong>Ölü:</strong> ${formatNumber(earthquake.deaths)} kişi</span>
          </div>
          <div class="historic-detail-row">
            <span class="detail-icon">🤕</span>
            <span><strong>Yaralı:</strong> ${formatNumber(earthquake.injured)} kişi</span>
          </div>
          <div class="historic-detail-row">
            <span class="detail-icon">🏠</span>
            <span><strong>Evsiz:</strong> ${formatNumber(earthquake.homeless)} kişi</span>
          </div>
          <div class="historic-detail-row">
            <span class="detail-icon">💰</span>
            <span><strong>Hasar:</strong> ${earthquake.damage}</span>
          </div>
          <div class="historic-detail-row">
            <span class="detail-icon">⏱️</span>
            <span><strong>Süre:</strong> ${earthquake.duration}</span>
          </div>
          <div class="historic-detail-row">
            <span class="detail-icon">📏</span>
            <span><strong>Derinlik:</strong> ${earthquake.depth}</span>
          </div>
        </div>
        
        <div class="historic-description">
          <strong>📝 Açıklama:</strong><br>
          ${earthquake.description}
        </div>
        
        <div class="affected-cities">
          <strong>🏙️ Etkilenen Şehirler:</strong><br>
          ${earthquake.affected_cities.join(', ')}
        </div>
      </div>
    `;

    // Popup ekle (sadece desktop'ta)
    if (!isMobile) {
      historicEarthquakeMarker.bindPopup(popupContent, {
        className: 'historic-earthquake-popup',
        maxWidth: 400,
        autoPan: true
      });

      // Popup'ı otomatik aç
      setTimeout(() => {
        if (historicEarthquakeMarker) {
          historicEarthquakeMarker.openPopup();
        }
      }, 500);
    }

    historicEarthquakeMarker.addTo(map);
  }

  function clearHistoricEarthquakeSelection() {
    selectedHistoricEarthquake = null;
    if (historicEarthquakeMarker) {
      map.removeLayer(historicEarthquakeMarker);
      historicEarthquakeMarker = null;
    }
  }

  function getMagnitudeClass(magnitude) {
    if (magnitude >= 9.0) return 'extreme';
    if (magnitude >= 8.0) return 'major';  
    if (magnitude >= 7.0) return 'strong';
    return 'moderate';
  }

  function formatNumber(num) {
    return new Intl.NumberFormat('tr-TR').format(num);
  }
  // Fay hatlarını kaldır
  function removeFaultLines() {
    if (faultsLayer) {
      map.removeLayer(faultsLayer);
      faultsLayer = null;
      console.log('🚫 Fay hatları kaldırıldı');
    }
  }



  function getDisplayDate(eq) {
    if (eq.date && eq.date !== 'undefined') return eq.date;
    if (eq.dateTime) return new Date(eq.dateTime).toLocaleDateString('tr-TR');
    return '-';
  }

  function getDisplayTime(eq) {
    if (eq.time && eq.time !== 'undefined') return eq.time;
    if (eq.dateTime) return new Date(eq.dateTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return '-';
  }

  function updateMarkers() {
    if (!markersLayer || !map) return;
    
    markersLayer.clearLayers();
    markers.clear();

    earthquakes.forEach((eq, index) => {
      if (!eq.latitude || !eq.longitude) return;
      
      const color = getMagnitudeColor(eq.magnitude);
      const isLatest = index === 0;
      const latestSize = 44;
      const normalSize = 28;
      const currentSize = isLatest ? latestSize : normalSize;
      
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="marker-wrapper ${isLatest ? 'latest' : ''}" style="--marker-color: ${color};">
            ${isLatest ? `
              <div class="marker-ring ring-1"></div>
              <div class="marker-ring ring-2"></div>
              <div class="marker-ring ring-3"></div>
            ` : ''}
            <div class="marker-dot ${isLatest ? 'latest-dot' : ''}">${eq.magnitude.toFixed(1)}</div>
          </div>
        `,
        iconSize: [currentSize, currentSize],
        iconAnchor: [currentSize / 2, currentSize / 2]
      });

      const marker = L.marker([eq.latitude, eq.longitude], { icon });

      const popupContent = `
        <div class="eq-popup">
          <div class="popup-mag" style="background: ${color}">${eq.magnitude.toFixed(1)}</div>
          <div class="popup-info">
            <div class="popup-title">${eq.location || 'Bilinmeyen Konum'}</div>
            <div class="popup-meta">
              <span>📅 ${getDisplayDate(eq)} ⏰ ${getDisplayTime(eq)}</span>
              <span>📍 Derinlik: ${eq.depth} km</span>
              <span>🌍 ${eq.latitude.toFixed(4)}°, ${eq.longitude.toFixed(4)}°</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'custom-popup',
        maxWidth: 300,
        autoPan: true
      });

      markers.set(eq.id, marker);
      markersLayer.addLayer(marker);
    });
  }

  function checkMobile() {
    isMobile = window.innerWidth <= 768;
  }

  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    map = L.map(mapContainer, {
      center: TURKEY_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: false
    });

    // Attribution'ı sağ alta ekle
    L.control.attribution({
      position: 'bottomright',
      prefix: false
    }).addTo(map);

    tileLayer = L.tileLayer(darkMode ? darkTile : lightTile, {
      attribution: '© CARTO, © OpenStreetMap',
      maxZoom: 18,
      minZoom: 5,
      // Performance optimizations
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 2,
      // Reduce tile requests
      subdomains: ['a', 'b', 'c', 'd'],
      // Browser caching
      crossOrigin: true,
      // Reduce memory usage
      reuseTiles: true,
      // Improve loading performance
      detectRetina: window.devicePixelRatio > 1
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    
    // Zoom dinleyicisi
    map.on('zoomend', () => {
      currentZoom = map.getZoom();
    });
    
    initialized = true;

    // İlk yüklemede marker'ları oluştur
    if (earthquakes.length > 0) {
      updateMarkers();
      
      // Son depreme odaklan
      if (lastEarthquake && lastEarthquake.latitude) {
        setTimeout(() => {
          flyToAndOpenPopup(lastEarthquake);
          currentLastId = lastEarthquake.id;
        }, 500);
      }
    }
  });

  // Earthquakes değiştiğinde marker'ları güncelle
  $: if (initialized && earthquakes.length > 0) {
    updateMarkers();
  }

  // Tema değiştiğinde harita stilini güncelle
  $: if (initialized && darkMode !== undefined) {
    updateTileLayer();
  }

  // darkMode değişikliğini izle
  $: darkMode, (() => {
    if (initialized && map) {
      updateTileLayer();
    }
  })();

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });
</script>

<div class="map-wrapper">
  <div bind:this={mapContainer} class="map"></div>
  
  <!-- Fay Hatları Kontrolü -->
  <div class="map-controls" class:light={!darkMode}>
    <!-- Fay Hatları Toggle -->
    <button 
      class="tectonic-toggle fault-toggle" 
      class:active={showFaultLines}
      on:click={toggleFaultLines}
      title="Fay Hatlarını Göster/Gizle"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 3l6 6 6-6"/>
        <path d="M6 15l6 6 6-6"/>
      </svg>
      Fay Hatları {showFaultLines ? '🔴' : '⚪'}
    </button>
  </div>

  <!-- Tarihi Depremler Widget'ı -->
  <HistoricEarthquakesWidget 
    {darkMode}
    on:earthquakeSelected={handleHistoricEarthquakeSelected}
    on:triggerEffect={handleEarthquakeEffect}
    on:clearSelection={clearHistoricEarthquakeSelection}
  />
  
  <div class="map-legend" class:light={!darkMode}>
    <div class="legend-title">Büyüklük</div>
    <div class="legend-items">
      <div class="legend-item"><span class="dot" style="background:#22c55e"></span>&lt;2</div>
      <div class="legend-item"><span class="dot" style="background:#84cc16"></span>2-3</div>
      <div class="legend-item"><span class="dot" style="background:#eab308"></span>3-4</div>
      <div class="legend-item"><span class="dot" style="background:#f59e0b"></span>4-5</div>
      <div class="legend-item"><span class="dot" style="background:#ea580c"></span>5-6</div>
      <div class="legend-item"><span class="dot" style="background:#dc2626"></span>&gt;6</div>
    </div>
  </div>
</div>

<style>
  .map-wrapper {
    position: relative;
    height: 100%;
    min-height: 480px;
  }

  .map {
    width: 100%;
    height: 100%;
    min-height: 480px;
    border-radius: 12px;
  }

  /* Mobil görünümde harita daha uzun */
  @media (max-width: 768px) {
    .map-wrapper {
      min-height: 600px;
    }
    
    .map {
      min-height: 600px;
    }
  }

  @media (max-width: 480px) {
    .map-wrapper {
      min-height: 650px;
    }
    
    .map {
      min-height: 650px;
    }
  }

  .map-legend {
    position: absolute;
    bottom: 20px;
    left: 10px;
    background: rgba(15, 23, 42, 0.92);
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    z-index: 1000;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #f8fafc;
  }

  .map-legend.light {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(0, 0, 0, 0.1);
    color: #0f172a;
  }

  .legend-title {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.4rem;
    opacity: 0.7;
    font-weight: 600;
  }

  .legend-items {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.65rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  :global(.custom-marker) {
    background: transparent !important;
    border: none !important;
  }

  :global(.marker-wrapper) {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.marker-ring) {
    position: absolute;
    border: 2px solid var(--marker-color);
    border-radius: 50%;
    pointer-events: none;
  }

  :global(.marker-ring.ring-1) {
    width: 44px;
    height: 44px;
    animation: ring-pulse-1 2.5s ease-out infinite;
  }

  :global(.marker-ring.ring-2) {
    width: 44px;
    height: 44px;
    animation: ring-pulse-2 2.5s ease-out infinite;
    animation-delay: 0.8s;
  }

  :global(.marker-ring.ring-3) {
    width: 44px;
    height: 44px;
    animation: ring-pulse-3 2.5s ease-out infinite;
    animation-delay: 1.6s;
  }

  @keyframes ring-pulse-1 {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(2.5); opacity: 0; }
  }

  @keyframes ring-pulse-2 {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(2.2); opacity: 0; }
  }

  @keyframes ring-pulse-3 {
    0% { transform: scale(1); opacity: 0.4; }
    100% { transform: scale(1.9); opacity: 0; }
  }

  :global(.marker-dot) {
    position: relative;
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    background: var(--marker-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: white;
    border: 2px solid white;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    cursor: pointer;
    transition: transform 0.2s;
    aspect-ratio: 1 / 1;
  }

  :global(.marker-dot:hover) {
    transform: scale(1.1);
  }

  :global(.marker-dot.latest-dot) {
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    font-size: 13px;
    border-width: 3px;
    box-shadow: 0 0 20px var(--marker-color), 0 4px 15px rgba(0, 0, 0, 0.5);
  }

  :global(.marker-wrapper.latest) {
    width: 44px;
    height: 44px;
  }

  :global(.custom-popup .leaflet-popup-content-wrapper) {
    background: #1e293b;
    color: #f8fafc;
    border-radius: 12px;
    padding: 0;
    overflow: hidden;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
    z-index: 9999 !important;
  }

  :global(.custom-popup) {
    z-index: 9999 !important;
  }

  /* Leaflet popup pane z-index */
  :global(.leaflet-popup-pane) {
    z-index: 9998 !important;
  }

  :global(.leaflet-popup) {
    z-index: 9999 !important;
  }

  /* Alt panel üzerinde popup görünsün */
  :global(.leaflet-container) {
    position: relative;
  }

  :global(.leaflet-control-container) {
    z-index: 800;
  }

  :global(.custom-popup .leaflet-popup-tip) {
    background: #1e293b;
  }

  :global(.custom-popup .leaflet-popup-content) {
    margin: 0;
  }

  :global(.custom-popup .leaflet-popup-close-button) {
    color: #94a3b8;
    font-size: 20px;
    padding: 8px 10px;
  }

  :global(.custom-popup .leaflet-popup-close-button:hover) {
    color: #f8fafc;
  }

  :global(.eq-popup) {
    display: flex;
    align-items: stretch;
    min-width: 240px;
  }

  :global(.popup-mag) {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    font-size: 1.6rem;
    font-weight: 800;
    color: white;
    min-width: 75px;
  }

  :global(.popup-info) {
    padding: 1rem;
    flex: 1;
  }

  :global(.popup-title) {
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 0.6rem;
    line-height: 1.3;
  }

  :global(.popup-meta) {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  /* Kullanıcı Bildirimi Marker Stilleri */
  :global(.user-report-wrapper) {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
  }

  :global(.user-report-ring) {
    position: absolute;
    border: 3px solid #dc2626;
    border-radius: 50%;
    pointer-events: none;
  }

  :global(.user-report-ring.ring-1) {
    width: 50px;
    height: 50px;
    animation: user-report-pulse-1 1.5s ease-out infinite;
  }

  :global(.user-report-ring.ring-2) {
    width: 50px;
    height: 50px;
    animation: user-report-pulse-2 1.5s ease-out infinite;
    animation-delay: 0.5s;
  }

  :global(.user-report-ring.ring-3) {
    width: 50px;
    height: 50px;
    animation: user-report-pulse-3 1.5s ease-out infinite;
    animation-delay: 1s;
  }

  @keyframes user-report-pulse-1 {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(3); opacity: 0; }
  }

  @keyframes user-report-pulse-2 {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(2.5); opacity: 0; }
  }

  @keyframes user-report-pulse-3 {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(2); opacity: 0; }
  }

  :global(.user-report-dot) {
    position: relative;
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
    background: #dc2626;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    color: white;
    border: 3px solid white;
    box-shadow: 0 0 25px rgba(220, 38, 38, 0.6), 0 4px 15px rgba(0, 0, 0, 0.5);
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    cursor: pointer;
    letter-spacing: 0.5px;
    animation: user-report-glow 1s ease-in-out infinite alternate;
  }

  @keyframes user-report-glow {
    0% { box-shadow: 0 0 25px rgba(220, 38, 38, 0.6), 0 4px 15px rgba(0, 0, 0, 0.5); }
    100% { box-shadow: 0 0 40px rgba(220, 38, 38, 0.9), 0 4px 20px rgba(0, 0, 0, 0.6); }
  }

  :global(.user-report-popup-container .leaflet-popup-content-wrapper) {
    border: 2px solid #dc2626;
  }

  /* Tektonik Levhalar Kontrolü */
  .map-controls {
    position: absolute;
    top: 80px;
    left: 10px;
    z-index: 1000;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Z-Index düzenlemeleri - popup'ların en üstte olması için */
  :global(.leaflet-popup) {
    z-index: 2000 !important;
  }

  :global(.leaflet-popup-pane) {
    z-index: 2000 !important;
  }

  /* Alt panelin arkada kalmaması için */
  :global(.leaflet-control-container) {
    z-index: 1500 !important;
  }

  .tectonic-toggle {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.5rem;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .tectonic-toggle:hover {
    background: var(--bg-hover);
    border-color: var(--accent);
    color: var(--text-primary);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .tectonic-toggle.active {
    background: var(--accent);
    border-color: var(--accent);
    color: white !important;
  }

  .tectonic-toggle.active:hover {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
    color: white !important;
  }

  .tectonic-toggle.fault-toggle.active {
    background: #dc2626;
    border-color: #dc2626;
    color: white !important;
  }

  .tectonic-toggle.fault-toggle.active:hover {
    background: #b91c1c;
    border-color: #b91c1c;
    color: white !important;
  }

  .tectonic-toggle svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .debug-panel {
    margin-top: 0.5rem;
    padding: 0.4rem 0.6rem;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 6px;
    font-size: 0.7rem;
    color: #94a3b8;
    font-family: monospace;
  }

  .map-controls.light .tectonic-toggle {
    background: rgba(255, 255, 255, 0.95);
  }

  .map-controls.light .tectonic-toggle:hover {
    background: rgba(255, 255, 255, 1);
  }

  .map-controls.light .tectonic-toggle.active {
    background: var(--accent) !important;
    color: white !important;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .map-controls {
      top: 60px;
      left: 8px;
      right: 8px;
      flex-direction: row;
      justify-content: flex-start;
    }
    
    .tectonic-toggle {
      font-size: 0.7rem;
      padding: 0.25rem 0.4rem;
      gap: 0.2rem;
    }
    
    .tectonic-toggle svg {
      width: 16px;
      height: 16px;
    }
  }

  /* Tektonik Popup Stilleri */
  :global(.tectonic-popup) {
    font-family: inherit;
  }

  :global(.tectonic-popup h4) {
    font-size: 0.9rem;
    font-weight: 600;
  }

  :global(.tectonic-popup p) {
    line-height: 1.4;
  }

  @media (max-width: 768px) {
    .map-wrapper, .map {
      min-height: 320px;
    }

    .map-legend {
      bottom: 8px;
      left: 8px;
      padding: 0.5rem;
    }

    .map-controls {
      top: 8px;
      left: 8px;
    }

    .tectonic-toggle {
      padding: 0.4rem 0.6rem;
      font-size: 0.75rem;
      gap: 0.4rem;
    }

    .tectonic-toggle svg {
      width: 14px;
      height: 14px;
    }
  }

  /* Tarihi Deprem Marker'ları */
  :global(.historic-earthquake-marker) {
    z-index: 2000 !important;
  }

  :global(.historic-marker) {
    position: relative;
    width: 60px;
    height: 60px;
    cursor: pointer;
    transform: scale(calc(var(--marker-size, 1.2)));
    transition: all 0.3s ease;
  }

  :global(.historic-marker:hover) {
    transform: scale(calc(var(--marker-size, 1.2) + 0.3));
    z-index: 1000;
  }

  :global(.historic-marker-inner) {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 50px;
    height: 50px;
    background: var(--marker-color, #dc2626);
    border-radius: 50%;
    border: 3px solid #fff;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), 0 0 0 0 rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }

  :global(.historic-magnitude) {
    font-size: 14px;
    font-weight: 700;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    line-height: 1;
  }

  :global(.historic-year) {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 1px 1px rgba(0,0,0,0.5);
    line-height: 1;
  }

  /* Çoklu pulse animasyonları */
  :global(.historic-pulse-1), 
  :global(.historic-pulse-2), 
  :global(.historic-pulse-3) {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 2px solid var(--marker-color, #dc2626);
    background: transparent;
    opacity: 0;
    z-index: 1;
  }

  :global(.normal-pulse .historic-pulse-1) { animation: historic-pulse-ring 3s infinite; }
  :global(.normal-pulse .historic-pulse-2) { animation: historic-pulse-ring 3s infinite 1s; }
  
  :global(.strong-pulse .historic-pulse-1) { animation: historic-pulse-ring 2s infinite; }
  :global(.strong-pulse .historic-pulse-2) { animation: historic-pulse-ring 2s infinite 0.7s; }
  :global(.strong-pulse .historic-pulse-3) { animation: historic-pulse-ring 2s infinite 1.4s; }
  
  :global(.extreme-pulse .historic-pulse-1) { animation: historic-pulse-ring 1.5s infinite; }
  :global(.extreme-pulse .historic-pulse-2) { animation: historic-pulse-ring 1.5s infinite 0.5s; }
  :global(.extreme-pulse .historic-pulse-3) { animation: historic-pulse-ring 1.5s infinite 1s; }

  @keyframes historic-pulse {
    0% { 
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4), 0 0 0 0 rgba(220, 38, 38, 0.7);
    }
    70% {
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4), 0 0 0 15px rgba(220, 38, 38, 0);
    }
    100% {
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4), 0 0 0 0 rgba(220, 38, 38, 0);
    }
  }

  @keyframes historic-pulse-ring {
    0% {
      transform: translate(-50%, -50%) scale(0.8);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) scale(2);
      opacity: 0;
    }
  }

  /* Tarihi Deprem Popup Stilleri */
  :global(.historic-earthquake-popup .leaflet-popup-content-wrapper) {
    background: var(--bg-card);
    border: 2px solid #dc2626;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  :global(.historic-earthquake-popup .leaflet-popup-tip) {
    background: var(--bg-card);
    border: 2px solid #dc2626;
  }

  :global(.historic-popup) {
    font-family: inherit;
    max-width: 400px;
  }

  :global(.historic-popup-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  :global(.historic-popup-title) {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    flex: 1;
  }

  :global(.historic-popup-magnitude) {
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 700;
    color: white;
    min-width: 45px;
    text-align: center;
  }

  :global(.historic-popup-magnitude.magnitude-extreme) {
    background: #dc2626;
  }

  :global(.historic-popup-magnitude.magnitude-major) {
    background: #ea580c;
  }

  :global(.historic-popup-magnitude.magnitude-strong) {
    background: #ca8a04;
  }

  :global(.historic-popup-magnitude.magnitude-moderate) {
    background: #16a34a;
  }

  :global(.historic-popup-content) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  :global(.historic-detail-row) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
    padding: 0.2rem 0;
  }

  :global(.historic-detail-row .detail-icon) {
    font-size: 1rem;
    min-width: 20px;
  }

  :global(.historic-description),
  :global(.affected-cities) {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: var(--bg-secondary);
    border-radius: 8px;
    font-size: 0.85rem;
    line-height: 1.4;
    color: var(--text-secondary);
  }

  :global(.historic-description strong),
  :global(.affected-cities strong) {
    color: var(--text-primary);
    display: block;
    margin-bottom: 0.25rem;
  }

  /* Mobile tarihi deprem stilleri */
  @media (max-width: 768px) {
    :global(.historic-marker) {
      width: 50px;
      height: 50px;
    }

    :global(.historic-marker-inner) {
      width: 40px;
      height: 40px;
    }

    :global(.historic-pulse) {
      width: 50px;
      height: 50px;
    }

    :global(.historic-magnitude) {
      font-size: 12px;
    }

    :global(.historic-year) {
      font-size: 8px;
    }

    :global(.historic-popup-content) {
      grid-template-columns: 1fr;
    }
  }

  /* Tarihi deprem alarm overlay'leri */
  :global(.earthquake-alarm-overlay) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999999;
    pointer-events: none;
    animation: alarmFlash 0.3s ease-in-out 3;
  }

  :global(.earthquake-alarm-overlay.intensity-low) {
    background: radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 50%, transparent 100%);
  }

  :global(.earthquake-alarm-overlay.intensity-medium) {
    background: radial-gradient(circle, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.08) 50%, transparent 100%);
  }

  :global(.earthquake-alarm-overlay.intensity-high) {
    background: radial-gradient(circle, rgba(234, 88, 12, 0.2) 0%, rgba(234, 88, 12, 0.1) 50%, transparent 100%);
  }

  :global(.earthquake-alarm-overlay.intensity-extreme) {
    background: radial-gradient(circle, rgba(220, 38, 38, 0.25) 0%, rgba(220, 38, 38, 0.15) 50%, transparent 100%);
  }

  /* Tarihi deprem border efektleri */
  :global(.earthquake-border) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999998;
    pointer-events: none;
    border-width: 8px;
    border-style: solid;
    animation: borderPulse 0.4s ease-in-out 4;
  }

  :global(.earthquake-border.intensity-low) {
    border-color: rgba(34, 197, 94, 0.6);
    box-shadow: inset 0 0 50px rgba(34, 197, 94, 0.3);
  }

  :global(.earthquake-border.intensity-medium) {
    border-color: rgba(234, 179, 8, 0.7);
    box-shadow: inset 0 0 50px rgba(234, 179, 8, 0.4);
  }

  :global(.earthquake-border.intensity-high) {
    border-color: rgba(234, 88, 12, 0.8);
    box-shadow: inset 0 0 50px rgba(234, 88, 12, 0.5);
  }

  :global(.earthquake-border.intensity-extreme) {
    border-color: rgba(220, 38, 38, 0.9);
    box-shadow: inset 0 0 50px rgba(220, 38, 38, 0.6);
  }

  @keyframes alarmFlash {
    0%, 100% { opacity: 0; }
    50% { opacity: 1; }
  }

  @keyframes borderPulse {
    0%, 100% { 
      border-width: 0px;
      opacity: 0;
    }
    50% { 
      border-width: 8px;
      opacity: 1;
    }
  }
</style>
