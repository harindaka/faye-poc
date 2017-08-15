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
    this.fayeClient = new Faye.Client(this.fayeConfig.baseUrl);
  } 

  onJoinLeaveClicked(command: string){
    var self = this;
    
    self.session = null;
    if(command == "Join"){
      self.subscribeToUserChannel().then((session)=>{
        self.session = session;
        return self.subscribeToChatChannel();
      }).then((subscription) => {
        self.session.chatSubscription = subscription;
        self.model.joinLeaveCaption = "Leave";
      }).catch((error) => {
        if(self.session && self.session.userSubscription){
          self.session.userSubscription.cancel();
        }
        self.appendAppMessage("Unable to join chat due to error: " + error.message);
      });
    }else{
      self.unsubscribe();
    }
  }

  onSendClicked(){
    var self = this;
    if(!self.model.nickname || !(/^[a-zA-Z0-9]{1,15}$/.test(self.model.nickname))){
      self.appendAppMessage("Invalid username entered. Please try again");
    } else if(self.model.messageToSend != null && self.model.messageToSend.trim() != ''){      
      let message = { 
          text: self.model.messageToSend        
      };

      self.model.messageToSend = '';
      
      self.fayeClient.publish(self.fayeConfig.topics.chat.url, message, {
          deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
          attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
      }).catch((error) => {
        self.appendAppMessage('The server explicitly rejected publishing your message which was sent due to error: ' + error.message);        
      });
    }
  }

  private subscribeToUserChannel(): Promise<any>{
    return new Promise((resolve, reject)=> {
      var self = this;
      let subscription = this.fayeClient.subscribe(this.fayeConfig.topics.chatUsers.url + "/" + self.model.nickname, function(message){
        if(message && message.meta && message.meta.type){
          switch(message.meta.type){
            case "auth-token": 
              resolve({
                token: message.data.token,
                userSubscription: subscription
              });
              break;
          }
        }
      }).catch((error) =>{
          reject(error);
      });
    });
  }

  private subscribeToChatChannel(): Promise<any>{
    return new Promise((resolve, reject)=> {
      var self = this;
      let subscription = this.fayeClient.subscribe(this.fayeConfig.topics.chat.url, function(message){
        if(message && message.meta && message.meta.type){
          switch(message.meta.type){
            case "chat":
              if(message.text){ 
                self.appendChatMessage(message);
              }
              break;
          }
        }
      }).catch((error) =>{
          reject(error);
      });

      resolve(subscription);
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

    self.model.joinLeaveCaption = "Join";
    self.appendAppMessage("You left the chat");
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
