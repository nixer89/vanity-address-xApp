import { Component, ViewChild, OnInit, Input, OnDestroy } from '@angular/core';
import { isValidXRPAddress } from './utils/utils';
import { MatStepper } from '@angular/material/stepper';
import { XummService } from './services/xumm.service';
import { XRPLWebsocket } from './services/xrplWebSocket';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AddressResult, GenericBackendPostRequest, TransactionValidation } from './utils/types';
import { XummTypes } from 'xumm-sdk';
import { webSocket, WebSocketSubject} from 'rxjs/webSocket';
import { Subscription, Observable } from 'rxjs';
import { OverlayContainer } from '@angular/cdk/overlay';
import { DateAdapter } from '@angular/material/core';
import { TypeWriter } from './utils/TypeWriter';
import * as clipboard from 'copy-to-clipboard';
import * as flagutil from './utils/flagutils';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'vanity',
  templateUrl: './vanity.html',
  styleUrls: ['./vanity.css']
})
export class VanityComponent implements OnInit, OnDestroy {

  constructor(private xummService: XummService,
              private xrplWebSocket: XRPLWebsocket,
              private snackBar: MatSnackBar,
              private overlayContainer: OverlayContainer,
              private dateAdapter: DateAdapter<any>,
              private route: ActivatedRoute) { }


  @ViewChild('inpvanityword') inpvanityword;
  vanityWordInput: string;

  @ViewChild('vanityStepper') stepper: MatStepper;

  @Input()
  ottChanged: Observable<any>;

  @Input()
  themeChanged: Observable<any>;

  vanityWordValid:boolean = false;

  websocket: WebSocketSubject<any>;

  searchResult:string[] = null;
  purchasedAddresses:string[] = null;

  xummVersion:string = null;

  originalAccountInfo:any;
  testMode:boolean = null;
  selectedVanityAddress:string = null;
  vanityWordUsedForSearch:string = null;
  fixAmounts:any = null;

  purchaseStarted:boolean = false;
  purchaseSuccess:boolean = false;

  backendSaveStarted:boolean = false;
  backendSaveSuccess:boolean = false;

  activationStarted:boolean = false;
  activationAmountSent:boolean = false;

  accountActivated:boolean = false;
  accountRekeyed:boolean = false;
  accountMasterKeyDisabled:boolean = false;

  intervalAccountStatus = null;
  errorTimeout = null;
  errorActivation:boolean = false;
  
  private ottReceived: Subscription;
  private themeReceived: Subscription;
  loadingData:boolean = false;

  checkBoxPurchaseAmount:boolean = false;
  checkBoxActivation:boolean = false;
  checkBoxSignInfo:boolean = false;
  checkBoxAccess:boolean = false;
  checkBoxSignAccFull:boolean = false;
  checkBoxVanityAccReadOnly:boolean = false;

  informationConfirmed:boolean = false;

  infoLabel:string = null;

  title: string = "Vanity Address xApp";
  tw: TypeWriter

  themeClass = 'royal-theme';
  backgroundColor = '#030B36';

  errorLabel:string = null;
  showHelp:boolean = false;
  indexBeforeHelp:number = -1;

  debugMode:boolean = true;

