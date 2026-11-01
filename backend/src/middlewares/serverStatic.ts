import { static as expressStatic } from 'express'

export default function serveStatic(baseDir: string) {
    return expressStatic(baseDir, {
        dotfiles: 'deny',
        index: false,
        redirect: false,
        maxAge: '1h',
        setHeaders: (res) => {
            res.setHeader(
                'Content-Security-Policy',
                "default-src 'none'; sandbox"
            )
            res.setHeader('X-Content-Type-Options', 'nosniff')
        },
    })
}
