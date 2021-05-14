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

const activityFunction: AzureFunction = async function (context: Context, deviceListGraph): Promise<string> {
    console.log("ACT3000AzureDataCollectHandleDevice", "Start Device handeling");
    let Device = mongoose.model('Device');
       
    // check for new devices
    for (var i = 0; i < deviceListGraph.length; i++) {
        const graphDeviceId = deviceListGraph[i].id;
        //console.log(graphDeviceId);
        
        await Device.find({ deviceId: graphDeviceId }, function (err, devices) {
            // if id does not exist in db, we found a new device
            if (devices.length == 0) {
                console.log("found new device " + graphDeviceId);

                // create new device element
                Device.create({
                    deviceName: deviceListGraph[i].deviceName,
                    deviceId: graphDeviceId
                }, function (err, newDevice) {
                    if (err) console.log(err);
                    else console.log(newDevice);
                });
            } else {
                console.log("device " + graphDeviceId + " already exists in table");
            }
        });
    }
    return; 
};

export default activityFunction;