<script>
  import { createEventDispatcher } from 'svelte';
  
  export let earthquake = null;
  export let earthquakes = [];
  export let getMagnitudeColor;
  export let darkMode = true;
  export let isNewEarthquake = false;

  const dispatch = createEventDispatcher();

  function handleEarthquakeClick(eq) {
    if (eq) {
      dispatch('select', eq);
      dispatch('animate', eq);
    }
  }

  // Bugünün en büyük depremi
  $: todaysBiggest = getTodaysBiggest(earthquakes);

  function getTodaysBiggest(list) {
    if (!list || list.length === 0) return null;
    
    const today = new Date().toLocaleDateString('tr-TR');
    const todaysEarthquakes = list.filter(eq => {
      const eqDate = eq.date || (eq.dateTime ? new Date(eq.dateTime).toLocaleDateString('tr-TR') : '');
      return eqDate === today;
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
    const today = new Date().toLocaleDateString('tr-TR');
    const eqDate = eq.date || (eq.dateTime ? new Date(eq.dateTime).toLocaleDateString('tr-TR') : '');
    return eqDate === today;
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

  <!-- Widget 3: Bugünkü Sayı -->
  <div class="widget stat-widget">
    <div class="widget-header">
      <div class="widget-icon chart">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
      </div>
      <span class="widget-title">Bugün</span>
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
</div>

<style>
  .widgets-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
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
