<template>
  <div class="mapping-interface">
    <div class="mapping-header">
      <h2>Сопоставление категорий</h2>
      <div class="mapping-actions">
        <button @click="showAutoMappingModal = true" class="auto-map-btn">
          <span class="icon">🔄</span> Автоматическое сопоставление
        </button>
        <button @click="importSessionData" class="import-btn">Импорт сессии</button>
        <button @click="sessionStore.exportSession()" class="export-btn">Экспорт сессии</button>
        <button @click="sessionStore.resetSession()" class="reset-btn">Сбросить все изменения</button>
      </div>
    </div>
    
    <auto-mapping-modal
      v-model="showAutoMappingModal"
      @start-auto-mapping="handleAutoMapping"
    />
    
    <div class="loading-status" v-if="sessionStore.isLoading">
      <div class="loader"></div>
      <div class="loading-message">{{ translateLoadingMessage(sessionStore.loadingMessage) }}</div>
      
      <!-- Progress bar for auto-mapping -->
      <div class="progress-container" v-if="isAutoMappingInProgress">
        <div class="progress-bar">
          <div 
            class="progress-bar-fill" 
            :style="{ width: `${mappingProgress}%` }"
          ></div>
        </div>
        <div class="progress-stats">
          {{ progressStats }}
        </div>
      </div>
    </div>
    
    <div v-else class="mapping-container">
      <!-- Three-column layout with ShopZZ as the center/primary column -->
      <div class="category-columns three-level">
        <!-- Wildberries Column -->
        <div class="category-column wb-column">
          <h3>Категории Wildberries</h3>
          <div class="search-container">
            <input 
              type="text" 
              v-model="wbSearchQuery" 
              placeholder="Поиск категорий Wildberries..."
              class="search-input"
            />
            <span class="search-icon">🔍</span>
          </div>
          <category-tree 
            :categories="filteredWbCategories" 
            platformType="wb"
            :searchQuery="wbSearchQuery"
            @select-category="handleCategorySelect"
          />
        </div>
        
        <!-- ShopZZ Column (center, primary) -->
        <div class="category-column shopzz-column primary-column">
          <div class="column-header-with-stats">
            <h3>Категории ShopZZ (основные)</h3>
            <div class="category-stats">
              <span class="unmapped-count">Не сопоставлено: {{ sessionStore.shopzzCategories.length }}</span>
            </div>
          </div>
          <div class="search-container">
            <input 
              type="text" 
              v-model="shopzzSearchQuery" 
              placeholder="Поиск в категориях ShopZZ..."
              class="search-input"
            />
            <span class="search-icon">🔍</span>
          </div>
          <category-tree 
            :categories="filteredShopzzCategories" 
            platformType="shopzz"
            :searchQuery="shopzzSearchQuery"
            @select-category="handleShopzzCategorySelect"
          />
          
          <!-- Selected ShopZZ Category Info -->
          <div v-if="selectedShopzzCategory" class="selected-shopzz-info">
            <h4>Выбранная категория ShopZZ:</h4>
            <div class="shopzz-category-details">
              <div>{{ selectedShopzzCategory.name }}</div>
              <div class="category-id">ID: {{ selectedShopzzCategory.id }}</div>
              <div>
                <button 
                  @click="mapSelectedExternalCategory('wb')" 
                  class="map-btn map-wb-btn"
                  :disabled="!selectedWbCategory || !selectedShopzzCategory"
                >
                  Привязать WB категорию
                </button>
                <button 
                  @click="mapSelectedExternalCategory('ozon')" 
                  class="map-btn map-ozon-btn"
                  :disabled="!selectedOzonCategory || !selectedShopzzCategory"
                >
                  Привязать Ozon категорию
                </button>
              </div>
              <div>
                <button 
                  @click="markSelectedShopzzAsNotSold()" 
                  class="not-sold-btn"
                  :disabled="!selectedShopzzCategory"
                >
                  Отметить как "Не продается"
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Ozon Column -->
        <div class="category-column ozon-column">
          <h3>Категории Ozon</h3>
          <div class="search-container">
            <input 
              type="text" 
              v-model="ozonSearchQuery" 
              placeholder="Поиск категорий Ozon..."
              class="search-input"
            />
            <span class="search-icon">🔍</span>
          </div>
          <category-tree 
            :categories="filteredOzonCategories" 
            platformType="ozon"
            :searchQuery="ozonSearchQuery"
            @select-category="handleCategorySelect"
          />
        </div>
      </div>
      
      <!-- Selected External Categories Display -->
      <div class="selected-external-categories">
        <div class="external-category wb" v-if="selectedWbCategory">
          <h4>Выбранная WB категория:</h4>
          <div>{{ selectedWbCategory.name }}</div>
          <div class="category-id">ID: {{ selectedWbCategory.id }}</div>
          <button @click="selectedWbCategory = null" class="clear-btn">✕</button>
        </div>
        
        <div class="external-category ozon" v-if="selectedOzonCategory">
          <h4>Выбранная Ozon категория:</h4>
          <div>{{ selectedOzonCategory.name }}</div>
          <div class="category-id">ID: {{ selectedOzonCategory.id }}</div>
          <button @click="selectedOzonCategory = null" class="clear-btn">✕</button>
        </div>
      </div>
      
      <!-- Mapped Categories List -->
      <div class="mapped-categories-section">
        <h3>Карта сопоставлений</h3>
        <mapped-categories-list 
          ref="mappedCategoriesList"
          :categoryMappings="sessionStore.categoryMappings"
          @remove-mapping="handleRemoveMapping"
          @cancel-all-mappings="handleCancelAllMappings"
        />
      </div>
    </div>
    
    <input 
      type="file" 
      ref="fileInput" 
      style="display: none" 
      accept=".json" 
      @change="handleFileImport"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useSessionStore } from '../stores/session'
