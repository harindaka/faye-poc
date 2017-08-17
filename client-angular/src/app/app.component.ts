import { Component, OnInit } from '@angular/core';
import { ConfigService } from './services/config.service'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Faye Web Client';
  model: any = {};  
  
  constructor(private configService: ConfigService){    
    this.model.InitStatus = InitStatus;
    this.model.initStatus = this.model.InitStatus.Pending;
    this.model.initError = null;    
  }

  ngOnInit(){
    this.configService.initConfig().subscribe((config) => {
      this.model.initStatus = this.model.InitStatus.Success;
    }, (error) => {
      this.model.initStatus = this.model.InitStatus.Failed;
      this.model.initError = error;
    });
  }  
}

export enum InitStatus {
  Success, Failed, Pending
}
