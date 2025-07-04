/**
 * @Author: cj
 * @Date: 2025/7/4 23:02
 *
 */

export default function (el: Element, prop: string, newValue: string) {
    if (newValue === null || newValue === undefined) {
        el.removeAttribute(prop)
    } else {
        el.setAttribute(prop, newValue)
    }
}