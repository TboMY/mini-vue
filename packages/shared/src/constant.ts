/**
 * @Author: cj
 * @Date: 2025/1/19 17:15
 *
 */

export const ReactivityFlags = {
    IS_REACTED: Symbol('__v_is_reacted'),
    // 不只是ref对应的类才有, 有`get value(), set value()` 这样的访问器属性都会有这个标识符;
    // 比如computed, toRef对应的类(ObjectRefImpl)
    IS_REF: Symbol('__v_is_Ref')
}

export enum DirtyLevel {
    NotDirty = 0,
    Dirty = 4
}


export enum ShapeFlags {
    ELEMENT = 1,
    FUNCTIONAL_COMPONENT = 1 << 1,
    STATEFUL_COMPONENT = 1 << 2,
    TEXT_CHILDREN = 1 << 3,
    ARRAY_CHILDREN = 1 << 4,
    SLOTS_CHILDREN = 1 << 5,
    TELEPORT = 1 << 6,
    SUSPENSE = 1 << 7,
    COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
    COMPONENT_KEPT_ALIVE = 1 << 9,
    COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT,
}

export const RuntimeFlags = {
    IS_V_NODE: Symbol('__v_is_v_node'),
    Text: Symbol('v_text'),
    Nil: Symbol('v_nil'),
    Fragment: Symbol('v_fragment')
}

