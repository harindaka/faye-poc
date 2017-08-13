import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { ChatComponent } from './components/chat/chat.component';
import { MessageLogComponent } from './components/message-log/message-log.component';

import { ScrollToModule } from 'ng2-scroll-to-el';
import { ConfigService } from './services/config.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import {FocusModule} from 'angular2-focus';

@NgModule({
  declarations: [
    AppComponent,
    ChatComponent,
    MessageLogComponent
  ],
  imports: [
    HttpModule,
    FormsModule,
    BrowserModule,
    ScrollToModule.forRoot(),
    FocusModule.forRoot()
  ],
  providers: [
    ConfigService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
