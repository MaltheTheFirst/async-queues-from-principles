function delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}

async function main() {
    const start = performance.now()

    setTimeout(() => {
        const elapsed = performance.now() - start - 100

        console.log(`Time elapsed: ${elapsed}ms`)
    }, 100)

    await delay(2000)

    const longDelayElapsed = performance.now() - start
    console.log(`Time elapsed for long delay: ${longDelayElapsed}ms`)
}

main()