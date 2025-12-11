<script>
  import { createEventDispatcher } from 'svelte';

  export let earthquakes = [];
  export let getMagnitudeColor;
  export let darkMode = true;

  const dispatch = createEventDispatcher();

  function handleSelect(earthquake) {
    dispatch('select', earthquake);
    dispatch('animate', earthquake);
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

    if (isNaN(earthquakeDate.getTime())) {
      return '-';
    }

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
    if (eq.time && eq.time !== 'undefined') return eq.time;
    if (eq.dateTime) return new Date(eq.dateTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return '-';
  }
</script>

<div class="earthquake-list">
  <div class="list-header">
    <div class="header-left">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
      <h3>Son Depremler</h3>
    </div>
    <span class="count">{earthquakes.length}</span>
  </div>

  <div class="list-content">
    {#each earthquakes as earthquake, index}
      <button 
        class="earthquake-item" 
        class:latest={index === 0}
        on:click={() => handleSelect(earthquake)}
      >
        <div 
          class="magnitude" 
          style="background: {getMagnitudeColor(earthquake.magnitude)}"
        >
          {earthquake.magnitude.toFixed(1)}
        </div>

        <div class="details">
          <div class="location">{earthquake.location || 'Bilinmeyen Konum'}</div>
          <div class="meta">
            <span class="depth">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
                <line x1="12" y1="2" x2="12" y2="5"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
              {earthquake.depth} km
            </span>
            <span class="time">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {getDisplayTime(earthquake)}
            </span>
          </div>
        </div>

        <div class="time-ago">
          {formatTimeAgo(earthquake.dateTime, earthquake.date, earthquake.time)}
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .earthquake-list {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .header-left svg {
    width: 18px;
    height: 18px;
    opacity: 0.7;
  }

  .list-header h3 {
    font-size: 0.9rem;
    font-weight: 600;
  }

  .count {
    font-size: 0.75rem;
    color: var(--text-secondary);
    background: var(--bg-hover);
    padding: 0.25rem 0.625rem;
    border-radius: 12px;
    font-weight: 500;
  }

  .list-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .earthquake-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    margin-bottom: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
    color: inherit;
    font-family: inherit;
  }

  .earthquake-item:hover {
    background: var(--bg-hover);
    border-color: var(--border-color);
  }

  .earthquake-item.latest {
    background: var(--bg-hover);
    border-color: var(--accent);
  }

  .magnitude {
    width: 42px;
    height: 42px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.9rem;
    color: white;
    flex-shrink: 0;
  }

  .details {
    flex: 1;
    min-width: 0;
  }

  .location {
    font-size: 0.8rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-primary);
  }

  .meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  .meta span {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .meta svg {
    width: 12px;
    height: 12px;
    opacity: 0.6;
  }

  .time-ago {
    font-size: 0.7rem;
    color: var(--text-secondary);
    white-space: nowrap;
    padding: 0.2rem 0.5rem;
    background: var(--bg-secondary);
    border-radius: 4px;
    font-weight: 500;
  }

  @media (max-width: 480px) {
    .meta {
      flex-direction: column;
      gap: 0.15rem;
    }

    .magnitude {
      width: 38px;
      height: 38px;
      font-size: 0.85rem;
    }
  }
</style>
