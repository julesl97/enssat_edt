'use strict'
var socket = io();

var error = $(".error")[0];
var output = $(".output")[0];
var msg = $(".msg")[0];
var days = $(".calendar .days .day");
var date = $(".calendar .chosenDate")[0];
var filter = $(".calendar .filter")[0];
var modes = $(".selector input[name=mode]");
var displaySelec = $(".selector input[name=display]");
date.value = new Date().toJSON().slice(0,10);

var EDT={};  			//EDT sorted by week number
var rooms=[];			//list of rooms, updated at each change in database(on "update" received)
var descItems=[];	//list of all elements in all description

const nbSecSemaine = 1000*3600*24*7;

function nbWeek(d) { //nb of week between 1970-01-01 and the date given(in millisec)
  return Math.trunc((d+3*24*3600*1000)/nbSecSemaine);
}
function nbMilli(w) { //number of milliseconds elapsed during n weeks
  return w*nbSecSemaine-3*24*3600*1000;
}
function findMode(modes){ //search for which of the mode as been selected
  for(let mode of modes)
    if(mode.checked)
      return mode.id;
}
const frenchDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']; 

function updateFile(){
  socket.emit("updateFile");
} 
let emptyRooms = {};

function display(){
  let dateValue=new Date(date.value);
  let it = nbWeek(dateValue.getTime());
  let dayIt = new Date(nbMilli(it));
  for(let i=0; i<7; i++, dayIt.setDate(dayIt.getDate()+1))
    days[i].innerHTML = '<div class="title">'+frenchDays[i]+'<span>'+dayIt.getDate()+'</span></div>';

  if(!EDT.hasOwnProperty(it))
    EDT[it]=[];
  switch(findMode(modes)){
    case "cours":
      renderWeek(EDT[it]);
      break;
    case "salleVide":
      let weekByRooms={};
      EDT[it].forEach((e) => {
        e.location.split(/[,-]/).forEach((s) => {
          if(!weekByRooms.hasOwnProperty(s)) weekByRooms[s]=[e];
          else weekByRooms[s].push(e);
        });
      });
      emptyRooms=[];
      for(let r of rooms){
        //initialisation
        for(let i=0, time=nbMilli(it); i<7; i++, time+=24*3600*1000){
          let e={
            name:r,
            starttime:time+7*3600*1000,
            endtime:time+22*3600*1000,
            location:" ",
            description:" "
          };
          emptyRooms.push(e);
        }
        //splicing
        if(weekByRooms.hasOwnProperty(r))
          for(let e of weekByRooms[r]){
            let er;
            for(er of emptyRooms)
              if(er.starttime<e.starttime && e.starttime<er.endtime)
                break;
            let tmp=er.endtime;
            er.endtime=e.starttime;
            emptyRooms.push({
              name:r,
              starttime:e.endtime,
              endtime:tmp,
              location:" ",
              description:" "
            });
          }
      }
      renderWeek(Object.values(emptyRooms));
      break;
    default:
      alert("mode '"+findMode(modes)+"' unknown");
  }
}

function showDisplay(){

}

function renderWeek(week){
  console.log(week);
  for(let e of week){
    if(e.name.match(filter.value) || e.location.match(filter.value) || e.description.match(filter.value)){
      let sdate = new Date(e.starttime);
      let edate = new Date(e.endtime);
      let shour = sdate.getHours()+sdate.getMinutes()/60;
      let ehour = edate.getHours()+edate.getMinutes()/60;
      if(ehour-shour > 24)
        error.innerHTML += "Les événements d'une durée supérieur a 24h ne sont pas traité ("+e.name+')';
      let out = '<div class=event style="top:'+
        (50+(shour-8)*50)+'px; height:'+
        ((ehour-shour)*50)+'px">';
      out += '<span class=name>'+e.name+'</span>\n';
      out += '<span class=time>'+sdate.getHours()+'h'+sdate.getMinutes()+' - '+edate.getHours()+'h'+edate.getMinutes()+'</span>\n';
      out += '<span class=location>'+e.location+'</span>\n';
      out += '<span class=description>'+e.description+'</span>\n';
      out += '</div>\n';
      days[(sdate.getDay()+6)%7].innerHTML +=out; //(day+6)%7 map respectively 0,1,2,3,5,6 to 6,0,1,2,3,4,5  for sunday 
    }
  }
}



socket.on('update', (data) => {
  console.log("packet update recu ("+data.length+"octets)");
  data = JSON.parse(data);
  data.forEach((e) => {
    e.location.split(/[,-]/).forEach((s) => {
      if(rooms.indexOf(s) == -1)rooms.push(s);
		});
	});
	data.forEach((e)=>{
		e.description.split("\n").forEach((s)=>{
			if(!descItems.includes(s))
				descItems.push(s);
		});
	});
	descItems.sort();

  for(let e of data){
    let it = nbWeek(e.starttime);
    if(EDT.hasOwnProperty(it))
      EDT[it].push(e);
    else
      EDT[it] = [e];
  }
  display();
});

socket.on('error', (data) => {
  alert("packet error recu ! pourquoi ?");
  console.log("packet error recu ("+data.length+"octets)");
  error.innerHTML += data+'<br>';
});
socket.on('errormsg', (data) => {
  console.log("packet errormsg recu ("+data.length+"octets)");
  error.innerHTML += data+'<br>';
});
