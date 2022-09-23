import { Injectable } from '@angular/core';
import { AppService } from './app.service';
import { XummTypes } from 'xumm-sdk';
import { GenericBackendPostRequest, PurchasedVanityAddresses, TransactionValidation, VanityReserveResponse, VanitySearchResponse } from '../utils/types';

@Injectable()
export class XummService {
    constructor(private app: AppService) {}

    isTestMode = false;
    xummBackendURL = this.isTestMode ? 'http://localhost:4001' : 'https://api.xrpl-address.com';

    async submitPayload(payload:GenericBackendPostRequest): Promise<XummTypes.XummPostPayloadResponse> {
        try {
            console.log("submitting payload: " + JSON.stringify(payload));
            return this.app.post(this.xummBackendURL+"/api/v1/platform/payload", payload);
        } catch(err) {
            //console.log("error: ");
            console.log(JSON.stringify(err))
            return null;
        }
    }

    async getxAppOTTData(token: string): Promise<any> {
        try {
            return this.app.get(this.xummBackendURL+"/api/v1/platform/xapp/ott/" + token);
        } catch(err) {
            console.log(JSON.stringify(err))
            return { error: true, success: false, testnet:false }
        }
    }

    async sendxAppEvent(data: any): Promise<any> {
        try {
            return this.app.post(this.xummBackendURL+"/api/v1/platform/xapp/event", data);
        } catch(err) {
            console.log(JSON.stringify(err))
            return { error: true, success: false, testnet:false }
        }
    }

    async sendxAppPush(data: any): Promise<any> {
        try {
            return this.app.post(this.xummBackendURL+"/api/v1/platform/xapp/push", data);
        } catch(err) {
            console.log(JSON.stringify(err))
            return { error: true, success: false, testnet:false }
        }
    }

    async checkSignIn(payloadId:string): Promise<TransactionValidation> {
        try {
            return this.app.get(this.xummBackendURL+"/api/v1/check/signin/"+payloadId);
        } catch(err) {
            console.log(JSON.stringify(err))
            return { error: true, success: false, testnet:false }
        }
    }

    async validatePayment(payloadId:string): Promise<TransactionValidation> {
        try {
            return this.app.get(this.xummBackendURL+"/api/v1/check/payment/"+payloadId);
        } catch(err) {
            console.log(JSON.stringify(err))
            return { error: true, success: false, testnet:false }
        }
    }

    async searchVanityAddress(searchString: string, testnet: boolean, prospect: string): Promise<VanitySearchResponse> {
        try {
            return this.app.post(this.xummBackendURL+"/api/v1/vanity/search", {searchWord: searchString, testnet: testnet, prospect: prospect});
        } catch(err) {
            console.log(JSON.stringify(err))
            return null;
        }
    }
    
    async reserveVanityAddress(prospect: string, identifier:string, testnet: boolean): Promise<VanityReserveResponse> {
        try {
            return this.app.post(this.xummBackendURL+"/api/v1/vanity/reserve", {prospect: prospect, identifier: identifier, testnet: testnet});
        } catch(err) {
            console.log(JSON.stringify(err))
            return null;
        }
    }

    async getPurchases(account: string): Promise<PurchasedVanityAddresses[]> {
        try {
            return this.app.post(this.xummBackendURL+"/api/v1/vanity/purchases", {account: account});
        } catch(err) {
            console.log(JSON.stringify(err))
            return null;
        }
    }

    async getFixAmounts(): Promise<any> {
        try {
            return this.app.get(this.xummBackendURL+"/api/v1/payment/amounts");
        } catch(err) {
            console.log(JSON.stringify(err))
            return [];
        }
    }

    async convertToXrp(amountUsd: number): Promise<any> {
        try {
            return this.app.post(this.xummBackendURL+"/api/v1/vanity/xrpvalue", {amount: amountUsd});
        } catch(err) {
            console.log(JSON.stringify(err))
            return [];
        }
    }
}