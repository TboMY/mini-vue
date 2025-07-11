/**
 * @Author: cj
 * @Date: 2025/5/29 下午3:26
 *
 */
import {isDomElement} from "@mini-vue/shared";

export const nodeOps = {
    // 将el节点插入parent节点的子节点refer的前面,如果没有refer,就将el插到parent最后一个子节点
    insert: (el: Node, parent: Node, refer?: Node) => parent && parent.insertBefore(el, refer || null),
    remove: (el: Node) => {
        if (!el) return;
        // if (!isDomElement(el)) return
        const parent = el.parentNode
        parent && parent.removeChild(el)
    },
    createElement: (type: string) => document.createElement(type),
    createText: (str: string) => document.createTextNode(str),
    createComment: (str: string) => document.createComment(str),
    setText: (node, text: string) => node && (node.nodeValue = text),
    setElementText: (el: Node, text: string) => el && (el.textContent = text),
    parentNode: (el: Node) => el && el.parentNode,
    nextSibling: (el: Node) => el && el.nextSibling
    // setScopeId: ,
    // insertStaticContent:
}
