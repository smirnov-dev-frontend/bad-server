import { Joi, celebrate } from 'celebrate'
import sanitizeHtml from 'sanitize-html'

export const phoneRegExp = /^\+?[0-9][0-9 ()-]{5,24}$/

export enum PaymentType {
    Card = 'card',
    Online = 'online',
}

const text = (max: number) =>
    Joi.string()
        .max(max)
        .custom((value: string) =>
            sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
        )
const email = Joi.string().email().max(254)
const password = Joi.string()
    .min(6)
    .max(72)
    .custom((value: string, helpers) =>
        Buffer.byteLength(value) <= 72
            ? value
            : helpers.error('string.max', { limit: 72 })
    )
const objectId = Joi.string().hex().length(24)
const phone = Joi.string().max(26).pattern(phoneRegExp)
const image = Joi.object({
    fileName: Joi.string()
        .max(150)
        .pattern(/^\/images\/[a-z0-9_-]+\.(png|jpe?g|gif)$/i)
        .required(),
    originalName: text(255).required(),
}).unknown(false)
const productFields = {
    title: text(30).min(2),
    image,
    category: Joi.string().valid(
        'софт-скил',
        'хард-скил',
        'другое',
        'дополнительное',
        'кнопка'
    ),
    description: text(5000),
    price: Joi.number().min(0).max(1000000000).allow(null),
}
const profileFields = {
    name: text(30).min(2),
    email,
    phone,
}
const body = (schema: Joi.ObjectSchema) =>
    celebrate({ body: schema }, { convert: false, abortEarly: false })

export const validateOrderBody = body(
    Joi.object({
        items: Joi.array()
            .items(objectId.required())
            .min(1)
            .max(100)
            .unique()
            .required(),
        payment: Joi.string()
            .valid(...Object.values(PaymentType))
            .required(),
        email: email.required(),
        phone: phone.required(),
        address: text(500).required(),
        total: Joi.number().min(0).max(1000000000).required(),
        comment: Joi.string()
            .max(5000)
            .allow('')
            .custom((value: string) =>
                sanitizeHtml(value, {
                    allowedTags: [
                        'a',
                        'b',
                        'strong',
                        'i',
                        'em',
                        'u',
                        'p',
                        'br',
                        'div',
                        'span',
                        'ul',
                        'ol',
                        'li',
                    ],
                    allowedAttributes: { a: ['href', 'title'] },
                    allowedSchemes: ['http', 'https'],
                    allowProtocolRelative: false,
                })
            ),
    }).unknown(false)
)

export const validateProductBody = body(
    Joi.object(productFields)
        .fork(['title', 'image', 'category', 'description'], (field) =>
            field.required()
        )
        .unknown(false)
)
export const validateProductUpdateBody = body(
    Joi.object(productFields).min(1).unknown(false)
)
export const validateUserBody = body(
    Joi.object({
        name: profileFields.name,
        email: email.required(),
        password: password.required(),
    }).unknown(false)
)
export const validateAuthentication = body(
    Joi.object({
        email: email.required(),
        password: password.required(),
    }).unknown(false)
)
export const validateProfileBody = body(
    Joi.object(profileFields).min(1).unknown(false)
)
export const validateOrderUpdateBody = body(
    Joi.object({
        status: Joi.string()
            .valid('new', 'delivering', 'completed', 'cancelled')
            .required(),
    }).unknown(false)
)

export const validateObjId = celebrate({
    params: Joi.object({ productId: objectId.required() }),
})
export const validateId = celebrate({
    params: Joi.object({ id: objectId.required() }),
})
export const validateOrderNumber = celebrate({
    params: Joi.object({
        orderNumber: Joi.number()
            .integer()
            .min(1)
            .max(Number.MAX_SAFE_INTEGER)
            .required(),
    }),
})

const pagination = {
    page: Joi.number().integer().min(1).max(10000),
    limit: Joi.number()
        .integer()
        .min(1)
        .max(1000000)
        .custom((value: number) => Math.min(value, 100)),
}
const smallPagination = {
    ...pagination,
    limit: Joi.number()
        .integer()
        .min(1)
        .max(1000000)
        .custom((value: number) => Math.min(value, 10)),
}
const search = Joi.string().max(100).allow('')
const amount = Joi.number().min(0).max(1000000000).empty('')
const date = Joi.date().iso().empty('')
const sorting = (fields: string[]) => ({
    sortField: Joi.string().valid(...fields),
    sortOrder: Joi.string().valid('asc', 'desc'),
})

export const validateProductQuery = celebrate({
    query: Joi.object(pagination).unknown(false),
})
export const validateUserOrdersQuery = celebrate({
    query: Joi.object({ ...smallPagination, search }).unknown(false),
})
export const validateOrdersQuery = celebrate({
    query: Joi.object({
        ...smallPagination,
        ...sorting(['createdAt', 'orderNumber', 'totalAmount', 'status']),
        search,
        status: Joi.string().valid(
            '',
            'new',
            'delivering',
            'completed',
            'cancelled'
        ),
        totalAmountFrom: amount,
        totalAmountTo: amount,
        orderDateFrom: date,
        orderDateTo: date,
    }).unknown(false),
})
export const validateCustomersQuery = celebrate({
    query: Joi.object({
        ...smallPagination,
        ...sorting([
            'createdAt',
            'name',
            'totalAmount',
            'orderCount',
            'lastOrderDate',
        ]),
        search,
        registrationDateFrom: date,
        registrationDateTo: date,
        lastOrderDateFrom: date,
        lastOrderDateTo: date,
        totalAmountFrom: amount,
        totalAmountTo: amount,
        orderCountFrom: amount.integer(),
        orderCountTo: amount.integer(),
    }).unknown(false),
})
