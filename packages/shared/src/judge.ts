/**
 * @Author: cj
 * @Date: 2025/7/6 下午9:59
 *
 */

export function isObject(val: any) {
    return val !== null && typeof val === 'object'
}

export function isFunction(val: any) {
    return typeof val === 'function'
}

export function isString(val: any) {
    return typeof val === 'string'
}