  async ngOnInit() {

    if(this.debugMode) {
      await this.loadAccountData("r9N4v3cWxfh4x6yUNjxNy3DbWUgbzMBLdk");
      this.fixAmounts = await this.xummService.getFixAmounts();
      this.testMode = true;
      this.loadingData = false;

      this.tw = new TypeWriter(["Vanity Address xApp", "by nixerFFM + WietseWind", "Vanity Address xApp"], t => {
        this.title = t;
      })
  
      this.tw.start();
      
      return;
    }

    this.ottReceived = this.ottChanged.subscribe(async ottData => {
      console.log("ottReceived: " + JSON.stringify(ottData));

      this.fixAmounts = await this.xummService.getFixAmounts();
      this.getPurchasedAddresses();

      if(ottData) {

        this.infoLabel = JSON.stringify(ottData);

        try {
        
          this.testMode = ottData.nodetype == 'TESTNET';
          this.xummVersion = ottData.version;

          if(ottData.locale)
            this.dateAdapter.setLocale(ottData.locale);
          //this.infoLabel = "changed mode to testnet: " + this.testMode;

          if(ottData && ottData.account && ottData.accountaccess == 'FULL') {
            await this.loadAccountData(ottData.account);
          } else {
            this.originalAccountInfo = "no account";
          }
        } catch(e) {
          await this.handleError(e);
        }
      }

      //this.testMode = true;
      //await this.loadAccountData("rELeasERs3m4inA1UinRLTpXemqyStqzwh");
      //await this.loadAccountData("r9N4v3cWxfh4x6yUNjxNy3DbWUgbzMBLdk");
      this.loadingData = false;
    });

    this.themeReceived = this.themeChanged.subscribe(async appStyle => {

      this.themeClass = appStyle.theme;
      this.backgroundColor = appStyle.color;

      var bodyStyles = document.body.style;
      bodyStyles.setProperty('--background-color', this.backgroundColor);
      this.overlayContainer.getContainerElement().classList.remove('dark-theme');
      this.overlayContainer.getContainerElement().classList.remove('light-theme');
      this.overlayContainer.getContainerElement().classList.remove('moonlight-theme');
      this.overlayContainer.getContainerElement().classList.remove('royal-theme');
      this.overlayContainer.getContainerElement().classList.add(this.themeClass);
    });
    //this.infoLabel = JSON.stringify(this.device.getDeviceInfo());

    this.route.queryParams.subscribe(async params => {
      if(params.found) {
        this.vanityWordInput = params.found;
        this.searchVanityAddress();
      }
    });

    this.tw = new TypeWriter(["Vanity Address xApp", "by nixerFFM + WietseWind", "Vanity Address xApp"], t => {
      this.title = t;
    })

    this.tw.start();
  }

  ngOnDestroy() {
    if(this.ottReceived)
      this.ottReceived.unsubscribe();

    if(this.themeReceived)
      this.themeReceived.unsubscribe();
  }

