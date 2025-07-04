/**
 * @Author: cj
 * @Date: 2025/7/4 19:41
 *
 */

export default function patchStyle(el: Element, preValue: object = {}, newValue: object) {
    if (!newValue) {
        el.removeAttribute('style')
        return
    }

    const style = (el as HTMLElement).style
    // 新的都要
    for (const key in newValue) {
        const val = newValue[key]
        // style属性只能设置''才能使其被删除
        if (propNotExist(val)) {
            style[key] = ''
            continue
        }
        style[key] = newValue[key]
    }

    // 如果老的有,新的没有,要删掉
    for (const key in preValue) {
        if (propNotExist(newValue[key])) {
            style[key] = ''
        }
    }
}

// 属性不存在
// 不能用!key, 宽度可能为0;
function propNotExist(key: any) {
    return key === null || key === undefined || key === '';
}

