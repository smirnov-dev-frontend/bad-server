import { randomUUID } from 'crypto'
import { mkdirSync } from 'fs'
import multer from 'multer'
import BadRequestError from '../errors/bad-request-error'
import { TEMP_ROOT } from '../utils/files'

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        mkdirSync(TEMP_ROOT, { recursive: true })
        cb(null, TEMP_ROOT)
    },
    filename: (_req, _file, cb) => cb(null, `${randomUUID()}.upload`),
})

export default multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
    fileFilter: (_req, file, cb) => {
        if (
            ![
                'image/png',
                'image/jpeg',
                'image/jpg',
                'image/gif',
                'image/webp',
            ].includes(file.mimetype)
        ) {
            return cb(new BadRequestError('Недопустимый формат изображения'))
        }
        if (Buffer.byteLength(file.originalname) > 255) {
            return cb(new BadRequestError('Слишком длинное имя файла'))
        }
        return cb(null, true)
    },
})
