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