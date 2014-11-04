'use strict';

/**
 * module imports
 */
var SMB2 = require('smb2'),
    program = require('commander'),
    async = require('async'),
    ProgressBar = require('progress');


/**
 * variables
 */
var smbConfig = {},
    writeData = "I will not do bad things",
    progressBar = new ProgressBar('Progress [:bar] :percent', {width: 20, total: 100}),
    startTime, //the time that the traffic generation start
    endTime, //the time to end the traffic generation
    lastTick,
    currentTick,
    smb2Client; //the client that is re-used for reads and writes

program
    .version('0.0.0')
    .option('-s, --share <share>', 'share')
    .option('-d, --shareDomain <shareDomain>', 'shareDomain')
    .option('-u, --username <username>', 'username')
    .option('-p, --password <password>', 'password')
    .option('-o, --octets <octets> of the files to transfer', 'octets', 2048000)//default octets
    .option('-t, --time <time> the amount of time to generate traffic in ms', 'time', 600000)
    .parse(process.argv);

//check the parameters
if (typeof program.share !== "string" || typeof program.shareDomain !== "string" || typeof program.username !== "string" || typeof program.password !== "string") {
    console.log("Incorrect parameters");
    program.help();
}
else{
    //the parameters are correct
    console.log('\nInitializing SMB client');
    console.log('Share: %s', program.share);
    console.log('Domain: %s', program.shareDomain);
    console.log('Username: %s', program.username);
    console.log('Password: %s \n', program.password);

    //initialize the smb share config
    smbConfig = {
     share: program.share,
     domain: program.shareDomain,
     username: program.username,
     password: program.password
     };
    //create an smb client instance
    smb2Client = new SMB2(smbConfig);

    console.log('Generating traffic for %d ms \n', program.time);
    //start the progress bar
    progressBar.tick(0);
    //calculate the start and end time
    startTime = new Date().getTime();
    endTime = startTime + program.time;

    //initialize the ticks
    lastTick = startTime;

    var generateTrafficCallback = function(error, result){
        lastTick = currentTick;
        currentTick = new Date().getTime();
        progressBar.tick(Math.ceil(100 * (currentTick - lastTick)/program.time));
        if(!progressBar.complete){
            generateTraffic(smb2Client, generateTrafficCallback);
        }
        else{
            console.log("\nTraffic generation complete\n");
            smb2Client.close();
        }
    };
    generateTraffic(smb2Client, generateTrafficCallback);
}

function generateTraffic(smb2Client, generateTrafficCallback){
    //create a buffer for writing
    var buffer = new Buffer(program.octets);
    for(var i = 0; i < program.octets/writeData.length; i++){
        buffer.write(writeData, i * writeData.length);
    }

    async.waterfall(
        [
            function(callback){
                smb2Client.writeFile('cifs_data.txt', buffer, function (err) {
                    callback(err, null)
                });
            },
            function(error, callback){
                smb2Client.readFile('cifs_data.txt', {encoding: 'utf8'},function (err, data) {
                    if (err) throw err;
                    callback(err, null);
                });
            }
        ], function(error, result){
            if(error){
                console.log("An error occurred while generating traffic: " + error)
            }
            generateTrafficCallback(error, result)
        });
}

