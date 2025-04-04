<template>
  <div class="app">
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title">Маппер Категорий</h1>
        <div class="app-subtitle">Сопоставление категорий между ShopZZ, Wildberries и Ozon</div>
      </div>
    </header>
    
    <main class="app-main">
      <router-view />
    </main>
    
    <footer class="app-footer">
      <div class="footer-content">
        <p>© 2025 Маппер Категорий</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
// App-level logic can go here
</script>

<style>
/* Global styles */
:root {
  --primary-color: #4caf50;
  --secondary-color: #ffffff;
  --background-color: #f5f5f5;
  --text-color: #333;
  --border-color: #e0e0e0;
  --accent-color: #2e7d32;
  --light-green: #e8f5e9;
  --danger-color: #f44336;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 
    'Open Sans', 'Helvetica Neue', sans-serif;
  color: var(--text-color);
  background-color: var(--background-color);
  line-height: 1.6;
}

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1rem 0;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.app-title {
  color: white;
  margin-bottom: 0.2rem;
}

.app-subtitle {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1rem;
}

.app-main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 1.5rem;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
}

.app-footer {
  background-color: var(--light-green);
  padding: 0.8rem 0;
  border-top: 1px solid var(--border-color);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  text-align: center;
  color: var(--accent-color);
  font-size: 0.9rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .app-main {
    padding: 1rem;
    margin-top: 1rem;
    margin-bottom: 1rem;
  }
  
  .header-content, .footer-content {
    padding: 0 1rem;
  }
}
</style>
