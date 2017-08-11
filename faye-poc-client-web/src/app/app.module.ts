import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { ChatComponent } from './components/chat/chat.component';
import { MessageLogComponent } from './components/message-log/message-log.component';

@NgModule({
  declarations: [
    AppComponent,
    ChatComponent,
    MessageLogComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
