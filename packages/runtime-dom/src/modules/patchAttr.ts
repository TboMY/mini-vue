/**
 * @Author: cj
 * @Date: 2025/7/4 23:02
 *
 */
import {isNil} from "@mini-vue/shared";

export default function (el: Element, prop: string, newValue: string) {
    if (isNil(newValue)) {
        el.removeAttribute(prop)
    } else {
        el.setAttribute(prop, newValue)
    }
}