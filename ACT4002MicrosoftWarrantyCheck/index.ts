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
const cryptoModule = require('crypto')
const base64Arraybuffer = require('base64-arraybuffer')
import * as base64 from "byte-base64";
const NodeRSA = require('node-rsa');

var getBytes = function (string) {
    var utf8 = unescape(encodeURIComponent(string));
    var arr = [];

    for (var i = 0; i < utf8.length; i++) {
        arr.push(utf8.charCodeAt(i));
    }

    console.log('Array ', arr);

    return arr;
}

function toBuffer(ab) {
    const buf = Buffer.alloc(ab.byteLength);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
}


const activityFunction: AzureFunction = async function (context: Context, parameter): Promise<any> {
    let warrentyObject = null
    let serialNumber = parameter.serialNumber
    let now = new Date();

    let body = {
        SerialNumber: "004327510957",
        ForceRefresh: false,
        sku: "Surface_"
    }

    let publicKeyReponse = await fetch('https://surfacewarrantyservice.azurewebsites.net/api/key', { method: 'GET' });
    let publicKey = await publicKeyReponse.text();
    context.log(publicKey)

    /*const encryptedData = cryptoModule.publicEncrypt(
        {
            key: publicKey,
            padding: cryptoModule.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        },
        // We convert the data string to a buffer using `Buffer.from`
        Buffer.from(body.toString())
    );*/

    const encryptionType = 'aes-256-cbc';
    const encryptionEncoding = 'base64';
    const bufferEncryption = 'utf-8';

    // Defining key, returns Buffer
    const key = cryptoModule.randomBytes(32);
    const iv = cryptoModule.randomBytes(16);

    const aesKeyString = key.toString('base64');
    const aesIVString = iv.toString('base64');

    const keyPairBase64 = Buffer.from(getBytes(aesIVString + "," + aesKeyString)).toString('base64')
    //context.log(aesIVString)
    //context.log(aesKeyString)
    //context.log(keyPairBase64)

    // value
   
   
    // build cipher
    const cipher = cryptoModule.createCipheriv(encryptionType, Buffer.from(key), iv);
    let encrypted = cipher.update( Buffer.from(JSON.stringify(body), 'utf8'));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    let encryptedBase64 = encrypted.toString('base64')
    context.log(encrypted)
    context.log(encryptedBase64)

    /*context.log(encrypted);
    context.log(cipher);
    context.log(aesKeyString)
    context.log(aesIVString)*/

    // encrypt Keys
    let publicKeyBytes = base64.base64ToBytes(publicKey)
    let keyPairBytes = base64.base64ToBytes(keyPairBase64);
    context.log(publicKeyBytes)

    //let test = toBuffer(base64Arraybuffer.decode(publicKey))
    //context.log(test);
    //context.log(publicKeyBytes);

    /*var prefix = '-----BEGIN PUBLIC KEY-----\n';
    var postfix = '-----END PUBLIC KEY-----';
    var pemText = prefix + publicKey + '\n' + postfix;*/
    //context.log(pemText)
    //context.log(publicKey)

    //var public2="-----BEGIN PUBLIC KEY-----\n"+publicKey+"\n"+"-----END PUBLIC KEY-----";
    const keyNew = new NodeRSA(publicKeyBytes, "pkcs8-public-pem");
    //context.log(keyNew);

    context.log(getBytes("HELLO"))
    
    const encryptedKey = keyNew.encrypt(keyPairBytes, 'base64');
    context.log(encryptedKey)
    
    //return
    /*
    var utf8encoded = Buffer.from(publicKey, 'base64').toString('utf8');
        context.log(utf8encoded);
    const encryptedKeys = cryptoModule.publicEncrypt(
        utf8encoded,
        keyPairBytes
    );*/

    /*$AesCSP = New - Object System.Security.Cryptography.AesCryptoServiceProvider
    $AesCSP.GenerateIV()
    $AesCSP.GenerateKey()
    $AESIVString = [System.Convert]:: ToBase64String($AesCSP.IV)
    $AESKeyString = [System.Convert]:: ToBase64String($AesCSP.Key)
    $AesKeyPair = [System.Convert]:: ToBase64String([System.Text.Encoding]:: UTF8.GetBytes("$AESIVString,$AESKeyString"))
    $bodybytes = [System.Text.Encoding]:: UTF8.GetBytes($body)
    $bodyenc = [System.Convert]:: ToBase64String($AesCSP.CreateEncryptor().TransformFinalBlock($bodybytes, 0, $bodybytes.Length))
    $RSA = New - Object System.Security.Cryptography.RSACryptoServiceProvider
    $RSA.ImportCspBlob([System.Convert]:: FromBase64String($PublicKey))
    $EncKey = [System.Convert]:: ToBase64String($rsa.Encrypt([System.Text.Encoding]:: UTF8.GetBytes($AesKeyPair), $false))
 */


    let fullBody = {
        Data: encryptedBase64,
        Key: encryptedKey
    }

    context.log(fullBody)
    let warReq = await fetch("https://surfacewarrantyservice.azurewebsites.net/api/v2/warranty", {
        method: 'POST',
        body: JSON.stringify(fullBody),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    context.log(warReq)
    //context.log(await warReq.text())
    //context.log(await warReq.json())
};

export default activityFunction;
