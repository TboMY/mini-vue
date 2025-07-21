/**
 * @Author: cj
 * @Date: 2025/7/17 下午1:43
 *
 */

const queue = []
let isFlushing = false

export function queueJob(job) {
    // debugger
    if (!queue.includes(job)) {
        queue.push(job)
    }

    // 将update放入微队列, 异步更新;
    // 并且只更新一次
    if (!isFlushing) {
        isFlushing = true
        // 这几个顺序不能乱, 因为job中可能又触发渲染;
        // 比如可能job()同步导致queue中添加元素, 但是回调里面foreach之后让queue.length=0;
        // 又或者最后才isFlushing = false,导致异步渲染都不执行
        queueMicrotask(() => {
            // debugger
            isFlushing = false
            const copy = queue.slice(0)
            queue.length = 0
            copy.forEach(job => job())
        })
    }
}