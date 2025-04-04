<template>
  <div class="mapped-categories-list">
    <div class="mapped-list-header">
      <div class="search-container">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Поиск по сопоставленным категориям..."
          class="search-input"
        />
        <span class="search-icon">🔍</span>
      </div>
      <div class="mapping-count" v-if="categoryMappings.length > 0">
        {{ filteredMappings.length }} из {{ categoryMappings.length }} категорий ShopZZ
      </div>
    </div>
    
    <div v-if="categoryMappings.length === 0" class="empty-message">
      <div class="empty-icon">📋</div>
      <div class="empty-text">Нет сопоставленных категорий</div>
      <div class="empty-subtext">Используйте панель сопоставления для создания новых связей</div>
    </div>
    
    <div v-else-if="filteredMappings.length === 0" class="empty-message">
      <div class="empty-icon">🔍</div>
      <div class="empty-text">Нет результатов</div>
      <div class="empty-subtext">Измените параметры поиска для отображения категорий</div>
    </div>
    
    <div v-else class="mapping-cards-container">
      <div 
        v-for="mapping in filteredMappings" 
        :key="mapping.shopzz_id" 
        class="mapping-card"
        :class="{ 'not-sold': mapping.not_sold }"
      >
        <!-- ShopZZ Category Header -->
        <div class="mapping-card-header">
          <div class="platform-indicator shopzz">
            <span class="platform-icon">ShopZZ</span>
          </div>
          <div class="category-title">
            {{ mapping.shopzz_name }}
            <span v-if="mapping.not_sold" class="not-sold-badge">Не продается</span>
          </div>
          <div class="category-id">ID: {{ mapping.shopzz_id }}</div>
        </div>
        
        <!-- Mapping Content -->
        <div class="mapping-card-content">
          <!-- Status Summary -->
          <div class="mapping-summary">
            <div class="mapping-stats">
              <div class="stat-item">
                <span class="stat-label">Всего связей:</span>
                <span class="stat-value">{{ mapping.mappings.length }}</span>
              </div>
              <div class="platforms-summary">
                <span 
                  class="platform-tag ozon"
                  v-if="countPlatformMappings(mapping, 'ozon') > 0"
                >
                  Ozon: {{ countPlatformMappings(mapping, 'ozon') }}
                </span>
                <span 
                  class="platform-tag wb"
                  v-if="countPlatformMappings(mapping, 'wb') > 0"
                >
                  WB: {{ countPlatformMappings(mapping, 'wb') }}
                </span>
              </div>
            </div>
            <div>
              <button 
                type="button"
                @click.prevent.stop="handleCancelAllMappings(mapping.shopzz_id)" 
                class="action-btn remove-all"
                title="Удалить все сопоставления"
              >
                <span class="btn-icon">🗑️</span> Удалить все
              </button>
            </div>
          </div>
          
          <!-- External Mappings -->
          <div class="external-mappings-container">
            <div v-if="mapping.mappings.length === 0" class="no-mappings">
              <span class="no-mappings-icon">ℹ️</span>
              <span class="no-mappings-text">Нет связанных категорий</span>
            </div>
            
            <div v-else class="external-mappings-list">
              <div 
                v-for="extMapping in mapping.mappings" 
                :key="`${extMapping.platform}-${extMapping.id}`"
                class="external-mapping-item"
                :class="extMapping.platform"
              >
                <div class="external-mapping-content">
                  <div class="platform-badge" :class="extMapping.platform">
                    {{ getPlatformLabel(extMapping.platform) }}
                  </div>
                  <div class="external-details">
                    <div class="external-name">{{ extMapping.name }}</div>
                    <div class="external-id">ID: {{ extMapping.id }}</div>
                  </div>
                </div>
                
                <div>
                  <button 
                    type="button"
                    @click.prevent.stop="handleRemoveMapping(mapping.shopzz_id, extMapping.platform, extMapping.id)" 
                    class="remove-mapping-btn"
                    title="Удалить это сопоставление"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

// Props
const props = defineProps({
  categoryMappings: {
    type: Array,
    required: true
  }
})

// Emits
const emit = defineEmits(['remove-mapping', 'cancel-all-mappings'])

// Search state
const searchQuery = ref('')

// Обработчики для удаления маппингов
const handleRemoveMapping = (shopzzId, platform, externalId) => {
  emit('remove-mapping', shopzzId, platform, externalId)
}

const handleCancelAllMappings = (shopzzId) => {
  emit('cancel-all-mappings', shopzzId)
}

// Helper function to get platform label
const getPlatformLabel = (platform) => {
  if (platform === 'ozon') return 'Ozon'
  if (platform === 'wb') return 'Wildberries'
  return platform
}

// Helper function to count mappings for a specific platform
const countPlatformMappings = (mapping, platform) => {
  if (!mapping.mappings) return 0
  return mapping.mappings.filter(m => m.platform === platform).length
}

// Filtered mappings based on search
const filteredMappings = computed(() => {
  if (!searchQuery.value.trim()) return props.categoryMappings
  
  const query = searchQuery.value.toLowerCase()
  
  return props.categoryMappings.filter(mapping => {
    // Search in ShopZZ category details
    if (mapping.shopzz_name?.toLowerCase().includes(query)) return true
    if (String(mapping.shopzz_id).includes(query)) return true
    
    // Search in external mappings (Ozon, WB)
    if (mapping.mappings && mapping.mappings.length > 0) {
      for (const extMapping of mapping.mappings) {
        if (extMapping.name?.toLowerCase().includes(query)) return true
        if (String(extMapping.id).includes(query)) return true
        if (extMapping.platform?.toLowerCase().includes(query)) return true
      }
    }
    
    // Search in status
    if (mapping.not_sold && ('not sold'.includes(query) || 'не продается'.includes(query))) return true
    
    // Search by platform name
    if ('ozon'.includes(query) && countPlatformMappings(mapping, 'ozon') > 0) return true
    if ('wildberries'.includes(query) && countPlatformMappings(mapping, 'wb') > 0) return true
    if ('wb'.includes(query) && countPlatformMappings(mapping, 'wb') > 0) return true
    
    return false
  })
})


