//TODO:
//1: rename mw (message wrapper) fields/attributes to msg, accidentally assumed I was using a message wrapper (oops)

"use strict";

class ed {
    constructor(mw, c){
        this.mw = mw,
        this.c = c;
    }
}
class rea{
    constructor(mw, sym, interacted=false){
        this.mw = mw;
        this.sym = sym;
        this.interacted = interacted;
    }
}

const superContainer = document.getElementById("superContainer");

const s = new TMFSettings(true, true, false, 2, true, true, 40, 30, 40,"<Message was deleted>", true, true, "👍")
const s1 = new TMFSettings();
const settings = s;

let tmf = new TextMessageFormatter(settings);

const orient = TMFOrientationEnum;

const m0 = new TMFMessage("How are you reading this text? Oh no, something went wrong", orient.left, "a bit ago probably", "Bobby");
const m1 = new TMFMessage("Hello!", orient.right, "now", "Bubba");
const m2 = new TMFMessage("Who is this? Please don't text me again", orient.left, "now", "Bert");
m2.replyToMessage(m1)

const allMessages = [
    m0,
    m1,
    m2,
];
const allDeletes = [];
const allEdits = [
    new ed(m0, "Hi there!"),
];
const allReactions = [
    new rea(m0, "😊")
];
const allReplies = [];


superContainer.appendChild(tmf.messageContainer);
initTMFDemo(tmf);



function submitMessage(){
    //console.log("pressed");
    const inputs = ['input[id="senderName"]', 'input[id="contents"]', 'input[id="timestamp"]', 'input[name="orientation"]:checked', 'input[id="replyToIndex"]'];
    const values = [null, null, null, null, null];
    for (let i=0; i<inputs.length; i++){
        const input = document.querySelector(inputs[i])
        if (input){
            values[i] = input.value;
            //console.log(inputs[i] + ": <" + values[i]+">");
        }
    }

    const msg = new TMFMessage(values[1], parseInt(values[3]), values[2], values[0]);
    allMessages.push(msg);
    
    if (values[4].length > 0){
        //console.log("replying to message "+values[4])
        tmf.replyToMessage(msg, parseInt(values[4]))
    } else {
        tmf.addMessage(msg);
    }
    return false;
}

function submitTMFSettings(){
    const inputs = ["showTimestamps", "showSenderNames", "cleanUpTimestamps", "enableReactions", "enableReplies"];
    const values = [null, null, null, null, null];
    for (let i=0; i<inputs.length; i++){
        const input = document.querySelector('input[name="'+inputs[i]+'"]:checked')
        if (input){
            values[i] = input.value === 'true';
            //console.log(inputs[i] + ": " + values[i]);
        }
    }

    //const settings = new TMFSettings(values[0], values[1], values[2])
    const settingsToChange = {
        showTimestamp: values[0],
        showNames: values[1],
        cleanTimestamps: values[2],
        enableReactions: values[3],
        enableReplies: values[4],
    }
    //console.log(settingsToChange)
    Object.assign(settings, settingsToChange);
    //console.log("resetting tmf")
    const tmf2 = new TextMessageFormatter(settings)

    superContainer.appendChild(tmf2.messageContainer);
    
    superContainer.removeChild(tmf.messageContainer);
    tmf = tmf2;
    initTMFDemo(tmf);
    return false;
}

function initTMFDemo(tmfDemo){
    for (let i=0; i<allMessages.length; i++){
        allMessages[i].resetReactions();
        tmfDemo.addMessage(allMessages[i]);
    }

    for (let i=0; i<allEdits.length; i++){
        const e = allEdits[i];
        const mid = allMessages.indexOf(e.mw)
        tmfDemo.editMessage(mid, e.c);
    }

    for (let i=0; i<allReactions.length; i++){
        const r = allReactions[i];
        const mid = allMessages.indexOf(r.mw)
        tmfDemo.addReaction(mid, r.sym, r.interacted)
    }

    for (let i=0; i<allDeletes.length; i++){
        tmfDemo.deleteMessage(allDeletes[i]);
    }

    
}

function submitDelete(){
    const input = document.querySelector('input[id="messageId"]')
    if (input){
        const value = parseInt(input.value);
        tmf.deleteMessage(value);
        //allMessages.splice(value, 1);
        allDeletes.push(value);
    }
    
    return false;
}

function submitEdit(){
    const inputs = ['editMessageId', 'editContents'];
    const values = [null, null];
    for (let i=0; i<inputs.length; i++){
        const input = document.querySelector('input[id="'+inputs[i]+'"]');
        if (input){
            values[i] = input.value;
            //console.log(inputs[i] + ": <" + values[i]+">");
        }
    }

    const mid = values[0];
    const e = new ed(allMessages[mid], values[1]);
    //const e = {
    //    mid: values[0],
    //    c: values[1]
    //}
    tmf.editMessage(mid, e.c);
    allEdits.push(e);
    //console.log(allEdits)
    return false;
}

function submitReaction(){
    const midInput = document.querySelector('input[id="reactToIndex"]');
    if (!midInput) {
        console.error("submitReaction(): no mid input")
        return false;
    }
    //console.log(midInput.value)
    const mid = parseInt(midInput.value);
    
    const input = document.querySelector('input[name="reaction"]:checked')
    if (!input){
        onsole.error("submitReaction(): no mid input")
        return false;
    }
    const value = input.value;
    //console.log(value);

    const r = new rea(allMessages[mid], value, true);
    //const r = {
    //    mid: mid,
    //    sym: value,
    //    interacted: true
    //}
    //console.log(r)
    tmf.addReaction(mid, r.sym, r.interacted)

    allReactions.push(r);
    //console.log(allReactions)
    return false;
}