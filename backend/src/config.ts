import { randomBytes } from 'crypto'
import { CookieOptions } from 'express'
import ms from 'ms'
import { SignOptions } from 'jsonwebtoken'

export const { PORT = '3000' } = process.env
export const { DB_ADDRESS = 'mongodb://127.0.0.1:27017/weblarek' } = process.env
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function secret(name: string) {
    const value = process.env[name]
    if (IS_PRODUCTION && (!value || Buffer.byteLength(value) < 32)) {
        throw new Error(`Задайте ${name}: минимум 32 байта`)
    }
    return value || randomBytes(32).toString('hex')
}

export const CSRF_SECRET = secret('CSRF_SECRET')
export const ACCESS_TOKEN = {
    secret: secret('AUTH_ACCESS_TOKEN_SECRET'),
    expiry: (process.env.AUTH_ACCESS_TOKEN_EXPIRY || '10m') as NonNullable<
        SignOptions['expiresIn']
    >,
}
export const REFRESH_TOKEN = {
    secret: secret('AUTH_REFRESH_TOKEN_SECRET'),
    expiry: (process.env.AUTH_REFRESH_TOKEN_EXPIRY || '7d') as NonNullable<
        SignOptions['expiresIn']
    >,
    cookie: {
        name: 'refreshToken',
        options: {
            httpOnly: true,
            sameSite: 'lax',
            secure: IS_PRODUCTION,
            maxAge: ms(
                (process.env.AUTH_REFRESH_TOKEN_EXPIRY ||
                    '7d') as ms.StringValue
            ),
            path: '/',
        } as CookieOptions,
    },
}

if (ACCESS_TOKEN.secret === REFRESH_TOKEN.secret) {
    throw new Error('Секреты access и refresh токенов должны отличаться')
}
