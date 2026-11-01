import { ReactNode } from 'react'

export interface Column<T> {
    title: string
    dataIndex: string
    key: string
    extraClassHeaderCell?: string
    extraClassTableCell?: string
    render?: (row: T) => ReactNode
}

export interface DataRow {
    key: string
}
