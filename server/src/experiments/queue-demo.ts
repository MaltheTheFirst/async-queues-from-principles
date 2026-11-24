import { createQueue } from '../queue/in-memory-queue.js'
import type { Job } from '../queue/types.js'

function delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}

const queueA = createQueue(async (job) => {
    console.log('Processer:', job.id)
    await delay(2000)
})
const queueB = createQueue(async () => {
    throw new Error('Failure')
})

const jobA: Job = {
    id: 'A',
    type: 'csv-export',
    status: 'pending'
}

queueA.enqueue(jobA)

console.log('Queue A:', queueA.getRunningCount())
console.log('Queue B:', queueB.getRunningCount())

queueB.enqueue(jobA)

console.log('Queue A:', queueA.getRunningCount())
console.log('Queue B:', queueB.getRunningCount())

await delay(2500)

console.log('Queue A status:', queueA.getJob('A')?.status)
console.log('Queue B status:', queueB.getJob('A')?.status)