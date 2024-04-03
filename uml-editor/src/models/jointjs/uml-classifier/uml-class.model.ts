import { dia, shapes, util } from '@joint/core'
import { ClassifierConfigurationComponent } from '../../../shared/classifier-configuration/classifier-configuration.component'
import { CustomJointJSElementAttributes } from '../custom-jointjs-element.model'
import { TextBlock } from '../text-block.model'
import { UmlClassifierModel } from './IUml-classifier.model'
import { UmlInterface } from './uml-interface.model'

//type UmlClassSectors = 'header' | 'variablesRect' | 'functionsRect'

const initialWidth = 150
const initialHeight = 100
const listItemHeight = 20

export class UmlClass extends UmlClassifierModel {
  //override UmlClassSectors!: 'header' | 'variablesRect' | 'functionsRect'

  override readonly markup = [
    {
      tagName: 'rect',
      selector: 'body',
    },
    {
      tagName: 'rect',
      selector: 'header',
    },
    {
      tagName: 'rect',
      selector: 'variablesRect',
    },
    {
      tagName: 'rect',
      selector: 'functionsRect',
    },
  ]

  private get variablesComponentAllHeight(): number {
    return (this.variableComponents?.length || 0) * listItemHeight
  }

  private get functionsComponentAllHeight(): number {
    return (this.functionComponents?.length || 0) * listItemHeight
  }

  private inlineContainerHeight(container: this['UmlClassSectors']): number {
    const initialHeightPerContainer = (initialHeight - listItemHeight) / 2

    try {
      const amountInputs = this.variablesComponentAllHeight + this.functionsComponentAllHeight
      const heigthBothContainer = this.size().height - listItemHeight - amountInputs

      if (amountInputs == 0) {
        return heigthBothContainer / 2
      }

      if (container === 'variablesRect') {
        return this.variablesComponentAllHeight + heigthBothContainer / 2
      } else {
        return this.functionsComponentAllHeight + heigthBothContainer / 2
      }
    } catch (e) {
      if (container === 'variablesRect') {
        return initialHeightPerContainer
      } else {
        return initialHeightPerContainer
      }
    }
  }

  private readonly variableComponents: shapes.standard.TextBlock[] = []

