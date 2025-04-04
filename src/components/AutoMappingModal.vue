<template>
  <div class="auto-mapping-modal" v-if="modelValue">
    <div class="modal-overlay" @click="$emit('update:modelValue', false)"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Настройки автоматического сопоставления</h3>
        <button class="close-btn" @click="$emit('update:modelValue', false)">✕</button>
      </div>
      
      <div class="modal-body">
        <div class="info-card">
          <h4>Новый улучшенный алгоритм автосопоставления</h4>
          <div class="feature-list">
            <div class="feature-item">
              <div class="feature-icon">✓</div>
              <div class="feature-text">Двухэтапный алгоритм сопоставления</div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">✓</div>
              <div class="feature-text">Наследование иерархии категорий от Ozon</div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">✓</div>
              <div class="feature-text">Числовые ID для категорий ShopZZ</div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">✓</div>
              <div class="feature-text">Подробная статистика процесса</div>
            </div>
          </div>
        </div>
        
        <div class="description">
          <p>Автоматическое сопоставление анализирует категории Ozon и WildBerries в два этапа:</p>
          <ol class="process-steps">
            <li>Сначала находит точные совпадения названий</li>
            <li>Затем ищет наиболее похожие названия среди оставшихся категорий</li>
          </ol>
          <p>Все категории ShopZZ наследуют иерархию от категорий Ozon, сохраняя связи parent_id.</p>
          <p>Настройте порог сходства для контроля точности сопоставления.</p>          
        </div>
        
        <div class="threshold-control">
          <label for="similarity-threshold">Порог сходства: {{ threshold }}%</label>
          <div class="slider-container">
            <input 
              type="range" 
              id="similarity-threshold" 
              v-model="threshold" 
              min="50" 
              max="100" 
              step="1"
              class="threshold-slider"
            />
            <div class="threshold-labels">
              <span>50% (Мягкий)</span>
              <span>75%</span>
              <span>100% (Точный)</span>
            </div>
          </div>
        </div>
        
        <div class="threshold-explanation">
          <p><strong>Что это означает:</strong></p>
          <ul>
            <li><strong>50%:</strong> Больше категорий будет сопоставлено автоматически, но с меньшей точностью</li>
            <li><strong>75%:</strong> Сбалансированный подход - подходит для большинства случаев</li>
            <li><strong>100%:</strong> Будут сопоставлены только категории с высоким сходством названий</li>
          </ul>
        </div>
      </div>
      
      <div class="modal-footer">
        <button 
          class="cancel-btn" 
          @click.prevent.stop="$emit('update:modelValue', false)"
          type="button"
        >
          Отмена
        </button>
        <button 
          class="start-btn" 
          @click.prevent.stop="startAutoMapping"
          type="button"
        >
          Начать автоматическое сопоставление
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Props
defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'start-auto-mapping'])

// State
const threshold = ref(75) // Default 75% similarity

// Methods
const startAutoMapping = (event) => {
  // Предотвращаем стандартное поведение и всплытие события
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  
  // Вызываем автосопоставление с выбранным порогом сходства
  console.log('Starting auto-mapping with threshold:', threshold.value)
  emit('start-auto-mapping', threshold.value)
  
  // Закрываем модальное окно
  emit('update:modelValue', false)
}
</script>

<style scoped>
.auto-mapping-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  width: 500px;
  max-width: 90%;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 1001;
  border: 1px solid var(--light-green);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--light-green);
  background-color: var(--primary-color);
  color: white;
  border-radius: 8px 8px 0 0;
}

.modal-header h3 {
  margin: 0;
  color: var(--accent-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: white;
}

.close-btn:hover {
  color: rgba(255, 255, 255, 0.8);
}

.modal-body {
  padding: 20px;
  flex: 1;
}

.description {
  margin-bottom: 16px;
  color: #666;
}

.threshold-control {
  margin-bottom: 20px;
}

.threshold-control label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.slider-container {
  display: flex;
  flex-direction: column;
}

.threshold-slider {
  width: 100%;
  margin-bottom: 5px;
  accent-color: var(--primary-color);
  height: 6px;
}

.threshold-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #666;
}

.threshold-explanation {
  background-color: var(--light-green);
  padding: 10px 15px;
  border-radius: 4px;
  margin-top: 15px;
}

.threshold-explanation p {
  margin-top: 0;
  margin-bottom: 8px;
}

.threshold-explanation ul {
  margin: 0;
  padding-left: 20px;
}

.threshold-explanation li {
  margin-bottom: 5px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #e8e8e8;
}

.cancel-btn, .start-btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.cancel-btn {
  background-color: white;
  border: 1px solid var(--primary-color);
  color: var(--accent-color);
}

.cancel-btn:hover {
  background-color: var(--light-green);
}

.start-btn {
  background-color: var(--primary-color);
  border: 1px solid var(--primary-color);
  color: white;
}

.start-btn:hover {
  background-color: var(--accent-color);
  border-color: var(--accent-color);
}
</style>
