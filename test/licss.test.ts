// oxlint-disable typescript/no-explicit-any
import File from 'vinyl'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { licss } from '../src/licss.js'

// Моки для зависимостей
vi.mock('lightningcss', () => ({
  browserslistToTargets: vi.fn(() => ({})),
  bundle: vi.fn(() => ({
    code: new Uint8Array([99, 115, 115]), // "css" в байтах
    map: null,
  })),
  transform: vi.fn((options) => ({
    code: options?.code || new Uint8Array([99, 115, 115]),
    map: null,
  })),
}))

vi.mock('sass-embedded', () => ({
  compileStringAsync: vi.fn(() =>
    Promise.resolve({
      css: 'body { color: red; }',
      sourceMap: null,
    }),
  ),
}))

vi.mock('tinyglobby', () => ({
  glob: vi.fn(() => Promise.resolve(['/test/index.html'])),
}))

vi.mock('purgecss', () => ({
  PurgeCSS: class {
    purge() {
      return Promise.resolve([
        {
          css: '.used { color: green; }',
          rejected: [],
          sourceMap: null,
        },
      ])
    }
  },
}))

// Создание mock файла vinyl
const createMockFile = (options: {
  path: string
  contents: Buffer
  cwd?: string
  base?: string
  sourceMap?: any
}): File => {
  const { path, contents, cwd = process.cwd(), base = cwd, sourceMap } = options
  return new File({
    cwd,
    base,
    path,
    contents,
    stat: { mode: 0o666 } as any,
    sourceMap,
  }) as File
}

