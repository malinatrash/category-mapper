/**
 * Web Worker для выполнения автоматического сопоставления категорий
 * без блокировки основного потока UI
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

// Обработчик сообщений от основного потока
self.onmessage = function(e) {
  const { action, data } = e.data
  
  if (action === 'autoMap') {
    // Извлекаем данные из сообщения
    const { ozonCategories, wbCategories, threshold } = data
    
    // Отправляем прогресс 
    self.postMessage({ 
      type: 'progress', 
      status: 'start',
      message: 'Подготовка данных для автосопоставления...' 
    })
    
    // Выполняем сопоставление в отдельном потоке
    const result = performAutoMapping(ozonCategories, wbCategories, threshold)
    
    // Отправляем результат обратно в основной поток
    self.postMessage({ 
      type: 'complete', 
      result: result 
    })
  }
}

/**
 * Выполняет автоматическое сопоставление категорий
 */
function performAutoMapping(ozonCategories, wbCategories, threshold) {
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
  
  // Результаты - пары для сопоставления
  const matchingPairs = []
  
  // Шаг 1: Точные совпадения
  let lastProgress = 0
  
  for (let i = 0; i < ozonCategories.length; i++) {
    const ozonCategory = ozonCategories[i]
    
    // Пропускаем удаленные категории
    if (!ozonIdSet.has(ozonCategory.id)) continue
    
    // Проверяем точное совпадение
    const normalizedName = ozonCategory.name.toLowerCase().trim()
    const exactMatch = wbExactMatchIndex[normalizedName]
    
    if (exactMatch && wbIdSet.has(exactMatch.id)) {
      // Найдено точное совпадение
      matchingPairs.push([ozonCategory, exactMatch])
      stats.mapped++
      stats.exactMatches++
      stats.similaritySum += 1.0
      
      // Удаляем обработанные категории
      ozonIdSet.delete(ozonCategory.id)
      wbIdSet.delete(exactMatch.id)
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
  
  // Промежуточный отчет
  self.postMessage({
    type: 'progress',
    status: 'step2',
    message: `Поиск частичных совпадений для оставшихся ${ozonIdSet.size} категорий...`,
    stats: { ...stats, totalToProcess }
  })
  
  // Шаг 2: Поиск приблизительных совпадений
  const remainingOzons = ozonCategories.filter(c => ozonIdSet.has(c.id))
  lastProgress = 0
  
  for (let i = 0; i < remainingOzons.length; i++) {
    const ozonCategory = remainingOzons[i]
    
    if (!ozonIdSet.has(ozonCategory.id)) continue
    
    let bestMatch = null
    let bestSimilarity = threshold
    
    for (const wbData of wbNormalizedData) {
      if (!wbIdSet.has(wbData.category.id)) continue
      
      const similarity = calculateStringSimilarity(ozonCategory.name, wbData.category.name)
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity
        bestMatch = wbData.category
      }
    }
    
    if (bestMatch) {
      matchingPairs.push([ozonCategory, bestMatch])
      stats.mapped++
      stats.similaritySum += bestSimilarity
      
      ozonIdSet.delete(ozonCategory.id)
      wbIdSet.delete(bestMatch.id)
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
  
  return {
    matchingPairs,
    stats: {
      totalProcessed: totalToProcess,
      mapped: stats.mapped,
      exactMatches: stats.exactMatches,
      similaritySum: stats.similaritySum,
      avgSimilarity: stats.mapped > 0 ? Math.round((stats.similaritySum / stats.mapped) * 100) : 0
    },
    timeMs: Math.round(endTime - startTime)
  }
}
