/**
 * @Author: cj
 * @Date: 2025/1/13 00:53
 * 公共方法
 */

export * from './shapeFlags.ts'

export function isObject(val: any) {
    return val !== null && typeof val === 'object'
}

export function isFunction(val: any) {
    return typeof val === 'function'
}



