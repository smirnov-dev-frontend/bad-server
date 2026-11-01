import { constants } from 'fs'
import { copyFile, mkdir, rename, unlink } from 'fs/promises'
import { join } from 'path'
import BadRequestError from '../errors/bad-request-error'
import { containedFile, IMAGE_ROOT, imageName, TEMP_ROOT } from './files'

export default async function movingFile(imagePath: string) {
    const name = imageName(imagePath)
    try {
        await mkdir(IMAGE_ROOT, { recursive: true })
        const source = await containedFile(TEMP_ROOT, name)
        const destination = join(IMAGE_ROOT, name)
        try {
            await rename(source, destination)
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error
            await copyFile(source, destination, constants.COPYFILE_EXCL)
            await unlink(source)
        }
    } catch {
        throw new BadRequestError('Не найдено загруженное изображение')
    }
}
