import { describe, expect, it, vi } from 'vitest'
import { createQueue } from './in-memory-queue.js'
import type { Job } from './types.js'

describe('in-memory queue', () => {
    it('starts with zero running jobs', async () => {
        const queue = createQueue(async () => {})

        expect(queue.getRunningCount()).toBe(0)
    })

    it('submitted job starts running', () => {
        const queue = createQueue(async () => {
            await new Promise<void>(() => {})
        })

        const job: Job = {
            id: 'A',
            type: 'csv-export',
            status: 'pending'
        }

        queue.enqueue(job)

        expect(queue.getRunningCount()).toBe(1)
        expect(queue.getJob('A')?.status).toBe('running')
    })

    it('never exceeds concurrency limit', () => {
        const concurrencyLimit = 3
        const queue = createQueue(async () => {
            await new Promise<void>(() => {})
        }, concurrencyLimit)

        const ids = ['A', 'B', 'C', 'D', 'E']

        for (const id of ids) {
            const job: Job = {
                id,
                type: 'csv-export',
                status: 'pending'
            }

            queue.enqueue(job)
        }

        expect(queue.getRunningCount()).toBe(concurrencyLimit)
        
        for (const id of ids.slice(0, concurrencyLimit)) {
            expect(queue.getJob(id)?.status).toBe('running')
        }

        for (const id of ids.slice(concurrencyLimit)) {
            expect(queue.getJob(id)?.status).toBe('pending')
        }
    })

    it('frees a slot when job completes', async () => {
        let finishA!: () => void
        let finishB!: () => void

        const promiseA = new Promise<void>((resolve) => {
            finishA = resolve
        })

        const promiseB = new Promise<void>((resolve) => {
            finishB = resolve
        })

        const queue = createQueue(async (job) => {
            if (job.id === 'A') {
                await promiseA
            } else if (job.id === 'B') {
                await promiseB
            }
        }, 1)

        const jobA: Job = {
            id: 'A',
            type: 'csv-export',
            status: 'pending'
        }

        const jobB: Job = {
            id: 'B',
            type: 'csv-export',
            status: 'pending'
        }

        queue.enqueue(jobA)
        queue.enqueue(jobB)

        expect(queue.getJob('A')?.status).toBe('running')
        expect(queue.getJob('B')?.status).toBe('pending')

        finishA()

        await vi.waitFor(() => {
            expect(queue.getJob('A')?.status).toBe('completed')
            expect(queue.getJob('B')?.status).toBe('running')
        })

        finishB()

        await vi.waitFor(() => {
            expect(queue.getJob('B')?.status).toBe('completed')
            expect(queue.getRunningCount()).toBe(0)
        })
    })

    it('failed job does not occupy a concurrency slot', async () => {
        let failA!: (reason?: Error) => void
        let finishB!: () => void

        const promiseA = new Promise<void>((resolve, reject) => {
            failA = reject
        })

        const promiseB = new Promise<void>((resolve) => {
            finishB = resolve
        })

        const queue = createQueue(async (job) => {
            if (job.id === 'A') {
                await promiseA
            } else if (job.id === 'B') {
                await promiseB
            }
        }, 1)

        const jobA: Job = {
            id: 'A',
            type: 'csv-export',
            status: 'pending'
        }

        const jobB: Job = {
            id: 'B',
            type: 'csv-export',
            status: 'pending'
        }

        queue.enqueue(jobA)
        queue.enqueue(jobB)

        expect(queue.getJob('A')?.status).toBe('running')
        expect(queue.getJob('B')?.status).toBe('pending')

        failA(new Error('Simulated processor failure'))

        await vi.waitFor(() => {
            expect(queue.getJob('A')?.status).toBe('failed')
            expect(queue.getJob('B')?.status).toBe('running')
        })

        finishB()

        await vi.waitFor(() => {
            expect(queue.getJob('B')?.status).toBe('completed')
            expect(queue.getRunningCount()).toBe(0)
        })
    })

    it('ignores duplicate job IDs', async () => {
        let finishA!: () => void

        const promiseA = new Promise<void>((resolve) => {
            finishA = resolve
        })

        const processor = vi.fn(async () => {
            await promiseA
        })

        const queue = createQueue(processor, 1)

        const jobA: Job = {
            id: 'A',
            type: 'csv-export',
            status: 'pending'
        }

        const duplicateJobA: Job = {
            id: 'A',
            type: 'csv-export',
            status: 'pending'
        }

        queue.enqueue(jobA)
        queue.enqueue(duplicateJobA)

        expect(queue.getRunningCount()).toBe(1)
        expect(queue.getJob('A')?.status).toBe('running')
        expect(processor).toHaveBeenCalledTimes(1)

        finishA()

        await vi.waitFor(() => {
            expect(queue.getJob('A')?.status).toBe('completed')
            expect(queue.getRunningCount()).toBe(0)
            expect(processor).toHaveBeenCalledTimes(1)
        })
    })

    it('isolates internal state from submitted job objects', () => {
        const queue = createQueue(async () => {
            await new Promise<void>(() => {})
        })

        const job: Job = {
            id: 'A',
            type: 'csv-export',
            status: 'pending'
        }

        queue.enqueue(job)

        job.status = 'failed'

        expect(queue.getJob('A')?.status).toBe('running')
    })

    it('isolates internal state from retrieved job objects', () => {
        const queue = createQueue(async () => {
            await new Promise<void>(() => {})
        })

        const job: Job = {
            id: 'A',
            type: 'csv-export',
            status: 'pending'
        }

        queue.enqueue(job)

        const retrievedJob = queue.getJob('A')

        if (retrievedJob === undefined) {
            throw new Error('Job is undefined')
        }

        retrievedJob.status = 'failed'

        expect(queue.getJob('A')?.status).toBe('running')
    })

    it('each queue creation invocation owns independent state', () => {
        const queueA = createQueue(async () => {
            await new Promise<void>(() => {})
        })

        const queueB = createQueue(async () => {
            await new Promise<void>(() => {})
        })

        const job: Job = {
            id: 'A',
            type: 'csv-export',
            status: 'pending'
        }

        queueA.enqueue(job)

        expect(queueA.getRunningCount()).toBe(1)
        expect(queueB.getRunningCount()).toBe(0)
        expect(queueB.getJob('A')).toBeUndefined()

        queueB.enqueue(job)

        expect(queueB.getRunningCount()).toBe(1)
        expect(queueB.getJob('A')?.status).toBe('running')
    })

    it.each([0, -1, 1.5, NaN, Infinity])('throws on invalid concurrency configuration', (number) => {
        const processer = async () => {}
        
        expect(() => createQueue(processer, number)).toThrow()
    })
})