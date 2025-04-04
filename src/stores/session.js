import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useSessionStore = defineStore(
	'session',
	() => {
		// State
		// Primary categories (all three platforms)
		const shopzzCategories = ref([])
		const ozonCategories = ref([])
		const wbCategories = ref([])
		
		// Original data for reset functionality
		const originalShopzzCategories = ref([])
		const originalOzonCategories = ref([])
		const originalWbCategories = ref([]) 
		
		// Mapping storage
		// Format: { shopzz_id, mappings: [{ platform: 'ozon'|'wb', id, name }] }
		const categoryMappings = ref([])
		
		// UI State
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

		// Create tree structure for all category systems
		const shopzzCategoryTree = computed(() => buildCategoryTree(shopzzCategories.value))
		const ozonCategoryTree = computed(() => buildCategoryTree(ozonCategories.value))
		const wbCategoryTree = computed(() => buildCategoryTree(wbCategories.value))

		// Initialize data
		const initializeData = async () => {
			isLoading.value = true
			loadingMessage.value = 'Loading category data...'

			try {
				// Load ShopZZ categories - this is our foundation hierarchy
				loadingMessage.value = 'Loading ShopZZ categories...'
				const shopzzResponse = await fetch('/data/shopzz_unified.json')
				const shopzzData = await shopzzResponse.json()
				
				// Load Ozon categories
				loadingMessage.value = 'Loading Ozon categories...'
				const ozonResponse = await fetch('/data/ozon_unified.json')
				const ozonData = await ozonResponse.json()

				// Load WB categories
				loadingMessage.value = 'Loading Wildberries categories...'
				const wbResponse = await fetch('/data/wb_unified.json')
				const wbData = await wbResponse.json()

				// Store the original data for reset functionality
				originalShopzzCategories.value = JSON.parse(JSON.stringify(shopzzData))
				originalOzonCategories.value = JSON.parse(JSON.stringify(ozonData))
				originalWbCategories.value = JSON.parse(JSON.stringify(wbData))

				// Set category data
				shopzzCategories.value = shopzzData
				ozonCategories.value = ozonData
				wbCategories.value = wbData

				// Initialize the mappings array based on ShopZZ categories
				initializeMappings()

				loadingMessage.value = 'Category data loaded successfully'
			} catch (error) {
				loadingMessage.value = `Error loading category data: ${error.message}`
				console.error('Error loading category data:', error)
			} finally {
				isLoading.value = false
			}
		}

		// Initialize mappings from ShopZZ categories
		const initializeMappings = () => {
			// Start with empty mappings array
			categoryMappings.value = []
			
			// Create a mapping entry for each ShopZZ category
			shopzzCategories.value.forEach(category => {
				categoryMappings.value.push({
					shopzz_id: category.id,
					shopzz_name: category.name,
					shopzz_parent_id: category.parent_id,
					mappings: [], // Will contain both Ozon and WB mappings
					timestamp: new Date().toISOString(),
				})
			})
			
			// Check for any saved mappings in localStorage (for persistence)
			// This would be implemented later if needed for backward compatibility
		}
		
		// Функция для обновления визуального представления категорий
		const updateCategoryVisualsBasedOnMappings = () => {
			// Создаем карту сопоставленных ShopZZ ID для быстрого поиска
			const mappedShopzzIds = new Set(
				categoryMappings.value
					.filter(mapping => mapping.mappings && mapping.mappings.length > 0)
					.map(mapping => String(mapping.shopzz_id))
			)

			// Обновляем реактивные массивы для перезапуска рендеринга
			shopzzCategories.value = [...shopzzCategories.value]
			ozonCategories.value = [...ozonCategories.value]
			wbCategories.value = [...wbCategories.value]
			categoryMappings.value = [...categoryMappings.value]
		}

		// Find a ShopZZ category mapping by ID
		const findShopzzMapping = (shopzzId) => {
			// Преобразуем ID в строку для надежного сравнения
			const shopzzIdStr = String(shopzzId)
			return categoryMappings.value.find(mapping => String(mapping.shopzz_id) === shopzzIdStr)
		}
		
		// Find category by ID in a category array
		const findCategoryById = (categories, id) => {
			return categories.find(category => category.id === id)
		}
		
		// Map an external category (Ozon or WB) to a ShopZZ category
		const mapCategory = (shopzzId, platform, externalCategory) => {
			const mapping = findShopzzMapping(shopzzId)
			
			if (!mapping) {
				console.error(`ShopZZ category with ID ${shopzzId} not found`)
				return false
			}
			
			// Check if this external category is already mapped
			const existingMapping = mapping.mappings.find(
				m => m.platform === platform && m.id === externalCategory.id
			)
			
			if (existingMapping) {
				console.warn(`Category ${externalCategory.id} from ${platform} is already mapped`)
				return false
			}
			
			// Add the mapping
			mapping.mappings.push({
				platform,
				id: externalCategory.id,
				name: externalCategory.name,
				timestamp: new Date().toISOString()
			})
			
			// Не удаляем ShopZZ категорию из списка доступных, чтобы она оставалась видимой
			// Возможно отметить категорию как-то, чтобы показать что она уже сопоставлена
			// Но сохраняем её в списке для наглядности

			// Remove the external category from the available list based on platform
			if (platform === 'ozon') {
				// Remove from ozonCategories
				const index = ozonCategories.value.findIndex(cat => cat.id === externalCategory.id)
				if (index !== -1) {
					// Optional: save removed category to restore it later if needed
					// const removedCategory = ozonCategories.value[index]
					ozonCategories.value.splice(index, 1)
				}
			} else if (platform === 'wb') {
				// Remove from wbCategories
				const index = wbCategories.value.findIndex(cat => cat.id === externalCategory.id)
				if (index !== -1) {
					// Optional: save removed category to restore it later if needed
					// const removedCategory = wbCategories.value[index]
					wbCategories.value.splice(index, 1)
				}
			}
			
			// Явное обновление реактивных данных для обновления UI
			categoryMappings.value = [...categoryMappings.value]
			
			// Обновляем визуальное представление категорий
			updateCategoryVisualsBasedOnMappings()
			
			return true
		}

		// Mark a ShopZZ category as not sold
		const markCategoryAsNotSold = (shopzzId) => {
			const mapping = findShopzzMapping(shopzzId)
			
			if (!mapping) {
				console.error(`ShopZZ category with ID ${shopzzId} not found`)
				return false
			}
			
			// Add a not_sold flag to the mapping
			mapping.not_sold = true
			mapping.timestamp = new Date().toISOString()
			
			return true
		}
		
		// Remove a mapping between a ShopZZ category and an external category (Ozon or WB)
		const removeMapping = (shopzzId, platform, externalId) => {
			console.log(`Removing mapping: ShopZZ ID=${shopzzId}, platform=${platform}, externalId=${externalId}`)
			
			// Преобразование ID в строковый формат для корректного сравнения
			const shopzzIdStr = String(shopzzId)
			const externalIdStr = String(externalId)
			
			// Поиск сопоставления категории ShopZZ
			const mappingIndex = categoryMappings.value.findIndex(m => String(m.shopzz_id) === shopzzIdStr)
			
			if (mappingIndex === -1) {
				console.error(`ShopZZ category with ID ${shopzzIdStr} not found in categoryMappings`)
				return false
			}
			
			const mapping = categoryMappings.value[mappingIndex]
			console.log('DEBUG: Found mapping:', JSON.stringify(mapping))
			console.log(`DEBUG: Mapping has ${mapping.mappings ? mapping.mappings.length : 0} mappings`)
			
			// Важно: проверим, что у mapping есть массив mappings
			if (!mapping.mappings || !Array.isArray(mapping.mappings)) {
				console.error('Mapping does not have a valid mappings array')
				// Инициализируем массив, если его нет
				mapping.mappings = []
				return false
			}
			
			// Находим конкретное сопоставление по платформе и ID
			console.log(`Searching for mapping with platform=${platform} and externalId=${externalIdStr}`)
			
			// Проверяем, что массив маппингов действительно существует
			if (!mapping.mappings || !Array.isArray(mapping.mappings)) {
				console.error('Mapping does not have a valid mappings array')
				mapping.mappings = []
				return false
			}
			
			// Ищем маппинг для удаления
			const foundMappings = mapping.mappings.filter(m => m.platform === platform && String(m.id) === externalIdStr)
			console.log(`Found ${foundMappings.length} mappings to remove`)
			
			if (foundMappings.length === 0) {
				console.error(`Mapping not found for ${platform} category with ID ${externalIdStr}`)
				return false
			}
			

			
			// Сохраняем информацию о сопоставлении перед удалением
			console.log('Found external mapping to remove:', foundMappings[0])
			
			// Восстановление внешней категории в соответствующий список
			if (platform === 'ozon') {
				// Проверка существования категории в исходных данных
				const originalCategory = originalOzonCategories.value.find(c => String(c.id) === externalId)
				if (originalCategory) {
					// Восстановление в ozonCategories, если еще не существует
					if (!ozonCategories.value.some(c => String(c.id) === externalId)) {
						console.log('Restoring Ozon category to available list:', originalCategory)
						ozonCategories.value.push({
							...originalCategory
						})
					}
				}
			} else if (platform === 'wb') {
				// Проверка существования категории в исходных данных
				const originalCategory = originalWbCategories.value.find(c => String(c.id) === externalId)
				if (originalCategory) {
					// Восстановление в wbCategories, если еще не существует
					if (!wbCategories.value.some(c => String(c.id) === externalId)) {
						console.log('Restoring WB category to available list:', originalCategory)
						wbCategories.value.push({
							...originalCategory
						})
					}
				}
			}
			

			
			// Создаем новый массив сопоставлений без удаляемых элементов
			// Используем фильтрацию вместо индексов для надежности
			const updatedMappings = mapping.mappings.filter(m => !(m.platform === platform && String(m.id) === externalIdStr))
			console.log(`Removed mappings. Original count: ${mapping.mappings.length}, new count: ${updatedMappings.length}`)
			console.log('DEBUG: Updated mappings array:', JSON.stringify(updatedMappings))
			
			// Обновляем сопоставления для этой категории ShopZZ
			mapping.mappings = updatedMappings
			
			// Если сопоставлений больше нет и категория не помечена как "не продается", 
			// восстановить категорию ShopZZ в список доступных
			if (mapping.mappings.length === 0 && !mapping.not_sold) {
				const originalShopzzCategory = originalShopzzCategories.value.find(c => String(c.id) === shopzzId)
				if (originalShopzzCategory && !shopzzCategories.value.some(c => String(c.id) === shopzzId)) {
					console.log('Restoring ShopZZ category to available list:', originalShopzzCategory)
					shopzzCategories.value.push({
						...originalShopzzCategory
					})
				}
			}
			
			mapping.timestamp = new Date().toISOString()
			

			
			// Явно обновляем массив сопоставлений и запускаем реактивность
			mapping.mappings = updatedMappings
			categoryMappings.value = [...categoryMappings.value]
			
			// Обновляем визуальное представление категорий
			updateCategoryVisualsBasedOnMappings()
			
			console.log('DEBUG: Mapping successfully removed')
			return true
		}

		// Cancel all mappings for a ShopZZ category and remove the 'not sold' flag if present
		const cancelAllMappings = (shopzzId) => {
			console.log(`Canceling all mappings for ShopZZ ID=${shopzzId}`)
			
			// Преобразование ID в строковый формат для обеспечения корректного сравнения
			const shopzzIdStr = String(shopzzId)
			
			// Поиск сопоставления категории ShopZZ
			const mappingIndex = categoryMappings.value.findIndex(m => String(m.shopzz_id) === shopzzIdStr)
			
			if (mappingIndex === -1) {
				console.error(`ShopZZ category with ID ${shopzzIdStr} not found in categoryMappings`)
				return false
			}
			
			const mapping = categoryMappings.value[mappingIndex]
			console.log('Found mapping to cancel all:', mapping)
			
			// Сохраняем копию существующих сопоставлений для восстановления категорий
			const existingMappings = [...mapping.mappings]
			console.log('Mappings to restore:', existingMappings)
			
			// Восстановление всех внешних категорий в соответствующие списки
			for (const externalMapping of existingMappings) {
				const platform = externalMapping.platform
				const externalId = String(externalMapping.id)
				
				// Восстановление внешней категории в соответствующий список
				if (platform === 'ozon') {
					// Проверка существования категории в исходных данных
					const originalCategory = originalOzonCategories.value.find(c => String(c.id) === externalId)
					if (originalCategory) {
						// Восстановление в ozonCategories, если еще не существует
						if (!ozonCategories.value.some(c => String(c.id) === externalId)) {
							console.log('Restoring Ozon category to available list:', originalCategory)
							ozonCategories.value.push({
								...originalCategory
							})
						}
					}
				} else if (platform === 'wb') {
					// Проверка существования категории в исходных данных
					const originalCategory = originalWbCategories.value.find(c => String(c.id) === externalId)
					if (originalCategory) {
						// Восстановление в wbCategories, если еще не существует
						if (!wbCategories.value.some(c => String(c.id) === externalId)) {
							console.log('Restoring WB category to available list:', originalCategory)
							wbCategories.value.push({
								...originalCategory
							})
						}
					}
				}
			}
			
			// Очистка всех сопоставлений для этой категории ShopZZ
			mapping.mappings = []
			
			// Если категория была помечена как "не продается", сбросить этот флаг
			if (mapping.not_sold) {
				mapping.not_sold = false
			}
			
			// Категория ShopZZ остается в списке, не нужно восстанавливать
			
			mapping.timestamp = new Date().toISOString()
			
			// Обновляем весь объект categoryMappings для запуска реактивности Vue
			categoryMappings.value = [...categoryMappings.value]
			
			// Обновляем визуальное представление категорий
			updateCategoryVisualsBasedOnMappings()
			
			console.log('All mappings successfully canceled')
			return true
		}

		// Export session data
		const exportSession = () => {
			const sessionData = {
				shopzzCategories: shopzzCategories.value,
				ozonCategories: ozonCategories.value,
				wbCategories: wbCategories.value,
				categoryMappings: categoryMappings.value,
				exportedAt: new Date().toISOString(),
				version: '2.0' // New version tag to differentiate from old format
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
			// Check if this is new format (version 2.0+)
			if (sessionData.version && parseFloat(sessionData.version) >= 2.0) {
				// Import directly using new format
				if (sessionData.shopzzCategories) {
					shopzzCategories.value = sessionData.shopzzCategories
				}
				
				if (sessionData.ozonCategories) {
					ozonCategories.value = sessionData.ozonCategories
				}
				
				if (sessionData.wbCategories) {
					wbCategories.value = sessionData.wbCategories
				}
				
				if (sessionData.categoryMappings) {
					categoryMappings.value = sessionData.categoryMappings
				}
			} else {
				// Legacy import - handle old format data
				console.warn('Importing from legacy format. Converting to new format...')
				
				// We would need shopzzCategories already loaded
				if (sessionData.mappedCategories && sessionData.mappedCategories.length > 0) {
					// For each old mapping, create a new mapping in the new format
					sessionData.mappedCategories.forEach(oldMapping => {
						// Find or create the ShopZZ category mapping
						const mapping = findShopzzMapping(oldMapping.shopz_id)
						
						if (mapping) {
							// Add Ozon mapping if present
							if (oldMapping.ozon_id) {
								mapping.mappings.push({
									platform: 'ozon',
									id: oldMapping.ozon_id,
									name: oldMapping.ozon_name,
									timestamp: oldMapping.timestamp
								})
							}
							
							// Add WB mapping if present
							if (oldMapping.wb_id) {
								mapping.mappings.push({
									platform: 'wb',
									id: oldMapping.wb_id,
									name: oldMapping.wb_name,
									timestamp: oldMapping.timestamp
								})
							}
							
							// Set not_sold flag if present in old mapping
							if (oldMapping.not_sold) {
								mapping.not_sold = true
							}
						}
					})
				}
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
					shopzzCategories.value = JSON.parse(
						JSON.stringify(originalShopzzCategories.value)
					)
					ozonCategories.value = JSON.parse(
						JSON.stringify(originalOzonCategories.value)
					)
					wbCategories.value = JSON.parse(
						JSON.stringify(originalWbCategories.value)
					)

					// Reinitialize mappings but with empty mapping arrays
					initializeMappings()

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
					let mappedCount = 0
					let ozonCount = 0
					let wbCount = 0

					// Обрабатываем результаты в новом формате
					if (result.mappingResults && result.mappingResults.length > 0) {
						// Формат: массив объектов { shopzz, ozon: [], wb: [] }
						result.mappingResults.forEach(mapping => {
							const shopzzCategory = mapping.shopzz
							let hasMappings = false
							
							// Добавляем все сопоставления Ozon
							if (mapping.ozon && mapping.ozon.length > 0) {
								mapping.ozon.forEach(ozonCategory => {
									if (mapCategory(shopzzCategory.id, 'ozon', ozonCategory)) {
										ozonCount++
										hasMappings = true
									}
								})
							}
							
							// Добавляем все сопоставления WB
							if (mapping.wb && mapping.wb.length > 0) {
								mapping.wb.forEach(wbCategory => {
									if (mapCategory(shopzzCategory.id, 'wb', wbCategory)) {
										wbCount++
										hasMappings = true
									}
								})
							}
							
							// Увеличиваем счетчик сопоставленных ShopZZ категорий
							if (hasMappings) {
								mappedCount++
							}
						})
					} 
					// Обратная совместимость со старыми форматами
					else if (result.matchingTriples && result.matchingTriples.length > 0) {
						// Применяем тройные сопоставления (ShopZZ -> Ozon -> WB)
						mappedCount = result.matchingTriples.reduce((count, [shopzzCategory, ozonCategory, wbCategory]) => {
							// Добавляем сопоставления для обеих платформ
							const ozonMapped = mapCategory(shopzzCategory.id, 'ozon', ozonCategory)
							const wbMapped = mapCategory(shopzzCategory.id, 'wb', wbCategory)
							
							if (ozonMapped) ozonCount++
							if (wbMapped) wbCount++
							
							return count + (ozonMapped || wbMapped ? 1 : 0)
						}, 0)
					} else if (result.matchingPairs && result.matchingPairs.length > 0) {
						// Старый формат с парами
						mappedCount = result.matchingPairs.reduce((count, [ozonCategory, wbCategory]) => {
							// Найдем подходящую ShopZZ категорию с таким же или похожим именем
							let bestMatch = null
							let bestSimilarity = threshold
							
							for (const shopzzCategory of shopzzCategories.value) {
								const similarity = calculateStringSimilarity(
									shopzzCategory.name,
									ozonCategory.name
								)
								
								if (similarity > bestSimilarity) {
									bestMatch = shopzzCategory
									bestSimilarity = similarity
								}
							}
							
							if (bestMatch) {
								// Добавляем сопоставления для обеих платформ
								const ozonMapped = mapCategory(bestMatch.id, 'ozon', ozonCategory)
								const wbMapped = mapCategory(bestMatch.id, 'wb', wbCategory)
								
								if (ozonMapped) ozonCount++
								if (wbMapped) wbCount++
								
								return count + (ozonMapped || wbMapped ? 1 : 0)
							}
							
							return count
						}, 0)
					}

					// Показываем итоговый отчет
					loadingMessage.value = `Автосопоставление завершено за ${
						result.timeMs
					}мс:
        ✓ Обработано: ${result.stats.totalProcessed} категорий
        ✓ Сопоставлено: ${mappedCount} ShopZZ категорий
        ✓ Добавлено ${ozonCount} сопоставлений с Ozon
        ✓ Добавлено ${wbCount} сопоставлений с WB
        ✓ Точных совпадений: ${result.stats.exactMatches}
        ✓ Средняя схожесть: ${result.stats.avgSimilarity}%`

					// Завершаем работу и освобождаем воркер
					setTimeout(() => {
						isLoading.value = false
						worker.terminate()
						// Обновляем визуальное представление категорий
						updateCategoryVisualsBasedOnMappings()
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
			const serializableShopzzCategories = shopzzCategories.value.map(cat => ({
				id: cat.id,
				name: cat.name,
				parent_id: cat.parent_id
			}))
			
			const serializableOzonCategories = ozonCategories.value.map(cat => ({
				id: cat.id,
				name: cat.name,
				parent_id: cat.parent_id
			}))
			
			const serializableWbCategories = wbCategories.value.map(cat => ({
				id: cat.id,
				name: cat.name,
				parent_id: cat.parent_id
			}))
			
			// Запускаем процесс сопоставления в отдельном потоке
			worker.postMessage({
				action: 'autoMap',
				data: {
					shopzzCategories: serializableShopzzCategories,
					ozonCategories: serializableOzonCategories,
					wbCategories: serializableWbCategories,
					threshold: threshold,
				},
			})
		}

		return {
			// State - Data stores for all three platforms
			shopzzCategories,
			ozonCategories,
			wbCategories, 
			categoryMappings, // New structure for mappings
			isLoading,
			loadingMessage,

			// Computed - Tree views for all three platforms
			shopzzCategoryTree,
			ozonCategoryTree,
			wbCategoryTree,

			// Core category actions
			initializeData,
			initializeMappings,
			findShopzzMapping,
			findCategoryById,
			
			// Mapping actions
			mapCategory,            // Map external category to ShopZZ category
			markCategoryAsNotSold, // Mark ShopZZ category as not sold
			removeMapping,         // Remove specific external mapping 
			cancelAllMappings,     // Cancel all mappings for a ShopZZ category
			updateCategoryVisualsBasedOnMappings, // Обновление визуального представления
			
			// Session management
			exportSession,
			importSession,
			resetSession,
			
			// Utilities
			calculateStringSimilarity,
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
