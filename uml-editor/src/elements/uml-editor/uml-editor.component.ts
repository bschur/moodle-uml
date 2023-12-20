import { AfterViewInit, ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, effect, ElementRef, EventEmitter, Input, Output, signal, ViewChild } from '@angular/core'
import { decodeDiagram, encodeDiagram } from '../../utils/uml-editor-compression.utils'
import { dia, elementTools, linkTools } from 'jointjs'
import { initCustomNamespaceGraph, initCustomPaper, jointJsCustomUmlItems } from '../../utils/jointjs-drawer.utils'
import { UmlClass } from '../../models/jointjs/uml-class.model'
import { coerceBooleanProperty } from '@angular/cdk/coercion'
import { NgIf } from '@angular/common'
import { CustomTextBlock } from '../../models/jointjs/custom-text-block.model'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'

@Component({
    selector: 'app-uml-editor',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './uml-editor.component.html',
    styleUrl: './uml-editor.component.scss',
    imports: [
        NgIf,
        MatSidenavModule,
        MatButtonModule,
        MatIconModule
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class UmlEditorComponent implements AfterViewInit {
    @Input() set inputId(value: string | null) {
        this._inputId.set(value)
    }

    @Input({ transform: coerceBooleanProperty }) allowEdit = false

    @Input() set diagram(value: string | null) {
        this._inputDiagram.set(value)
    }

    @ViewChild('editor', { static: true }) editorRef!: ElementRef<HTMLDivElement>
    @ViewChild('toolbox', { static: true }) toolboxRef!: ElementRef<HTMLDivElement>

    @Output() readonly diagramChanged = new EventEmitter<{ inputId: string, diagram: string }>()

    private readonly _inputId = signal<string | null>(null)
    private readonly _inputDiagram = signal<string | null>(null)
    private readonly _diagram = signal<any>(null)
    private readonly _paperEditor = signal<dia.Paper | null>(null)

    constructor() {
        // listen to diagram input and draw it on editor
        effect(() => {
            const inputDiagram = this._inputDiagram()
            const paperEditor = this._paperEditor()
            if (!inputDiagram || !paperEditor) {
                return
            }

            const decoded = decodeDiagram(inputDiagram)
            try {
                paperEditor.model.fromJSON(decoded)
            } catch (err) {
                console.error('error while decoding diagram', err, inputDiagram)
                paperEditor.model.clear()
            }
        })

        // listen to diagram changes and emit value
        effect(() => {
            const diagram = this._diagram()
            const inputId = this._inputId()
            if (!inputId || !diagram) {
                console.warn('inputId or diagram not set')
                return
            }

            const encodedDiagram = encodeDiagram(diagram)
            if (encodedDiagram === this._inputDiagram()) {
                console.warn('diagram not changed')
                return
            }

            this.diagramChanged.emit({
                inputId,
                diagram: encodedDiagram
            })
        })
    }

    ngAfterViewInit() {
        const paperEditor = initCustomPaper(this.editorRef.nativeElement, initCustomNamespaceGraph(), true)

        this.subscribeToEvents(paperEditor)

        this._paperEditor.set(paperEditor)

        this.toolboxRef.nativeElement.addEventListener('itemSelected', <EventListenerOrEventListenerObject>((event: CustomEvent) => this.addItemFromToolboxToEditor(event.detail)))
    }

    addItemFromToolboxToEditor(itemType: string) {
        const clickedClass = jointJsCustomUmlItems.find((item) => item.defaults.type === itemType)?.createEmpty()
        if (!clickedClass) {
            throw new Error(`itemType ${itemType} not found`)
        }

        let tmpX = Math.floor(Math.random() * (500 - 20 + 1)) + 20
        let tmpY = Math.floor(Math.random() * (500 - 20 + 1)) + 20
        clickedClass.position(tmpX, tmpY)

        this._paperEditor()?.model.addCell(clickedClass)
    }

    private subscribeToEvents(paperEditor: dia.Paper) {
        paperEditor.model.on('change', () => {
            this._diagram.set(paperEditor.model.toJSON())
        })

        // Assuming paper is your JointJS paper

        paperEditor.on('cell:mouseenter', function (cellView) {
            const tools = new dia.ToolsView({
                tools: [
                    new elementTools.Boundary({
                        padding: 3,
                        rotate: true,
                        useModelGeometry: true
                    }),
                    new linkTools.Remove({
                        scale: 1.2,
                        distance: 15
                    })
                ]
            })
            cellView.addTools(tools)
        })

        paperEditor.on('element:pointerdblclick', function (elementView, evt) {
            if (elementView.model instanceof UmlClass) {
                const class1 = elementView.model
                const x = class1.userInput(evt, paperEditor)
                if (x != null) {
                    paperEditor.model.addCell(x)
                }
            } else if (elementView.model instanceof CustomTextBlock) {
                const customTextBlock = elementView.model
                const cell = elementView.model

                // customTextBlock.createVariableComponent();
                const element = elementView.el
            } else {
                throw new Error('elementView.model is not instanceof UmlClass')
            }
        })

        paperEditor.on('cell:mouseleave', function (cellView) {
            cellView.removeTools()
        })
    }
}
