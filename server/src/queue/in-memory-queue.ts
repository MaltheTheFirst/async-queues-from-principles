import type { Job, JobProcesser } from "./types.js"

export function createQueue(
    processer: JobProcesser,
    concurrencyLimit: number = 3
) {
    if (!Number.isInteger(concurrencyLimit) || concurrencyLimit <= 0) {
        throw new Error('Concurrency limit must be a positive integer')
    }

    const pendingJobs: Job[] = []
    const runningJobs = new Map<string, Job>()
    const allJobs = new Map<string, Job>()

    function getRunningCount(): number {
        return runningJobs.size
    }

    function getJob(jobId: string): Job | undefined {
        const job = allJobs.get(jobId)

        if (job === undefined) {
            return undefined
        }

        return { ...job }
    }

    function enqueue(job: Job): void {
        if (allJobs.has(job.id)) {
            return
        }

        const copy: Job = { 
            ...job,
            status: 'pending'
        }

        allJobs.set(copy.id, copy)
        pendingJobs.push(copy)
        startNextJob()
    }

    function startNextJob(): void {
        if (runningJobs.size >= concurrencyLimit) {
            return
        }

        const next = pendingJobs.shift()

        if (next === undefined) {
            return
        }

        next.status = 'running'
        runningJobs.set(next.id, next)
        void runJob(next)

        console.log('Started:', next.id, 'Running:', runningJobs.size)
    }

    async function runJob(job: Job): Promise<void> {
        try {
            await processer(job)
            job.status = 'completed'
            console.log('Completed:', job.id)
        } catch {
            job.status = 'failed'
        } finally {
            runningJobs.delete(job.id)
            console.log('Released:', job.id, 'Running:', runningJobs.size)
            startNextJob()
        }
    }

    return {
        getRunningCount,
        getJob,
        enqueue
    }
}