import CategoryTree from './CategoryTree.vue'
import MappedCategoriesList from './MappedCategoriesList.vue'
import AutoMappingModal from './AutoMappingModal.vue'

// Store
const sessionStore = useSessionStore()

// State
const selectedWbCategory = ref(null)
const selectedOzonCategory = ref(null)
const selectedShopzzCategory = ref(null)
const fileInput = ref(null)
const wbSearchQuery = ref('')
const ozonSearchQuery = ref('')
const shopzzSearchQuery = ref('')
const showAutoMappingModal = ref(false)

// Progress tracking for auto-mapping
const isAutoMappingInProgress = computed(() => {
  if (!sessionStore.isLoading) return false
  return sessionStore.loadingMessage.value?.includes('Auto-mapping')
})

const progressStats = computed(() => {
  const message = sessionStore.loadingMessage.value || ''
  const match = message.match(/\d+\/\d+/)
  
  if (match) {
    return match[0]
  }
  
  return ''
})

const mappingProgress = computed(() => {
  const message = sessionStore.loadingMessage.value || ''
  const match = message.match(/(\d+)\/(\d+)/)
  
  if (match && match.length >= 3) {
    const [_, current, total] = match
    return Math.round((Number(current) / Number(total)) * 100)
  }
  
  return 0
})

// Search and filter functions
const searchInCategoryTree = (categories, query) => {
  if (!query) return categories
  
  const searchLowerCase = query.toLowerCase()
  
  // Helper function to search in a single category and its children
  const searchInCategory = (category) => {
    // Check if the current category matches
    const nameMatches = category.name.toLowerCase().includes(searchLowerCase)
    const idMatches = String(category.id).includes(searchLowerCase)
    
    // If this category matches, return a copy with all children
    if (nameMatches || idMatches) {
      return { ...category }
    }
    
    // If it doesn't match, check if any children match
    if (category.children && category.children.length > 0) {
      const matchingChildren = category.children
        .map(searchInCategory)
        .filter(Boolean)
      
      // If there are matching children, return this category with only the matching children
      if (matchingChildren.length > 0) {
        return {
          ...category,
          children: matchingChildren
        }
      }
    }
    
    // No matches in this branch
    return null
  }
  
  // Apply search to all root categories
  return categories
    .map(searchInCategory)
    .filter(Boolean)
}

const filteredShopzzCategories = computed(() => {
  return searchInCategoryTree(sessionStore.shopzzCategoryTree, shopzzSearchQuery.value)
})

const filteredWbCategories = computed(() => {
  return searchInCategoryTree(sessionStore.wbCategoryTree, wbSearchQuery.value)
})

const filteredOzonCategories = computed(() => {
  return searchInCategoryTree(sessionStore.ozonCategoryTree, ozonSearchQuery.value)
})

// Lifecycle
onMounted(() => {
  // Initialize data
  sessionStore.initializeData()
})

// Methods
const handleCategorySelect = ({ category, platform }) => {
  if (platform === 'wb') {
    selectedWbCategory.value = category
  } else if (platform === 'ozon') {
    selectedOzonCategory.value = category
  }
}

