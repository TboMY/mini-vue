/**
 * @Author: cj
 * @Date: 2025/7/4 22:25
 *
 */

export function patchEvent(el: Element, name: string, newValue: Function) {

    // 取出on后面的名字
    const eventName = name.slice(2).toLowerCase()

    // 存历史的时间函数, 方便解绑
    const invokers = (el as any)._eventCacheMap || ((el as any)._eventCacheMap = {})

    let invoke = invokers[eventName]

    // 第一次给这个事件绑定函数
    if (!invoke) {
        invoke = invokers[eventName] = createInvoke(newValue)
        el.addEventListener(eventName, invoke)
    } else {
        if (newValue) {
            // 不是第一次, 换引用从而实现事件的回调函数改变
            invoke.value = newValue
        } else {
            // 原本有, 现在没有, 说明要删除
            el.removeEventListener(eventName, invoke)
            invokers[eventName] = undefined
        }
    }
}

// 通过改变引用, 就不用频繁解绑和绑定了
// 因为调用的是invoke.value; 当时间绑定的函数改变时, 直接改变value的引用就可以实现调用另外一个函数了
function createInvoke(fn: Function) {
    const invoke = (e: Event) => invoke.value(e)
    invoke.value = fn
    return invoke
}