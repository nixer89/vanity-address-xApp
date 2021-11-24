import { XummTypes } from 'xumm-sdk';

export interface GenericBackendPostRequestOptions {
    frontendId?: string,
    web?: boolean,
    pushDisabled?: boolean,
    referer?: string,
    xrplAccount?: string,
    signinToValidate?: boolean,
    issuing?: boolean,
    isRawTrx?: boolean
}

export interface GenericBackendPostRequest {
    options?: GenericBackendPostRequestOptions,
    payload: XummTypes.XummPostPayloadBodyJson
}

export interface TransactionValidation {
    success: boolean,
    testnet: boolean,
    txid?: string,
    error?: boolean,
    message?: string,
    payloadExpired?: boolean,
    noValidationTimeFrame?: boolean,
    redirect?: boolean,
    account?: string,
    payloadId?: string
}

export interface VanitySearchResult {
    address:string,
    identifier:string
}

export interface VanitySearchRequest {
    search: string
}

export interface VanitySearchResponse {
    query: string,
    testnet: boolean,
    results: VanitySearchResult[]
}

export interface VanityReserveRequest {
    prospect: string,
    identifier: string
}

export interface VanityReserveResponse {
    reserved: string,
    testnet: boolean
}

export interface VanityPurchaseRequest {
    address: string,
    identifier: string,
    regularKey: string
}