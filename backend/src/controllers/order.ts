import { NextFunction, Request, Response } from 'express'
import { FilterQuery, Error as MongooseError } from 'mongoose'
import BadRequestError from '../errors/bad-request-error'
import NotFoundError from '../errors/not-found-error'
import Order, { IOrder } from '../models/order'
import Product, { IProduct } from '../models/product'
import escapeRegExp from '../utils/escapeRegExp'

const listOrders = async (
    req: Request,
    res: Response,
    next: NextFunction,
    own: boolean
) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortField = 'createdAt',
            sortOrder = 'desc',
            status,
            totalAmountFrom,
            totalAmountTo,
            orderDateFrom,
            orderDateTo,
            search,
        } = req.query
        const filters: FilterQuery<IOrder> = {}
        if (own) filters.customer = res.locals.user._id
        if (status) filters.status = status
        if (totalAmountFrom !== undefined)
            filters.totalAmount = { $gte: Number(totalAmountFrom) }
        if (totalAmountTo !== undefined)
            filters.totalAmount = {
                ...filters.totalAmount,
                $lte: Number(totalAmountTo),
            }
        if (orderDateFrom)
            filters.createdAt = { $gte: new Date(String(orderDateFrom)) }
        if (orderDateTo) {
            const end = new Date(String(orderDateTo))
            end.setUTCHours(23, 59, 59, 999)
            filters.createdAt = { ...filters.createdAt, $lte: end }
        }
        if (search) {
            const products = await Product.find({
                title: new RegExp(escapeRegExp(String(search)), 'i'),
            }).select('_id')
            filters.$or = [
                { products: { $in: products.map((product) => product._id) } },
            ]
            const number = Number(search)
            if (Number.isSafeInteger(number) && number > 0)
                filters.$or.push({ orderNumber: number })
        }
        const sort: Record<string, 1 | -1> = {
            [String(sortField)]: sortOrder === 'desc' ? -1 : 1,
        }
        const [orders, totalOrders] = await Promise.all([
            Order.find(filters)
                .sort(sort)
                .skip((Number(page) - 1) * Number(limit))
                .limit(Number(limit))
                .populate(['customer', 'products']),
            Order.countDocuments(filters),
        ])
        res.json({
            orders,
            pagination: {
                totalOrders,
                totalPages: Math.ceil(totalOrders / Number(limit)),
                currentPage: Number(page),
                pageSize: Number(limit),
            },
        })
    } catch (error) {
        next(error)
    }
}

export const getOrders = (req: Request, res: Response, next: NextFunction) =>
    listOrders(req, res, next, false)

export const getOrdersCurrentUser = (
    req: Request,
    res: Response,
    next: NextFunction
) => listOrders(req, res, next, true)

export const getOrderByNumber = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const order = await Order.findOne({
            orderNumber: req.params.orderNumber,
        })
            .populate(['customer', 'products'])
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
        return res.status(200).json(order)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}

export const getOrderCurrentUserByNumber = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const userId = res.locals.user._id
    try {
        const order = await Order.findOne({
            orderNumber: req.params.orderNumber,
        })
            .populate(['customer', 'products'])
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
        if (!order.customer._id.equals(userId)) {
            return next(
                new NotFoundError('Заказ по заданному id отсутствует в базе')
            )
        }
        return res.status(200).json(order)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}

export const createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const basket: IProduct[] = []
        const products = await Product.find<IProduct>({
            _id: { $in: req.body.items },
        })
        const userId = res.locals.user._id
        const { address, payment, phone, total, email, items, comment } =
            req.body

        items.forEach((id: string) => {
            const product = products.find((p) => p._id.equals(id))
            if (!product) {
                throw new BadRequestError(`Товар с id ${id} не найден`)
            }
            if (product.price === null) {
                throw new BadRequestError(`Товар с id ${id} не продается`)
            }
            return basket.push(product)
        })
        const totalBasket = basket.reduce((a, c) => a + c.price, 0)
        if (totalBasket !== total) {
            return next(new BadRequestError('Неверная сумма заказа'))
        }

        const newOrder = new Order({
            totalAmount: total,
            products: items,
            payment,
            phone,
            email,
            comment,
            customer: userId,
            deliveryAddress: address,
        })
        const populateOrder = await newOrder.populate(['customer', 'products'])
        await populateOrder.save()

        return res.status(200).json(populateOrder)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        return next(error)
    }
}

export const updateOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { status } = req.body
        const updatedOrder = await Order.findOneAndUpdate(
            { orderNumber: req.params.orderNumber },
            { status },
            { new: true, runValidators: true }
        )
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
            .populate(['customer', 'products'])
        return res.status(200).json(updatedOrder)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}

export const deleteOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id)
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
            .populate(['customer', 'products'])
        return res.status(200).json(deletedOrder)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}
