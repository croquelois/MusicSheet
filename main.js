const VF = Vex.Flow;
const clef = "treble";
const beatRegExp = /^(\d+)\/(\d+)$/;
const noteRegExp = /^([A-Ga-g](?:b|#)?\/\d+)+:(\w+)$/;
const accRegExp = /^[A-Ga-g](b|#)\/\d+$/;
const width = 200;
const height = 130;
const clefSize = 75;
const highlightClass = "highlight";

function parser(str){
  const tokens = str.trim().split(" ");
  const strBeat = tokens.shift();
  const resBeat = beatRegExp.exec(strBeat);
  if(!resBeat)
    throw "the input should start with the beat information; ex: '4/4'";
  const infoBeat = {num_beats: resBeat[1], beat_value: resBeat[2]};
  
  const notes = tokens.map(function(token){
    const keys = noteRegExp.exec(token);
    if(!keys)
      throw ("malformed note: '"+token+"'");
    keys.shift();
    const duration = keys.pop();
    const note = new VF.StaveNote({clef, keys, duration});
    keys.forEach(function(key,i){
      const acc = accRegExp.exec(key);
      if(!acc)
        return;
      note.addAccidental(i, new VF.Accidental(acc[1]));
    });
    return note;
  });
  return {infoBeat, strBeat, notes};
}

function render(input, elem, addClef){  
  const renderer = new VF.Renderer(elem, VF.Renderer.Backends.SVG);
  renderer.resize(width + (addClef ? clefSize : 0), height);
  const context = renderer.getContext();
  context.setFont("Arial", 10, "").setBackgroundFillStyle("#ccf");
  
  const stave = new VF.Stave(0, 0, width + (addClef ? clefSize : 0));
  if(addClef)
    stave.addClef(clef).addTimeSignature(input.strBeat);
  stave.setContext(context).draw();      

  const beams = VF.Beam.generateBeams(input.notes);
  const voices = [new VF.Voice(input.infoBeat).addTickables(input.notes)];
  const formatter = new VF.Formatter().joinVoices(voices).format(voices, width);
  voices.forEach(v => v.draw(context, stave));
  beams.forEach(b => b.setContext(context).draw());
}

$(function(){
  /* 
Amsterdam
6/4 e/4:8 e/4:8 a/4:q a/4:q b/4:q c/5:h|6/4 d/5:8 c/5:8 b/4:q g/4:q g/4:q g/4:h|6/4 a/4:8 b/4:8 c/5:q a/4:q a/4:q a/4:h|6/4 g/4:8 a/4:8 b/4:q b/4:q g#/4:q e/4:h
6/4 e/4:8 e/4:8 a/4:q a/4:q b/4:q c/5:h|6/4 d/5:8 c/5:8 b/4:q g/4:q g/4:q g/4:h|6/4 a/4:8 b/4:8 c/5:q a/4:q a/4:q g#/4:h|6/4 f#/4:8 g/4:8 a/4:q a/4:q a/4:q a/4:h
6/4 c/5:8 d/5:8 e/5:q e/5:q e/5:q e/5:h|6/4 e/5:8 d/5:8 c/5:q c/5:q c/5:q c/5:h|6/4 e/5:8 d/5:8 c/5:q a/4:q a/4:q a/4:h|6/4 b/4:8 c/5:8 b/4:q b/4:q g#/4:q e/4:h
6/4 e/4:8 e/4:8 a/4:q a/4:q a/4:q a/4:h|6/4 d/5:8 c/5:8 b/4:q g/4:q g/4:q g/4:h|6/4 a/4:8 b/4:8 c/5:q a/4:q a/4:q g#/4:h|6/4 f#/4:8 g/4:8 a/4:q a/4:q a/4:q a/4:h
  */
  
  let sheetInfo = [];
  let currentLine = null;
  let curInfo = null;
  
  function clear(){
    $("#sheet").empty();
    sheetInfo = [];
    currentLine = null
    currentElem = null;
    $("#clear").prop("disabled", true);
    $("#newLine").prop("disabled", true);
    $("#edit").prop("disabled", true);
  }
  
  function newLine(){
    currentLine = null;
    $("#newLine").prop("disabled", true);
  }
  
  function showError(err){
    let msg = (err || {}).message;
    if(msg){
      switch(msg){
        case "Too many ticks.":
          msg = "Too much notes";
          break;
        case "Voice does not have enough notes.":
          msg = "Not enough notes";
          break;
      }
    }else{
      msg = err;
    }
    $("#notesFeedback").text(msg);
    $("#notes").addClass("is-invalid");
  }
  function removeError(){
    $("#notesFeedback").text("");
    $("#notes").removeClass("is-invalid");
  }
  
  function addStave(txt){
    let input = null;
    try {
      input = parser(txt);
    }catch(err){
      return showError(err);
    }
    removeError();
    
    let info = {};
    if(!currentLine){
      currentLine = $("<div>");
      $("#sheet").append(currentLine);
      sheetInfo.push([]);
      info.addClef = true;
    }
    sheetInfo[sheetInfo.length-1].push(info);
    info.div = $("<div>").addClass("d-inline");
    currentLine.append(info.div);
    
    info.notes = txt;
    curInfo = info;
    curInfo.highlight = function(){
      $("svg").removeClass(highlightClass);
      this.div.find("svg").addClass(highlightClass);
    }
    
    curInfo.div.click(function(){
      curInfo = info;
      info.highlight();
      $("#notes").val(info.notes);
    });
    
    try {
      render(input, curInfo.div[0], curInfo.addClef);
    }catch(err){
      showError(err);
    }
    
    curInfo.highlight();
    $("#clear").prop("disabled", false);
    $("#newLine").prop("disabled", false);
    $("#edit").prop("disabled", false);
  }
  
  $("#notes").val(""); // "6/4 e/4:8 e/4:8 a/4:q a/4:q b/4:q c/5:h"
  $("#clear").click(clear);
  $("#newLine").click(newLine);
  $("#add").click(() => addStave($("#notes").val()));
  
  $("#edit").click(function(){
    if(!curInfo)
      return;
    let input = null;
    try {
      input = parser($("#notes").val());
    }catch(err){
      return showError(err);
    }
    removeError();
    curInfo.notes = $("#notes").val();
    curInfo.div.empty();
    try {
      render(input, curInfo.div[0], curInfo.addClef);
    }catch(err){
      showError(err);
    }
    curInfo.highlight();
  });
  
  $("#save").click(function(){
    $('#modalLoadBtn').addClass("d-none");
    $('#modalSaveBtn').removeClass("d-none");
    $('#modalLocalMem').addClass("d-none");
    $('#loadSaveModal .modal-title').text("Save");
    let title = $("#title").text();
    let str = [title].concat(sheetInfo.map(line => line.map(info => info.notes).join("|"))).join("\n");
    $('#loadSaveModal textarea').prop("readonly",true).val(str);
    $('#loadSaveModal').modal({});
  });
  $("#load").click(function(){
    $('#modalLoadBtn').removeClass("d-none");
    $('#modalSaveBtn').addClass("d-none");
    let localMemList = Object.keys(localStorage);
    if(localMemList.length > 0){
      $('#modalLocalMem').removeClass("d-none");
      $('#modalLocalMem').empty();
      $('#modalLocalMem').append($("<option selected>"))
      localMemList.forEach(name => $('#modalLocalMem').append($("<option>").text(name)));
    }else{
      $('#modalLocalMem').addClass("d-none");
    }
    $('#loadSaveModal .modal-title').text("Load");
    $('#loadSaveModal textarea').prop("readonly",false).val("");
    $('#loadSaveModal').modal({});
  });
  $('#modalLocalMem').change(function(){
    let name = $(this).val();;
    if(!name){
      $('#loadSaveModal textarea').val("");
      return true;
    }
    let txt = localStorage[name] || "";
    $('#loadSaveModal textarea').val(txt);
  });
  $("#modalLoadBtn").click(function(){
    let txt = $('#loadSaveModal textarea').val();
    clear();
    txt.split("\n").forEach(function(line,i){
      if(i==0){
        $("#title").text(line);
      }else if(line.length > 0){
        line.split("|").forEach(addStave);
        newLine();
      }
    });
  });

  $("#modalSaveBtn").click(function(){
    let txt = $('#loadSaveModal textarea').val();
    let lines = txt.split("\n");
    if(lines.length == 0)
      return;
    if(lines.length == 1)
      delete localStorage[lines[0]];
    else
      localStorage[lines[0]] = txt;
  });
  
  
  function applyTitleChange(){
    $("#titleInput").prop("disabled", true).addClass("d-none");
    $("#title").text($("#titleInput").val()).removeClass("d-none");
  }
  
  $("#titleInput").on('keypress', e => (e.which === 13 ? applyTitleChange() : true));
  $("#titleInput").on('focusout', applyTitleChange);
  $("#title").click(function(){
    $("#title").addClass("d-none");
    $("#titleInput").val($("#title").text()).prop("disabled", false).removeClass("d-none").select();
  });
});