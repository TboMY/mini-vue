/**
 * @Author: cj
 * @Date: 2025/1/19 17:15
 *
 */

export const ReactivityFlags = {
    IS_REACTED: Symbol('__v_is_reacted')
}

export enum DirtyLevel {
    NotDirty = 0,
    Dirty = 4
}