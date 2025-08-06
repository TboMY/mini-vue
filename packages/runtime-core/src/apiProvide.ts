/**
 * @Author: cj
 * @Date: 2025/8/6 16:14
 *
 */
import {getCurrentInstance} from "./component";

export function provide(key, value) {
    // 只能setup中使用
    const currentInstance = getCurrentInstance()
    if (!currentInstance) return

    let {provides, parent} = currentInstance

    // 说明还没有手动构建原型链, 还是初始值
    if (provides === parent?.provides) {
        provides = (currentInstance.provides = Object.create(provides))
    }
    provides[key] = value
}


export function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance()
    if (!currentInstance) return

    const provides = currentInstance.provides
    // in 关键字会查找原型链; 并且Object.create创建的obj没有其他属性
    if (key in provides) {
        return provides[key]
    }
    return defaultValue
}