describe('licss', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('должен пропускать null файлы', async () => {
    const plugin = licss()
    const mockFile = { isNull: () => true } as File
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    plugin._transform(mockFile, null, callback)
    expect(callback).toHaveBeenCalledWith(null, mockFile)
  })

  it('должен вызывать ошибку для потоков', async () => {
    const plugin = licss()
    const mockFile = { isNull: () => false, isStream: () => true } as File
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    plugin._transform(mockFile, null, callback)
    // Ожидаем, что колбек вызван с ошибкой PluginError
    expect(callback).toHaveBeenCalledWith(expect.any(Error))
    const error = callback.mock.calls[0][0]
    expect(error.message).toContain('Streams are not supported')
  })

  it('должен пропускать partial файлы (начинающиеся с _)', async () => {
    const plugin = licss()
    const mockFile = {
      isNull: () => false,
      isStream: () => false,
      isBuffer: () => true,
      stem: '_partial',
    } as File
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    plugin._transform(mockFile, null, callback)
    expect(callback).toHaveBeenCalledWith()
  })

  it('должен вызывать ошибку для неподдерживаемого расширения', async () => {
    const plugin = licss()
    const mockFile = createMockFile({
      path: '/test/file.txt',
      contents: Buffer.from(''),
    })
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    await expect(plugin._transform(mockFile, null, callback)).rejects.toThrow('Unsupported file extension')
    // Колбек не должен быть вызван, потому что ошибка выброшена до его вызова
    expect(callback).not.toHaveBeenCalled()
  })

  it('должен обрабатывать CSS файл с компилятором lightningcss по умолчанию', async () => {
    const plugin = licss()
    const mockFile = createMockFile({
      path: '/test/file.css',
      contents: Buffer.from('body { color: red; }'),
    })
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    await plugin._transform(mockFile, null, callback)
    expect(callback).toHaveBeenCalledWith(null, mockFile)
    // Расширение должно стать .css
    expect(mockFile.extname).toBe('.css')
    // Содержимое должно быть заменено на мок (transform возвращает переданный код)
    expect(Buffer.isBuffer(mockFile.contents)).toBe(true)
    expect((mockFile.contents as Buffer).toString()).toBe('body { color: red; }')
  })

  it('должен обрабатывать SCSS файл с компилятором sass', async () => {
    const plugin = licss({ minify: false })
    const mockFile = createMockFile({
      path: '/test/file.scss',
      contents: Buffer.from('$color: red; body { color: $color; }'),
    })
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    await plugin._transform(mockFile, null, callback)
    expect(callback).toHaveBeenCalledWith(null, mockFile)
    expect(mockFile.extname).toBe('.css')
    // Скомпилированный CSS должен быть из мока sass
    const output = (mockFile.contents as Buffer).toString()
    expect(output).toBe('body { color: red; }')
  })

  it('должен минифицировать CSS при minify: true', async () => {
    const plugin = licss({ minify: true })
    const mockFile = createMockFile({
      path: '/test/file.css',
      contents: Buffer.from('body { color: red; }'),
    })
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    await plugin._transform(mockFile, null, callback)
    expect(callback).toHaveBeenCalledWith(null, mockFile)
    // LightningCSS мок возвращает переданный код (минификация не эмулируется)
    expect((mockFile.contents as Buffer).toString()).toBe('body { color: red; }')
  })

  it('должен применять PurgeCSS при наличии опций', async () => {
    const plugin = licss({
      purgeCSSoptions: {
        content: ['/test/index.html'],
        css: [],
        rejected: true,
      },
    })
    const mockFile = createMockFile({
      path: '/test/file.css',
      contents: Buffer.from('.unused { color: blue; } .used { color: green; }'),
    })
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    await plugin._transform(mockFile, null, callback)
    expect(callback).toHaveBeenCalledWith(null, mockFile)
    // PurgeCSS мок возвращает '.used { color: green; }'
    expect((mockFile.contents as Buffer).toString()).toBe('.used { color: green; }')
  })

  it('должен генерировать sourcemap при наличии sourceMap в файле', async () => {
    const sourceMap = { version: 3, sources: [], mappings: '' }
    const mockFile = createMockFile({
      path: '/test/file.css',
      contents: Buffer.from('body { color: red; }'),
      sourceMap,
    })
    const plugin = licss()
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    await plugin._transform(mockFile, null, callback)
    expect(mockFile.sourceMap).toBeDefined()
  })

  it('должен обрабатывать PCSS файл с bundle lightningcss', async () => {
    const plugin = licss()
    const mockFile = createMockFile({
      path: '/test/file.pcss',
      contents: Buffer.from('body { color: red; }'),
    })
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    await plugin._transform(mockFile, null, callback)
    expect(callback).toHaveBeenCalledWith(null, mockFile)
    expect(mockFile.extname).toBe('.css')
    expect((mockFile.contents as Buffer).toString()).toBe('css')
  })

  it('должен обрабатывать SASS файл с компилятором sass', async () => {
    const plugin = licss({ minify: false })
    const mockFile = createMockFile({
      path: '/test/file.sass',
      contents: Buffer.from('body\n  color: red'),
    })
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    await plugin._transform(mockFile, null, callback)
    expect(callback).toHaveBeenCalledWith(null, mockFile)
    expect(mockFile.extname).toBe('.css')
    const output = (mockFile.contents as Buffer).toString()
    expect(output).toBe('body { color: red; }')
  })

  it('должен пропускать transformLightningCSS если purgeCSSoptions.rejected установлен', async () => {
    const plugin = licss({
      purgeCSSoptions: {
        content: ['/test/index.html'],
        css: [],
        rejected: true,
      },
    })
    const mockFile = createMockFile({
      path: '/test/file.css',
      contents: Buffer.from('.unused { color: blue; }'),
    })
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    await plugin._transform(mockFile, null, callback)
    expect(callback).toHaveBeenCalledWith(null, mockFile)
    // PurgeCSS мок возвращает '.used { color: green; }'
    expect((mockFile.contents as Buffer).toString()).toBe('.used { color: green; }')
  })

  it('должен использовать loadPaths по умолчанию', async () => {
    const plugin = licss()
    const mockFile = createMockFile({
      path: '/test/file.scss',
      contents: Buffer.from('body { color: red; }'),
      cwd: '/test',
    })
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    await plugin._transform(mockFile, null, callback)
    expect(callback).toHaveBeenCalledWith(null, mockFile)
  })

  it('должен использовать переданные loadPaths', async () => {
    const plugin = licss({ loadPaths: ['/custom/path'] })
    const mockFile = createMockFile({
      path: '/test/file.scss',
      contents: Buffer.from('body { color: red; }'),
    })
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    await plugin._transform(mockFile, null, callback)
    expect(callback).toHaveBeenCalledWith(null, mockFile)
  })

  it('должен выбрасывать ошибку при неверных опциях PurgeCSS', async () => {
    const plugin = licss({
      purgeCSSoptions: {} as any, // отсутствует content
    })
    const mockFile = createMockFile({
      path: '/test/file.css',
      contents: Buffer.from('body { color: red; }'),
    })
    const callback = vi.fn()
    // @ts-expect-error доступ к приватному методу
    await expect(plugin._transform(mockFile, null, callback)).rejects.toThrow('PurgeCSS requires a non-empty "content" array')
  })
})
