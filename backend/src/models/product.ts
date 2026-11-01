import mongoose, { Document } from 'mongoose'
import { removeImage } from '../utils/files'

export interface IFile {
    fileName: string
    originalName: string
}

export interface IProduct extends Document {
    title: string
    image: IFile
    category: string
    description: string
    price: number
}

const cardsSchema = new mongoose.Schema<IProduct>(
    {
        title: {
            type: String,
            unique: true,
            required: [true, 'Поле "title" должно быть заполнено'],
            minlength: [2, 'Минимальная длина поля "title" - 2'],
            maxlength: [30, 'Максимальная длина поля "title" - 30'],
        },
        image: {
            fileName: {
                type: String,
                required: [true, 'Поле "image.fileName" должно быть заполнено'],
            },
            originalName: String,
        },
        category: {
            type: String,
            required: [true, 'Поле "category" должно быть заполнено'],
            maxlength: 50,
        },
        description: {
            type: String,
            maxlength: 5000,
        },
        price: {
            type: Number,
            default: null,
        },
    },
    { versionKey: false }
)

cardsSchema.index({ title: 'text' })

cardsSchema.post('findOneAndDelete', async (doc: IProduct | null) => {
    if (doc?.image?.fileName) {
        const referenced = await mongoose
            .model<IProduct>('product')
            .exists({ 'image.fileName': doc.image.fileName })
        if (!referenced) await removeImage(doc.image.fileName)
    }
})

export default mongoose.model<IProduct>('product', cardsSchema)