const handleShopzzCategorySelect = ({ category }) => {
  selectedShopzzCategory.value = category
}

// Functions for managing mappings based on the ShopZZ hierarchy
const mapSelectedExternalCategory = (platform) => {
  if (!selectedShopzzCategory.value) return
  
  if (platform === 'wb' && selectedWbCategory.value) {
    const success = sessionStore.mapCategory(
      selectedShopzzCategory.value.id,
      'wb',
      selectedWbCategory.value
    )
    
    if (success) {
      // Clear selected WB category after successful mapping
      selectedWbCategory.value = null
    }
  } else if (platform === 'ozon' && selectedOzonCategory.value) {
    const success = sessionStore.mapCategory(
      selectedShopzzCategory.value.id,
      'ozon',
      selectedOzonCategory.value
    )
    
    if (success) {
      // Clear selected Ozon category after successful mapping
      selectedOzonCategory.value = null
    }
  }
}

const markSelectedShopzzAsNotSold = () => {
  if (selectedShopzzCategory.value) {
    sessionStore.markCategoryAsNotSold(selectedShopzzCategory.value.id)
  }
}

const handleRemoveMapping = (shopzzId, platform, externalId) => {
  // Вывод отладочной информации
  console.log('Removing mapping:', { shopzzId, platform, externalId })
  console.log('Types:', { 
    shopzzIdType: typeof shopzzId, 
    platformType: typeof platform, 
    externalIdType: typeof externalId
  })
  
  if (confirm('Вы уверены, что хотите удалить это сопоставление?')) {
    try {
      // Преобразуем все аргументы в строки для единообразия
      const result = sessionStore.removeMapping(String(shopzzId), String(platform), String(externalId))
      console.log('Mapping removal result:', result)
      
      // Явно запрашиваем обновление интерфейса
      sessionStore.updateCategoryVisualsBasedOnMappings()
      
      // Отладка маппингов после удаления
      const mapping = sessionStore.categoryMappings.find(m => String(m.shopzz_id) === String(shopzzId))
      if (mapping) {
        console.log('Current mappings for ShopZZ ID', shopzzId, ':', mapping.mappings)
      }
    } catch (error) {
      console.error('Error removing mapping:', error)
    }
  }
}

const handleCancelAllMappings = (shopzzId) => {
  // Вывод отладочной информации
  console.log('Canceling all mappings for:', shopzzId, 'type:', typeof shopzzId)
  
  if (confirm('Вы уверены, что хотите отменить все сопоставления для этой категории ShopZZ?')) {
    try {
      // Преобразуем ID в строку для гарантии корректного сравнения
      const result = sessionStore.cancelAllMappings(String(shopzzId))
      console.log('Cancel all mappings result:', result)
      
      // Явно запрашиваем обновление интерфейса
      sessionStore.updateCategoryVisualsBasedOnMappings()
    } catch (error) {
      console.error('Error canceling all mappings:', error)
    }
  }

  // Явное обновление интерфейса
  nextTick(() => {
    console.log('Updated mappings count:', sessionStore.categoryMappings.length)
    
    // Проверяем, действительно ли удалены маппинги
    const mapping = sessionStore.categoryMappings.find(m => String(m.shopzz_id) === String(shopzzId))
    if (mapping) {
      console.log('Current mappings for ShopZZ ID', shopzzId, ':', mapping.mappings || [])
    }
  })
}

// Translate loading messages
const translateLoadingMessage = (message) => {
  if (!message) return ''
  
  // Auto-mapping messages
  if (message.includes('Auto-mapping in progress')) {
    return message
      .replace('Auto-mapping in progress', 'Автоматическое сопоставление в процессе')
      .replace('processed', 'обработано')
      .replace('mapped', 'сопоставлено')
  }
  
  if (message.includes('Auto-mapping complete')) {
    return message
      .replace('Auto-mapping complete', 'Автоматическое сопоставление завершено')
      .replace('categories mapped', 'категорий сопоставлено')
      .replace('processed', 'обработано')
      .replace('out of', 'из')
  }
  
  if (message.includes('Loading category data')) {
    return 'Загрузка данных категорий...'
  }
  
  if (message.includes('Category data loaded successfully')) {
    return 'Данные категорий успешно загружены'
  }
  
  if (message.includes('Error loading category data')) {
    return 'Ошибка при загрузке данных категорий'
  }
  
  if (message.includes('Resetting session data')) {
    return 'Сброс данных сессии...'
  }
  
  if (message.includes('Session reset successfully')) {
    return 'Сессия успешно сброшена'
  }
  
  // Default: return the original message
  return message
}

