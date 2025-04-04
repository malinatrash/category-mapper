<template>
  <div class="category-tree">
    <div v-if="categories.length === 0" class="empty-message">
      No categories available
    </div>
    <ul v-else class="tree-root">
      <category-tree-node 
        v-for="category in categories" 
        :key="category.id"
        :category="category"
        :platformType="platformType"
        @select-category="$emit('select-category', $event)"
        @remove-category="$emit('remove-category', $event)"
      />
    </ul>
  </div>
</template>

<script setup>
import CategoryTreeNode from './CategoryTreeNode.vue'

// Props
defineProps({
  categories: {
    type: Array,
    required: true
  },
  platformType: {
    type: String,
    required: true,
    validator: (value) => ['ozon', 'wb'].includes(value)
  }
})

// Emits
defineEmits(['select-category', 'remove-category'])
</script>

<style scoped>
.category-tree {
  height: 100%;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
  background-color: #f9f9f9;
}

.tree-root {
  list-style-type: none;
  padding-left: 0;
}

.empty-message {
  text-align: center;
  color: #666;
  padding: 20px;
  font-style: italic;
}
</style>
