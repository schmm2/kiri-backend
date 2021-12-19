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
import { DeviceVersion } from "../models/deviceversion";

const activityFunction: AzureFunction = async function (context: Context, deviceIds): Promise<any> {
    let newestDeviceVersions = []

    // get all devices by ids
    let devices = await Device.find().where('_id').in(deviceIds).exec();

    // get newest DeviceVersion per Device
    if (devices.length > 0) {
        for (let d = 0; d < devices.length; d++) {
            const device = devices[d]

            let deviceVersions = await DeviceVersion.find({ successorVersion: null, device: device._id })
            // context.log(configurationVersions)

            if (deviceVersions.length == 1) {
                // context.log(deviceVersions[0])
                newestDeviceVersions.push(deviceVersions[0])
            }
        }
    }
    return newestDeviceVersions
};

export default activityFunction;
