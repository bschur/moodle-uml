import { dia, util } from '@joint/core'
import { CustomJointJSElementAttributes } from './custom-jointjs-element.model'
import { TextBlock } from './text-block.model'

export class UseCase extends dia.Element {
  override markup = [
    {
      tagName: 'ellipse',
      selector: 'body',
    },
    {
      tagName: 'textBox',
      selector: 'textBox',
    },
  ]

  userInput() {
    const ctb = new TextBlock()

    const variableComponent = ctb.createVariableComponent(
      'textBox',
      this.position().x,
      this.position().y + (this.size().width - 5) / 4,
      {
        width: this.size().width - 5,
        height: this.size().height / 2,
      }
    )

    // Alternatively, store the textbox reference for further manipulation
    this.embed(variableComponent)
    return variableComponent
  }

  override defaults() {
    const elementAttributes: CustomJointJSElementAttributes<dia.Element.Attributes> = {
      type: 'custom.uml.UseCase',

      size: {
        width: 95,
        height: 45,
      },
      attrs: {
        root: {
          highlighterSelector: 'body',
        },
        body: {
          cx: 50,
          cy: 25,
          rx: 50,
          ry: 30,
          stroke: '#000000',
          strokeWidth: 2,
          fill: '#ffffff',
        },
      },
    }
    util.defaultsDeep(elementAttributes, super.defaults)
    return elementAttributes
  }

  override resize(width: number, height: number) {
    const newSize = {
      width: Math.max(width - this.position().x, 60), // Ensuring width doesn't go below 60
      height: Math.max(height - this.position().x, 60) * 0.43, // Ensuring width doesn't go below 60
    }
    const newRx = newSize.width / 2 + 5
    const newRy = newRx * (3 / 5) + 5

    super.resize(newSize.width, newSize.height)

    // Updating ellipse attributes
    this.attr('body/rx', newRx)
    this.attr('body/ry', newRy)
    this.attr('body/cx', newRx)
    this.attr('body/cy', newRx / 2)

    return this
  }
}
