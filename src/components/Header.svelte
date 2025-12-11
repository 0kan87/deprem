<script>
  import { createEventDispatcher } from 'svelte';
  
  export let notificationPermission = 'default';
  export let darkMode = true;
  export let connected = false;
  
  const dispatch = createEventDispatcher();

  function handleNotificationClick() {
    dispatch('requestPermission');
  }

  function handleThemeToggle() {
    dispatch('toggleTheme');
  }
</script>

<header>
  <div class="header-content">
    <div class="logo">
      <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
        <line x1="12" y1="2" x2="12" y2="4"/>
        <line x1="12" y1="20" x2="12" y2="22"/>
        <line x1="2" y1="12" x2="4" y2="12"/>
        <line x1="20" y1="12" x2="22" y2="12"/>
      </svg>
      <div class="logo-text">
        <h1>Deprem Takip</h1>
        <span class="subtitle">Kandilli Rasathanesi</span>
      </div>
    </div>

    <div class="header-actions">
      <div class="live-indicator" class:connected>
        <span class="pulse"></span>
        <span>{connected ? 'Anlık' : 'Canlı'}</span>
      </div>

      <button 
        class="action-btn"
        on:click={handleThemeToggle}
        title={darkMode ? 'Açık Tema' : 'Koyu Tema'}
      >
        {#if darkMode}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        {/if}
      </button>

      <button 
        class="action-btn"
        class:active={notificationPermission === 'granted'}
        class:denied={notificationPermission === 'denied'}
        on:click={handleNotificationClick}
        disabled={notificationPermission === 'denied'}
        title={notificationPermission === 'granted' ? 'Bildirimler Aktif' : notificationPermission === 'denied' ? 'Bildirimler Engellendi' : 'Bildirimleri Aç'}
      >
        {#if notificationPermission === 'granted'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        {:else if notificationPermission === 'denied'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            <path d="M18.63 13A17.89 17.89 0 0 1 18 8"/>
            <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/>
            <path d="M18 8a6 6 0 0 0-9.33-5"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        {/if}
      </button>
    </div>
  </div>
</header>

<style>
  header {
    background: var(--bg-card);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 1000;
  }

  .header-content {
    max-width: 1600px;
    margin: 0 auto;
    padding: 0.75rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .logo-icon {
    width: 32px;
    height: 32px;
    color: var(--accent);
  }

  .logo-text h1 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .subtitle {
    font-size: 0.65rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .live-indicator {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    height: 34px;
    padding: 0 0.75rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid var(--success);
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--success);
  }

  .live-indicator.connected {
    background: rgba(59, 130, 246, 0.1);
    border-color: var(--accent);
    color: var(--accent);
  }

  .pulse {
    width: 6px;
    height: 6px;
    background: currentColor;
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.3); }
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-primary);
  }

  .action-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--accent);
  }

  .action-btn svg {
    width: 18px;
    height: 18px;
  }

  .action-btn.active {
    background: rgba(34, 197, 94, 0.1);
    border-color: var(--success);
    color: var(--success);
  }

  .action-btn.denied {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 600px) {
    .header-content {
      justify-content: center;
      padding: 0.625rem 0.75rem;
    }

    .logo-text h1 {
      font-size: 1rem;
    }

    .logo-icon {
      width: 28px;
      height: 28px;
    }
  }
</style>
