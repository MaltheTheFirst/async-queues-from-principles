const start = performance.now()

setTimeout(() => {
    console.log('Timer finished')
    const elapsed = performance.now() - start
    const lateness = elapsed - 100

    console.log(`Total time spent: ${elapsed}ms, lateness: ${lateness}ms`)
}, 100)

while (performance.now() - start < 2000) {
}

console.log('CPU-intensive work finished')