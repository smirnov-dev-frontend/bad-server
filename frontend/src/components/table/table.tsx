import clsx from 'clsx'
import { ReactNode } from 'react'
import { Column, DataRow } from './helpers/types'
import styles from './table.module.scss'

interface TableChildrenProps<T> {
    rowData: T
    columnsData: Column<T>[]
}

interface TableProps<T> {
    columns: Column<T>[]
    data: T[]
    children: (props: TableChildrenProps<T>) => ReactNode
}

const Table = <T extends DataRow>({
    columns,
    data,
    children,
}: TableProps<T>) => {
    return (
        <div className={styles.table}>
            <div className={styles.table__header}>
                {columns.map((column) => (
                    <div
                        key={column.key}
                        className={clsx(
                            styles.table__headerCell,
                            column.extraClassHeaderCell &&
                                column.extraClassHeaderCell
                        )}
                    >
                        {column.title}
                    </div>
                ))}
            </div>
            <div className={styles.table__body}>
                {data.map((row) =>
                    children({ rowData: row, columnsData: columns })
                )}
            </div>
        </div>
    )
}

export default Table
