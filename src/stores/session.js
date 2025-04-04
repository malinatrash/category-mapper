import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// Utility function to generate ShopZZ ID
// Теперь просто используем Ozon ID как ShopZZ ID
const getShopZId = ozonCategory => {
	// Если есть Ozon ID, используем его
	if (ozonCategory && ozonCategory.id) {
		return ozonCategory.id
	}
	// В случае, если сопоставление создано только для WB категории (без Ozon)
	// генерируем отрицательный ID, чтобы избежать конфликтов
	return -1 * Math.floor(Math.random() * 1000000) - 1
}

export const useSessionStore = defineStore(
	'session',
	() => {
		// State
		const unmappedOzonCategories = ref([])
		const unmappedWbCategories = ref([])
		const mappedCategories = ref([])
		const isLoading = ref(false)
		const loadingMessage = ref('')

		// Generate category tree structure from flat categories array
		const buildCategoryTree = categories => {
			const idMap = {}
			const rootItems = []

			// First pass: Create nodes
			categories.forEach(category => {
				idMap[category.id] = {
					...category,
					children: [],
				}
			})

			// Second pass: Build tree
			categories.forEach(category => {
				const node = idMap[category.id]
				if (category.parent_id === null) {
					rootItems.push(node)
				} else if (idMap[category.parent_id]) {
					idMap[category.parent_id].children.push(node)
				}
			})

			return rootItems
		}

		// Create tree structure for categories
		const ozonCategoryTree = computed(() =>
			buildCategoryTree(unmappedOzonCategories.value)
		)
		const wbCategoryTree = computed(() =>
			buildCategoryTree(unmappedWbCategories.value)
		)

		// Keep original data for reset functionality
		const originalOzonCategories = ref([])
		const originalWbCategories = ref([])

		// Initialize data
		const initializeData = async () => {
			isLoading.value = true
			loadingMessage.value = 'Loading category data...'

			try {
				// Load Ozon categories
				const ozonResponse = await fetch('/data/ozon_unified.json')
				const ozonData = await ozonResponse.json()

				// Load WB categories
				const wbResponse = await fetch('/data/wb_unified.json')
				const wbData = await wbResponse.json()

				// Store the original data for reset functionality
				originalOzonCategories.value = JSON.parse(JSON.stringify(ozonData))
				originalWbCategories.value = JSON.parse(JSON.stringify(wbData))

				// Set unmapped categories
				unmappedOzonCategories.value = ozonData
				unmappedWbCategories.value = wbData

				loadingMessage.value = 'Category data loaded successfully'
			} catch (error) {
				loadingMessage.value = `Error loading category data: ${error.message}`
				console.error('Error loading category data:', error)
			} finally {
				isLoading.value = false
			}
		}

		// Map categories
		const mapCategories = (ozonCategory, wbCategory) => {
			// Получаем ShopZZ ID на основе Ozon ID
			const shopz_id = getShopZId(ozonCategory)

			// Получаем parent_id из родительской категории Ozon
			const shopz_parent_id = ozonCategory ? ozonCategory.parent_id : null

			// Create mapping
			mappedCategories.value.push({
				shopz_id, // Теперь это integer
				shopz_parent_id, // Добавлено: parent_id из Ozon
				ozon_id: ozonCategory.id,
				wb_id: wbCategory.id,
				ozon_name: ozonCategory.name,
				wb_name: wbCategory.name,
				timestamp: new Date().toISOString(),
				not_sold: false,
			})

			// Remove from unmapped categories
			unmappedOzonCategories.value = unmappedOzonCategories.value.filter(
				category => category.id !== ozonCategory.id
			)

			unmappedWbCategories.value = unmappedWbCategories.value.filter(
				category => category.id !== wbCategory.id
			)
		}

		// Mark category as not sold (removed)
		const markCategoryAsNotSold = (platform, category) => {
			if (platform === 'ozon') {
				// Получаем ShopZZ ID на основе Ozon ID
				const shopz_id = getShopZId(category)
				// Получаем parent_id из родительской категории Ozon
				const shopz_parent_id = category.parent_id

				// Create mapping with only Ozon category
				mappedCategories.value.push({
					shopz_id,
					shopz_parent_id, // Добавлено: parent_id из Ozon
					ozon_id: category.id,
					wb_id: null,
					ozon_name: category.name,
					wb_name: null,
					timestamp: new Date().toISOString(),
					not_sold: true,
				})

				// Remove from unmapped categories
				unmappedOzonCategories.value = unmappedOzonCategories.value.filter(
					c => c.id !== category.id
				)
			} else if (platform === 'wb') {
				// Для WB категорий создаем отрицательный ID, так как мы не можем наследовать от Ozon
				const shopz_id = getShopZId(null)

				// Create mapping with only WB category
				mappedCategories.value.push({
					shopz_id,
					shopz_parent_id: null, // Нет связи с иерархией Ozon
					ozon_id: null,
					wb_id: category.id,
					ozon_name: null,
					wb_name: category.name,
					timestamp: new Date().toISOString(),
					not_sold: true,
				})

				// Remove from unmapped categories
				unmappedWbCategories.value = unmappedWbCategories.value.filter(
					c => c.id !== category.id
				)
			}
		}

		// Функция проверки существования категории в массиве
		const categoryExists = (categoryArray, categoryId) => {
			return categoryArray.some(cat => cat.id === categoryId)
		}

		// Remove mapping - удаляет сопоставление полностью с возможностью возврата категорий
		const removeMapping = shopz_id => {
			const mapping = mappedCategories.value.find(m => m.shopz_id === shopz_id)

			if (!mapping) return

			// If the mapping had an Ozon category, add it back to unmapped
			if (mapping.ozon_id && !mapping.not_sold) {
				// Проверяем, что категория ещё не существует в массиве
				if (!categoryExists(unmappedOzonCategories.value, mapping.ozon_id)) {
					unmappedOzonCategories.value.push({
						id: mapping.ozon_id,
						name: mapping.ozon_name,
						parent_id: mapping.shopz_parent_id // Сохраняем правильный parent_id
					})
				}
			}

			// If the mapping had a WB category, add it back to unmapped
			if (mapping.wb_id && !mapping.not_sold) {
				// Проверяем, что категория ещё не существует в массиве
				if (!categoryExists(unmappedWbCategories.value, mapping.wb_id)) {
					unmappedWbCategories.value.push({
						id: mapping.wb_id,
						name: mapping.wb_name,
						parent_id: null // We don't have the original parent_id anymore
					})
				}
			}

			// Remove the mapping
			mappedCategories.value = mappedCategories.value.filter(
				m => m.shopz_id !== shopz_id
			)
		}
		
		// Cancel mapping - только отменяет сопоставление и возвращает категории в несопоставленные
		const cancelMapping = shopz_id => {
			const mapping = mappedCategories.value.find(m => m.shopz_id === shopz_id)

			if (!mapping) return

			// Гарантируем, что обе категории будут возвращены в несопоставленные
			if (mapping.ozon_id) {
				// Проверяем, что категория ещё не существует в массиве
				if (!categoryExists(unmappedOzonCategories.value, mapping.ozon_id)) {
					// Добавляем обратно категорию Ozon с правильным parent_id
					unmappedOzonCategories.value.push({
						id: mapping.ozon_id,
						name: mapping.ozon_name,
						parent_id: mapping.shopz_parent_id
					})
				}
			}
			
			if (mapping.wb_id) {
				// Проверяем, что категория ещё не существует в массиве
				if (!categoryExists(unmappedWbCategories.value, mapping.wb_id)) {
					// Добавляем обратно категорию WB
					unmappedWbCategories.value.push({
						id: mapping.wb_id,
						name: mapping.wb_name,
						parent_id: null
					})
				}
			}

			// Удаляем сопоставление
			mappedCategories.value = mappedCategories.value.filter(
				m => m.shopz_id !== shopz_id
			)
		}

		// Export session data
		const exportSession = () => {
			const sessionData = {
				unmappedOzonCategories: unmappedOzonCategories.value,
				unmappedWbCategories: unmappedWbCategories.value,
				mappedCategories: mappedCategories.value,
				exportedAt: new Date().toISOString(),
			}

			const dataStr = JSON.stringify(sessionData, null, 2)
			const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
				dataStr
			)}`

			const exportFileName = `shopzz-category-mapping-${new Date()
				.toISOString()
				.slice(0, 10)}.json`

			const linkElement = document.createElement('a')
			linkElement.setAttribute('href', dataUri)
			linkElement.setAttribute('download', exportFileName)
			linkElement.click()
		}

		// Import session data
		const importSession = sessionData => {
			if (sessionData.unmappedOzonCategories) {
				unmappedOzonCategories.value = sessionData.unmappedOzonCategories
			}

			if (sessionData.unmappedWbCategories) {
				unmappedWbCategories.value = sessionData.unmappedWbCategories
			}

			if (sessionData.mappedCategories) {
				mappedCategories.value = sessionData.mappedCategories
			}
		}

		// Reset session to initial state
		const resetSession = () => {
			if (
				confirm(
					'Are you sure you want to reset the session? All mappings will be lost.'
				)
			) {
				isLoading.value = true
				loadingMessage.value = 'Resetting session data...'

				setTimeout(() => {
					// Reset to original data
					unmappedOzonCategories.value = JSON.parse(
						JSON.stringify(originalOzonCategories.value)
					)
					unmappedWbCategories.value = JSON.parse(
						JSON.stringify(originalWbCategories.value)
					)

					// Clear all mappings
					mappedCategories.value = []

					loadingMessage.value = 'Session reset successfully'
					isLoading.value = false
				}, 500) // Small delay to show loading state
			}
		}

		// Calculate string similarity using Levenshtein distance
		const calculateStringSimilarity = (str1, str2) => {
			// Convert both strings to lowercase for case-insensitive comparison
			const s1 = str1.toLowerCase()
			const s2 = str2.toLowerCase()

			// If strings are identical, return 100%
			if (s1 === s2) return 1.0

			// If either string is empty, similarity is 0%
			if (s1.length === 0 || s2.length === 0) return 0.0

			// Calculate Levenshtein distance
			const matrix = []

			// Initialize matrix
			for (let i = 0; i <= s1.length; i++) {
				matrix[i] = [i]
			}

			for (let j = 0; j <= s2.length; j++) {
				matrix[0][j] = j
			}

			// Fill matrix
			for (let i = 1; i <= s1.length; i++) {
				for (let j = 1; j <= s2.length; j++) {
					const cost = s1.charAt(i - 1) === s2.charAt(j - 1) ? 0 : 1
					matrix[i][j] = Math.min(
						matrix[i - 1][j] + 1, // deletion
						matrix[i][j - 1] + 1, // insertion
						matrix[i - 1][j - 1] + cost // substitution
					)
				}
			}

			// Calculate similarity as a percentage
			const distance = matrix[s1.length][s2.length]
			const maxLength = Math.max(s1.length, s2.length)

			// Return similarity percentage (0.0 to 1.0)
			return 1.0 - distance / maxLength
		}

		// Использует Web Worker для автоматического сопоставления категорий без блокировки интерфейса
		const autoMapCategories = similarityThreshold => {
			isLoading.value = true
			loadingMessage.value = 'Инициализация автосопоставления...'

			// Создаем экземпляр Web Worker
			const worker = new Worker(
				new URL('@/workers/mapping-worker.js', import.meta.url),
				{ type: 'module' }
			)

			// Передаем пороговое значение из процентов в доли (0.5-1.0)
			const threshold = similarityThreshold / 100

			// Обрабатываем сообщения от воркера
			worker.onmessage = e => {
				const { type, message, status, stats, result } = e.data

				if (type === 'progress') {
					// Обновляем интерфейс с прогрессом
					loadingMessage.value = message
				} else if (type === 'complete') {
					// Обработка завершена, применяем результаты

					// Применяем сопоставления
					result.matchingPairs.forEach(([ozonCategory, wbCategory]) => {
						mapCategories(ozonCategory, wbCategory)
					})

					// Показываем итоговый отчет
					loadingMessage.value = `Автосопоставление завершено за ${
						result.timeMs
					}мс:
        ✓ Обработано: ${result.stats.totalProcessed} категорий
        ✓ Сопоставлено: ${result.stats.mapped} (${Math.round(
						(result.stats.mapped / result.stats.totalProcessed) * 100
					)}%)
        ✓ Точных совпадений: ${result.stats.exactMatches}
        ✓ Средняя схожесть: ${result.stats.avgSimilarity}%`

					// Завершаем работу и освобождаем воркер
					setTimeout(() => {
						isLoading.value = false
						worker.terminate()
					}, 1000)
				}
			}

			// Обрабатываем ошибки
			worker.onerror = error => {
				console.error('Ошибка в Web Worker:', error)
				loadingMessage.value = `Ошибка при автосопоставлении: ${error.message}`
				isLoading.value = false
				worker.terminate()
			}

			// Создаем простые копии данных для передачи в Web Worker
			// Это необходимо, так как некоторые объекты не могут быть клонированы
			const serializableOzonCategories = unmappedOzonCategories.value.map(cat => ({
				id: cat.id,
				name: cat.name,
				parent_id: cat.parent_id
			}))
			
			const serializableWbCategories = unmappedWbCategories.value.map(cat => ({
				id: cat.id,
				name: cat.name,
				parent_id: cat.parent_id
			}))
			
			// Запускаем процесс сопоставления в отдельном потоке
			worker.postMessage({
				action: 'autoMap',
				data: {
					ozonCategories: serializableOzonCategories,
					wbCategories: serializableWbCategories,
					threshold: threshold,
				},
			})
		}

		return {
			// State
			unmappedOzonCategories,
			unmappedWbCategories,
			mappedCategories,
			isLoading,
			loadingMessage,

			// Computed
			ozonCategoryTree,
			wbCategoryTree,

			// Actions
			initializeData,
			mapCategories,
			markCategoryAsNotSold,
			removeMapping,
			cancelMapping, // Новая функция отмены сопоставления
			exportSession,
			importSession,
			resetSession,
			autoMapCategories,
		}
	},
	{
		persist: {
			storage: localStorage,
			paths: [
				'unmappedOzonCategories',
				'unmappedWbCategories',
				'mappedCategories',
			],
		},
	}
)
