const assert = require('node:assert/strict')
const { before, after, test } = require('node:test')
const { setTimeout: delay } = require('node:timers/promises')
const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs/promises')

process.env.MONGOMS_DOWNLOAD_DIR ||= path.join(os.tmpdir(), 'weblarek-mongodb')
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const sharp = require('sharp')
const { app } = require('../src/app')
const User = require('../src/models/user').default
const Product = require('../src/models/product').default
const { IMAGE_ROOT, TEMP_ROOT } = require('../src/utils/files')
const cleanupUploads = require('../src/utils/cleanupUploads').default

let database
let server
let baseUrl
let product
let orderNumber
let customerId
const files = []
const testUri = process.env.TEST_DB_ADDRESS

function client() {
    const cookies = new Map()
    let csrfToken
    let accessToken
    return async (endpoint, options = {}) => {
        const headers = new Headers(options.headers)
        if (cookies.size) headers.set('Cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; ') + (headers.has('Cookie') ? `; ${headers.get('Cookie')}` : ''))
        if (options.csrf !== false && csrfToken) headers.set('X-CSRF-Token', csrfToken)
        if (options.auth !== false && accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
        let body = options.body
        if (body && !(body instanceof FormData) && typeof body === 'object') {
            headers.set('Content-Type', 'application/json')
            body = JSON.stringify(body)
        }
        const response = await fetch(baseUrl + endpoint, { ...options, headers, body })
        for (const cookie of response.headers.getSetCookie()) {
            const pair = cookie.split(';')[0]
            const equals = pair.indexOf('=')
            cookies.set(pair.slice(0, equals), pair.slice(equals + 1))
        }
        const raw = await response.text()
        let data
        try { data = JSON.parse(raw) } catch { data = raw }
        if (data.csrfToken) csrfToken = data.csrfToken
        if (data.accessToken) accessToken = data.accessToken
        return { status: response.status, data, headers: response.headers }
    }
}

const admin = client()
const customer = client()

before(async () => {
    if (testUri) {
        const databaseName = new URL(testUri).pathname.slice(1)
        assert.match(databaseName, /^weblarek_security_test_[a-z0-9_]+$/)
        await mongoose.connect(testUri)
    } else {
        database = await MongoMemoryServer.create()
        await mongoose.connect(database.getUri())
    }
    await Promise.all([User.init(), Product.init()])
    server = app.listen(0, '127.0.0.1')
    await new Promise((resolve) => server.once('listening', resolve))
    baseUrl = `http://127.0.0.1:${server.address().port}`
    await admin('/auth/csrf-token')
    const account = await admin('/auth/register', {
        method: 'POST', body: { name: 'Администратор', email: 'admin@test.ru', password: 'password1' },
    })
    assert.equal(account.status, 201)
    await User.updateOne({ email: 'admin@test.ru' }, { $set: { roles: ['admin'] } })
    await customer('/auth/csrf-token')
    const response = await customer('/auth/register', {
        method: 'POST', body: { name: 'Покупатель', email: 'user@test.ru', password: 'password2' },
    })
    assert.equal(response.status, 201)
    customerId = response.data.user.id
    product = await Product.create({
        title: 'Тестовый товар', description: 'Описание', category: 'другое', price: 100,
        image: { fileName: '/images/Leaf.png', originalName: 'Leaf.png' },
    })
})

after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve))
    if (testUri && mongoose.connection.readyState === 1) {
        assert.match(mongoose.connection.name, /^weblarek_security_test_[a-z0-9_]+$/)
        await mongoose.connection.dropDatabase()
    }
    await mongoose.disconnect()
    if (database) await database.stop()
    await Promise.all(files.map((file) => fs.unlink(file).catch(() => undefined)))
})

test('CSRF: отклонены отсутствующий, чужой и поддельный токены', async () => {
    const anonymous = client()
    const body = { email: 'user@test.ru', password: 'password2' }
    assert.equal((await anonymous('/auth/login', { method: 'POST', body })).status, 403)
    const first = await anonymous('/auth/csrf-token')
    const other = client()
    await other('/auth/csrf-token')
    assert.equal((await other('/auth/login', {
        method: 'POST', body, csrf: false, headers: { 'X-CSRF-Token': first.data.csrfToken },
    })).status, 403)
    assert.equal((await anonymous('/auth/login', {
        method: 'POST', body, csrf: false, headers: { 'X-CSRF-Token': 'a'.repeat(64) },
    })).status, 403)
    assert.equal((await anonymous('/auth/login', { method: 'POST', body })).status, 200)
    assert.equal((await anonymous('/auth/logout')).status, 404)
    await delay(1100)
})

