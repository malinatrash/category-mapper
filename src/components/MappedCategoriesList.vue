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
      <div class="mapping-count" v-if="mappedCategories.length > 0">
        {{ filteredMappings.length }} из {{ mappedCategories.length }} сопоставлений
      </div>
    </div>
    
    <div v-if="mappedCategories.length === 0" class="empty-message">
      Категории еще не сопоставлены. Сопоставьте категории, чтобы увидеть их здесь.
    </div>
    
    <div v-else-if="filteredMappings.length === 0" class="empty-message">
      Нет сопоставлений, соответствующих критериям поиска.
    </div>
    
    <table v-else class="mapping-table">
      <thead>
        <tr>
          <th>ShopZZ ID</th>
          <th>Parent ID</th>
          <th>Категория Wildberries</th>
          <th>Категория Ozon</th>
          <th>Статус</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="mapping in filteredMappings" :key="mapping.shopz_id" :class="{ 'not-sold': mapping.not_sold }">
          <td class="id-cell">{{ mapping.shopz_id }}</td>
          <td class="id-cell">{{ mapping.shopz_parent_id !== null ? mapping.shopz_parent_id : '–' }}</td>
          <td class="category-cell">
            <div v-if="mapping.wb_id">
              <div>{{ mapping.wb_name }}</div>
              <div class="category-id">ID: {{ mapping.wb_id }}</div>
            </div>
            <div v-else class="not-available">Недоступно</div>
          </td>
          <td class="category-cell">
            <div v-if="mapping.ozon_id">
              <div>{{ mapping.ozon_name }}</div>
              <div class="category-id">ID: {{ mapping.ozon_id }}</div>
            </div>
            <div v-else class="not-available">Недоступно</div>
          </td>
          <td class="status-cell">
            <span v-if="mapping.not_sold" class="not-sold-badge">Не продается на ShopZZ</span>
            <span v-else class="mapped-badge">Сопоставлено</span>
          </td>
          <td class="actions-cell">
            <div class="action-buttons">
              <button 
                @click="cancelMapping(mapping.shopz_id)" 
                class="cancel-btn" 
                title="Отменить сопоставление (вернуть в несопоставленные)">
                ↺
              </button>
              <button 
                @click="removeMapping(mapping.shopz_id)" 
                class="remove-btn" 
                title="Удалить сопоставление">
                ✕
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  mappedCategories: {
    type: Array,
    required: true
  }
})

// Search state
const searchQuery = ref('')

// Filtered mappings based on search
const filteredMappings = computed(() => {
  if (!searchQuery.value.trim()) return props.mappedCategories
  
  const query = searchQuery.value.toLowerCase()
  
  return props.mappedCategories.filter(mapping => {
    // Search in ShopZZ ID (теперь это число)
    if (String(mapping.shopz_id).includes(query)) return true
    
    // Search in WB category name and ID
    if (mapping.wb_name?.toLowerCase().includes(query)) return true
    if (String(mapping.wb_id).includes(query)) return true
    
    // Search in Ozon category name and ID
    if (mapping.ozon_name?.toLowerCase().includes(query)) return true
    if (String(mapping.ozon_id).includes(query)) return true
    
    // Search in status
    if (mapping.not_sold && 'not sold'.includes(query)) return true
    if (!mapping.not_sold && 'mapped'.includes(query)) return true
    
    return false
  })
})

// Emits
const emit = defineEmits(['remove-mapping', 'cancel-mapping'])

// Methods
const removeMapping = (shopzId) => {
  if (confirm('Вы уверены, что хотите удалить это сопоставление?')) {
    emit('remove-mapping', shopzId)
  }
}

// Отменить сопоставление и вернуть категорию в несопоставленные
const cancelMapping = (shopzId) => {
  if (confirm('Вы уверены, что хотите отменить сопоставление? Категории вернутся в список несопоставленных.')) {
    emit('cancel-mapping', shopzId)
  }
}
</script>

<style scoped>
.mapped-categories-list {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--light-green);
  border-radius: 4px;
  padding: 10px;
  background-color: white;
  max-height: 400px;
  overflow-y: auto;
}

.mapped-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.search-container {
  position: relative;
  width: 60%;
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

.mapping-count {
  font-size: 0.9rem;
  color: #666;
}

.empty-message {
  text-align: center;
  color: #666;
  padding: 20px;
  font-style: italic;
}

.mapping-table {
  width: 100%;
  border-collapse: collapse;
}

.mapping-table th,
.mapping-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.mapping-table th {
  background-color: var(--light-green);
  font-weight: 600;
  color: var(--accent-color);
}

.mapping-table tr:last-child td {
  border-bottom: none;
}

.mapping-table tr:hover {
  background-color: var(--light-green);
}

.id-cell {
  font-family: monospace;
  color: #666;
  font-size: 0.9rem;
}

.category-cell {
  max-width: 300px;
}

.category-id {
  font-size: 0.8rem;
  color: #666;
}

.not-available {
  color: #999;
  font-style: italic;
}

.status-cell {
  white-space: nowrap;
}

.mapped-badge {
  background-color: var(--primary-color);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
}

.not-sold-badge {
  background-color: var(--danger-color);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
}

.actions-cell {
  width: 60px;
  text-align: center;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--danger-color);
  cursor: pointer;
  font-weight: bold;
  padding: 0 4px;
  font-size: 1rem;
}

.remove-btn:hover {
  background-color: #ffebeb;
  border-radius: 4px;
}

tr.not-sold {
  background-color: rgba(244, 67, 54, 0.1);
}

tr.not-sold:hover {
  background-color: rgba(244, 67, 54, 0.15);
}
</style>
