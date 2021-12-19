/*
 * not finished -> captcha issues
 */

import { AzureFunction, Context } from "@azure/functions"

const activityFunction: AzureFunction = async function (context: Context, parameter): Promise<string> {
    let serialNumber = parameter.serialNumber

    // query wssid
    let hpResponse = await fetch('https://support.hp.com/us-en/checkwarranty/multipleproducts/');
    let hpResponseText = await hpResponse.text();
    //context.log(hpResponseText);
    context.log(hpResponse)
    let wssid = (hpResponseText.match('.*mwsid":"(?<wssid>.*)".*')).groups.wssid
    //context.log(wssid)

    // query warranty
    let hpBody = {
        "gRecaptchaResponse": "",
        "obligationServiceRequests": [
            {
                "serialNumber": serialNumber,
                "isoCountryCde": "US",
                "lc": "EN",
                "cc": "US",
                "modelNumber`": null
            }
        ],
    }

    let queryUrl = "https://support.hp.com/hp-pps-services/os/multiWarranty?ssid=" + wssid
    let hpWarrantyReponse = await fetch(queryUrl, {
        body: JSON.stringify(hpBody),
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
    })
    let hpWarrantyReponseJson = await hpWarrantyReponse.text()
    context.log(hpWarrantyReponseJson)
    
    return `Hello ${context.bindings.name}!`;
};

export default activityFunction;
