import { realpath, unlink } from 'fs/promises'
import path from 'path'
import BadRequestError from '../errors/bad-request-error'

export const IMAGE_ROOT = path.join(__dirname, '../public/images')
export const TEMP_ROOT = path.join(__dirname, '../../uploads/temp')

export function imageName(value: string) {
    if (!/^\/images\/[a-z0-9_-]+\.(png|jpe?g|gif)$/i.test(value)) {
        throw new BadRequestError('Недопустимый путь изображения')
    }
    return path.basename(value)
}

export async function containedFile(root: string, name: string) {
    const resolvedRoot = await realpath(root)
    const file = await realpath(path.join(resolvedRoot, name))
    if (path.dirname(file) !== resolvedRoot) {
        throw new BadRequestError('Недопустимый путь файла')
    }
    return file
}

export async function removeImage(value: string) {
    try {
        const file = await containedFile(IMAGE_ROOT, imageName(value))
        await unlink(file)
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
}
