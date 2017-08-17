import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import {Observable} from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

@Injectable()
export class ConfigService {
  
  private config = null;

  constructor(private http: Http) { }

  initConfig(): Observable<any> {
    
    if(this.config == null){
      return this.http.get('assets/config/config.json').map((response: Response) => {
        this.config = response.json();
        return this.config;
      });
    }else{
      return Observable.create(this.config);
    }
  }

  getConfig(){
    return this.config;
  }
}
