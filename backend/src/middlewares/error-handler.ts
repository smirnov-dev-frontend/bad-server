import { ErrorRequestHandler } from 'express'
import { Error as MongooseError } from 'mongoose'
import { MulterError } from 'multer'

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    let status = err.statusCode || err.status || 500
    let message = err.message
    if (err instanceof MulterError) {
        status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
        message = 'Недопустимый размер или формат загрузки'
    } else if (
        err instanceof MongooseError.ValidationError ||
        err instanceof MongooseError.CastError
    ) {
        status = 400
        message = 'Переданы некорректные данные'
    } else if (err.code === 11000) {
        status = 409
        message = 'Запись с такими данными уже существует'
    } else if (status === 413) {
        message = 'Превышен допустимый размер запроса'
    } else if (status === 400) {
        message = 'Переданы некорректные данные'
    }
    res.status(status >= 400 && status < 600 ? status : 500).json({
        message: status >= 500 ? 'На сервере произошла ошибка' : message,
    })
}

export default errorHandler
