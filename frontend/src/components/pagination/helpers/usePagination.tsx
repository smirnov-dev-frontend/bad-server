import { AsyncThunk } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from '@store/hooks'
import { RootState } from '@store/store'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { WebLarekAPI } from '../../../utils/weblarek-api'
import { AppDispatch } from '../../../services/store'

interface Paginated {
    pagination: { totalPages: number; pageSize: number }
}

const usePagination = <T extends Paginated, U>(
    asyncAction: AsyncThunk<
        T,
        Record<string, unknown>,
        {
            extra: WebLarekAPI
            state: RootState
            dispatch: AppDispatch
        }
    >,
    selector: (state: RootState) => U[],
    defaultLimit: number
) => {
    const dispatch = useDispatch()
    const data = useSelector(selector)
    const [searchParams, setSearchParams] = useSearchParams()
    const [totalPages, setTotalPages] = useState(1)
    const currentPage = Math.max(
        1,
        Math.min(Number(searchParams.get('page')) || 1, totalPages)
    )
    const limit = Math.max(
        1,
        Math.min(Number(searchParams.get('limit')) || defaultLimit, 100)
    )

    useEffect(() => {
        let active = true
        dispatch(
            asyncAction({
                ...Object.fromEntries(searchParams),
                page: currentPage,
                limit,
            })
        )
            .unwrap()
            .then((response) => {
                if (active)
                    setTotalPages(Math.max(1, response.pagination.totalPages))
            })
            .catch(() => undefined)
        return () => {
            active = false
        }
    }, [asyncAction, dispatch, currentPage, limit, searchParams])

    const updateURL = (params: Record<string, number>) => {
        const updated = new URLSearchParams(searchParams)
        Object.entries(params).forEach(([key, value]) =>
            updated.set(key, String(value))
        )
        setSearchParams(updated)
    }
    const setPage = (page: number) =>
        updateURL({ page: Math.max(1, Math.min(page, totalPages)), limit })

    return {
        data,
        totalPages,
        currentPage,
        limit,
        nextPage: () => setPage(currentPage + 1),
        prevPage: () => setPage(currentPage - 1),
        setPage,
        setLimit: (newLimit: number) => updateURL({ page: 1, limit: newLimit }),
    }
}

export default usePagination
