export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

export type JobProcesser = (job: Job) => Promise<void>

export type Job = {
    id: string,
    type: 'csv-export',
    status: JobStatus
}