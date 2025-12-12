<script>
  import { historicEarthquakes, getTurkishEarthquakes, getWorldEarthquakes, getEarthquakesByMagnitude, getEarthquakesByDeaths } from '../data/historicEarthquakes.js';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  
  export let darkMode = false;
  
  let isOpen = false;
  let selectedFilter = 'all'; // 'all', 'turkey', 'world', 'magnitude', 'deaths'
  let selectedEarthquake = null;
  
  $: filteredEarthquakes = getFilteredEarthquakes(selectedFilter);
  
  function getFilteredEarthquakes(filter) {
    switch(filter) {
      case 'turkey':
        return getTurkishEarthquakes();
      case 'world':
        return getWorldEarthquakes();
      case 'magnitude':
        return getEarthquakesByMagnitude(7.0);
      case 'deaths':
        return getEarthquakesByDeaths().slice(0, 10);
      default:
        return historicEarthquakes;
    }
  }
  
  function toggleWidget() {
    isOpen = !isOpen;
  }
  
  function selectEarthquake(earthquake) {
    selectedEarthquake = earthquake;
    dispatch('earthquakeSelected', earthquake);
    
    // Animasyon için event gönder
    dispatch('triggerEffect', earthquake);
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
</script>

<div class="historic-earthquakes-widget" class:dark={darkMode} class:open={isOpen}>
  <!-- Widget Toggle Button -->
  <button class="widget-toggle" on:click={toggleWidget} title="Tarihi Büyük Depremler">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      <circle cx="12" cy="12" r="1"/>
    </svg>
    <span class="widget-text">Tarihi Depremler</span>
    <div class="toggle-indicator" class:rotated={isOpen}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </div>
  </button>

  <!-- Widget Panel -->
  {#if isOpen}
    <div class="widget-panel">
      <!-- Filter Buttons -->
      <div class="filter-section">
        <div class="filter-title">📊 Filtreler</div>
        <div class="filter-buttons">
          <button 
            class="filter-btn"
            class:active={selectedFilter === 'all'}
            on:click={() => selectedFilter = 'all'}
          >
            🌍 Tümü ({historicEarthquakes.length})
          </button>
          <button 
            class="filter-btn"
            class:active={selectedFilter === 'turkey'}
            on:click={() => selectedFilter = 'turkey'}
          >
            🇹🇷 Türkiye ({getTurkishEarthquakes().length})
          </button>
          <button 
            class="filter-btn"
            class:active={selectedFilter === 'world'}
            on:click={() => selectedFilter = 'world'}
          >
            🌎 Dünya ({getWorldEarthquakes().length})
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
                <div class="earthquake-magnitude" style="background-color: {getMagnitudeColor(earthquake.magnitude)};">
                  {earthquake.magnitude}
                </div>
              </div>
              
              <div class="earthquake-details">
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
    max-height: 70vh;
    display: flex;
    flex-direction: column;
  }

  .filter-section {
    padding: 1rem;
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
    padding: 1rem;
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

  /* Mobile responsive */
  @media (max-width: 768px) {
    .historic-earthquakes-widget {
      top: 8px;
      right: 8px;
      left: 8px;
      width: auto;
    }

    .filter-buttons {
      flex-direction: column;
    }

    .filter-btn {
      width: 100%;
      text-align: left;
    }

    .earthquake-details {
      grid-template-columns: 1fr;
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