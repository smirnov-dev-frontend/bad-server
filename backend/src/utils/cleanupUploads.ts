import { readdir, stat, unlink } from 'fs/promises'
import path from 'path'
import { TEMP_ROOT } from './files'

export default async function cleanupUploads() {
    const entries = await readdir(TEMP_ROOT, { withFileTypes: true }).catch(
        () => []
    )
    await Promise.all(
        entries
            .filter((entry) => entry.isFile())
            .map(async (entry) => {
                const file = path.join(TEMP_ROOT, entry.name)
                try {
                    const metadata = await stat(file)
                    if (Date.now() - metadata.mtimeMs > 60 * 60 * 1000)
                        await unlink(file)
                } catch {
                    return
                }
            })
    )
}
