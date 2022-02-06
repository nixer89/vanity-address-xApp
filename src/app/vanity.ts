import { Component, ViewChild, OnInit, Input, OnDestroy } from '@angular/core';
import { isValidXRPAddress } from './utils/utils';
import { MatStepper } from '@angular/material/stepper';
import { XummService } from './services/xumm.service';
import { XRPLWebsocket } from './services/xrplWebSocket';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GenericBackendPostRequest, PurchasedVanityAddresses, TransactionValidation, VanitySearchResponse, VanitySearchResult } from './utils/types';
import { XummTypes } from 'xumm-sdk';
import { webSocket, WebSocketSubject} from 'rxjs/webSocket';
import { Subscription, Observable } from 'rxjs';
import { OverlayContainer } from '@angular/cdk/overlay';
import * as clipboard from 'copy-to-clipboard';
import * as flagutil from './utils/flagutils';
import { environment } from '../environments/environment';

@Component({
  selector: 'vanity',
  templateUrl: './vanity.html'
})
export class VanityComponent implements OnInit, OnDestroy {

  constructor(private xummService: XummService,
              private xrplWebSocket: XRPLWebsocket,
              private snackBar: MatSnackBar,
              private overlayContainer: OverlayContainer) { }


  @ViewChild('inpvanityword') inpvanityword;
  vanityWordInput: string;

  @ViewChild('vanityStepper') stepper: MatStepper;

  @Input()
  ottChanged: Observable<any>;

  @Input()
  themeChanged: Observable<any>;

  vanityWordValid:boolean = false;

  websocket: WebSocketSubject<any>;

  searchResult:VanitySearchResult[] = null;

  originalAccountInfo:any;
  testMode:boolean = null;
  selectedVanityAddress:VanitySearchResult = null;
  vanityWordUsedForSearch:string = null;
  fixAmounts:any = null;
  xrpAmountFirst:number = null;

  amountXrpNeeded:number = null;

  openSearch:boolean = true;

  balanceTooLow:boolean = false;

  purchaseStarted:boolean = false;
  purchaseSuccess:boolean = false;

  backendSaveStarted:boolean = false;
  backendSaveSuccess:boolean = false;

  activationStarted:boolean = false;
  activationAmountSent:boolean = false;

  accountActivated:boolean = false;
  accountRekeyed:boolean = false;
  accountMasterKeyDisabled:boolean = false;

  rekeyAccount:string = null;

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
  checkBoxVanityAccAccess:boolean = false;
  checkBoxVanityPrivacy:boolean = false;
  checkBoxMasterKey:boolean = false;

  informationConfirmed:boolean = false;

  infoLabel:string = null;
  infoLabel2:string = null;
  infoLabel3:string = null;

  themeClass = 'royal-theme';
  backgroundColor = '#030B36';

  errorLabel:string = null;

  purchasedAddresses:PurchasedVanityAddresses[] = null;
  loadingPurchases:boolean = false;

  highlightedText:string = null;
  fullAccessAccount:boolean = true;

  loadingCheckForPurchaseActivation:boolean = false;

  debugMode:boolean = !environment.production;
  useMainNet:boolean = environment.useMainNet;

  title: string = "XRPL Vanity";

  accountReserve:number = 10000000;
  ownerReserve:number = 2000000;

  searchString:string[] = ["dsfdsf","fgtfh","zuukuzk","gfdgfdg","fsfdsf","zuui","qsdsd","kloh","bngjh","adgjig","dfdghjj","qwfguilo","vkhprfhh","vcbmgote",
  "cloho","scbnhjuz","gjkizf","ssdfzii","ghjhkh","cgfhg","ghgfhsdf","efrhjhlkl","hkues","daniel","richard","peter","wietse","tristan","qwertzui","poiuztre",
  "asdfghjk","cvbnmjkl","xdcfvgbh","xxxxxxxx","vbnhzuik","fghjmkiz","kiolpztd","xyascbmk","aghjiztr",]

