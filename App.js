const { Client} = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const express = require('express');
const { body, validationResult } = require('express-validator');
const { response } = require('express');
const {phoneNumberFormatter} = require('./wanumberformatter.js');

const port = 8000;
const app = express();

app.use(express.json());
app.use(express.urlencoded({
    extended:true
}));

const SESSION_FILE_PATH = './session.json';

//load the session data if it has been previously saved
let sessionData;
let data;
if(fs.existsSync(SESSION_FILE_PATH)){
    var checkfile = JSON.parse(fs.readFileSync(SESSION_FILE_PATH))
    if(Object.entries(checkfile).length === 0){
        console.log("WA Session doesn't exist");
        data = 0;
    }else{
        sessionData = require(SESSION_FILE_PATH);
        data = 1;
    }
    
}

//use the saved values
const client = new Client({
    restartOnAuthFail: true,
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // <- this one doesn't works in Windows
        '--disable-gpu'
      ],
    },
    session: sessionData
  });

  client.initialize();

if(data === 0){
    client.on('qr', async(qr) => {
        // Generate and scan this code with your phone
        console.log('QR RECEIVED', qr);
        qrcode.generate(qr,{small:true});
    });
}
client.on('ready', () => {
    console.log('Client is ready!');
});

//saved session value to the file upon successful auth
client.on('authenticated',async(session)=>{
    sessionData = session;
    fs.writeFile(SESSION_FILE_PATH,JSON.stringify(session),(err)=>{
        if(err) console.error(err);
    })
})

// client.on('auth_failure', () =>{
//     console.log('Auth failed');
//     sessionData = "";
//     process.exit();
//   });


////message
const checkRegisteredNumber = async function(number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
  }

app.post('/send-message',[
    body('number').notEmpty(),
    body('message').notEmpty(),
],async(req,res) => {
    const errors = validationResult(req).formatWith(({
        msg
    })=>{
        return msg
    });
    if(!errors.isEmpty()){
        return res.status(422).json({
            status: false,
            message: errors
        });
    }
    const number = phoneNumberFormatter(req.body.number);
    const message = req.body.message;
    const isRegisterdNumber = await checkRegisteredNumber(number);

    if(!isRegisterdNumber){
        return res.status(422).json({
            status: false,
            message: 'the number is not registered'
        });
    }

    client.sendMessage(number,message).then(response => {
        res.status(200).json({
            status:true,
            response: response
        });
    }).catch(err =>{
        res.status(500).json({
            status: false,
            response: err
        });
    });
});

app.listen(port,()=> console.log('runnin on ',port));