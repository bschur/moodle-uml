import { AppComponent } from './app/app.component'
import { bootstrapApplication } from '@angular/platform-browser'

bootstrapApplication(AppComponent)
    .catch(err => console.error(err))