  async ngOnInit() {

    this.loadingData = true;

    if(this.debugMode) {
      this.testMode = true;
      await this.loadAccountData("rNixerUVPwrhxGDt4UooDu6FJ7zuofvjCF");
      this.fixAmounts = await this.xummService.getFixAmounts();

      let response = await this.xummService.convertToXrp(parseInt(this.getPurchaseAmountUSD()));
      this.xrpAmountFirst = parseInt(response.xrpamount)/1000000;
      
      await this.loadPurchases();

      //this.errorLabel = "AN ERROR HAPPENED!!!!"

      this.loadingData = false;

      /**
      console.log("start search");
      for(let i = 0; i < this.searchString.length;i++) {
        setTimeout(async () => {
          let word = this.searchString[i];
          console.time(word);
          let searchResultApi:VanitySearchResponse = await this.xummService.searchVanityAddress(word, this.testMode);
          console.timeEnd(word);

        },0)
      }

      */

      return;
    }

    this.ottReceived = this.ottChanged.subscribe(async ottData => {
      //this.infoLabel = "ott received: " + JSON.stringify(ottData);
      //console.log("ottReceived: " + JSON.stringify(ottData));

      this.fixAmounts = await this.xummService.getFixAmounts();

      let response = await this.xummService.convertToXrp(parseInt(this.getPurchaseAmountUSD()));
      this.xrpAmountFirst = parseInt(response.xrpamount)/1000000;

      if(ottData) {

        //this.infoLabel = JSON.stringify(ottData);

        this.testMode = ottData.nodetype === 'TESTNET';
        //this.isTestMode = true;

        //this.infoLabel2 = "changed mode to testnet: " + this.testMode;

        if(ottData && ottData.account && ottData.accountaccess == 'FULL') {
          await this.loadAccountData(ottData.account);
          await this.loadPurchases();

          this.fullAccessAccount = true;

          console.log("having full access!");

          try {
            //read origin data
            if(ottData.vanityword) {

              let predefined = ottData.vanityword;

              console.log("predefined: " + predefined);
              if(predefined && typeof predefined === 'string' && predefined.trim().length >=3 &&  predefined.trim().length <= 8) {
                //we have a deeplink with a vanity word, set it and go!
                this.vanityWordInput = predefined.trim();
                this.checkVanitySearchChange();
                console.log("vanityWordInput for search: " + this.vanityWordInput);
                await this.searchVanityAddress();
              }
            }
          } catch(err) {
            //nothing if it fails.. just reset some things
            this.vanityWordInput = null;
            this.checkVanitySearchChange();
          }

          this.loadingData = false;

          //await this.loadAccountData(ottData.account); //false = ottResponse.node == 'TESTNET'
        } else {
          this.fullAccessAccount = false;
          this.originalAccountInfo = "no account";
          this.loadingData = false;
        }

        //this.infoLabel = JSON.stringify(this.originalAccountInfo);
      }
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

    await this.loadFeeReserves();
  }

  ngOnDestroy() {
    if(this.ottReceived)
      this.ottReceived.unsubscribe();

    if(this.themeReceived)
      this.themeReceived.unsubscribe();
  }

  async loadFeeReserves() {
    let fee_request:any = {
      command: "ledger_entry",
      index: "4BC50C9B0D8515D3EAAE1E74B29A95804346C491EE1A95BF25E4AAB854A6A651",
      ledger_index: "validated"
    }

    let feeSetting:any = await this.xrplWebSocket.getWebsocketMessage("fee-settings", fee_request, this.testMode);
    this.accountReserve = feeSetting?.result?.node["ReserveBase"];
    this.ownerReserve = feeSetting?.result?.node["ReserveIncrement"];

    //console.log("resolved accountReserve: " + this.accountReserve);
    //console.log("resolved ownerReserve: " + this.ownerReserve);
  }

  openSearchClick() {
    this.openSearch = true;
  }

  openPurchaseClick() {
    this.openSearch = false;
  }

  async loadPurchases() {
    try {
      this.loadingPurchases = true;

      if(this.originalAccountInfo && this.originalAccountInfo.Account && isValidXRPAddress(this.originalAccountInfo.Account))
        this.purchasedAddresses = await this.xummService.getPurchases(this.originalAccountInfo.Account);
      //console.log(JSON.stringify(this.purchasedAddresses));

      this.loadingPurchases = false;
    } catch (err) {
      console.log(err);
    }
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
      this.vanityWordValid = /^[a-zA-Z]{1,}$/.test(this.vanityWordInput)
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
          this.snackBar.open("Sign In successful", null, {panelClass: 'snackbar-success', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
        } else {
          this.snackBar.open("SignIn not successful!", null, {panelClass: 'snackbar-failed', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
        }
      } else {
        this.snackBar.open("SignIn not successful!", null, {panelClass: 'snackbar-failed', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
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
        signer_lists: true,
        "strict": true,
      }

      let message_acc_info:any = await this.xrplWebSocket.getWebsocketMessage("loadAccount", account_info_request, this.testMode);
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

  hasSignerList(): Boolean {
    return this.originalAccountInfo.signer_lists && this.originalAccountInfo.signer_lists.length > 0;
  }

  async signToConfirm() {
    this.loadingData = true;

    if(this.debugMode) {
      this.informationConfirmed = true;
      this.snackBar.open("Information confirmed with a very very long text which is too long!", null, {panelClass: 'snackbar-success', duration: 3000, horizontalPosition: 'center', verticalPosition: 'top'});
      this.loadingData = false;
      return;
    }

    //setting up xumm payload and waiting for websocket
    let backendPayload:GenericBackendPostRequest = {
      options: {
          web: false,
          signinToValidate: true,
          xrplAccount: this.originalAccountInfo.Account,
          pushDisabled: true
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
            instruction: "Confirm that your vanity address:\n- costs " + this.getPurchaseAmountUSD() + " USD\n- needs activation with 10 XRP\n- ONLY accessible with " + this.originalAccountInfo.Account + "\n" +
                          "- if access to " + this.originalAccountInfo.Account + " is lost, " + this.selectedVanityAddress.address + " will be inaccessible too"
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
            this.snackBar.open("Signed with wrong account! Please sign with the account you chose in the previous step!", null, {panelClass: 'snackbar-failed', duration: 5000, horizontalPosition: 'center', verticalPosition: 'top'});
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
      this.vanityWordUsedForSearch = this.vanityWordInput.trim();

      let searchResultApi:VanitySearchResponse = await this.xummService.searchVanityAddress(this.vanityWordUsedForSearch, this.testMode);

      console.log("Search result: " + JSON.stringify(searchResultApi));

      this.searchResult = searchResultApi.results;

      //this.infoLabel = "search result: " +JSON.stringify(this.searchResult);
    } catch(e) {
      await this.handleError(e);
    }

    this.loadingData = false;
  }

  getPurchaseAmountUSD(): string {
    /**
      if(this.vanityWordUsedForSearch) {
      let length:string = (this.vanityWordUsedForSearch.length > 8 ? 8 : this.vanityWordUsedForSearch.length) + ""

      if(this.fixAmounts[length])
        return this.fixAmounts[length]
      else if(this.fixAmounts["*"])
        return this.fixAmounts["*"]
      else
        return "--"

    } else {
      return "--";
    }
    **/

    if(this.fixAmounts && this.fixAmounts["*"])
      return this.fixAmounts["*"]
    else
      return "--"
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

  async selectVanityAddress(selectedAddress:VanitySearchResult) {
    try {

      this.loadingData = true;
      //check vanity address existence     

      let account_info_request:any = {
        command: "account_info",
        account: selectedAddress.address,
        "strict": true,
      }

      let message_acc_info:any = await this.xrplWebSocket.getWebsocketMessage("loadAccount", account_info_request, this.testMode);
      console.log("xrpl-transactions account info: " + JSON.stringify(message_acc_info));
      //this.infoLabel = JSON.stringify(message_acc_info);
      if(message_acc_info && message_acc_info.status && message_acc_info.type && message_acc_info.type === 'response') {
        if(message_acc_info.status === 'success' && message_acc_info.result?.account_data?.Account && isValidXRPAddress(message_acc_info.result.account_data.Account)) {
          //address exists already, stop here!
          this.selectedVanityAddress = null;
          
          //reduce search result by already activated address
          this.searchResult = this.searchResult.filter(vanity => vanity.address != selectedAddress.address);

          this.snackBar.open("Address is not available! Please choose a different address.", null, {panelClass: 'snackbar-failed', duration: 8000, horizontalPosition: 'center', verticalPosition: 'top'});
          this.loadingData = false;
          return;
        }
      }

      await this.xummService.reserveVanityAddress(selectedAddress.address, selectedAddress.identifier, this.testMode);

      let response = await this.xummService.convertToXrp(parseInt(this.getPurchaseAmountUSD()));
      this.amountXrpNeeded = parseInt(response.xrpamount) + this.accountReserve + 100000; //add 100000 as "buffer"

      this.balanceTooLow = this.getAvailableBalance(this.originalAccountInfo) < this.amountXrpNeeded;

      this.selectedVanityAddress = selectedAddress;

      //console.log("balance: " + this.getAvailableBalance(this.originalAccountInfo));
      //console.log("xrp amount needed: " + this.amountXrpNeeded);
      this.loadingData = false;

    } catch(err) {
      console.log(err);
      this.loadingData = false;
      //but ignore
    }
  }

  getAvailableBalance(accountInfo: any): number {
    if(accountInfo && accountInfo.Balance) {
      let balance:number = Number(accountInfo.Balance);
      balance = balance - this.accountReserve; //deduct acc reserve
      balance = balance - (accountInfo.OwnerCount * this.ownerReserve); //deduct owner count
      balance = balance;

      if(balance >= 1)
        return balance
      else
        return 0;

    } else {
      return 0;
    }
  }

  async buyVanityAddress() {
    this.loadingData = true;

    if(this.debugMode) {
      this.purchaseStarted = true;
      setTimeout(async () => {
        this.purchaseSuccess = true;
        await this.loadPurchases();
        this.loadingData = false;
      }, 1000);
      return;
    }

    //limit purchase amount to 6
    let vanityLength = this.vanityWordUsedForSearch.length;
    if(vanityLength > 6)
      vanityLength = 6;

    let genericBackendRequest:GenericBackendPostRequest = {
      options: {
        xrplAccount: this.originalAccountInfo.Account,
        pushDisabled: true
      },
      payload: {
        options: {
          forceAccount: true
        },
        txjson: {
          Account: this.originalAccountInfo.Account,
          TransactionType: "Payment",
          Memos : [{Memo: {MemoType: Buffer.from("Vanity-xApp-Memo", 'utf8').toString('hex').toUpperCase(), MemoData: Buffer.from("Payment to purchase vanity address: "+this.selectedVanityAddress.address, 'utf8').toString('hex').toUpperCase()}}]
        },
        custom_meta: {
          instruction: "Please sign this request to buy your vanity address " + this.selectedVanityAddress.address,
          blob: {
            vanityAddress: this.selectedVanityAddress,
            isPurchase: true,
            vanityLength: vanityLength+"",
            regularKey: this.originalAccountInfo.Account
          }
        }
      }
    }

    try {
      let message:any = await this.waitForTransactionSigning(genericBackendRequest);

      if(message && message.payload_uuidv4) {

        this.purchaseStarted = true;

        let txInfo = await this.xummService.validatePayment(message.payload_uuidv4);
          //console.log('The generic dialog was closed: ' + JSON.stringify(info));

        //if(txInfo && txInfo.success && txInfo.account && txInfo.testnet == false) { <-------- ######## USE THIS IN PROD. CHECK THAT PAYMENT WAS ON MAIN NET!!
        if(txInfo && txInfo.success && txInfo.account && txInfo.testnet == this.testMode) {
          if(isValidXRPAddress(txInfo.account)) {
            this.purchaseSuccess = true;
          } else
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

  async selectPurchasedAddressAndActivate(account:PurchasedVanityAddresses) {
    this.loadingCheckForPurchaseActivation = true;
    try {

      if(this.testMode != account.testnet) {
        this.snackBar.open("To activate this address please change the XRP Ledger network XUMM is connected to!", null, {panelClass: 'snackbar-success', duration: 8000, horizontalPosition: 'center', verticalPosition: 'top'});
        return;
      }

      this.selectedVanityAddress = {
        address: account.vanityAddress,
        identifier: account.identifier
      }

      //check purchase!
      let paymentCheckResult = await this.xummService.validatePayment(account.buyPayloadId);

      //check successfull
      if(paymentCheckResult.account === account.buyerAccount && paymentCheckResult.account === this.originalAccountInfo?.Account && this.testMode === paymentCheckResult.testnet) {
        this.snackBar.open("Purchase checked successfully!", null, {panelClass: 'snackbar-success', duration: 5000, horizontalPosition: 'center', verticalPosition: 'top'});

        this.informationConfirmed = true;
        this.purchaseStarted = true;
        this.purchaseSuccess = true;

        this.openSearch = true;
        this.loadingData = true;

        setTimeout(() => {
          console.log("navigating...")
          this.loadingCheckForPurchaseActivation = false;
          //silly and dirty, but it does what I need!
          this.moveNext();
          this.moveNext();
          this.moveNext();
          this.loadingData = false;
        }, 500);
      } else {
        this.snackBar.open("Payment checked failed!", null, {panelClass: 'snackbar-failed', duration: 5000, horizontalPosition: 'center', verticalPosition: 'top'});
        this.loadingCheckForPurchaseActivation = false;
      }
    } catch(err) {

    }
  }

  async openImportGuide(account: PurchasedVanityAddresses) {
    this.loadingCheckForPurchaseActivation = true;
    try {
      this.selectedVanityAddress = {
        address: account.vanityAddress,
        identifier: account.identifier
      }

      this.informationConfirmed = true;
      this.purchaseStarted = true;
      this.purchaseSuccess = true;
      this.activationStarted = this.accountActivated = this.accountRekeyed = this.accountMasterKeyDisabled = true;

      this.openSearch = true;
      this.loadingData = true;

      setTimeout(() => {
        console.log("navigating...")
        this.loadingCheckForPurchaseActivation = false;
        //silly and dirty, but it does what I need!
        this.moveNext();
        this.moveNext();
        this.moveNext();
        this.moveNext();
        this.loadingData = false;
      }, 500);
    } catch(err) {
      //ignore?
    }
  }

  async activateVanityAddress() {
    this.loadingData = true;

    if(this.debugMode) {
      this.activationAmountSent = true;
      //this.errorActivation = true;
      //this.loadingData = false;
      //return;
      this.scrollToBottom();
      setTimeout(() => {
        this.accountActivated = true;
        this.scrollToBottom();
      },1000);

      setTimeout(() => {
        this.accountRekeyed = true;
        this.scrollToBottom();
      },2000);

      setTimeout(() => {
        this.accountMasterKeyDisabled = true;
        this.loadingData = false;
        this.scrollToBottom();
      },3000);

      return;
    }

    let genericBackendRequest:GenericBackendPostRequest = {
      options: {
        xrplAccount: this.originalAccountInfo.Account,
        pushDisabled: true
      },
      payload: {
        options: {
          forceAccount: true
        },
        txjson: {
          Account: this.originalAccountInfo.Account,
          TransactionType: "Payment",
          Memos : [{Memo: {MemoType: Buffer.from("Vanity-xApp-Memo", 'utf8').toString('hex').toUpperCase(), MemoData: Buffer.from("Activation of vanity address: "+this.selectedVanityAddress.address, 'utf8').toString('hex').toUpperCase()}}],
        },
        custom_meta: {
          instruction: "Please send with the account which is already selected.\n\nThis account will be able to sign transactions for " + this.selectedVanityAddress.address,
          blob: {
            vanityAddress: this.selectedVanityAddress,
            isActivation: true,
            regularKey: this.originalAccountInfo.Account
          }
        }
      }
    }

    try {
      let message:any = await this.waitForTransactionSigning(genericBackendRequest);

      if(message && message.payload_uuidv4) {
        this.activationStarted = true;

        let txInfo = await this.xummService.validatePayment(message.payload_uuidv4);
        //console.log('The generic dialog was closed: ' + JSON.stringify(info));

        //if(txInfo && txInfo.success && txInfo.account && txInfo.testnet == false) {
        if(txInfo && txInfo.success && txInfo.account && txInfo.testnet === this.testMode) {
          if(isValidXRPAddress(txInfo.account)) {
            this.activationAmountSent = true;

            //start interval timer to check account status
            this.intervalAccountStatus = setInterval(() => this.checkVanityAccountStatus(this.selectedVanityAddress.address), 1000);

            this.errorTimeout = setTimeout(() => {
              //something went wrong!
              if(!this.accountActivated || !this.accountRekeyed || !this.accountMasterKeyDisabled) {
                this.errorActivation = true;
                clearInterval(this.intervalAccountStatus);
                this.loadingData = false;
              }
            }, 45000)
          } else {
            this.activationAmountSent = false;
            this.loadingData = false;
          }
        } else {
          this.activationAmountSent = false;
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
          this.accountRekeyed = accountInfo && accountInfo.RegularKey != null;
          this.rekeyAccount = accountInfo && accountInfo.RegularKey;
          this.accountMasterKeyDisabled = accountInfo && accountInfo.Flags && flagutil.isMasterKeyDisabled(accountInfo.Flags);

          //scroll down because more elements are loaded
          this.scrollToBottom();

          if(this.accountActivated && this.accountRekeyed && this.accountMasterKeyDisabled) {

            this.stepper.selected.completed = true;
            this.stepper.selected.editable = false;
            
            clearInterval(this.intervalAccountStatus);
            clearTimeout(this.errorTimeout);

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

        let txInfo = await this.xummService.validatePayment(message.payload_uuidv4);
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

  isAllCheckboxesChecked(): boolean {
    return this.checkBoxPurchaseAmount && this.checkBoxActivation && this.checkBoxVanityAccReadOnly && this.checkBoxVanityAccAccess && this.checkBoxVanityPrivacy && this.checkBoxMasterKey;
  }

  copyAddress(address) {
    if(address) {
      clipboard(address);
      this.snackBar.dismiss();
      this.snackBar.open("Address " +address+ " copied to clipboard!", null, {panelClass: 'snackbar-success', duration: 3000, horizontalPosition: 'center', verticalPosition: 'bottom'});
    }
  }

  scrollToBottom() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
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
    this.scrollToTop();
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

  openFAQ() {
    if (typeof window.ReactNativeWebView !== 'undefined') {
      //this.infoLabel = "opening sign request";
      window.ReactNativeWebView.postMessage(JSON.stringify({
        command: "openBrowser",
        url: "https://support.xumm.app/hc/en-us/articles/4415447550610"
      }));
    }
  }

  openSupportApp() {
    if (typeof window.ReactNativeWebView !== 'undefined') {
      //this.infoLabel = "opening sign request";
      window.ReactNativeWebView.postMessage(JSON.stringify({
        command: "openBrowser",
        url: "https://xumm.app/detect/xapp:xumm.support?xAppSource=xumm.vanity"
      }));
    }
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
