<template>
  <li class="category-node">
    <div 
      class="category-item"
      :class="{ 'selected': isSelected }"
      @click="selectCategory"
    >
      <div class="category-toggle" v-if="category.children && category.children.length" @click.stop="toggleExpanded">
        <span>{{ isExpanded ? '▼' : '►' }}</span>
      </div>
      <div class="category-content">
        <div class="category-name">{{ category.name }}</div>
        <div class="category-id">ID: {{ category.id }}</div>
      </div>
      <button class="remove-btn" @click.stop="removeCategory" title="Mark as not sold on ShopZZ">✕</button>
    </div>
    
    <ul v-if="isExpanded && category.children && category.children.length" class="child-categories">
      <category-tree-node 
        v-for="child in category.children" 
        :key="child.id"
        :category="child"
        :platformType="platformType"
        @select-category="$emit('select-category', $event)"
        @remove-category="$emit('remove-category', $event)"
      />
    </ul>
  </li>
</template>

<script setup>
import { ref } from 'vue'

// Props
const props = defineProps({
  category: {
    type: Object,
    required: true
  },
  platformType: {
    type: String,
    required: true,
    validator: (value) => ['ozon', 'wb'].includes(value)
  }
})

// Emits
const emit = defineEmits(['select-category', 'remove-category'])

// State
const isExpanded = ref(false)
const isSelected = ref(false)

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
</script>

<style scoped>
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
