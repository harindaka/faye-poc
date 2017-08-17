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

  constructor(
    private scrollService: ScrollToService,
    private configService: ConfigService,
    private changeDetectorRef: ChangeDetectorRef) {
    this.model.messages = [];    
    this.model.messageToSend = "";
    this.model.joinLeaveCaption = "Join"
  }

  ngOnInit() {
    let config = this.configService.getConfig();
    this.fayeConfig = config.server.faye;
  } 

  onJoinLeaveClicked(command: string){
    var self = this;
    
    self.session = null;
    if(command == "Join"){
      if(!self.model.nickname || !(/^[a-zA-Z0-9]{1,15}$/.test(self.model.nickname))){
        self.appendAppMessage("Invalid username entered. Please try again");
      } else {
        self.unsubscribe();
        self.fayeClient = new Faye.Client(this.fayeConfig.baseUrl);

        self.subscribeToUserChannel().then((session)=>{
          self.session = session;
          return self.subscribeToChatChannel();
        }).then((subscription) => {
          self.session.chatSubscription = subscription;
          self.model.joinLeaveCaption = "Leave";
        }, (error) => {
          if(self.session && self.session.userSubscription){
            self.session.userSubscription.cancel();
          }
          self.appendAppMessage("Unable to join chat due to error: " + error.message);
        });
      }
    }else{
      self.unsubscribe();
    }
  }

  onSendClicked(){
    var self = this;

    if(self.model.joinLeaveCaption = "Leave" 
      && self.model.messageToSend != null 
      && self.model.messageToSend.trim() != ''){      
      
      let message = { 
        meta: { type: 'chat' },
        text: self.model.messageToSend        
      };

      self.model.messageToSend = '';
      
      self.fayeClient.publish(self.fayeConfig.topics.chat.url, message, {
          deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
          attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
      }, (error) => {
        self.appendAppMessage('The server explicitly rejected publishing your message which was sent due to error: ' + error.message);        
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
              resolve({
                token: message.authToken,
                userSubscription: subscription
              });
              break;
          }
        }
      });
      
      subscription.then(() => {
        let authTokenRequestMessage = {
          meta: {
            type: 'auth-token-request'
          }
        };

        return self.fayeClient.publish(topicUrl, authTokenRequestMessage, {
          deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
          attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
        });
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
      }).then(() => {
        resolve(subscription);
      }, (error) => {
        reject(error);
      });      
    });
  }

  private unsubscribe(): void{
    var self = this;
    if(self.session){
      if(self.session.chatSubscription){
        self.session.chatSubscription.cancel();
      }

      if(self.session.userSubscription){
        self.session.userSubscription.cancel();
      }
    }

    if(self.fayeClient && self.fayeClient !== null){
      self.fayeClient.disconnect();
      self.fayeClient = null;
    }

    if(self.model.joinLeaveCaption !== "Join"){
      self.model.joinLeaveCaption = "Join";
      self.appendAppMessage("You left the chat");
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
}
