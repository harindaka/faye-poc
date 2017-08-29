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
  private fayeClient: any = null;
  private fayeConfig: any = null; 
  private session: any = {};
  private sessionDurationCounterHandle:any = null;

  constructor(
    private scrollService: ScrollToService,
    private configService: ConfigService,
    private changeDetectorRef: ChangeDetectorRef) {    
  }

  ngOnInit() {
    this.model.messages = [];    
    this.model.messageToSend = "";
    this.model.joinLeaveCaption = "Join"
    this.model.sessionDurationSeconds = 0;
    this.model.isClientOnline = false;

    let config = this.configService.getConfig();
    this.fayeConfig = config.server.faye;
  } 

  onJoinLeaveClicked(command: string){
    if(command == "Join"){
      this.joinChat();
    }else{
      this.resetChat(false);
    }
  }

  onSendClicked(){
    this.sendChat();
  }

  isEmpty(value:any): boolean{
    return (typeof value === 'undefined' || value === null);
  }

  private initializeFayeClient(): void {
    var self = this;
    
    self.resetChat(false);
    self.fayeClient = new Faye.Client(this.fayeConfig.baseUrl);

    self.fayeClient.addExtension({
      incoming: function(message, callback){
        if(message.error && message.error.name && message.error.name === 'E401'){
          self.resetChat(true);
        }
        callback(message);
      },
      outgoing: function(message, callback) {
        if(self.session && self.session.token){
          if(!message.ext){
            message.ext = {};
          }

          message.ext.authToken = self.session.token;
        }

        callback(message);
      }        
    });

    self.fayeClient.on('transport:down', function() {
        self.model.isClientOnline = false;
    });

    self.fayeClient.on('transport:up', function() {
        self.model.isClientOnline = true;
    });
  }

  private joinChat(): void {
    var self = this;
    
    self.session = null;
    if(!self.model.nickname || !(/^[a-zA-Z0-9]{1,15}$/.test(self.model.nickname))){
      self.appendAppMessage("Invalid username entered. Please try again");
    } else {
      self.initializeFayeClient();        

      self.subscribeToUserChannel().then(()=>{
        return self.subscribeToChatChannel();
      }).then((subscription) => {
        self.session.chatSubscription = subscription;
        self.model.joinLeaveCaption = "Leave";

        self.sessionDurationCounterHandle = setInterval(function(){
          self.model.sessionDurationSeconds += 1;
        }, 1000);

        self.appendAppMessage("You joined the chat");
      }, (error) => {
        if(self.session && self.session.userSubscription){
          self.session.userSubscription.cancel();
        }
        self.appendAppMessage("Unable to join chat due to error: " + self.getErrorMessage(error));
      });
    }
  }

  private subscribeToUserChannel(): Promise<any>{
    var self = this;
    
    return new Promise((resolve, reject)=> {
      let topicUrl = self.fayeConfig.topics.chatUsers.url + "/" + self.model.nickname;
      let subscription = self.fayeClient.subscribe(topicUrl, function(message){
        if(message && message.meta && message.meta.type){
          switch(message.meta.type){
            case "auth-token":
              self.session = {
                token: message.authToken,
                clientId: message.clientId,
                userSubscription: subscription
              }              
              resolve();
              break;

            case "session-expiration":
              if(self.session.clientId === message.clientId){
                self.resetChat(true);
              }
              break;
          }
        }
      });
      
      subscription.then(() => {
      }, (error) => {
        reject(error);
      });
    });
  }

  private subscribeToChatChannel(): Promise<any>{
    var self = this;
    
    return new Promise((resolve, reject)=> {      
      let subscription = self.fayeClient.subscribe(self.fayeConfig.topics.chat.url, function(message){
        if(message && message.meta && message.meta.type){
          switch(message.meta.type){
            case "chat":
              if(message.text){                
                self.appendChatMessage(message);
              }
              break;
          }
        }
      });
      
      subscription.then(() => {
        resolve(subscription);
      }, (error) => {
        reject(error);
      });      
    });
  }

  private sendChat(): void{
    var self = this;

    if(self.model.joinLeaveCaption === "Leave" 
      && self.model.messageToSend != null 
      && self.model.messageToSend.trim() != ''){      
      
      let message = { 
        meta: { type: 'chat' },
        text: self.model.messageToSend        
      };

      self.model.messageToSend = '';
      
      self.fayeClient.publish(self.fayeConfig.topics.chat.url, message, {
          deadline: 10, //client will not attempt to resend the message any later than 10 seconds after the first publish() call
          attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
      }, (error) => {
        self.appendAppMessage('Failed to send your message due to error: ' + self.getErrorMessage(error));        
      });
    }
  }
  
  private resetChat(isSessionExpired: boolean): void{
    var self = this;
    if(self.session){
      if(self.session.chatSubscription){
        self.session.chatSubscription.cancel();
      }

      if(self.session.userSubscription){
        self.session.userSubscription.cancel();
      }

      self.session = null;
    }

    if(self.fayeClient && self.fayeClient !== null){
      self.fayeClient.disconnect();
      self.fayeClient = null;
    }

    self.model.sessionDurationSeconds = 0;
    if(self.sessionDurationCounterHandle){
      clearInterval(self.sessionDurationCounterHandle);
    }
    
    if(self.model.joinLeaveCaption !== "Join"){
      self.model.joinLeaveCaption = "Join";
      if(isSessionExpired){
        self.appendAppMessage("You were logged out since your session has expired. Please join again to continue");
      }
      else{
        self.appendAppMessage("You left the chat");
      } 
    }   
  }

  private appendChatMessage(message: any): void{
    this.model.messages.push(message);

    this.changeDetectorRef.detectChanges();
    this.scrollService.scrollTo('#scrollAnchor');
  }

  private appendAppMessage(messageText:string): void{
    this.model.messages.push({
        text: messageText
    });

    this.changeDetectorRef.detectChanges();
    this.scrollService.scrollTo('#scrollAnchor');
  }

  private getErrorMessage(error){
    if(typeof error === "string"){
      return error;
    }
    else if (typeof error === "object" && error.message) {
      if(typeof error.message === "string"){
        return error.message;
      }
      else if(typeof error.message === "object" && error.message.message){
        return error.message.message;
      }      
    }
    
    return JSON.stringify(error);    
  }
}
