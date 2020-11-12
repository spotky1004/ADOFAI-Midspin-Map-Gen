var loadedMap, outputMap;
var twirl = 0;
var progress = [0, 0];

//process file
function loadFile() {
  var input = document.createElement("input");
  input.type = "file";
  input.accept = ".txt, .json, .adofai";
  input.onchange = function (event) {
    processFile(event.target.files[0]);
  };
  input.click();
}
function processFile(file) {
  var reader = new FileReader();
  reader.onload = function () {
    loadedMap = reader.result.toString();
    try {
      makeMidspin();
    } catch (e) {
      console.log(e);
    }
  };
  reader.readAsText(file, /* optional */ "euc-kr");
}

//make midspin
async function makeMidspin() {
  //set vars
  var totDeg = 0;
  var floorThis = 0;
  twirl = 0;
  loadedMap = ADOFAI.Import(loadedMap);
  loadedMap.actions = loadedMap.actions.sort((a, b) => a.floor - b.floor);
  progress[0] = 0;
  progress[1] = loadedMap.pathData.length*2;
  //loadedMap.actions = ActionSort(loadedMap.actions);

  //init map
  outputMap = new ADOFAI();
  outputMap.pathData = [];
  outputMap.settings.bpm = loadedMap.settings.bpm;
  outputMap.settings.songFilename = loadedMap.settings.songFilename;
  outputMap.settings.hitsound = loadedMap.settings.hitsound;
  outputMap.settings.hitsoundVolume = loadedMap.settings.hitsoundVolume;
  outputMap.settings.song = loadedMap.settings.song;
  outputMap.settings.author = loadedMap.settings.author;
  outputMap.settings.artist = loadedMap.settings.artist;
  outputMap.settings.offset = loadedMap.settings.offset;
  outputMap.settings.backgroundColor = loadedMap.settings.backgroundColor;
  outputMap.settings.trackColor = loadedMap.settings.trackColor;
  /*outputMap.settings.backgroundColor = '000000';
  outputMap.settings.trackColor = 'debb7b';*/
  outputMap.settings.beatsAhead = '1';
  outputMap.settings.beatsBehind = '0.2';
  outputMap.settings.trackAnimation = "Extend";
  outputMap.settings.trackDisappearAnimation = "Shrink";

  outputMap.settings.pitch = 1;
  outputMap.settings.hitsoundVolume = 1;
  outputMap.settings.unscaledSize = 1;
  outputMap.settings.volume = 1;
  outputMap.settings.zoom = 1;
  /*outputMap.settings = JSON.parse(JSON.stringify(loadedMap.settings));
  outputMap.settings.beatsAhead = '1.6';
  outputMap.settings.beatsBehind = '0.4';
  outputMap.settings.trackAnimation = "Extend";
  outputMap.settings.trackDisappearAnimation = "Shrink";*/

  //generate map - pathData
  var pathOff = 0;
  var actionPointer = 0;
  var pathThis = 'R';
  while (loadedMap.actions[actionPointer].floor == 0) {
    actionPointer++;
  }
  for (var i = 0; i < loadedMap.pathData.length; i++) {
    await timer(1);
    if (loadedMap.pathData[i].code == '!') {
      pathOff = 1;
      continue;
    }
    loop1:
    if (actionPointer < loadedMap.actions.length) {
      loop2:
      while (loadedMap.actions[actionPointer].floor == (i+1)) {
        if (loadedMap.actions[actionPointer].eventType == 'Twirl') {
          twirl ^= 1;
        }
        actionPointer++;
        if (actionPointer >= loadedMap.actions.length) {
          break loop1;
        }
      }
    }
    pathThis = loadedMap.pathData[i].code;
    if (i != 0) {
      if (!pathOff) {
        var dn = loadedMap.pathData[i].absoluteAngle;
      } else {
        var dn = (loadedMap.pathData[i].absoluteAngle+180)%360;
      }
      totDeg += getDeg(loadedMap.pathData[i-1-pathOff].absoluteAngle, dn);
      //console.log(`${i}: ${getDeg(loadedMap.pathData[i-1-pathOff].absoluteAngle, dn)}`);
    } else {
      totDeg += loadedMap.pathData[i].absoluteAngle;
    }
    var degToPush = (totDeg%360 == 0) ? 360 : totDeg%360;
    var pathIdx = findIndex(ADOFAI.PathData.ABSOLUTE_ANGLE_LIST, degToPush);
    outputMap.pathData.push(new ADOFAI.PathData(ADOFAI.PathData.ABSOLUTE_ANGLE_LIST[pathIdx]));
    outputMap.pathData.push(new ADOFAI.PathData('!'));
    pathOff = 0;
    progress[0]++;
    await displayProgress();
  }
  //generate map - Actions
  var floorNow = 0;
  var actionPointer = 0;
  var outActionPointer = 0;
  loop1:
  for (var i = 0; i < loadedMap.pathData.length; i++) {
    await timer(1);
    floorNow += 2;
    if (loadedMap.pathData[i].code == '!') {
      floorNow -= 2;
    }
    if (actionPointer >= loadedMap.actions.length) {
      progress[0] = progress[1];
      break;
    }
    loop2:
    while (loadedMap.actions[actionPointer].floor == i) {
      //setSpeed
      switch (loadedMap.actions[actionPointer].eventType) {
        case 'SetSpeed':
        outputMap.actions.push(new ADOFAI.Action((floorNow-3), 'SetSpeed'));
        if (loadedMap.actions[actionPointer].eventValue.speedType == 'Bpm') {
          outputMap.actions[outActionPointer].eventValue.isSpeedTypeBPM = loadedMap.actions[actionPointer].eventValue.speedType;
        } else {
          outputMap.actions[outActionPointer].eventValue.speedType = loadedMap.actions[actionPointer].eventValue.speedType;
        }
        outputMap.actions[outActionPointer].eventValue.BPM = loadedMap.actions[actionPointer].eventValue.beatsPerMinute;
        outputMap.actions[outActionPointer].eventValue.BPM_Multiplier = loadedMap.actions[actionPointer].eventValue.bpmMultiplier;
        outActionPointer++;
          break;
        case 'ColorTrack':
        outputMap.actions.push(new ADOFAI.Action((floorNow-3), 'ColorTrack'));
        outputMap.actions[outActionPointer].eventValue.secondaryTrackColor = loadedMap.actions[actionPointer].eventValue.secondaryTrackColor;
        outputMap.actions[outActionPointer].eventValue.trackColor = loadedMap.actions[actionPointer].eventValue.trackColor;
        outputMap.actions[outActionPointer].eventValue.trackColorAnimDuration = loadedMap.actions[actionPointer].eventValue.trackColorAnimDuration;
        outputMap.actions[outActionPointer].eventValue.trackColorPulse = loadedMap.actions[actionPointer].eventValue.trackColorPulse;
        outputMap.actions[outActionPointer].eventValue.trackColorType = loadedMap.actions[actionPointer].eventValue.trackColorType;
        outputMap.actions[outActionPointer].eventValue.trackPulseLength = loadedMap.actions[actionPointer].eventValue.trackPulseLength;
        outputMap.actions[outActionPointer].eventValue.trackStyle = loadedMap.actions[actionPointer].eventValue.trackStyle;
        outActionPointer++;
          break;
      }
      //next loop
      actionPointer++;
      if (actionPointer >= loadedMap.actions.length) {
        progress[0] = progress[1];
        break loop1;
      }
    }
    progress[0]++;
    await displayProgress();
  }

  //return map
  document.getElementById('outputArea').innerHTML = outputMap.Export().replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
}

