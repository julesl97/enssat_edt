var {spawn} = require('child_process');
var ical = require('ical.js');
var fs = require('fs');

const PUBLIC = 'public/';
const FILE_NAME_EDT = 'EDT.ics';

// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 45678;

server.listen(port,  () => {
  log('Server listening at port '+port);
});

var EDT;
var EDTstringify="default";
var salles;
var profs;
var lastUpdate=new Date().setYear(0);

// Routing
app.use(express.static(__dirname + '/' + PUBLIC));

parseIcsFile(FILE_NAME_EDT);

io.on('connection', (socket) => {
  log("connection from "+socket.handshake.address);
  socket.emit('update', EDTstringify);
  socket.on('updateFile', (data) => {
    if(Date.now() - lastUpdate > 300000){ //5min
      lastUpdate=Date.now();
      updateFile(socket);
    }else{
      socket.emit("errormsg", "update déjà effectué il y a moins de 5min");
      log("errormsg : update déjà effectué il y a moins de 5min");
    }
  });
});

function updateFile(socket){
  if(true){
    var wget = spawn('wget', ['-q','-i',PUBLIC+'addr.txt','-O',PUBLIC+FILE_NAME_EDT]);
    wget.stdout.on('data', (data) => console.stdout.write(data.toString()));
    wget.stderr.on('data', (data) => console.error(data.toString()));
    wget.on('exit', (code) => {
      if(code == 0){
        log("téléchargement réussi");
        parseIcsFile(FILE_NAME_EDT);
        socket.broadcast.emit("update",EDTstringify);
        log('update send to all connected');
      }else{
        log("(code="+code+") ERREUR lors du téléchargement =============================");
        socket.emit("errormsg", "téléchargement impossible depuis l'ENT");
      }
    });
  }else{
    log("téléchargement non activer");
    parseIcsFile(FILE_NAME_EDT);
    socket.broadcast.emit("update",EDTstringify);
    log('update send to all connected (not really updated)');
    socket.emit("errormsg", "téléchargement non activer (maintenance)");
    log("errormsg : téléchargement non activer (maintenance)");
  }
}

function parseIcsFile(fileName){
  log("parsing file ....");
  var data=fs.readFileSync(PUBLIC+fileName);
  data=data.toString();
  //console.log(data);
  var jcal = ical.parse(data);
  var vcal = new ical.Component(jcal);
  var vevents = vcal.getAllSubcomponents("vevent");
  log("parsing file .... (ical done)");
  EDT = vevents.map((vevent) => {
    return {
      name: vevent.getFirstPropertyValue("summary"),
      starttime: parseVEVENTdate(vevent.getFirstPropertyValue("dtstart").toString()),
      endtime: parseVEVENTdate(vevent.getFirstPropertyValue("dtend").toString()),
      description: vevent.getFirstPropertyValue("description"),
      location: vevent.getFirstPropertyValue("location")
    };
  });
  //console.log(EDT);
  log("parsing complete");
  log("stringifying database ....");
  EDTstringify=JSON.stringify(EDT);
  log("stringifying complete");
}

function parseVEVENTdate(str){
  return Date.parse(str.replace(/^([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2})([0-9]{2})([0-9]{2})Z$/, "$1-$2-$3 $4:$5:$6"));
}

function log(s){
  console.log("["+new Date().toISOString().replace(/T/,' ').replace(/\..+/,'')+"]"+s);
}
