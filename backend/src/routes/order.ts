import { Router } from 'express'
import {
    createOrder,
    deleteOrder,
    getOrderByNumber,
    getOrderCurrentUserByNumber,
    getOrders,
    getOrdersCurrentUser,
    updateOrder,
} from '../controllers/order'
import { roleGuardMiddleware } from '../middlewares/auth'
import {
    validateOrderBody,
    validateOrderUpdateBody,
    validateOrderNumber,
    validateId,
    validateOrdersQuery,
    validateUserOrdersQuery,
} from '../middlewares/validations'
import { Role } from '../models/user'

const orderRouter = Router()

orderRouter.post('/', validateOrderBody, createOrder)
orderRouter.get(
    '/all',
    roleGuardMiddleware(Role.Admin),
    validateOrdersQuery,
    getOrders
)
orderRouter.get('/all/me', validateUserOrdersQuery, getOrdersCurrentUser)
orderRouter.get(
    '/:orderNumber',
    validateOrderNumber,
    roleGuardMiddleware(Role.Admin),
    getOrderByNumber
)
orderRouter.get(
    '/me/:orderNumber',
    validateOrderNumber,
    getOrderCurrentUserByNumber
)
orderRouter.patch(
    '/:orderNumber',
    validateOrderNumber,
    roleGuardMiddleware(Role.Admin),
    validateOrderUpdateBody,
    updateOrder
)

orderRouter.delete(
    '/:id',
    validateId,
    roleGuardMiddleware(Role.Admin),
    deleteOrder
)

export default orderRouter
