import {
  AfterViewInit,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
} from '@angular/core'
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'
import { FormControl } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSidenavModule } from '@angular/material/sidenav'
import { dia, highlighters } from '@joint/core'
import { debounceTime, map } from 'rxjs'
import { CustomJointJSElementAttributes } from '../../models/jointjs/custom-jointjs-element.model'
import { EMPTY_DIAGRAM_OBJECT, JointJSDiagram } from '../../models/jointjs/jointjs-diagram.model'
import { LinkConfigurationComponent } from '../../shared/link-configuration/link-configuration.component'
import { PropertyEditorService } from '../../shared/property-editor/property-editor.service'
import { initCustomNamespaceGraph, initCustomPaper } from '../../utils/jointjs-drawer.utils'
import { jointJSCustomUmlElements } from '../../utils/jointjs-extension.const'
import { decodeDiagram, encodeDiagram } from '../../utils/uml-editor-compression.utils'

@Component({
  selector: 'app-uml-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './uml-editor.component.html',
  styleUrl: './uml-editor.component.scss',
  imports: [MatSidenavModule, MatButtonModule, MatIconModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class UmlEditorComponent implements OnChanges, AfterViewInit {
  readonly diagramControl = new FormControl<JointJSDiagram>(EMPTY_DIAGRAM_OBJECT, { nonNullable: true })
  readonly isDirty = toSignal(this.diagramControl.valueChanges.pipe(map(() => this.diagramControl.dirty)))

  @Input({ transform: booleanAttribute }) allowEdit = false
  @Input({ required: true }) inputId: string | null = null
  @Input({ required: true }) diagram: string | null = null

  @ViewChild('editor', { static: true }) editorRef!: ElementRef<HTMLDivElement>
  @ViewChild('toolbox', { static: true }) toolboxRef!: ElementRef<HTMLDivElement>

  @Output() readonly diagramChanged = new EventEmitter<{
    inputId: string
    diagram: string
  }>()

  private readonly viewContainerRef = inject(ViewContainerRef)
  private readonly showPropertyEditorService = inject(PropertyEditorService)

  private readonly _paperEditor = signal<dia.Paper | null>(null)

  constructor() {
    // listen to diagram changes and emit value
    this.diagramControl.valueChanges.pipe(takeUntilDestroyed(), debounceTime(200)).subscribe(this.encodeAndEmitDiagram)
  }

  ngOnChanges(changes: SimpleChanges) {
    if (('diagram' satisfies keyof this) in changes) {
      this.setDiagramToEditor(this.diagram, { emitEvent: false })
    }
  }

  ngAfterViewInit() {
    let clickTimer: string | number | NodeJS.Timeout | undefined
    const delay = 200

    const graph = initCustomNamespaceGraph()

    const paperEditor = initCustomPaper(this.editorRef.nativeElement, graph, true)

    graph.on('change', () => {
      this.diagramControl.markAsDirty()
      this.diagramControl.setValue(graph.toJSON())
    })

    graph.on('add', () => {
      this.diagramControl.markAsDirty()
      this.diagramControl.setValue(graph.toJSON())
    })

    paperEditor.on(
      'cell:pointerclick',
      cell => {
        clearTimeout(clickTimer)

        // use timer to differentiate between single & double click
        clickTimer = setTimeout(() => {
          if (cell instanceof dia.ElementView) {
            const propertyKey = 'propertyView' satisfies keyof CustomJointJSElementAttributes<dia.Element.Attributes>
            if (propertyKey in cell.model.attributes && cell.model.attributes[propertyKey]) {
              this.showPropertyEditorService.show(this.viewContainerRef, cell.model.attributes[propertyKey], {
                model: cell.model,
                elementView: cell,
              })
              highlighters.mask.add(cell, { selector: 'root' }, cell.model.id.toString(), {
                deep: true,
                attrs: {
                  stroke: 'blue',
                  'stroke-width': 3,
                },
              })
            }
          }
        }, delay)
      },
      delay
    )

    paperEditor.on(
      'cell:pointerdblclick',
      //todo why timer doesnt work?
      cell => {
        clearTimeout(clickTimer)
        this.showPropertyEditorService.hide()

        clickTimer = setTimeout(() => {
          // handle generic link from jointjs
          if (cell instanceof dia.LinkView) {
            this.showPropertyEditorService.show(this.viewContainerRef, LinkConfigurationComponent, {
              model: cell.model,
            })
            highlighters.mask.add(cell, { selector: 'root' }, cell.model.id.toString(), {
              deep: true,
              attrs: {
                stroke: 'blue',
                'stroke-width': 2,
              },
            })
            return
          }
        }, delay)
      },
      delay
    )

    // handle custom elements
    this._paperEditor.set(paperEditor)

    this.setDiagramToEditor(this.diagram, { emitEvent: false })

    this.toolboxRef.nativeElement.addEventListener('itemSelected', <EventListenerOrEventListenerObject>(
      ((event: CustomEvent) => this.addItemFromToolboxToEditor(event.detail))
    ))
  }

  addItemFromToolboxToEditor(itemType: string) {
    const clickedClass = jointJSCustomUmlElements.find(item => item.defaults.type === itemType)?.instance.clone()
    if (!clickedClass) {
      throw new Error(`itemType ${itemType} not found`)
    }

    const tmpX = Math.floor(Math.random() * (500 - 20 + 1)) + 20
    const tmpY = Math.floor(Math.random() * (500 - 20 + 1)) - 300
    clickedClass.position(tmpX, tmpY)
    console.log(clickedClass.position())

    this._paperEditor()?.model.addCell(clickedClass)
  }

  resetDiagram() {
    this.setDiagramToEditor(this.diagram)
  }

  private readonly setDiagramToEditor = (
    diagramValue: string | null,
    options?: {
      onlySelf?: boolean
      emitEvent?: boolean
    }
  ) => {
    const paperEditor = this._paperEditor()
    if (!diagramValue || !paperEditor) {
      return
    }

    const decoded = decodeDiagram(diagramValue)
    try {
      paperEditor.model.fromJSON(decoded)
      this.diagramControl.reset(decoded, options)
    } catch (err) {
      console.error('error while decoding diagram', err, diagramValue)
      paperEditor.model.clear()
    }
  }

  private readonly encodeAndEmitDiagram = (diagram: JointJSDiagram) => {
    // the value was changed
    const inputId = this.inputId
    if (!inputId || !diagram) {
      console.warn('inputId or diagram not set')
      return
    }

    const encodedDiagram = encodeDiagram(diagram)
    console.debug('diagram changed', inputId, encodedDiagram)

    this.diagramChanged.emit({
      inputId,
      diagram: encodedDiagram,
    })
  }
}
