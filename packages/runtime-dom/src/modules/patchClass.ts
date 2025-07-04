/**
 * @Author: cj
 * @Date: 2025/7/4 19:41
 *
 */

export default function patchClass(el: Element, val: string) {
    if (!val) {
        el.removeAttribute('class')
    } else {
        el.setAttribute('class', val)
    }
}