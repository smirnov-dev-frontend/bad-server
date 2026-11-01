import 'dotenv/config'
import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { json, urlencoded } from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import mongoose from 'mongoose'
import path from 'path'
import { CSRF_SECRET, DB_ADDRESS, PORT } from './config'
import { csrfProtection, getCsrfToken } from './middlewares/csrf'
import errorHandler from './middlewares/error-handler'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'
import cleanupUploads from './utils/cleanupUploads'

export const app = express()
const origins = (
    process.env.ORIGIN_ALLOW || 'http://localhost:5173,http://localhost'
)
    .split(',')
    .map((origin) => origin.trim())

app.disable('x-powered-by')
app.set('query parser', 'simple')
app.set(
    'trust proxy',
    process.env.TRUST_PROXY === 'true'
        ? 'loopback, linklocal, uniquelocal'
        : false
)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }))
app.use(
    cors({
        origin: (origin, callback) =>
            callback(null, origin ? origins.includes(origin) : origins[0]),
        credentials: true,
    })
)
app.use(
    rateLimit({
        windowMs: 1000,
        limit: 30,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { message: 'Слишком много одновременных запросов' },
    })
)
app.use(
    rateLimit({
        windowMs: 60 * 1000,
        limit: 120,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { message: 'Слишком много запросов. Повторите через минуту' },
    })
)
app.use(cookieParser(CSRF_SECRET))
app.get('/auth/csrf-token', getCsrfToken)
app.use(csrfProtection)
app.use('/images', serveStatic(path.join(__dirname, 'public/images')))
app.use(urlencoded({ extended: false, limit: '32kb', parameterLimit: 50 }))
app.use(json({ limit: '32kb', strict: true }))
app.use(
    '/auth/login',
    rateLimit({
        windowMs: 60 * 1000,
        limit: 20,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { message: 'Слишком много попыток входа' },
    })
)
app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
})
app.use(routes)
app.use(errors())
app.use(errorHandler)

mongoose.set('maxTimeMS', 5000)

if (require.main === module) {
    mongoose
        .connect(DB_ADDRESS)
        .then(() => {
            cleanupUploads().catch(() => undefined)
            setInterval(
                () => cleanupUploads().catch(() => undefined),
                10 * 60 * 1000
            ).unref()
            const server = app.listen(PORT)
            server.requestTimeout = 15000
            server.headersTimeout = 10000
            server.keepAliveTimeout = 5000
        })
        .catch(() => {
            console.error('Не удалось запустить сервер')
            process.exitCode = 1
        })
}
