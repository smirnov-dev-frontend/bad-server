import { Router } from 'express'
import { uploadFile } from '../controllers/upload'
import { roleGuardMiddleware } from '../middlewares/auth'
import { Role } from '../models/user'
import fileMiddleware from '../middlewares/file'

const uploadRouter = Router()
uploadRouter.post(
    '/',
    roleGuardMiddleware(Role.Admin),
    fileMiddleware.single('file'),
    uploadFile
)

export default uploadRouter
