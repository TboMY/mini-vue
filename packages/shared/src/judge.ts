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

export function isNumber(val: any) {
    return typeof val === 'number'
}

export function isBoolean(val: any) {
    return typeof val === 'boolean'
}

export function isBigint(val: any) {
    return typeof val === 'bigint'
}

export function isSymbol(val: any) {
    return typeof val === 'symbol'
}

export function isArr(val: any) {
    return Array.isArray(val)
}

export function isNil(val: any) {
    return val === null || val === undefined
}

export function isDomElement(val: any) {
    return val instanceof Element || val instanceof HTMLDocument
}

export function isJustObject(val: any) {
    return !isNil(val) && Object.prototype.toString.call(val) === '[object Object]'
}

