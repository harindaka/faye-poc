import { Component, AfterViewChecked, ElementRef, ViewChild, OnInit } from '@angular/core';

declare var Faye: any;

@Component({
  selector: 'app-message-log',
  templateUrl: './message-log.component.html',
  styleUrls: ['./message-log.component.css']
})
export class MessageLogComponent implements OnInit {
  @ViewChild('scrollMe') private scrollContainer: ElementRef;

  model: any = {};
  fayeClient: any = null;

  constructor() {
    this.model.messages = [];
    this.fayeClient = new Faye.Client('http://localhost:3000/messages');
  }

  ngOnInit() {
    let topicUrl = '/mytopic';
    var self = this;
    this.fayeClient.subscribe(topicUrl, function(message){
      var messageText = '';
      if(message.clientId === null){
        self.consoleLog('Received: ' + message.text + ' from server (' + message.publishedMessageCount + ' messages published)');          
      }
      else{
        self.consoleLog('Received: ' + message.text + ' from client ' + message.clientId + ' (' + message.publishedMessageCount + ' messages published)');
      }        
    }).then(function(){  
        var clientId = 'guid.raw()';

        self.consoleLog('Subscribed to ' + topicUrl + ' as client instance ' + clientId);
        self.consoleLog('Waiting for messages...');
    }, function(error){
        self.consoleLog('Unable to subscribe to topic ' + topicUrl + ' due to error ' + self.serializeError(error));
    });

    this.scrollToBottom();    
  }

  ngAfterViewChecked() {        
    this.scrollToBottom();        
  }

  scrollToBottom(): void {
    try {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) { }                 
  }

  private consoleLog(messageText:string): void{
    this.model.messages.push({
        text: messageText
    });
  }

  private serializeError(error): string{
      if(error.message && error.message.code && error.message.message){
          return error.message.code + ': ' + error.message.message
      }
      else {
          return JSON.stringify(error);
      }
  }

}
