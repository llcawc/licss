import { Buffer } from 'node:buffer'
import { SourceMapGenerator } from 'source-map'

/**
 * Создает sourcemap для CSS-файла и добавляет комментарий sourceMappingURL
 * @param {string} cssContent - Содержимое CSS-файла
 * @param {string} filename - Имя исходного файла
 * @returns {{cssWithMap: string, map: string}} - Объект с CSS и sourcemапом
 */

export function generateCSSSourceMap(cssContent, filename) {
  // Создаем генератор sourcemap
  const generator = new SourceMapGenerator()

  // Добавляем источник
  generator.setSourceContent(filename, cssContent)

  // Разбиваем CSS на строки
  const lines = cssContent.split('\n')

  // Добавляем соответствия между строками
  lines.forEach((line, i) => {
    generator.addMapping({
      generated: { line: i + 1, column: 0 },
      original: { line: i + 1, column: 0 },
      source: filename,
    })
  })

  // Получаем sourcemap в формате JSON
  const map = generator.toString()

  // Формируем комментарий sourceMapping
  const sourceMappingURL = `/*# sourceMappingURL=data:application/json;base64,${Buffer.from(map).toString('base64')} */`

  // Возвращаем результат
  return {
    cssWithMap: cssContent + '\n' + sourceMappingURL,
    map,
  }
}

// Пример использования:
// const content = readFileSync('./style.css', 'utf8')
const content = 'a{color:white;}'
const result = generateCSSSourceMap(content, 'style.css')
console.log(result.cssWithMap)
console.log(result.map)
