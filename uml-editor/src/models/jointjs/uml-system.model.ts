import { dia, mvc, shapes, util } from '@joint/core'
import { CustomJointJSElementAttributes } from './custom-jointjs-element.model'
import { TextBlock } from './text-block.model'
const initialWidth = 150
const initialHeight = 80
const listItemHeight = 20

export class UMLSystem extends shapes.standard.Rectangle {
  private textBlockMarkup: dia.MarkupJSON | undefined // Placeholder for TextBlock markup

  override initialize(
    attributes?: shapes.standard.RectangleAttributes,
    options?: mvc.CombinedModelConstructorOptions<never, this>
  ) {
    super.initialize(attributes, options)
    // Initialize textBlockMarkup with TextBlock markup
    this.textBlockMarkup = new TextBlock().markup
    this.markup = [
      {
        tagName: 'rect',
        selector: 'body',
      },
      {
        tagName: 'text',
        selector: 'headerlabel',
      },

      ...(this.textBlockMarkup || []),
    ]
  }

  override defaults() {
    const elementAttributes: CustomJointJSElementAttributes<shapes.standard.RectangleAttributes> = {
      type: 'custom.uml.System',
      size: {
        width: initialWidth,
        height: initialHeight,
      },
      attrs: {
        body: {
          rx: 0,
          ry: 0,
          strokeWidth: 4,
          stroke: 'black',
          fillOpacity: 0,
        },
        ['headerlabel']: {
          text: '<<System>>',
          width: '100%', // Assuming you want the label to occupy the entire width of the body
          height: listItemHeight,
          'ref-y': 0,
          'ref-x': 0.5, // Adjust reference to center horizontally
          'text-anchor': 'middle', // Center align text horizontally
          ref: 'body',
          fill: 'black',
        },
        ['functionsRect']: {
          width: initialWidth,
          height: 10,
          'ref-y': 2 * listItemHeight,
          'ref-x': 0,
          ref: 'body',
          fillOpacity: 0,
        },
      },
    }

    util.defaultsDeep(elementAttributes, super.defaults)
    return elementAttributes
  }
}
