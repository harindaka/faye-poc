import { Component, AfterViewChecked, ElementRef, ViewChild, OnInit, ChangeDetectorRef } from '@angular/core';
import { ScrollToService } from 'ng2-scroll-to-el';
import { ConfigService } from '../../services/config.service';

declare var Faye: any;

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {    
  model: any = {};
  fayeClient: any = null;
  fayeConfig: any = null; 
  nickname: string = null; 
  private token: string = null;

  constructor(
    private scrollService: ScrollToService,
    private configService: ConfigService,
    private changeDetectorRef: ChangeDetectorRef) {
    this.model.messages = [];    
    this.model.messageToSend = '';
    this.model.joinLeaveCaption = "Join"
  }

  ngOnInit() {
    let config = this.configService.getConfig();
    this.fayeConfig = config.server.faye;
    this.fayeClient = new Faye.Client(this.fayeConfig.baseUrl);
    
    var self = this;
    this.fayeClient.subscribe(this.fayeConfig.topics.chat.url, function(message){
      var messageText = '';
      if(message.senderName){
        self.appendChat(message.senderName + ' >> ' + message.text);
      }
      else{
        self.appendChat(message.text);
      }        
    }).then(function(){  
               
        
    }, function(error){
        self.appendChat('Unable to subscribe to topic ' + this.fayeConfig.topics.chat.url + ' due to error ' + self.serializeError(error));
    });

    this.fayeClient.subscribe(this.fayeConfig.topics.chatMeta.url, function(message){
      if(message.join && message.join.token){
        self.token = message.join.token
      }        
    }).then(function(){  
      
    }, function(error){
      self.appendChat('Unable to subscribe to topic ' + this.fayeConfig.topics.chat.url + ' due to error ' + self.serializeError(error));
    });
  }

  onSendClicked(){
    if(this.model.messageToSend != null && this.model.messageToSend.trim() != ''){
      let self = this;    
      let message = { 
          text: this.model.messageToSend        
      };

      this.model.messageToSend = '';
      
      this.fayeClient.publish(this.fayeConfig.topics.chat.url, message, {
          deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
          attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
      }).then(function(){
          
      }, function(error){
        self.appendChat('The server explicitly rejected publishing your message which was sent due to error: ' + error.message);        
      });
    }
  }

  onJoinLeaveClicked(command: string){
    var self = this;
    
    if(command == "Join"){
      let message = {
        join: {
          nickname: this.nickname
        }
      }

      this.fayeClient.publish(this.fayeConfig.topics.chatMeta.url, message, {
          deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
          attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
      }).then(function(){
          self.model.joinLeaveCaption = "Leave";
      }, function(error){
          self.appendChat('Unable to join due to error: ' + error.message);
      });
    }else{
      let message = {
        leave: {}
      }

      this.fayeClient.publish(this.fayeConfig.topics.chatMeta.url, message, {
          deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
          attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
      }).then(function(){
          self.token = null;
          self.model.joinLeaveCaption = "Join";
          self.appendChat('You left the chat');
      }, function(error){
          self.appendChat('Unable to leave due to error: ' + error.message);
      });
    }
  }

  private appendChat(messageText:string): void{
    this.model.messages.push({
        text: messageText
    });

    this.changeDetectorRef.detectChanges();

    this.scrollService.scrollTo('#scrollAnchor');
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