const handleCategoryRemove = ({ category, platform }) => {
  sessionStore.markCategoryAsNotSold(platform, category)
  
  // Reset selection if needed
  if (platform === 'wb' && selectedWbCategory.value && selectedWbCategory.value.id === category.id) {
    selectedWbCategory.value = null
  } else if (platform === 'ozon' && selectedOzonCategory.value && selectedOzonCategory.value.id === category.id) {
    selectedOzonCategory.value = null
  }
}

const mapSelectedCategories = () => {
  if (canMap.value) {
    sessionStore.mapCategories(selectedOzonCategory.value, selectedWbCategory.value)
    
    // Reset selections
    selectedWbCategory.value = null
    selectedOzonCategory.value = null
  }
}

const importSessionData = () => {
  fileInput.value.click()
}

const handleFileImport = (event) => {
  const file = event.target.files[0]
  
  if (file) {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const sessionData = JSON.parse(e.target.result)
        sessionStore.importSession(sessionData)
      } catch (error) {
        alert(`Error importing session data: ${error.message}`)
      }
    }
    
    reader.readAsText(file)
    
    // Reset file input
    event.target.value = null
  }
}

const handleAutoMapping = (threshold) => {
  sessionStore.autoMapCategories(threshold)
}
</script>

<style scoped>
.mapping-interface {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.mapping-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--light-green);
}

.mapping-header h2 {
  color: var(--accent-color);
  font-weight: 500;
}

.mapping-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.loading-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.loader {
  border: 4px solid rgba(76, 175, 80, 0.2);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 2s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-container {
  width: 100%;
  max-width: 400px;
  margin-top: 15px;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background-color: #f0f0f0;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 5px;
}

.progress-bar-fill {
  height: 100%;
  background-color: var(--primary-color);
  transition: width 0.3s ease;
}

.progress-stats {
  text-align: center;
  font-size: 0.9rem;
  color: #666;
  font-family: monospace;
}

.mapping-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 20px;
}

.category-columns {
  display: flex;
  gap: 20px;
  height: 400px;
}

.category-column {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.category-column h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--accent-color);
  font-weight: 500;
}

.column-header-with-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.category-stats {
  font-size: 0.9rem;
}

.unmapped-count {
  background-color: var(--light-green);
  color: var(--accent-color);
  padding: 3px 8px;
  border-radius: 20px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
}

.mapping-controls {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 15px;
  min-width: 200px;
}

.selected-category {
  width: 100%;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
}

.wb-category {
  background-color: var(--light-green);
  border: 1px solid var(--primary-color);
}

.ozon-category {
  background-color: var(--light-green);
  border: 1px solid var(--primary-color);
}

.placeholder {
  color: #999;
  font-style: italic;
  padding: 10px;
  text-align: center;
  border: 1px dashed #ddd;
  border-radius: 4px;
  width: 100%;
}

.category-id {
  font-size: 0.8rem;
  color: #666;
}

.map-btn {
  padding: 8px 16px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.map-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.map-btn:not(:disabled):hover {
  background-color: var(--accent-color);
}

.import-btn, .export-btn {
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.search-container {
  position: relative;
  margin-bottom: 10px;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 30px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: all 0.3s;
  background-color: white;
}

.search-input:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  pointer-events: none;
}

.import-btn {
  background-color: #ffffff;
  border: 1px solid #d9d9d9;
  color: rgba(0, 0, 0, 0.85);
}

.export-btn {
  background-color: #f0f0f0;
  border: 1px solid #d9d9d9;
  color: rgba(0, 0, 0, 0.85);
}

.reset-btn {
  background-color: #fff1f0;
  border: 1px solid var(--danger-color);
  color: var(--danger-color);
}

.reset-btn:hover {
  background-color: #ffe6e6;
  border-color: var(--danger-color);
}

.auto-map-btn {
  background-color: var(--primary-color);
  border: 1px solid var(--accent-color);
  color: white;
  display: flex;
  align-items: center;
  gap: 5px;
}

.auto-map-btn:hover {
  background-color: var(--accent-color);
}

.auto-map-btn .icon {
  font-size: 14px;
}

.mapped-categories-section {
  flex: 1;
}

.mapped-categories-section h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--accent-color);
  font-weight: 500;
}
</style>