</script>
<style scoped>
/* Main container styles */
.mapped-categories-list {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--light-green);
  border-radius: 8px;
  padding: 15px;
  background-color: #f9fafb;
  max-height: 600px;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

/* Header styles */
.mapped-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eaecef;
}

.search-container {
  position: relative;
  width: 60%;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.search-input:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.15);
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  pointer-events: none;
  font-size: 1.1rem;
}

.mapping-count {
  font-size: 0.95rem;
  color: #666;
  font-weight: 500;
  background-color: #f1f5f1;
  padding: 5px 10px;
  border-radius: 20px;
}

/* Empty state styles */
.empty-message {
  text-align: center;
  color: #666;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 15px;
  color: #aaa;
}

.empty-text {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 8px;
  color: #555;
}

.empty-subtext {
  font-size: 0.95rem;
  color: #888;
  max-width: 400px;
}

/* Mapping cards container */
.mapping-cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

/* Mapping card styles */
.mapping-card {
  border-radius: 8px;
  overflow: hidden;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #eaecef;
}

.mapping-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.mapping-card.not-sold {
  background-color: white;
  border-color: rgba(244, 67, 54, 0.3);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.08);
}

/* Card header */
.mapping-card-header {
  padding: 15px;
  background-color: #f5f9f5;
  display: flex;
  flex-direction: column;
  gap: 5px;
  border-bottom: 1px solid #eaecef;
}

.mapping-card.not-sold .mapping-card-header {
  background-color: rgba(244, 67, 54, 0.05);
}

.platform-indicator {
  display: inline-flex;
  align-items: center;
  margin-bottom: 5px;
}

.platform-indicator.shopzz .platform-icon {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--primary-color);
}

.category-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  word-break: break-word;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.not-sold-badge {
  font-size: 0.7rem;
  font-weight: 600;
  background-color: var(--danger-color);
  color: white;
  padding: 3px 8px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
}

.category-id {
  font-size: 0.85rem;
  color: #666;
  font-family: monospace;
}

/* Card content */
.mapping-card-content {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* Mapping summary */
.mapping-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9fafb;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #eaecef;
}

.mapping-stats {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85rem;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: 600;
  color: #333;
}

.platforms-summary {
  display: flex;
  gap: 8px;
  margin-top: 5px;
}

.platform-tag {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
}

.platform-tag.ozon {
  background-color: rgba(0, 91, 255, 0.1);
  color: #005bff;
}

.platform-tag.wb {
  background-color: rgba(203, 17, 171, 0.1);
  color: #cb11ab;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85rem;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  white-space: nowrap;
}

.action-btn.remove-all {
  background-color: #fff1f0;
  color: var(--danger-color);
  position: relative;
  z-index: 20 !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  border: none;
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
}

.action-btn.remove-all:hover {
  background-color: #ffccc7;
}

.btn-icon {
  font-size: 1rem;
}

/* External mapping styles */
.external-mappings-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.no-mappings {
  text-align: center;
  color: #888;
  font-size: 0.9rem;
  padding: 15px;
  background-color: #f9fafb;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.no-mappings-icon {
  font-size: 1.2rem;
  opacity: 0.7;
}

.external-mappings-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.external-mapping-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background-color: #f9fafb;
  border-radius: 6px;
  border: 1px solid #eaecef;
  transition: background-color 0.2s;
  position: relative;
  isolation: isolate; /* Создает новый контекст наложения */
}

.external-mapping-item:hover {
  background-color: #f5f5f5;
}

.external-mapping-item.ozon {
  border-left: 3px solid #005bff;
}

.external-mapping-item.wb {
  border-left: 3px solid #cb11ab;
}

.external-mapping-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  pointer-events: auto;
}

.platform-badge {
  font-size: 0.8rem;
  padding: 3px 8px;
  background-color: #e0e0e0;
  color: #333;
  border-radius: 20px;
  font-weight: 600;
  min-width: 70px;
  text-align: center;
}

.platform-badge.ozon {
  background-color: rgba(0, 91, 255, 0.1);
  color: #005bff;
}

.platform-badge.wb {
  background-color: rgba(203, 17, 171, 0.1);
  color: #cb11ab;
}

.external-details {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.external-name {
  font-size: 0.9rem;
  color: #333;
  word-break: break-word;
}

.external-id {
  font-size: 0.8rem;
  color: #666;
  font-family: monospace;
}

.remove-mapping-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer !important;
  font-size: 1rem;
  padding: 0 4px;
  transition: color 0.2s;
  height: 30px;
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  position: relative;
  z-index: 20 !important;
  pointer-events: auto !important;
}

.remove-mapping-btn:hover {
  color: #f44336;
  background-color: rgba(244, 67, 54, 0.1);
}

.action-btn-wrapper,
.remove-btn-wrapper {
  position: relative;
  z-index: 10;
}

.action-btn-wrapper button,
.remove-btn-wrapper button {
  pointer-events: auto;
}

/* Responsive design */
@media (max-width: 768px) {
  .mapping-cards-container {
    grid-template-columns: 1fr;
  }
  
  .mapped-list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .search-container {
    width: 100%;
  }
  
  .mapping-summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
