import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { XummService } from './services/xumm.service';
import { OverlayContainer } from '@angular/cdk/overlay';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'xaman-xapp-vanity-address';
  themeClass:string = "dark-theme";
  backgroundColor: string = "#000000";
  
  receivedParams = false;
  alreadySent = false;

  infoLabel:string = null;

  ottReceived: Subject<any> = new Subject<any>();
  appStyleChanged: Subject<any> = new Subject<any>();

  timeout1: any;
  timeout2: any;

  constructor(private route: ActivatedRoute, private xummService: XummService, private overlayContainer: OverlayContainer) { }

  ngOnInit() {
    this.route.queryParams.subscribe(async params => {
      this.infoLabel = JSON.stringify(params);
      if(this.timeout1) {
        //console.log("clearing timeout1");
        clearTimeout(this.timeout1)
      }
  
      if(this.timeout2) {
        //console.log("clearing timeout2");
        clearTimeout(this.timeout2)
      }

      let xAppToken = params.xAppToken;

      this.receivedParams = xAppToken != null;
      //console.log("has params received: " + this.receivedParams)

      //console.log("received pararms: " + JSON.stringify(params));
      this.infoLabel = "params: " + JSON.stringify(params);

      if(xAppToken) {
        try {
          this.infoLabel = "calling backend";
          let ottResponse:any = await this.xummService.getxAppOTTData(xAppToken);
          //console.log("ottResponse: " + JSON.stringify(ottResponse));
          this.infoLabel = "ott from backend: " + JSON.stringify(ottResponse);
  
          this.alreadySent = true;
  
          if(ottResponse && !ottResponse.error) {
            //console.log("error OTT, only sending app style");
            this.ottReceived.next(ottResponse);
            this.alreadySent = true;
          }
        } catch(err) {
          this.infoLabel = "error: " + JSON.stringify(err);
        }
        
      }
    });

    this.timeout2 = setTimeout(() => {
      //console.log("checking with2: " + this.receivedParams);
      if(!this.receivedParams && !this.alreadySent) {
        //console.log("didnt received any params")
        this.ottReceived.next({style: null});
        this.alreadySent = true;
      }
    }, 3000);
  }
}
