<script>
  import { historicEarthquakes, getTurkishEarthquakes, getWorldEarthquakes, getEarthquakesByMagnitude, getEarthquakesByDeaths } from '../data/historicEarthquakes.js';
  import { createEventDispatcher, onMount } from 'svelte';

  const dispatch = createEventDispatcher();
  
  export let darkMode = false;
  
  let isOpen = false;
  let selectedFilter = 'turkey'; // 'all', 'turkey', 'world', 'magnitude', 'deaths'
  let selectedEarthquake = null;
  let isMobile = false;
  let touchStartY = 0;
  let panelElement;
  
  $: filteredEarthquakes = getFilteredEarthquakes(selectedFilter);
  
  // Reaktif sayılar
  $: turkeyCount = getTurkishEarthquakes().length;
  $: worldCount = getWorldEarthquakes().length;
  $: totalCount = historicEarthquakes.length;
  
  // Debug için
  $: if (turkeyCount && worldCount) {
    console.log('Türkiye:', turkeyCount, 'Dünya:', worldCount, 'Toplam:', totalCount);
  }
  
  function getFilteredEarthquakes(filter) {
    switch(filter) {
      case 'turkey':
        return getTurkishEarthquakes();
      case 'world':
        return getWorldEarthquakes(); // Sadece Türkiye dışındaki depremler
      case 'magnitude':
        return getEarthquakesByMagnitude(7.0);
      case 'deaths':
        return getEarthquakesByDeaths().slice(0, 10);
      default:
        return historicEarthquakes; // 'all' durumu - tüm depremler
    }
  }
  
  function toggleWidget() {
    isOpen = !isOpen;
  }
  
  function closeWidget() {
    isOpen = false;
  }
  
  function handleOverlayClick(e) {
    if (isMobile && e.target === e.currentTarget) {
      closeWidget();
    }
  }
  
  function selectEarthquake(earthquake) {
    selectedEarthquake = earthquake;
    dispatch('earthquakeSelected', earthquake);
    
    // Animasyon için event gönder
    dispatch('triggerEffect', earthquake);
    
    // Mobilde deprem seçildiğinde listeyi kapat
    if (isMobile) {
      isOpen = false;
    }
  }
  
  function getMagnitudeColor(magnitude) {
    if (magnitude >= 6) return '#dc2626'; // Kırmızı
    if (magnitude >= 5) return '#ea580c'; // Turuncu
    if (magnitude >= 4) return '#f59e0b'; // Sarı-turuncu
    if (magnitude >= 3) return '#eab308'; // Sarı
    if (magnitude >= 2) return '#84cc16'; // Yeşil-sarı
    return '#22c55e'; // Yeşil
  }
  
  function formatNumber(num) {
    return new Intl.NumberFormat('tr-TR').format(num);
  }
  
  function checkMobile() {
    isMobile = window.innerWidth <= 768;
  }
  
  function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
  }
  
  function handleTouchMove(e) {
    if (!isOpen) return;
    
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - touchStartY;
    
    // Aşağı kaydırma ile kapat
    if (deltaY > 50) {
      isOpen = false;
    }
  }
  
  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  });
</script>

