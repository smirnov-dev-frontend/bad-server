import clsx from 'clsx'
import { Column, DataRow } from './helpers/types'
import styles from './table.module.scss'

interface TableRowProps<T> {
    rowData: T
    columnsData: Column<T>[]
}

export default function TableRow<T extends DataRow>({
    columnsData,
    rowData,
}: TableRowProps<T>) {
    return (
        <div className={styles.table__row}>
            {columnsData.map((column) => {
                return (
                    <div
                        key={column.key}
                        className={clsx(
                            styles.table__cell,
                            column.extraClassTableCell &&
                                column.extraClassTableCell
                        )}
                    >
                        {column.render
                            ? column.render(rowData)
                            : (
                                  Object.entries(rowData).find(
                                      ([key]) => key === column.dataIndex
                                  )?.[1] as
                                      { title?: React.ReactNode } | undefined
                              )?.title}
                    </div>
                )
            })}
        </div>
    )
}
