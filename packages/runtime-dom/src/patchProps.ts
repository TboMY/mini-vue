/**
 * @Author: cj
 * @Date: 2025/7/4 下午4:53
 *
 */
import patchStyle from "./modules/patchStyle";
import patchClass from "./modules/patchClass";
import {patchEvent} from "./modules/patchEvent";
import patchAttr from "./modules/patchAttr";

// 暂时只有 class, style, event(原生)
export const patchProp = function (el: Element, prop: string, preValue: any, newValue: any) {
    if ('class' === prop) {
        patchClass(el, newValue)
    } else if ('style' === prop) {
        patchStyle(el, preValue, newValue)
    } else if (/^on[A-Z]/.test(prop)) {
        patchEvent(el, prop, newValue)
    } else {
        // 暂时将其他的都视为一般属性
        patchAttr(el, prop, newValue)
    }
}