<div class="historic-earthquakes-widget" class:dark={darkMode} class:open={isOpen} class:mobile={isMobile} on:click={handleOverlayClick}>
  <!-- Widget Toggle Button -->
  <button class="widget-toggle" on:click={toggleWidget} title="Tarihi Büyük Depremler">
    {#if isMobile}
      <div class="fab-content" class:rotated={isOpen}>
        {#if isOpen}
          <!-- Aşağı ok (kapat) -->
          <svg class="fab-icon close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
          </svg>
        {:else}
          <!-- Yukarı ok (aç) -->
          <svg class="fab-icon main-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M5 10l7-7m0 0l7 7m-7-7v18"/>
          </svg>
        {/if}
      </div>
    {:else}
      <!-- Desktop görünüm -->
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
        <line x1="16" x2="16" y1="2" y2="6"/>
        <line x1="8" x2="8" y1="2" y2="6"/>
        <line x1="3" x2="21" y1="10" y2="10"/>
      </svg>
      <span class="widget-text">Tarihi Depremler</span>
      <div class="toggle-indicator" class:rotated={isOpen}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>
    {/if}
  </button>

  <!-- Widget Panel -->
  {#if isOpen}
    <div 
      class="widget-panel" 
      bind:this={panelElement}
      on:touchstart={handleTouchStart}
      on:touchmove={handleTouchMove}
    >
      <!-- Mobile Close Button -->
      {#if isMobile}
        <button class="mobile-close-btn" on:click={toggleWidget}>
          <svg class="fab-icon close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      {/if}
      <!-- Filter Buttons -->
      <div class="filter-section">
        <div class="filter-title">📊 Filtreler</div>
        <div class="filter-buttons">
          <button 
            class="filter-btn"
            class:active={selectedFilter === 'turkey'}
            on:click={() => selectedFilter = 'turkey'}
          >
            🏛️ Türkiye ({turkeyCount})
          </button>
          <button 
            class="filter-btn"
            class:active={selectedFilter === 'all'}
            on:click={() => selectedFilter = 'all'}
          >
            📊 Tümü ({totalCount})
          </button>
          <button 
            class="filter-btn"
            class:active={selectedFilter === 'magnitude'}
            on:click={() => selectedFilter = 'magnitude'}
          >
            📈 En Güçlü (7.0+)
          </button>
          <button 
            class="filter-btn"
            class:active={selectedFilter === 'deaths'}
            on:click={() => selectedFilter = 'deaths'}
          >
            💀 En Ölümcül
          </button>
        </div>
      </div>

      <!-- Earthquake List -->
      <div class="earthquakes-list">
        <div class="list-header">
          <span class="list-title">⚡ {filteredEarthquakes.length} Deprem</span>
          {#if selectedEarthquake}
            <button class="clear-selection" on:click={() => {selectedEarthquake = null; dispatch('clearSelection');}}>
              ❌ Temizle
            </button>
          {/if}
        </div>
        
        <div class="list-scroll">
          {#each filteredEarthquakes as earthquake (earthquake.id)}
            <div 
              class="earthquake-item"
              class:selected={selectedEarthquake?.id === earthquake.id}
              on:click={() => selectEarthquake(earthquake)}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && selectEarthquake(earthquake)}
            >
              <div class="earthquake-header">
                <div class="earthquake-name">{earthquake.name}</div>
                {#if !isMobile}
                  <div class="earthquake-magnitude" style="background-color: {getMagnitudeColor(earthquake.magnitude)};">
                    {earthquake.magnitude}
                  </div>
                {/if}
              </div>
              
              <div class="earthquake-details">
                {#if !isMobile}
                  <div class="detail-row">
                    <span class="detail-icon">📅</span>
                    <span class="detail-text">{earthquake.date}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-icon">📍</span>
                    <span class="detail-text">{earthquake.location}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-icon">💀</span>
                    <span class="detail-text">{formatNumber(earthquake.deaths)} ölü</span>
                  </div>
                  {#if earthquake.homeless}
                    <div class="detail-row">
                      <span class="detail-icon">🏠</span>
                      <span class="detail-text">{formatNumber(earthquake.homeless)} evsiz</span>
                    </div>
                  {/if}
                {:else}
                  <!-- Mobil kompakt görünüm -->
                  <div class="mobile-compact">
                    <span class="compact-info">📍 {earthquake.location.split(',')[0]}</span>
                    <span class="compact-info">📅 {earthquake.date.split(' ').pop()}</span>
                    <span class="compact-info">💀 {formatNumber(earthquake.deaths)}</span>
                  </div>
                {/if}
              </div>
              
              <div class="earthquake-description">
                {earthquake.description}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .historic-earthquakes-widget {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    width: 350px;
    max-width: calc(100vw - 20px);
    pointer-events: auto;
  }

  .widget-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    color: var(--text-primary);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .widget-toggle:hover {
    background: var(--bg-hover);
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
  }

  .widget-toggle svg {
    width: 20px;
    height: 20px;
    color: var(--accent);
  }

  .widget-text {
    flex: 1;
    text-align: left;
  }

  .toggle-indicator {
    transition: transform 0.3s ease;
  }

  .toggle-indicator.rotated {
    transform: rotate(180deg);
  }

  .toggle-indicator svg {
    width: 16px;
    height: 16px;
    color: var(--text-secondary);
  }

  .widget-panel {
    margin-top: 0.5rem;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
    backdrop-filter: blur(15px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    max-height: 65vh;
    display: flex;
    flex-direction: column;
  }

  .filter-section {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
  }

  .filter-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }

  .filter-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .filter-btn {
    padding: 0.3rem 0.6rem;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.75rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .filter-btn.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  .earthquakes-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .list-header {
    padding: 0.75rem 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .list-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .clear-selection {
    padding: 0.2rem 0.4rem;
    background: var(--danger);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.7rem;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .clear-selection:hover {
    opacity: 0.8;
  }

  .list-scroll {
    flex: 1;
    overflow-y: auto;
    max-height: 400px;
  }

  .earthquake-item {
    padding: 0.6rem;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--bg-card);
  }

  .earthquake-item:hover {
    background: var(--bg-hover);
  }

  .earthquake-item.selected {
    background: rgba(59, 130, 246, 0.1);
    border-left: 4px solid var(--accent);
  }

  .earthquake-item:last-child {
    border-bottom: none;
  }

  .earthquake-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .earthquake-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
  }

  .earthquake-magnitude {
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 700;
    color: white;
    min-width: 40px;
    text-align: center;
  }



  .earthquake-details {
    margin-bottom: 0.5rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.2rem;
  }

  .detail-row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
  }

  .detail-icon {
    font-size: 0.8rem;
  }

  .detail-text {
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .earthquake-description {
    font-size: 0.75rem;
    color: var(--text-secondary);
    line-height: 1.4;
    border-top: 1px solid var(--border-color);
    padding-top: 0.5rem;
    margin-top: 0.5rem;
  }

  /* Dark mode */
  .historic-earthquakes-widget.dark .widget-toggle {
    background: rgba(30, 41, 59, 0.95);
    border-color: rgba(71, 85, 105, 0.3);
  }

  .historic-earthquakes-widget.dark .widget-panel {
    background: rgba(30, 41, 59, 0.95);
    border-color: rgba(71, 85, 105, 0.3);
  }

  /* Mobil gizli metin */
  .widget-text.hidden {
    display: none;
  }

  /* Mobil close button */
  .mobile-close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }

  .mobile-close-btn:hover {
    background: var(--bg-hover);
    transform: scale(1.05);
  }

  .mobile-close-btn:active {
    transform: scale(0.95);
  }

  .mobile-close-btn .fab-icon {
    width: 24px;
    height: 24px;
    color: var(--text-primary);
  }

  /* Mobil handle bar - gizli */
  .historic-earthquakes-widget.mobile .mobile-handle {
    display: none;
  }

  /* Mobilde filter section */
  .historic-earthquakes-widget.mobile .filter-section {
    flex-shrink: 0;
    padding: 60px 1rem 0.75rem 1rem;
    margin: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    background: var(--bg-primary);
    border-bottom: 2px solid var(--border-color);
    box-sizing: border-box;
  }

  .handle-bar {
    width: 40px;
    height: 4px;
    background: var(--text-secondary);
    border-radius: 2px;
    opacity: 0.5;
  }

  /* Mobil Tasarım - Bottom Sheet */
  .historic-earthquakes-widget.mobile {
    position: fixed;
    top: auto;
    bottom: 16px;
    right: 50%;
    left: auto;
    transform: translateX(50%);
    width: auto;
    z-index: 1000;
  }

  /* Mobil açık durumda tam ekran override */
  .historic-earthquakes-widget.mobile.open {
    transform: none !important;
    right: 0 !important;
    left: 0 !important;
    bottom: 0 !important;
  }

  .historic-earthquakes-widget.mobile .widget-toggle {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    justify-content: center;
    align-items: center;
    padding: 0;
    background: var(--bg-card);
    border: 2px solid var(--border-color);
    box-shadow: 
      0 4px 16px rgba(0, 0, 0, 0.1),
      0 2px 8px rgba(0, 0, 0, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(10px);
  }

  .historic-earthquakes-widget.mobile .widget-toggle:hover {
    transform: scale(1.05);
    background: var(--bg-hover);
    border-color: var(--accent);
    box-shadow: 
      0 6px 24px rgba(0, 0, 0, 0.15),
      0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .historic-earthquakes-widget.mobile .widget-toggle:active {
    transform: scale(0.95);
    background: var(--bg-secondary);
    box-shadow: 
      0 2px 8px rgba(0, 0, 0, 0.1),
      0 1px 4px rgba(0, 0, 0, 0.05);
  }

  /* FAB içerik animasyonları */
  .fab-content {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .fab-content.rotated {
    transform: rotate(180deg);
  }

  .fab-icon {
    width: 28px;
    height: 28px;
    color: var(--text-primary);
    transition: all 0.2s ease;
  }

  .fab-icon.main-icon {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }

  .fab-icon.close-icon {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }

  /* Ripple efekti */
  .historic-earthquakes-widget.mobile .widget-toggle::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: var(--accent-hover);
    opacity: 0.2;
    transform: translate(-50%, -50%);
    transition: width 0.3s, height 0.3s;
  }

  .historic-earthquakes-widget.mobile .widget-toggle:active::before {
    width: 120%;
    height: 120%;
  }

  .historic-earthquakes-widget.mobile.open {
    position: fixed !important;
    top: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    background: var(--bg-primary);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    margin: 0 !important;
    padding: 0 !important;
  }

  .historic-earthquakes-widget.mobile.open {
    transform: none;
    right: 0;
    bottom: 0;
  }

  .historic-earthquakes-widget.mobile.open .widget-toggle {
    display: none;
  }

  .historic-earthquakes-widget.mobile.open .fab-icon {
    color: var(--accent);
  }

  .historic-earthquakes-widget.mobile .widget-panel {
    flex: 1;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 0;
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    transform: translateY(0);
    animation: slideIn 0.3s ease-out;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    overflow: hidden;
    position: relative;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Desktop Tasarım Korunuyor */
  @media (min-width: 769px) {
    .historic-earthquakes-widget {
      top: 20px;
      right: 20px;
      width: 300px;
    }
  }

  /* Mobil özel stiller */
  @media (max-width: 768px) {
    .filter-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .filter-btn {
      text-align: center;
      padding: 0.5rem;
    }

    .earthquake-item {
      padding: 0.75rem;
    }

    .earthquake-header {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }

    .earthquake-name {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .earthquake-details {
      grid-template-columns: 1fr;
      gap: 0.3rem;
    }

    .detail-row {
      justify-content: space-between;
    }

    .mobile-compact {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.3rem;
    }

    /* Tam ekran için liste alanını optimize et */
    .historic-earthquakes-widget.mobile .earthquakes-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      height: 100%;
      min-height: 0;
      background: var(--bg-primary);
    }

    .historic-earthquakes-widget.mobile .list-header {
      flex-shrink: 0;
      padding: 0.5rem 1rem;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border-color);
    }

    .historic-earthquakes-widget.mobile .list-scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0 !important;
      margin: 0 !important;
      width: 100vw !important;
      max-width: 100vw !important;
      height: 100%;
      -webkit-overflow-scrolling: touch;
      background: var(--bg-primary);
      box-sizing: border-box;
    }

    /* Earthquake item mobilde */
    .historic-earthquakes-widget.mobile .earthquake-item {
      background: var(--bg-card);
      margin: 0.25rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      min-height: 60px;
      width: calc(100vw - 2rem);
      max-width: calc(100vw - 2rem);
      box-sizing: border-box;
    }

    .historic-earthquakes-widget.mobile .earthquake-item:first-child {
      margin-top: 0.5rem;
    }

    .historic-earthquakes-widget.mobile .earthquake-item:last-child {
      margin-bottom: 2rem;
    }

    /* Mobilde container tam yükseklik */
    .historic-earthquakes-widget.mobile.open .widget-panel {
      min-height: 100vh !important;
      max-height: 100vh !important;
    }

    .historic-earthquakes-widget.mobile.open .earthquakes-list {
      min-height: calc(100vh - 140px) !important;
    }

    .historic-earthquakes-widget.mobile.open .list-scroll {
      min-height: calc(100vh - 200px) !important;
      max-height: calc(100vh - 200px) !important;
    }

    .compact-info {
      font-size: 0.7rem;
      color: var(--text-secondary);
      text-align: center;
      flex: 1;
    }

    /* Mobilde daha büyük dokunma alanları */
    .earthquake-item {
      min-height: 60px;
      cursor: pointer;
    }

    .earthquake-item:active {
      background: var(--bg-hover);
      transform: scale(0.98);
    }
  }

  /* Scrollbar styling */
  .list-scroll::-webkit-scrollbar {
    width: 4px;
  }

  .list-scroll::-webkit-scrollbar-track {
    background: var(--bg-secondary);
  }

  .list-scroll::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
  }

  .list-scroll::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
  }
</style>