/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 * Before running this sample, please:
 * - create a Durable orchestration function
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *   function app in Kudu
 */

import { AzureFunction, Context } from "@azure/functions"
import * as moment from "moment"
import { DeviceWarranty } from '../models/deviceWarranty'
import { Device } from '../models/device'

const activityFunction: AzureFunction = async function (context: Context, parameter): Promise<string> {
    let warrentyObject = null
    let serialNumber = parameter.serialNumber
    let now = new Date();
    let today = moment(now).format('YYYY-MM-DD');
    let apiUrl = "https://warrantyapiproxy.azurewebsites.net/api/Lenovo?Serial=" + serialNumber

    let response = await fetch(apiUrl, { method: 'Get' })
    let responseJson = await response.json();
    //context.log(responseJson)

    if (responseJson.WarProduct) {
        //let warlatest = responseJson.EndDate ForEach-Object { [datetime]$_ } | sort-object | select-object -last 1 

        warrentyObject = {
            'serialNumber': responseJson.Serial,
            'productName': responseJson.WarProduct,
            'startDate': responseJson.StartDate,
            'endDate': responseJson.EndDate,
            'device': parameter.deviceDbId
        }
    }
    context.log(warrentyObject)
    return warrentyObject
};

export default activityFunction;