test('Пароли защищены bcrypt, секретные поля не возвращаются', async () => {
    const stored = await User.findById(customerId).select('+password')
    assert.equal(await bcrypt.compare('password2', stored.password), true)
    assert.match(stored.password, /^\$2[aby]\$/)
    const response = await customer('/auth/user')
    assert.equal(response.status, 200)
    assert.equal(response.data.user.password, undefined)
    assert.equal(response.data.user.tokens, undefined)
    assert.equal((await client()('/auth/user')).status, 401)
})

test('NoSQL и повышение роли отклонены до обращения к базе', async () => {
    assert.equal((await customer('/auth/login', {
        method: 'POST', body: { email: { $ne: null }, password: 'password2' },
    })).status, 400)
    for (const body of [{ roles: ['admin'] }, { $set: { roles: ['admin'] } }, { name: { $ne: null } }]) {
        assert.equal((await customer('/auth/me', { method: 'PATCH', body })).status, 400)
    }
    const response = await customer('/auth/me', { method: 'PATCH', body: { name: 'Новое имя' } })
    assert.equal(response.status, 200)
    assert.deepEqual((await User.findById(customerId)).roles, ['customer'])
    assert.equal((await admin('/order/all?status[$expr][$function][body]=evil')).status, 400)
})

test('Права администратора проверяются на чтение, изменение и загрузку', async () => {
    for (const endpoint of ['/customers', '/order/all', `/customers/${customerId}`]) {
        assert.equal((await customer(endpoint)).status, 403)
    }
    assert.equal((await customer('/upload', { method: 'POST' })).status, 403)
    assert.equal((await customer(`/product/${product.id}`, { method: 'DELETE' })).status, 403)
    await delay(1100)
})

test('XSS: очищен HTML заказа, сохранены безопасная ссылка и форматирование', async () => {
    const response = await customer('/order', {
        method: 'POST', body: {
            items: [product.id], total: 100, payment: 'online', email: 'user@test.ru',
            phone: '+7 (999) 123-45-67', address: 'Москва, 1',
            comment: '<b>Текст</b><img src=x onerror=alert(1)><script>alert(1)</script><a href="javascript:alert(1)">вредная</a><a href="https://example.org">ссылка</a>',
        },
    })
    assert.equal(response.status, 200)
    assert.match(response.data.comment, /<b>Текст<\/b>/)
    assert.match(response.data.comment, /href="https:\/\/example.org"/)
    assert.doesNotMatch(response.data.comment, /script|onerror|<img|javascript:/i)
    assert.equal(response.data.customer.password, undefined)
    orderNumber = response.data.orderNumber
    const stranger = client()
    await stranger('/auth/csrf-token')
    await stranger('/auth/register', {
        method: 'POST', body: { name: 'Другой', email: 'other@test.ru', password: 'password3' },
    })
    assert.equal((await stranger(`/order/me/${orderNumber}`)).status, 404)
    assert.equal((await customer(`/order/me/${orderNumber}`)).status, 200)
    assert.equal((await admin('/order/all')).data.orders[0].customer.tokens, undefined)
})

test('Ограничены размеры тела, строк, корзины и значения пагинации', async () => {
    assert.equal((await customer('/auth/me', {
        method: 'PATCH', body: { name: 'a'.repeat(40000) },
    })).status, 413)
    assert.equal((await customer('/auth/me', {
        method: 'PATCH', body: { name: 'a'.repeat(31) },
    })).status, 400)
    assert.equal((await admin('/customers?limit=1000')).data.pagination.pageSize, 10)
    assert.equal((await admin('/order/all?limit=1000')).data.pagination.pageSize, 10)
    assert.equal((await admin('/customers?limit=0')).status, 400)
    assert.equal((await admin('/customers?sortField=password')).status, 400)
    await delay(1100)
})

test('ReDoS: поисковые метасимволы и длинный телефон обработаны быстро', async () => {
    for (const endpoint of ['/customers', '/order/all', '/order/all/me']) {
        assert.equal((await admin(`${endpoint}?search=${encodeURIComponent('1+{}$()(a+)+$')}`)).status, 200)
    }
    const start = performance.now()
    assert.equal((await customer('/order', {
        method: 'POST', body: {
            items: [product.id], total: 100, payment: 'online', email: 'user@test.ru',
            phone: `${'1'.repeat(1000)}a`, address: 'Москва',
        },
    })).status, 400)
    assert.ok(performance.now() - start < 1000)
})

