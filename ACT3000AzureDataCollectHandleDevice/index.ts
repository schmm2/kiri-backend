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
var mongoose = require('mongoose');
const crypto = require('crypto')

const activityFunction: AzureFunction = async function (context: Context, deviceListGraph): Promise<string> {
    console.log("ACT3000AzureDataCollectHandleDevice", "Start Device handeling");
    let Device = mongoose.model('Device');

    // check for new devices
    for (var i = 0; i < deviceListGraph.length; i++) {
        const graphDeviceId = deviceListGraph[i].id;
        //console.log(graphDeviceId);

        let devices = await Device.find({ deviceId: graphDeviceId });
        // console.log(devices);

        if (devices.length == 0) {
            console.log("found new device " + graphDeviceId);

            // find manufacturer
            let manufacturer = "";
            if (deviceListGraph[i].manufacturer) {
                manufacturer = deviceListGraph[i].manufacturer;
            }

            // version 
            let deviceValueVersion = crypto.createHash('md5').update(JSON.stringify(deviceListGraph[i])).digest("hex");

            // create new device element
            Device.create({
                deviceId: graphDeviceId,
                value: JSON.stringify(deviceListGraph[i]),
                manufacturer: manufacturer,
                version: deviceValueVersion
            }, function (err, newDevice) {
                if (err) console.log(err);
                else console.log(newDevice);
            });
        } else {
            console.log("device " + graphDeviceId + " already exists in table");
        }
    }
    return;
}

export default activityFunction;