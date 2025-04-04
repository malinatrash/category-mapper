<template>
  <li class="category-node">
    <div 
      class="category-item"
      :class="{ 
        'selected': isSelected, 
        'highlight-match': matchesSearch,
        'has-matching-child': hasMatchingChild,
        'mapped-category': isMapped
      }"
      @click="selectCategory"
    >
      <div class="category-toggle" v-if="category.children && category.children.length" @click.stop="toggleExpanded">
        <span>{{ isExpanded ? '▼' : '►' }}</span>
      </div>
      <div class="category-content">
        <div class="category-name">
          <span v-if="matchesSearch" class="highlight-text">{{ category.name }}</span>
          <span v-else>{{ category.name }}</span>
        </div>
        <div class="category-id">ID: {{ category.id }}</div>
      </div>
      <button class="remove-btn" @click.stop="removeCategory" title="Mark as not sold on ShopZZ">✕</button>
    </div>
    
    <ul v-if="(isExpanded || hasMatchingChild || matchesSearch) && category.children && category.children.length" class="child-categories">
      <category-tree-node 
        v-for="child in category.children" 
        :key="child.id"
        :category="child"
        :platformType="platformType"
        :searchQuery="searchQuery"
        :matchesParent="matchesSearch || hasMatchingChild || matchesParent"
        @select-category="$emit('select-category', $event)"
        @remove-category="$emit('remove-category', $event)"
        @has-match="childHasMatch"
      />
    </ul>
  </li>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSessionStore } from '../stores/session'

// Store
const sessionStore = useSessionStore()

// Props
const props = defineProps({
  category: {
    type: Object,
    required: true
  },
  platformType: {
    type: String,
    required: true,
    validator: (value) => ['ozon', 'wb', 'shopzz'].includes(value)
  },
  searchQuery: {
    type: String,
    default: ''
  },
  matchesParent: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['select-category', 'remove-category', 'has-match'])

// State
const isExpanded = ref(false)
const isSelected = ref(false)
const hasMatchingChild = ref(false)

// Проверяем, имеет ли категория сопоставления (только для ShopZZ)
const isMapped = computed(() => {
  if (props.platformType !== 'shopzz') return false
  
  const categoryId = String(props.category.id)
  const mapping = sessionStore.categoryMappings.find(m => String(m.shopzz_id) === categoryId)
  
  return mapping && mapping.mappings && mapping.mappings.length > 0
})

// Вычисляем, соответствует ли текущая категория поисковому запросу
const matchesSearch = computed(() => {
  if (!props.searchQuery || props.searchQuery.trim() === '') return false
  
  const query = props.searchQuery.toLowerCase()
  const categoryName = props.category.name.toLowerCase()
  const categoryId = props.category.id.toString().toLowerCase()
  
  return categoryName.includes(query) || categoryId.includes(query)
})

// Если категория соответствует поиску, оповещаем родителя
watch(matchesSearch, (newValue) => {
  if (newValue) {
    emit('has-match', true)
  }
})

// Автоматически раскрываем узел, если он или его потомки соответствуют поиску
watch(() => props.searchQuery, (newValue) => {
  if (newValue && (matchesSearch.value || props.matchesParent)) {
    isExpanded.value = true
  }
})

// Если родитель сообщил, что он соответствует поиску, раскрываем и этот узел
watch(() => props.matchesParent, (newValue) => {
  if (newValue) {
    isExpanded.value = true
  }
})

// Methods
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const selectCategory = () => {
  isSelected.value = true
  emit('select-category', { 
    category: props.category, 
    platform: props.platformType 
  })
  
  // Reset selection after a short delay
  setTimeout(() => {
    isSelected.value = false
  }, 1000)
}

const removeCategory = () => {
  if (confirm(`Are you sure you want to mark "${props.category.name}" as not sold on ShopZZ?`)) {
    emit('remove-category', { 
      category: props.category, 
      platform: props.platformType 
    })
  }
}

// Обработчик для уведомления о наличии совпадения в дочернем элементе
const childHasMatch = (hasMatch) => {
  if (hasMatch) {
    hasMatchingChild.value = true
    emit('has-match', true) // Передаем информацию дальше вверх по дереву
    isExpanded.value = true // Автоматически раскрываем узел
  }
}
</script>

<style scoped>
.mapped-category {
  background-color: rgba(76, 175, 80, 0.1); /* Легкий зеленый фон */
  border-left: 3px solid #4CAF50; /* Зеленая полоса слева */
}
.category-node {
  margin: 2px 0;
  list-style-type: none;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  background-color: white;
  border: 1px solid #eaeaea;
}

.category-item:hover {
  background-color: #f0f7ff;
}

.category-item.selected {
  background-color: #e1f0ff;
}

/* Стили для подсветки при поиске */
.highlight-match {
  background-color: rgba(255, 238, 88, 0.3);
  border-left: 3px solid #ffcc00 !important;
}

.highlight-text {
  font-weight: bold;
  color: #333;
}

.has-matching-child {
  background-color: rgba(255, 238, 88, 0.1);
  border-left: 3px solid rgba(255, 204, 0, 0.5) !important;
}

.category-toggle {
  margin-right: 8px;
  width: 16px;
  text-align: center;
  user-select: none;
  color: #666;
}

.category-content {
  flex: 1;
}

.category-name {
  font-weight: 500;
}

.category-id {
  font-size: 0.8rem;
  color: #666;
}

.remove-btn {
  visibility: hidden;
  background: none;
  border: none;
  color: #ff4d4d;
  cursor: pointer;
  font-weight: bold;
  padding: 0 4px;
  font-size: 1rem;
}

.category-item:hover .remove-btn {
  visibility: visible;
}

.remove-btn:hover {
  background-color: #ffebeb;
  border-radius: 4px;
}

.child-categories {
  padding-left: 20px;
  margin-top: 2px;
  list-style-type: none;
}
</style>