  async waitForTransactionSigning(payloadRequest: GenericBackendPostRequest): Promise<any> {
    this.loadingData = true;
    //this.infoLabel = "Opening sign request";
    let xummResponse:XummTypes.XummPostPayloadResponse;
    try {
        payloadRequest.payload.options = {
          expire: 2,
          forceAccount: isValidXRPAddress(payloadRequest.payload.txjson.Account+"")
        }

        //console.log("sending xumm payload: " + JSON.stringify(xummPayload));
        xummResponse = await this.xummService.submitPayload(payloadRequest);
        //this.infoLabel = "Called xumm successfully"
        console.log(JSON.stringify(xummResponse));
        if(!xummResponse || !xummResponse.uuid) {
          this.loadingData = false;
          this.snackBar.open("Error contacting XUMM backend", null, {panelClass: 'snackbar-failed', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
          return;
        }        
    } catch (err) {
        //console.log(JSON.stringify(err));
        this.handleError(err);
        this.loadingData = false;
        this.snackBar.open("Could not contact XUMM backend", null, {panelClass: 'snackbar-failed', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
        return;
    }

    if (typeof window.ReactNativeWebView !== 'undefined') {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        command: 'openSignRequest',
        uuid: xummResponse.uuid
      }));
    }

    //this.infoLabel = "Showed sign request to user";
    //remove old websocket
    try {

      if(this.websocket && !this.websocket.closed) {
        this.websocket.unsubscribe();
        this.websocket.complete();
      }

      return new Promise( (resolve, reject) => {

        this.websocket = webSocket(xummResponse.refs.websocket_status);
        this.websocket.asObservable().subscribe(async message => {
            //console.log("message received: " + JSON.stringify(message));
            //this.infoLabel = "message received: " + JSON.stringify(message);

            if((message.payload_uuidv4 && message.payload_uuidv4 === xummResponse.uuid) || message.expired || message.expires_in_seconds <= 0) {

              if(this.websocket) {
                this.websocket.unsubscribe();
                this.websocket.complete();
              }
              
              return resolve(message);
            }
        });
      });
    } catch(err) {
      this.loadingData = false;
      //this.infoLabel = JSON.stringify(err);
    }
  }

  checkVanitySearchChange() {
    if(this.vanityWordInput)
      this.vanityWordValid = /^[a-zA-Z\d]{1,}$/.test(this.vanityWordInput)
    else
      this.vanityWordValid = false;
  }

  async signIn() {
    this.loadingData = true;
    //setting up xumm payload and waiting for websocket
    let backendPayload:GenericBackendPostRequest = {
      options: {
          web: false,
          signinToValidate: true
      },
      payload: {
          txjson: {
              TransactionType: "SignIn"
          },
          custom_meta: {
            instruction: "Please choose your the account which will be able to sign transactions for you new vanity address.\n\nSign the request to confirm."
          }
      }
    }

    try {

      if(!this.fixAmounts)
        this.fixAmounts = await this.xummService.getFixAmounts();

      let message:any = await this.waitForTransactionSigning(backendPayload);

      if(message && message.payload_uuidv4 && message.signed) {
            
        let transactionResult:TransactionValidation = null;
        //check if we are an EscrowReleaser payment
        transactionResult = await this.xummService.checkSignIn(message.payload_uuidv4);

        if(transactionResult && transactionResult.success) {
          await this.loadAccountData(transactionResult.account);
          this.snackBar.open("Sign In successfull", null, {panelClass: 'snackbar-success', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
        } else {
          this.snackBar.open("SignIn not successfull!", null, {panelClass: 'snackbar-failed', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
        }
      } else {
        this.snackBar.open("SignIn not successfull!", null, {panelClass: 'snackbar-failed', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
      }
    } catch(err) {
      this.handleError(err);
    }

    this.loadingData = false;
  
  }

  async loadAccountData(xrplAccount: string) {
    //this.infoLabel = "loading " + xrplAccount;
    if(xrplAccount && isValidXRPAddress(xrplAccount)) {
      this.loadingData = true;
      
      let account_info_request:any = {
        command: "account_info",
        account: xrplAccount,
        "strict": true,
      }

      let message_acc_info:any = await this.xrplWebSocket.getWebsocketMessage("xrpl-transactions", account_info_request, this.testMode);
      console.log("xrpl-transactions account info: " + JSON.stringify(message_acc_info));
      //this.infoLabel = JSON.stringify(message_acc_info);
      if(message_acc_info && message_acc_info.status && message_acc_info.type && message_acc_info.type === 'response') {
        if(message_acc_info.status === 'success' && message_acc_info.result && message_acc_info.result.account_data) {
          this.originalAccountInfo = message_acc_info.result.account_data;
        } else {
          this.originalAccountInfo = message_acc_info;
        }
      } else {
        this.originalAccountInfo = "no account";
      }
    } else {
      this.originalAccountInfo = "no account"
    }
  }

  async signToConfirm() {
    this.loadingData = true;

    if(this.debugMode) {
      this.informationConfirmed = true;
      this.snackBar.open("Information confirmed!", null, {panelClass: 'snackbar-success', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
      this.loadingData = false;
      return;
    }

    //setting up xumm payload and waiting for websocket
    let backendPayload:GenericBackendPostRequest = {
      options: {
          web: false,
          signinToValidate: true,
          xrplAccount: this.originalAccountInfo.Account
      },
      payload: {
          options: {
            forceAccount: true
          },
          txjson: {
            Account: this.originalAccountInfo.Account,
            TransactionType: "SignIn"
          },
          custom_meta: {
            instruction: "Please confirm that you have understood the previous information and that you want to purchase the XRPL account " + this.selectedVanityAddress
          }
      }
    }

    try {

      let message:any = await this.waitForTransactionSigning(backendPayload);

      if(message && message.payload_uuidv4 && message.signed) {
            
        let transactionResult:TransactionValidation = null;
        //check if we are an EscrowReleaser payment
        transactionResult = await this.xummService.checkSignIn(message.payload_uuidv4);

        if(transactionResult && transactionResult.success && transactionResult.account == this.originalAccountInfo.Account) {
          this.informationConfirmed = true;
          this.snackBar.open("Information confirmed!", null, {panelClass: 'snackbar-success', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
        } else {
          this.informationConfirmed = false;
          if(transactionResult.account && transactionResult.account != this.originalAccountInfo.Account)
            this.snackBar.open("Signed with wrong account!", null, {panelClass: 'snackbar-failed', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
          else
            this.snackBar.open("Information not confirmed!", null, {panelClass: 'snackbar-failed', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
        }
      } else {
        this.informationConfirmed = false;
        this.snackBar.open("Information not confirmed!", null, {panelClass: 'snackbar-failed', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
      }
    } catch(err) {
      this.informationConfirmed = false;
      this.handleError(err);
    }
    this.loadingData = false;
  }

  async searchVanityAddress() {
    console.log("searching for vanity address with search string: " + this.vanityWordInput);
    this.loadingData = true;
    try {
      this.selectedVanityAddress = null;
      this.searchResult = null;
      this.purchasedAddresses = null;
      this.vanityWordUsedForSearch = this.vanityWordInput.trim();

      let searchResultApi:AddressResult = await this.xummService.findVanityAddress(this.vanityWordUsedForSearch);

      console.log("Search result: " + JSON.stringify(searchResultApi));

      this.searchResult = searchResultApi.addresses;

      this.infoLabel = "search result: " +JSON.stringify(this.searchResult);
    } catch(e) {
      await this.handleError(e);
    }

    this.loadingData = false;
  }

  async getPurchasedAddresses() {
    console.log("getting purchased vanity addresses for account: " + this.originalAccountInfo.Account);
    this.loadingData = true;
    try {
      this.selectedVanityAddress = null;
      this.searchResult = null;
      this.purchasedAddresses = null;

      let purchaseResult:AddressResult = await this.xummService.getPurchasedAddresses(this.originalAccountInfo.Account);

      console.log("Purchase result: " + JSON.stringify(purchaseResult));

      this.purchasedAddresses = purchaseResult.addresses;

      this.infoLabel = "Purchase result: " +JSON.stringify(this.purchasedAddresses);
    } catch(e) {
      await this.handleError(e);
    }

    this.loadingData = false;
  }

  getPurchaseAmount(): string {
    if(this.vanityWordUsedForSearch) {
      let length = this.vanityWordUsedForSearch.length+"";

      console.log("fix amounts: " + JSON.stringify(this.fixAmounts));
      
      if(this.fixAmounts[length])
        return this.fixAmounts[length]
      else
        return "--"
    } else {
      return "--";
    }
  }

  getBackendFeeAmount(): string {
    if(this.vanityWordUsedForSearch) {
      
      if(this.fixAmounts['backendFee'])
        return this.fixAmounts['backendFee']
      else
        return "--"
    } else {
      return "--";
    }
  }

  selectVanityAddress(account:string) {
    this.selectedVanityAddress = account;
  }

  async buyVanityAddress() {
    this.loadingData = true;

    if(this.debugMode) {
      this.purchaseStarted = true;
      this.purchaseSuccess = true;
      this.loadingData = false;
      return;
    }

    //limit purchase amount to 6
    let vanityLength = this.vanityWordUsedForSearch.length;
    if(vanityLength > 6)
      vanityLength = 6;

    let genericBackendRequest:GenericBackendPostRequest = {
      options: {
        xrplAccount: this.originalAccountInfo.Account
      },
      payload: {
        options: {
          forceAccount: true
        },
        txjson: {
          Account: this.originalAccountInfo.Account,
          TransactionType: "Payment",
          Memos : [{Memo: {MemoType: Buffer.from("Vanity-xApp-Memo", 'utf8').toString('hex').toUpperCase(), MemoData: Buffer.from("Payment for buying vanity address: "+this.selectedVanityAddress, 'utf8').toString('hex').toUpperCase()}}]
        },
        custom_meta: {
          instruction: "Please pay with the account which is already selected.\n\nThis account will be able to sign transactions for " + this.selectedVanityAddress,
          blob: {
            vanityAddress: this.selectedVanityAddress,
            isPurchase: true,
            vanityLength: vanityLength+""
          }
        }
      }
    }

    try {
      let message:any = await this.waitForTransactionSigning(genericBackendRequest);

      if(message && message.payload_uuidv4) {

        this.purchaseStarted = true;

        let txInfo = await this.xummService.validateTransaction(message.payload_uuidv4);
          //console.log('The generic dialog was closed: ' + JSON.stringify(info));

        //if(txInfo && txInfo.success && txInfo.account && txInfo.testnet == false) { <-------- ######## USE THIS IN PROD. CHECK THAT PAYMENT WAS ON MAIN NET!!
        if(txInfo && txInfo.success && txInfo.account) {
          if(isValidXRPAddress(txInfo.account) && txInfo.account == this.originalAccountInfo.Account)
            this.purchaseSuccess = true;
          else
            this.purchaseSuccess = false;
        } else {
          this.purchaseSuccess = false;
        }
      }
    } catch(err) {
      this.handleError(err);
    }

    this.loadingData = false;
  }

  async activateVanityAddress() {
    this.loadingData = true;

    if(this.debugMode) {
      this.activationAmountSent = true;
      this.accountActivated = true;
      this.accountRekeyed = true;
      this.accountMasterKeyDisabled = true;
      this.loadingData = false;
      return;
    }

    let genericBackendRequest:GenericBackendPostRequest = {
      options: {
        xrplAccount: this.originalAccountInfo.Account
      },
      payload: {
        options: {
          forceAccount: true
        },
        txjson: {
          Account: this.originalAccountInfo.Account,
          TransactionType: "Payment",
          Memos : [{Memo: {MemoType: Buffer.from("Vanity-xApp-Memo", 'utf8').toString('hex').toUpperCase(), MemoData: Buffer.from("Activation of vanity address: "+this.selectedVanityAddress, 'utf8').toString('hex').toUpperCase()}}],
        },
        custom_meta: {
          instruction: "Please send with the account which is already selected.\n\nThis account will be able to sign transactions for " + this.selectedVanityAddress,
          blob: {
            vanityAddress: this.selectedVanityAddress,
            isActivation: true
          }
        }
      }
    }

    try {
      let message:any = await this.waitForTransactionSigning(genericBackendRequest);

      if(message && message.payload_uuidv4) {

        this.intervalAccountStatus = setInterval(() => this.checkVanityAccountStatus(this.selectedVanityAddress), 1000);
        
        this.activationStarted = true;

        let txInfo = await this.xummService.validateTransaction(message.payload_uuidv4);

        this.errorTimeout = setTimeout(() => {
          //something went wrong!
          if(!this.accountActivated || !this.accountRekeyed || !this.accountMasterKeyDisabled) {
            this.errorActivation = true;
            this.loadingData = false;
          }
        }, 30000)
          //console.log('The generic dialog was closed: ' + JSON.stringify(info));

        //if(txInfo && txInfo.success && txInfo.account && txInfo.testnet == false) {
        if(txInfo && txInfo.success && txInfo.account) {
          if(isValidXRPAddress(txInfo.account) && txInfo.account == this.originalAccountInfo.Account)
            this.activationAmountSent = true;
          else {
            this.activationAmountSent = false;
            clearTimeout(this.errorTimeout);
            this.loadingData = false;
          }
        } else {
          this.activationAmountSent = false;
          clearTimeout(this.errorTimeout);
          this.loadingData = false;
        }
      }
    } catch(err) {
      this.activationAmountSent = false;
      this.loadingData = false;
      this.handleError(err);
    }
  }

  async checkVanityAccountStatus(xrplAccount: string) {
    //this.infoLabel = "loading " + xrplAccount;
    if(xrplAccount && isValidXRPAddress(xrplAccount)) {
      
      let account_info_request:any = {
        command: "account_info",
        account: xrplAccount,
        "strict": true,
      }

      let message_acc_info:any = await this.xrplWebSocket.getWebsocketMessage("checkVanityAccountStatus", account_info_request, this.testMode);
      console.log("checkVanityAccountStatus account info: " + JSON.stringify(message_acc_info));
      //this.infoLabel = JSON.stringify(message_acc_info);
      if(message_acc_info && message_acc_info.status && message_acc_info.type && message_acc_info.type === 'response') {
        if(message_acc_info.status === 'success' && message_acc_info.result && message_acc_info.result.account_data) {
          let accountInfo = message_acc_info.result.account_data;
          this.accountActivated = accountInfo && accountInfo.Account && accountInfo.Account == xrplAccount;
          this.accountRekeyed = accountInfo && accountInfo.RegularKey && accountInfo.RegularKey == this.originalAccountInfo.Account;
          this.accountMasterKeyDisabled = accountInfo && accountInfo.Flags && flagutil.isMasterKeyDisabled(accountInfo.Flags);

          //scroll down because more elements are loaded
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

          if(this.accountActivated && this.accountRekeyed && this.accountMasterKeyDisabled) {
            clearInterval(this.intervalAccountStatus);
            this.loadingData = false;
          }
        } else {
          this.accountActivated = false;
          this.accountRekeyed = false;
          this.accountMasterKeyDisabled = false;
        }
      } else {
        this.accountActivated = false;
        this.accountRekeyed = false;
        this.accountMasterKeyDisabled = false;
      }
    } else {
      this.accountActivated = false;
      this.accountRekeyed = false; 
      this.accountMasterKeyDisabled = false;
    }
  }

  async addVanityWordToBackend() {
    this.loadingData = true;

    if(this.debugMode) {
      this.backendSaveStarted = true;
      this.backendSaveSuccess = true;
      this.loadingData = false;
      return;
    }

    let genericBackendRequest:GenericBackendPostRequest = {
      options: {
        xrplAccount: this.originalAccountInfo.Account
      },
      payload: {
        options: {
          forceAccount: true
        },
        txjson: {
          Account: this.originalAccountInfo.Account,
          TransactionType: "Payment",
          Memos : [{Memo: {MemoType: Buffer.from("Vanity-xApp-Memo", 'utf8').toString('hex').toUpperCase(), MemoData: Buffer.from("Adding vanity word for explicit search: "+this.vanityWordInput.trim(), 'utf8').toString('hex').toUpperCase()}}]
        },
        custom_meta: {
          instruction: "This payment will add your vanity search word '" + this.vanityWordInput.trim() + "' to our backend to search for it explicitly.",
          blob: {
            isSaveWord: true,
            searchWord: this.vanityWordInput.trim()
          }
        }
      }
    }

    try {
      let message:any = await this.waitForTransactionSigning(genericBackendRequest);

      if(message && message.payload_uuidv4) {

        this.backendSaveStarted = true;

        let txInfo = await this.xummService.validateTransaction(message.payload_uuidv4);
          //console.log('The generic dialog was closed: ' + JSON.stringify(info));

        //if(txInfo && txInfo.success && txInfo.account && txInfo.testnet == false) { <-------- ######## USE THIS IN PROD. CHECK THAT PAYMENT WAS ON MAIN NET!!
        if(txInfo && txInfo.success && txInfo.account) {
          if(isValidXRPAddress(txInfo.account))
            this.backendSaveSuccess = true;
          else
            this.backendSaveSuccess = false;
        } else {
          this.backendSaveSuccess = false;
        }
      }
    } catch(err) {
      this.handleError(err);
    }

    this.loadingData = false;
  }

  copyAddress(address) {
    if(address) {
      clipboard(address);
      this.snackBar.dismiss();
      this.snackBar.open("Address " +address+ " copied to clipboard!", null, {panelClass: 'snackbar-success', duration: 3000, horizontalPosition: 'center', verticalPosition: 'bottom'});
    }
  }

  close() {
    if (typeof window.ReactNativeWebView !== 'undefined') {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        command: 'close',
        refreshEvents: 'true'
      }));
    }
  }

  moveNext() {
    // complete the current step
    this.stepper.selected.completed = true;
    this.stepper.selected.editable = false;
    // move to next step
    this.stepper.next();
    this.stepper.selected.editable = true;
  }

  moveBack() {
    //console.log("steps: " + this.stepper.steps.length);
    // move to previous step
    this.stepper.selected.completed = false;
    this.stepper.selected.editable = false;

    this.stepper.steps.forEach((item, index) => {
      if(index == this.stepper.selectedIndex-1 && this.stepper.selectedIndex-1 >= 0) {
        item.editable = true;
        item.completed = false;
      }
    });

    this.stepper.previous();
  }

  scrollToTop() {
    window.scrollTo(0, 0);
  }

  handleError(err) {
    if(err && JSON.stringify(err).length > 2) {
      this.errorLabel = JSON.stringify(err);
      this.scrollToTop();
    }
    this.snackBar.open("Error occured. Please try again!", null, {panelClass: 'snackbar-failed', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
  }

  copyError() {
    if(this.errorLabel) {
      clipboard(this.errorLabel);
      this.snackBar.dismiss();
      this.snackBar.open("Error text copied to clipboard!", null, {panelClass: 'snackbar-success', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
    }
  }
}
