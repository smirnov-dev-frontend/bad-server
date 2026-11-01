import { randomUUID } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { unlink } from 'fs/promises'
import path from 'path'
import sanitizeHtml from 'sanitize-html'
import sharp from 'sharp'
import BadRequestError from '../errors/bad-request-error'
import { TEMP_ROOT } from '../utils/files'

sharp.cache(false)
sharp.concurrency(2)
let activeUploads = 0

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.file) return next(new BadRequestError('Файл не загружен'))
    if (req.file.size < 2048) {
        await unlink(req.file.path).catch(() => undefined)
        return next(
            new BadRequestError('Изображение должно быть не меньше 2 КБ')
        )
    }
    const source = req.file.path
    if (activeUploads >= 2) {
        await unlink(source).catch(() => undefined)
        return res
            .status(429)
            .json({ message: 'Загрузка занята. Повторите позже' })
    }
    activeUploads += 1
    const name = `${randomUUID()}.png`
    const destination = path.join(TEMP_ROOT, name)
    try {
        const image = sharp(source, {
            limitInputPixels: 4000000,
            animated: false,
        })
        const metadata = await image.metadata()
        if (
            !metadata.format ||
            !['png', 'jpeg', 'gif', 'webp'].includes(metadata.format)
        ) {
            throw new Error('Недопустимый формат')
        }
        await image.png().toFile(destination)
        return res.status(201).json({
            fileName: `/images/${name}`,
            originalName: sanitizeHtml(req.file.originalname, {
                allowedTags: [],
                allowedAttributes: {},
            }),
        })
    } catch {
        await unlink(destination).catch(() => undefined)
        return next(
            new BadRequestError('Файл не является допустимым изображением')
        )
    } finally {
        activeUploads -= 1
        await unlink(source).catch(() => undefined)
    }
}
