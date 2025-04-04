/**
 * Web Worker для выполнения автоматического сопоставления категорий
 * без блокировки основного потока UI
 *
 * Supports three-level mapping: ShopZZ -> Ozon, ShopZZ -> WB
 * and OzonWB matches that help create mappings for both platforms
 */

// Функция расчета сходства строк (Levenshtein distance)
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0
  
  // Normalize strings
  str1 = str1.toLowerCase().trim()
  str2 = str2.toLowerCase().trim()
  
  // Identical strings have 100% similarity
  if (str1 === str2) return 1.0
  
  // Create matrix of distances
  const len1 = str1.length
  const len2 = str2.length
  const maxLength = Math.max(len1, len2)
  
  // Optimization for very different length strings
  if (maxLength > 100 && Math.abs(len1 - len2) / maxLength > 0.5) {
    return 0
  }
  
  // Use dp matrix to calculate edit distance
  const dp = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0))
  
  // Initialize first row and column
  for (let i = 0; i <= len1; i++) dp[i][0] = i
  for (let j = 0; j <= len2; j++) dp[0][j] = j
  
  // Fill the dp matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      )
    }
  }
  
  // Get the final distance
  const distance = dp[len1][len2]
  
  // Calculate similarity as 1 - (distance / maxLength)
  return 1.0 - (distance / maxLength)
}

/**
 * Находит наиболее подходящую ShopZZ категорию по имени
 */
function findBestShopzzMatch(name, shopzzData, threshold) {
  let bestMatch = null
  let bestSimilarity = threshold
  
  for (const shopzz of shopzzData) {
    const similarity = calculateStringSimilarity(name, shopzz.category.name)
    
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity
      bestMatch = shopzz
    }
  }
  
  return bestMatch
}

// Обработчик сообщений от основного потока
self.onmessage = function(e) {
  const { action, data } = e.data
  
  if (action === 'autoMap') {
    // Извлекаем данные из сообщения
    const { shopzzCategories, ozonCategories, wbCategories, threshold } = data
    
    // Отправляем прогресс 
    self.postMessage({ 
      type: 'progress', 
      status: 'start',
      message: 'Подготовка данных для автосопоставления...' 
    })
    
    // Выполняем сопоставление в отдельном потоке с учетом трехуровневой структуры
    const result = performAutoMapping(shopzzCategories, ozonCategories, wbCategories, threshold)
    
    // Отправляем результат обратно в основной поток
    self.postMessage({ 
      type: 'complete', 
      result: result 
    })
  }
}

/**
 * Выполняет автоматическое сопоставление категорий
 * Трехуровневая структура: ShopZZ -> Ozon, ShopZZ -> WB
 */
