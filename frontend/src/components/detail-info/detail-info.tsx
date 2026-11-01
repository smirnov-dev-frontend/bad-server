import clsx from 'clsx'
import React from 'react'
import styles from './detail-info.module.scss'
interface Header<T> {
    key: string
    label: string
    extraClass?: string
    render?: (data: T) => React.ReactNode
}

interface DetailInfoProps<T> {
    header: string
    subheader: string
    data: T
    headers: Header<T>[]
    actions: React.ComponentType[]
}
export default function DetailInfo<T extends object>({
    header,
    subheader,
    data,
    headers,
    actions,
}: DetailInfoProps<T>) {
    return (
        <div className={styles.detailInfo}>
            <h1 className={styles.detailInfo__title}>{header}</h1>
            <p className={styles.detailInfo__subtitle}>{subheader}</p>
            <div className={styles.detailInfo__container}>
                {headers.map((header) => (
                    <div
                        key={header.key}
                        className={clsx(
                            styles.detailInfo__item,
                            header.extraClass
                        )}
                    >
                        <div className={styles.detailInfo__itemWrap}>
                            <span className={styles.detailInfo__itemTitle}>
                                {header.label}:
                            </span>

                            {header.render ? (
                                header.render(data)
                            ) : (
                                <span className={styles.detailInfo__itemValue}>
                                    {
                                        Object.entries(data).find(
                                            ([key]) => key === header.key
                                        )?.[1] as React.ReactNode
                                    }{' '}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                <div className={styles.detailInfo__actions}>
                    {actions.map((ActionComponent, actionIndex) => (
                        <ActionComponent key={actionIndex} />
                    ))}
                </div>
            </div>
        </div>
    )
}
