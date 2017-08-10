import { Component, OnInit } from '@angular/core';

declare var Faye: any;

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

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
