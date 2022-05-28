//https://nodejs.org/api/crypto.html
//https://docs.microsoft.com/en-us/azure/azure-monitor/platform/data-collector-api
//https://stackoverflow.com/questions/44532530/encoding-encrypting-the-azure-log-analytics-authorization-header-in-node-js
const crypto = require('crypto')
const util = require('util')

const pushToLogAnalytics = async (content, { id, key, rfc1123date, LogType }) => {
    // return { id, key, rfc1123date, LogType }

    try {
        //Checking if the data can be parsed as JSON
        if (JSON.parse(JSON.stringify(content))) {

            var length = Buffer.byteLength(JSON.stringify(content), 'utf8')
            var binaryKey = Buffer.from(key, 'base64')
            var stringToSign = 'POST\n' + length + '\napplication/json\nx-ms-date:' + rfc1123date + '\n/api/logs';
            //console.log(stringToSign)

            var hash = crypto.createHmac('sha256', binaryKey)
                .update(stringToSign, 'utf8')
                .digest('base64')
            var authorization = "SharedKey " + id + ":" + hash

            const uri = "https://" + id + ".ods.opinsights.azure.com/api/logs?api-version=2016-04-01"

            const headers = new Headers()
            headers.append('Content-Type', 'application/json')
            headers.append('Authorization', authorization)
            headers.append('Log-Type', LogType)
            headers.append('x-ms-date', rfc1123date)
            headers.append('time-generated-field', 'DateValue')

            let response = await fetch(uri, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(content)
            })
            return response
        }
        //Catch error if data cant be parsed as JSON
    } catch (err) {
        return ("Not data sent to LA: " + err)
    }

}
export { pushToLogAnalytics }