  override defaults() {
    const elementAttributes: CustomJointJSElementAttributes<shapes.standard.RectangleAttributes> = {
      type: 'custom.uml.Classifier',
      propertyView: ClassifierConfigurationComponent,
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
        },
        ['header' satisfies this['UmlClassSectors']]: {
          width: initialWidth,
          height: listItemHeight,
          fontSize: 12,
          fontWeight: 'bold',
          fontFamily: 'Arial, helvetica, sans-serif',
          'ref-y': 0,
          'ref-x': 0,
          ref: 'body',
          'text-anchor': 'middle',
          stroke: 'black',
          strokeWidth: 3,
          fill: 'white',
        },
        ['variablesRect' satisfies this['UmlClassSectors']]: {
          width: initialWidth,
          height: this.inlineContainerHeight('functionsRect'),
          stroke: 'black',
          strokeWidth: 3,
          'ref-y': listItemHeight,
          'ref-x': 0,
          ref: 'body',
          fill: 'white',
        },
        ['functionsRect' satisfies this['UmlClassSectors']]: {
          width: initialWidth,
          height: this.inlineContainerHeight('functionsRect'),
          stroke: 'black',
          strokeWidth: 3,
          'ref-dy': -this.inlineContainerHeight('variablesRect'),
          'ref-x': 0,
          ref: 'body',
          fill: 'white',
        },
      },
    }

    util.defaultsDeep(elementAttributes, super.defaults)
    return elementAttributes
  }

  override userInput(evt: dia.Event) {
    const selectedRect = evt.target.attributes[0].value as this['UmlClassSectors'] | string

    const newTextBlockElement = new TextBlock()
    newTextBlockElement.attr('ref', selectedRect)

    let positionY = 0
    switch (selectedRect) {
      case 'header':
        newTextBlockElement.position(this.position().x, this.position().y)
        newTextBlockElement.resize(this.size().width - 10, listItemHeight)

        this.headerComponent = newTextBlockElement
        break
      case 'variablesRect':
        positionY = this.position().y + listItemHeight + this.variablesComponentAllHeight
        newTextBlockElement.position(this.position().x, positionY)
        newTextBlockElement.resize(this.listItemWidth, listItemHeight)
        this.variableComponents.push(newTextBlockElement)
        this.resizeInlineContainer(1, 'variablesRect')
        this.functionComponents.forEach(component => {
          const p = component.position()
          component.position(p.x, p.y + listItemHeight)
        })
        break
      case 'functionsRect':
        positionY =
          this.position().y +
          listItemHeight +
          this.inlineContainerHeight('variablesRect') +
          this.functionsComponentAllHeight

        newTextBlockElement.position(this.position().x, positionY)
        newTextBlockElement.resize(this.listItemWidth, listItemHeight)
        this.functionComponents.push(newTextBlockElement)

        this.resizeInlineContainer(1, 'functionsRect')
        break
      default:
        console.log('Clicked outside the sections')
        return null
    }

    this.embed(newTextBlockElement)
    return newTextBlockElement
  }

  override resizeInlineContainer(direction: number, container: this['UmlClassSectors']) {
    this.resize(this.size().width, (this.size().height += listItemHeight * direction))
    this.attr(container + '/height', this.inlineContainerHeight(container))
  }

  override adjustByDelete(selectedRect: this['UmlClassSectors'], posY: number) {
    let indexOfComponentToRemove = -1

    switch (selectedRect) {
      case 'variablesRect':
        indexOfComponentToRemove = this.variableComponents.findIndex(component => component.position().y === posY)

        if (indexOfComponentToRemove !== -1) {
          // Remove the component from the array
          this.variableComponents.splice(indexOfComponentToRemove, 1)

          // Adjust the position of subsequent components
          this.variableComponents.forEach((component, index) => {
            if (index >= indexOfComponentToRemove) {
              const p = component.position()
              component.position(p.x, p.y - listItemHeight)
            }
          })
          this.shrinkFuncY(0)
        } else {
          console.log('Component not found')
        }

        this.resizeInlineContainer(-1, 'variablesRect')

        break
      case 'functionsRect':
        indexOfComponentToRemove = this.functionComponents.findIndex(component => component.position().y === posY)

        if (indexOfComponentToRemove !== -1) {
          // Remove the component from the array
          this.functionComponents.splice(indexOfComponentToRemove, 1)

          // Adjust the position of subsequent components
          this.shrinkFuncY(indexOfComponentToRemove)
        } else {
          console.log('Component not found')
        }

        this.resizeInlineContainer(-1, 'functionsRect')
        break
    }
  }

  override resize(width: number, height: number) {
    width = Math.max(width, initialWidth)
    const minHeigth = this.variablesComponentAllHeight + this.functionsComponentAllHeight + 3 * listItemHeight
    if (height < minHeigth) {
      height = minHeigth
    }

    super.resize(width, height)

    // Update subelements
    this.attr('header/width', width)

    this.attr('variablesRect' satisfies this['UmlClassSectors'], {
      width: width,
      height: this.inlineContainerHeight('variablesRect'),
      'ref-y': listItemHeight,
    })
    this.attr('functionsRect' satisfies this['UmlClassSectors'], {
      width: width,
      height: this.inlineContainerHeight('functionsRect'),
      'ref-dy': -this.inlineContainerHeight('functionsRect'),
    })

    this.variableComponents.forEach(component => {
      component.resize(this.listItemWidth, listItemHeight)
    })

    let counter = 0
    this.functionComponents.forEach(component => {
      component.resize(this.listItemWidth, listItemHeight)

      let y = this.position().y + listItemHeight + this.inlineContainerHeight('variablesRect') + counter

      //dont know why this works
      if (y - component.position().y == listItemHeight) {
        y -= listItemHeight
      }
      component.position(component.position().x, y)

      counter += listItemHeight
    })

    return this
  }

  convertToClass(): UmlClass {
    return this
  }

  convertToInterface(): UmlInterface {
    return new UmlInterface(this.position())
  }

  exportToSVG() {
    const graph = new dia.Graph()

    // Create a temporary paper to add the specific element
    const paper = new dia.Paper({
      //el: $('#paper'),
      width: 200,
      height: 200,
      gridSize: 1,
      model: graph,
      interactive: false, // Disable interactivity to prevent dragging or resizing
    })
    this.addTo(graph)

    // Export the content of the temporary paper as SVG
    const svgString = paper.svg
    paper.remove()
    return svgString.outerHTML
  }
}
