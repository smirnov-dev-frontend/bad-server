import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { CSRF_SECRET, IS_PRODUCTION } from '../config'
import ForbiddenError from '../errors/forbidden-error'

const cookieName = '_csrf'
const sign = (session: string) =>
    createHmac('sha256', CSRF_SECRET).update(session).digest('hex')

export function getCsrfToken(req: Request, res: Response) {
    const session =
        req.signedCookies[cookieName] || randomBytes(32).toString('hex')
    res.cookie(cookieName, session, {
        signed: true,
        httpOnly: true,
        sameSite: 'strict',
        secure: IS_PRODUCTION,
        path: '/',
    })
    res.setHeader('Cache-Control', 'no-store')
    res.json({ csrfToken: sign(session) })
}

export function csrfProtection(
    req: Request,
    _res: Response,
    next: NextFunction
) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next()
    }
    const session = req.signedCookies[cookieName]
    const token = req.get('X-CSRF-Token')
    if (
        typeof session !== 'string' ||
        !token ||
        !/^[a-f0-9]{64}$/.test(token)
    ) {
        return next(new ForbiddenError('Невалидный CSRF-токен'))
    }
    if (
        !timingSafeEqual(
            Buffer.from(token, 'hex'),
            Buffer.from(sign(session), 'hex')
        )
    ) {
        return next(new ForbiddenError('Невалидный CSRF-токен'))
    }
    return next()
}
