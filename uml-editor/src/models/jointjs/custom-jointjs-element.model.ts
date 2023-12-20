import { dia } from 'jointjs'
import { Type } from '@angular/core'

export interface JointJSElementType {
    type: string
}

export type CustomJointJSElementAttributes<T extends dia.Element.Attributes> = JointJSElementType & Partial<T>

export interface CustomJointJSElement {
    clazz: Type<dia.Element>
    defaults: CustomJointJSElementAttributes<dia.Element.Attributes>,
    instance: dia.Element,
    name: string,
    inToolbox: boolean,
}