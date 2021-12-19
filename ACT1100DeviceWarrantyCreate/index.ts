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
import { Device } from "../models/device";
import { DeviceWarranty } from "../models/devicewarranty"

const activityFunction: AzureFunction = async function (context: Context, deviceWarranty): Promise<any> {
    // create deviceWarranty
    let createdDeviceWarranty = await DeviceWarranty.create(deviceWarranty);

    // update device
    if (createdDeviceWarranty._id) {
        let updatedDevice = await Device.findOneAndUpdate(
            { _id: deviceWarranty.device },
            { deviceWarranty: createdDeviceWarranty._id }
        );
    }
};

export default activityFunction;