test('Path Traversal: закрыты исходники, dotfiles и временные загрузки; статика кэшируется', async () => {
    for (const endpoint of ['/images/%2e%2e/%2e%2e/config.ts', '/images/..%2f..%2fconfig.ts', '/images/.env', '/temp/file.png']) {
        const response = await admin(endpoint)
        assert.ok([400, 403, 404].includes(response.status))
        assert.doesNotMatch(JSON.stringify(response.data), /AUTH_ACCESS_TOKEN_SECRET|import mongoose/)
    }
    const response = await admin('/images/Leaf.png')
    assert.equal(response.status, 200)
    assert.match(response.headers.get('cache-control'), /max-age=3600/)
    assert.equal(response.headers.get('x-powered-by'), null)
    await delay(1100)
})

test('Файлы: проверены минимум, максимум, содержимое, SVG и безопасное имя', async () => {
    const upload = (buffer, type = 'image/png', name = 'original.png') => {
        const form = new FormData()
        form.set('file', new Blob([buffer], { type }), name)
        return admin('/upload', { method: 'POST', body: form })
    }
    assert.equal((await upload(Buffer.alloc(100))).status, 400)
    assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413)
    assert.equal((await upload(Buffer.alloc(3000))).status, 400)
    assert.equal((await upload(Buffer.alloc(3000), 'image/svg+xml')).status, 400)
    const image = await fs.readFile(path.resolve(__dirname, '../src/public/images/Leaf.png'))
    const result = await upload(image, 'image/png', '../../original.png')
    assert.equal(result.status, 201, JSON.stringify(result.data))
    assert.match(result.data.fileName, /^\/images\/[a-f0-9-]{36}\.png$/)
    const name = path.basename(result.data.fileName)
    files.push(path.join(TEMP_ROOT, name), path.join(IMAGE_ROOT, name))
    assert.equal((await admin(`/temp/${name}`)).status, 404)
    assert.equal((await sharp(path.join(TEMP_ROOT, name)).metadata()).format, 'png')
    const created = await admin('/product', {
        method: 'POST', body: {
            title: 'Новый товар', description: 'Описание', category: 'другое', price: 200, image: result.data,
        },
    })
    assert.equal(created.status, 201, JSON.stringify(created.data))
    assert.equal((await admin(result.data.fileName)).status, 200)
    assert.equal((await admin(`/product/${created.data._id}`, {
        method: 'PATCH', body: { title: 'Обновлённый товар' },
    })).status, 200)
    const replacement = await upload(image)
    const replacementName = path.basename(replacement.data.fileName)
    files.push(path.join(TEMP_ROOT, replacementName), path.join(IMAGE_ROOT, replacementName))
    assert.equal((await admin(`/product/${created.data._id}`, {
        method: 'PATCH', body: { image: replacement.data },
    })).status, 200)
    await assert.rejects(fs.access(path.join(IMAGE_ROOT, name)), { code: 'ENOENT' })
    assert.equal((await admin(`/product/${created.data._id}`, { method: 'DELETE' })).status, 200)
    await assert.rejects(fs.access(path.join(IMAGE_ROOT, replacementName)), { code: 'ENOENT' })
    const expired = path.join(TEMP_ROOT, 'expired-test.upload')
    files.push(expired)
    await fs.writeFile(expired, 'unused')
    await fs.utimes(expired, new Date(0), new Date(0))
    await cleanupUploads()
    await assert.rejects(fs.access(expired), { code: 'ENOENT' })
    await delay(1100)
})

test('Refresh: ротация атомарна, повторное использование и токен после выхода отклонены', async () => {
    const response = await customer('/auth/token', { method: 'POST' })
    assert.equal(response.status, 200)
    const refreshCookie = response.headers.getSetCookie().find((cookie) => cookie.startsWith('refreshToken='))
    const old = refreshCookie.split(';')[0]
    assert.equal((await customer('/auth/token', { method: 'POST' })).status, 200)
    const replay = client()
    await replay('/auth/csrf-token')
    assert.equal((await replay('/auth/token', { method: 'POST', headers: { Cookie: old } })).status, 401)
    assert.equal((await customer('/auth/logout', { method: 'POST' })).status, 200)
    assert.equal((await customer('/auth/token', { method: 'POST' })).status, 401)
    await delay(1100)
})

test('Нагрузка: 200 параллельных запросов вызывают 429, сервер продолжает отвечать', async () => {
    const results = await Promise.all(Array.from({ length: 200 }, () => admin('/product')))
    assert.ok(results.some((response) => response.status === 429))
    assert.ok(results.every((response) => [200, 429].includes(response.status)))
    assert.equal((await admin('/product')).status, 429)
    assert.equal((await admin('/product')).headers.get('x-powered-by'), null)
})