//adofai functions
function displayProgress() {
  document.getElementById('outputArea').innerHTML = `[${progress[0]}/${progress[1]}] ${(progress[0]/progress[1]*100).toFixed(2)}%`;
}
function ActionSort(arr) {
  arr = arr.sort((a, b)=>a.floor-b.floor);
  for (var i = 0; i < arr.length; i++) {
    // 이름 정렬
    var filtered = arr.filter(x=>x.floor==arr[i].floor);
    var temp = [];
    for(var j = 0; j < filtered.length; j++){
        var nameIndex = Object.keys(ADOFAI.Action.ACTIONS_LIST).indexOf(arr[i].eventType);
        temp.push(nameIndex);
        }
    var tmp=temp;
    temp = temp.sort((a,b)=>a-b);
    tmp.forEach(e=>{var k=temp.indexOf(e);arr[i+k] = temp[k]});
    i += filtered.length;
  }
  return arr;
}

//basic functions
const timer = ms => new Promise(res => setTimeout(res, ms))
function findIndex(arr, toFind) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] == toFind) {
      return i;
    }
  }
  return -1;
}
function getDeg(d1, d2) {
  var degOff = (d2-d1+540)%360;
  if (twirl) degOff = 360-degOff;
  if (degOff == 0) degOff = 360;
  return degOff;
}