function performAutoMapping(shopzzCategories, ozonCategories, wbCategories, threshold) {
  const startTime = performance.now()
  
  // Статистика
  let stats = {
    processed: 0,
    mapped: 0,
    exactMatches: 0,
    similaritySum: 0
  }
  
  // Создаем Set для быстрого поиска
  const ozonIdSet = new Set(ozonCategories.map(c => c.id))
  const wbIdSet = new Set(wbCategories.map(c => c.id))
  const totalToProcess = ozonCategories.length
  
  // Индексируем WB категории для быстрого поиска
  const wbExactMatchIndex = {}
  const wbNormalizedData = []
  
  wbCategories.forEach(cat => {
    const normalizedName = cat.name.toLowerCase().trim()
    wbExactMatchIndex[normalizedName] = cat
    wbNormalizedData.push({
      category: cat,
      normalizedName
    })
  })
  
  // Результаты - структура для сопоставления
  // ShopZZ category может быть сопоставлена с несколькими Ozon и WB категориями
  // Или только с категориями одной платформы
  
  // Индексируем ShopZZ категории для быстрого поиска
  const shopzzExactMatchIndex = {}
  const shopzzNormalizedData = []
  
  shopzzCategories.forEach(cat => {
    const normalizedName = cat.name.toLowerCase().trim()
    shopzzExactMatchIndex[normalizedName] = cat
    shopzzNormalizedData.push({
      category: cat,
      normalizedName
    })
  })
  
  // Шаг 1: Обработка точных совпадений для каждой платформы по отдельности
  let lastProgress = 0
  
  // Эта структура хранит все найденные сопоставления по shopzzId
  // { shopzzId: { category: shopzzCategory, ozon: [], wb: [] } }
  const mappedByShopzzId = {}
  
  // Этап 1a: Обработка Ozon категорий
  for (let i = 0; i < ozonCategories.length; i++) {
    const ozonCategory = ozonCategories[i]
    
    // Пропускаем удаленные категории
    if (!ozonIdSet.has(ozonCategory.id)) continue
    
    // Нормализуем имя категории
    const normalizedName = ozonCategory.name.toLowerCase().trim()
    
    // Поиск подходящей ShopZZ категории
    const shopzzMatch = shopzzExactMatchIndex[normalizedName] || 
                        findBestShopzzMatch(ozonCategory.name, shopzzNormalizedData, threshold)
    
    // Если нашли подходящую ShopZZ категорию
    if (shopzzMatch) {
      // Выбираем фактическую категорию (учитываем структуру объекта)
      const shopzzCategory = shopzzMatch.category || shopzzMatch
      const shopzzId = String(shopzzCategory.id)
      
      // Добавляем в структуру сопоставлений, если еще нет
      if (!mappedByShopzzId[shopzzId]) {
        mappedByShopzzId[shopzzId] = {
          category: shopzzCategory,
          ozon: [],
          wb: []
        }
      }
      
      // Добавляем Ozon категорию в сопоставление
      mappedByShopzzId[shopzzId].ozon.push(ozonCategory)
      
      // Удаляем из доступных, чтобы не использовать дважды
      ozonIdSet.delete(ozonCategory.id)
      
      // Увеличиваем счетчик сопоставлений
      stats.mapped++
      stats.exactMatches++ // Условно считаем точным, даже если был использован findBestShopzzMatch
      stats.similaritySum += 1.0
    }
    
    stats.processed++
    
    // Отправляем прогресс каждые 5%
    const currentProgress = Math.floor((stats.processed / totalToProcess) * 100)
    if (currentProgress >= lastProgress + 5) {
      self.postMessage({
        type: 'progress',
        status: 'processing',
        message: `Поиск точных совпадений: ${stats.processed}/${totalToProcess} (${currentProgress}%)`,
        stats: { ...stats, totalToProcess }
      })
      lastProgress = currentProgress
    }
  }
  
  // Этап 1b: Обработка WB категорий
  // Промежуточный отчет
  self.postMessage({
    type: 'progress',
    status: 'step1b',
    message: `Обработка категорий Wildberries...`,
    stats: { ...stats, totalToProcess }
  })
  
  // Обрабатываем WB категории аналогично Ozon
  lastProgress = 0
  
  for (let i = 0; i < wbCategories.length; i++) {
    const wbCategory = wbCategories[i]
    
    // Пропускаем удаленные категории
    if (!wbIdSet.has(wbCategory.id)) continue
    
    // Нормализуем имя категории
    const normalizedName = wbCategory.name.toLowerCase().trim()
    
    // Поиск подходящей ShopZZ категории
    const shopzzMatch = shopzzExactMatchIndex[normalizedName] || 
                       findBestShopzzMatch(wbCategory.name, shopzzNormalizedData, threshold)
    
    // Если нашли подходящую ShopZZ категорию
    if (shopzzMatch) {
      // Выбираем фактическую категорию (учитываем структуру объекта)
      const shopzzCategory = shopzzMatch.category || shopzzMatch
      const shopzzId = String(shopzzCategory.id)
      
      // Добавляем в структуру сопоставлений, если еще нет
      if (!mappedByShopzzId[shopzzId]) {
        mappedByShopzzId[shopzzId] = {
          category: shopzzCategory,
          ozon: [],
          wb: []
        }
      }
      
      // Добавляем WB категорию в сопоставление
      mappedByShopzzId[shopzzId].wb.push(wbCategory)
      
      // Удаляем из доступных, чтобы не использовать дважды
      wbIdSet.delete(wbCategory.id)
      
      // Увеличиваем счетчик сопоставлений
      stats.mapped++
      stats.exactMatches++
      stats.similaritySum += 1.0
    }
    
    // Отправляем прогресс каждые 5%
    const currentProgress = Math.floor((i / wbCategories.length) * 100)
    if (currentProgress >= lastProgress + 5) {
      self.postMessage({
        type: 'progress',
        status: 'processing',
        message: `Обработка Wildberries категорий: ${i}/${wbCategories.length} (${currentProgress}%)`,
        stats: { ...stats, totalToProcess }
      })
      lastProgress = currentProgress
    }
  }
  
  // Промежуточный отчет о завершении первого этапа
  self.postMessage({
    type: 'progress',
    status: 'step2',
    message: `Поиск парных сопоставлений Ozon-WB...`,
    stats: { ...stats, totalToProcess }
  })
  
  // Шаг 2: Поиск пар Ozon-WB для обогащения результатов маппинга
  const remainingOzons = ozonCategories.filter(c => ozonIdSet.has(c.id))
  lastProgress = 0
  
  for (let i = 0; i < remainingOzons.length; i++) {
    const ozonCategory = remainingOzons[i]
    
    if (!ozonIdSet.has(ozonCategory.id)) continue
    
    let bestWbMatch = null
    let bestWbSimilarity = threshold
    
    // Ищем наиболее похожую WB категорию
    for (const wbData of wbNormalizedData) {
      if (!wbIdSet.has(wbData.category.id)) continue
      
      const similarity = calculateStringSimilarity(ozonCategory.name, wbData.category.name)
      
      if (similarity > bestWbSimilarity) {
        bestWbSimilarity = similarity
        bestWbMatch = wbData.category
      }
    }
    
    if (bestWbMatch) {
      // Ищем подходящую ShopZZ категорию для этой пары
      const shopzzMatch = findBestShopzzMatch(ozonCategory.name, shopzzNormalizedData, threshold)
      
      if (shopzzMatch) {
        // Выбираем фактическую категорию (учитываем структуру объекта)
        const shopzzCategory = shopzzMatch.category || shopzzMatch
        const shopzzId = String(shopzzCategory.id)
        
        // Добавляем в структуру сопоставлений, если еще нет
        if (!mappedByShopzzId[shopzzId]) {
          mappedByShopzzId[shopzzId] = {
            category: shopzzCategory,
            ozon: [],
            wb: []
          }
        }
        
        // Добавляем обе категории в сопоставление, если их еще нет там
        const addedOzon = !mappedByShopzzId[shopzzId].ozon.some(c => c.id === ozonCategory.id)
        const addedWb = !mappedByShopzzId[shopzzId].wb.some(c => c.id === bestWbMatch.id)
        
        if (addedOzon) {
          mappedByShopzzId[shopzzId].ozon.push(ozonCategory)
          ozonIdSet.delete(ozonCategory.id)
        }
        
        if (addedWb) {
          mappedByShopzzId[shopzzId].wb.push(bestWbMatch)
          wbIdSet.delete(bestWbMatch.id)
        }
        
        // Увеличиваем счетчики статистики
        if (addedOzon || addedWb) {
          stats.mapped++
          stats.similaritySum += bestWbSimilarity
        }
      }
    }
    
    // Отправляем прогресс для второго этапа
    const currentProgress = Math.floor((i / remainingOzons.length) * 100)
    if (currentProgress >= lastProgress + 5) {
      const overallProgress = Math.floor(((stats.processed + i) / (totalToProcess + remainingOzons.length)) * 100)
      self.postMessage({
        type: 'progress',
        status: 'processing',
        message: `Поиск частичных совпадений: ${i+1}/${remainingOzons.length} (${currentProgress}%)`,
        stats: { ...stats, currentSecondPhase: i+1, totalSecondPhase: remainingOzons.length }
      })
      lastProgress = currentProgress
    }
  }
  
  const endTime = performance.now()
  
  // Преобразуем результаты в формат для возврата
  const finalMappingResults = [];
  
  // Превращаем объект в массив маппингов
  Object.keys(mappedByShopzzId).forEach(shopzzId => {
    const mapping = mappedByShopzzId[shopzzId];
    finalMappingResults.push({
      shopzz: mapping.category,
      ozon: mapping.ozon,
      wb: mapping.wb
    });
  });
  
  // Формируем итоговый результат
  return {
    mappingResults: finalMappingResults,
    stats: {
      totalProcessed: totalToProcess,
      mapped: stats.mapped,
      exactMatches: stats.exactMatches,
      totalShopzzMapped: finalMappingResults.length,
      totalOzonMapped: finalMappingResults.reduce((sum, m) => sum + m.ozon.length, 0),
      totalWbMapped: finalMappingResults.reduce((sum, m) => sum + m.wb.length, 0),
      similaritySum: stats.similaritySum,
      avgSimilarity: stats.mapped > 0 ? Math.round((stats.similaritySum / stats.mapped) * 100) : 0
    },
    timeMs: Math.round(endTime - startTime)
  }
}
