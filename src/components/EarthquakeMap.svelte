<script>
  import { onMount, onDestroy } from 'svelte';
  import L from 'leaflet';

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
  let showTectonicPlates = false;

  const TURKEY_CENTER = [38.5, 35.5];
  const DEFAULT_ZOOM = 7;

  // USGS ve ArcGIS gerçek tektonik levha servisleri
  const tectonicServices = {
    // USGS Tektonik Levhalar (Resmi USGS verisi)
    plates: {
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places_Alternate/MapServer/tile/{z}/{y}/{x}',
      wms: 'https://earthquake.usgs.gov/arcgis/services/hazards/tectonic_plates/MapServer/WMSServer',
      esri: 'https://services.arcgisonline.com/ArcGIS/rest/services/Specialty/World_Geological_Map/MapServer'
    },
    // USGS Fay Hatları
    faults: {
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Specialty/World_Geological_Map/MapServer',
      quaternary: 'https://earthquake.usgs.gov/arcgis/services/hazards/quaternary_faults/MapServer/WMSServer'
    },
    // ArcGIS World Tectonic Plates
    worldPlates: {
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer',
      tectonic: 'https://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Specialty/ESRI_StatesCitiesRivers_USA/MapServer'
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

  // Tektonik levhaları göster/gizle
  function toggleTectonicPlates() {
    showTectonicPlates = !showTectonicPlates;
    
    if (showTectonicPlates) {
      addTectonicPlates();
    } else {
      removeTectonicPlates();
    }
  }

  function addTectonicPlates() {
    if (!map || tectonicLayer) return;

    // Layer group oluştur - birden fazla katman için
    tectonicLayer = L.layerGroup();

    // 1. USGS Tektonik Levhalar WMS Katmanı
    const usgsPlatesWMS = L.tileLayer.wms('https://earthquake.usgs.gov/arcgis/services/hazards/tectonic_plates/MapServer/WMSServer', {
      layers: '0',
      format: 'image/png',
      transparent: true,
      opacity: 0.6,
      attribution: '© USGS Earthquake Hazards Program'
    });

    // 2. ArcGIS World Geological Map (Fay hatları için)
    const esriGeologyLayer = L.esri.dynamicMapLayer({
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Specialty/World_Geological_Map/MapServer',
      opacity: 0.5,
      attribution: '© Esri, USGS'
    });

    // 3. USGS Quaternary Faults WMS
    const ussgsFaultsWMS = L.tileLayer.wms('https://earthquake.usgs.gov/arcgis/services/hazards/quaternary_faults/MapServer/WMSServer', {
      layers: '0,1,2',
      format: 'image/png',
      transparent: true,
      opacity: 0.7,
      attribution: '© USGS Quaternary Fault Database'
    });

    // Fallback: Eğer WMS çalışmazsa, basit ArcGIS tile layer
    const fallbackTectonicTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Specialty/World_Geological_Map/MapServer/tile/{z}/{y}/{x}', {
      opacity: 0.5,
      attribution: '© Esri, USGS, NOAA'
    });

    try {
      // WMS katmanlarını ekle
      tectonicLayer.addLayer(usgsPlatesWMS);
      tectonicLayer.addLayer(ussgsFaultsWMS);
      
      // Eğer ESRI Leaflet plugin varsa geological layer'ı da ekle
      if (typeof L.esri !== 'undefined') {
        tectonicLayer.addLayer(esriGeologyLayer);
      } else {
        // Fallback tile layer kullan
        tectonicLayer.addLayer(fallbackTectonicTiles);
      }
    } catch (error) {
      console.log('WMS katmanları yüklenemedi, fallback kullanılıyor:', error);
      // Hata durumunda sadece fallback tile layer kullan
      tectonicLayer.addLayer(fallbackTectonicTiles);
    }

    // Layer group'u haritaya ekle
    tectonicLayer.addTo(map);

    // Bilgi popup'ı ekle (tıklanabilir alan oluştur)
    const infoControl = L.control({ position: 'bottomleft' });
    infoControl.onAdd = function() {
      const div = L.DomUtil.create('div', 'tectonic-info-control');
      div.innerHTML = `
        <div class="tectonic-info-popup" style="
          background: var(--bg-card); 
          padding: 0.75rem; 
          border-radius: 8px; 
          border: 1px solid var(--border-color);
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          font-size: 0.8rem;
          color: var(--text-primary);
          max-width: 200px;
        ">
          <div style="font-weight: 600; margin-bottom: 0.25rem;">🌍 Tektonik Veriler</div>
          <div style="color: var(--text-secondary); line-height: 1.4;">
            • USGS resmi tektonik levhalar<br>
            • Kuvaterner fay sistemleri<br>
            • World Geological Map
          </div>
        </div>
      `;
      return div;
    };
    infoControl.addTo(map);
    
    // Info control'ü tectonicLayer'a bağla (temizlik için)
    tectonicLayer._infoControl = infoControl;
  }

  function removeTectonicPlates() {
    if (tectonicLayer && map) {
      // Layer group'taki tüm katmanları temizle
      tectonicLayer.eachLayer(function(layer) {
        map.removeLayer(layer);
      });
      
      // Info control'ü de kaldır
      if (tectonicLayer._infoControl) {
        map.removeControl(tectonicLayer._infoControl);
      }
      
      map.removeLayer(tectonicLayer);
      tectonicLayer = null;
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

  onMount(() => {
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
  
  <!-- Tektonik Levhalar Toggle -->
  <div class="map-controls" class:light={!darkMode}>
    <button 
      class="tectonic-toggle" 
      class:active={showTectonicPlates}
      on:click={toggleTectonicPlates}
      title="Tektonik Levhaları Göster/Gizle"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
      USGS Tektonik
    </button>
  </div>
  
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
    top: 10px;
    left: 10px;
    z-index: 1000;
    pointer-events: auto;
  }

  .tectonic-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
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

  .tectonic-toggle svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
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
</style>
