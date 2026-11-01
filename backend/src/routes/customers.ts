import { Router } from 'express'
import {
    deleteCustomer,
    getCustomerById,
    getCustomers,
    updateCustomer,
} from '../controllers/customers'
import { roleGuardMiddleware } from '../middlewares/auth'
import { Role } from '../models/user'
import {
    validateId,
    validateProfileBody,
    validateCustomersQuery,
} from '../middlewares/validations'

const customerRouter = Router()
customerRouter.use(roleGuardMiddleware(Role.Admin))

customerRouter.get('/', validateCustomersQuery, getCustomers)
customerRouter.get('/:id', validateId, getCustomerById)
customerRouter.patch('/:id', validateId, validateProfileBody, updateCustomer)
customerRouter.delete('/:id', validateId, deleteCustomer)

export default customerRouter
