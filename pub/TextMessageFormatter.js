//TODO: fixes
//1: handle empty fields for TMFMessages (dont create elements in DOM, and dont create margins)
//1.1: detect when elements are missing in DOM (for all elements, not just timestamp)
//2: clean up commented out code
//3: handle delete logic for senderName displaying
//4: _addToMessageCss could be improved (ie, process value as one part instead of broken up into intValue and cssUnits)
//5: handle width logic for reactions (reactions need to expand width so reactions can fit) [PARTIALLY COMPLETE]
//5.1: handle message resize to smaller width when reactionBox gets smaller (did I do this already?)

//TODO: features
//3: more customization options
//6: profile icons next to text messages
//7: discord format (optional, might be too much)
//9: edit/delete all mesages from a certain name (need a way to keep track of "users")

//TODO: things to consider/remember
//1: adding profile pictures will take up horizontal space, so maxWidth for messageBox needs to be adjusted at the start, if enabled
//3: add vars/classes to _classList that are being used and havent been added yet
//4: CONTINUE WORKING ON REPLIES (edit reply on edit message, move name up if applicable and margin-top)
//4.1 different border radius for each corner in reply
//5: delete console.log() messages
//6: bug: changing settings (in examples.js) resets resized messages (from reactions) (possibly fixed)
//7: css override methods


//NOTE: 
//1: every variable named selector is an input for a querySelector call, so the corresponding character ('.' for classes, '#' for ids)
//   may be needed to be appended to the front of the selector argument string

"use strict";

(function(global, document) {

    const TMFOrientationEnum = Object.freeze({//enum for keeping track of which side of the message container the message should appear
        left: 0,
        right: 1,
    });

    class TMFMessage {
        constructor(contents, orientation, timestamp=null, senderName=null){
            this.senderName = senderName;
            this.contents = contents;
            this.timestamp = timestamp;

            this.orientation = this._parseOrientation(orientation);//which side of the message container this message shouldd be

            this.reactions = new TMFReactions();
            this._wasDoubleClicked = false;//to keep track of whether user has doubled clicked this message in the DOM
            
            this.replyTo = null; //this.replyToMessage(replyTo);//this.replyTo = replyTo;//this.replyToMessage(replyTo);//set this.replyTo attribute and handle other logic
            this.repliesFrom = [];//Array of TMFMessages that have this message as their replyTo attribute, use this to update DOM elements when this
        }
        
        _parseOrientation(orientation){
            //simple check first, to not slow down runtime when proper inputs are used
            if (orientation === TMFOrientationEnum.left || orientation === TMFOrientationEnum.right){
                return orientation;
            }

            const parsedOrientation = String(orientation).toLowerCase();
            if (parsedOrientation.length > 0) {
                const left = ["0", "l", "left"]
                if (left.includes(parsedOrientation)){
                    return TMFOrientationEnum.left;
                }

                const right = ["1", "r", "right"]
                if (right.includes(parsedOrientation)){
                    return TMFOrientationEnum.right;
                }
            }
            
            console.warn("Message.constructor(): invalid orientation argument, defaulting to MsgOrientationEnum.right");
            return TMFOrientationEnum.right;
        }

        
        replyToMessage(replyTo){
            this.replyTo = replyTo;//TMFMessage pointer: points to the message that this one is replying to
            if (replyTo){
                try {
                    if (!replyTo.repliesFrom.includes(this)){
                        replyTo.repliesFrom.push(this);
                    }
                } catch {
                    console.error("TMFMessage.replyToMessage(): Something went wrong when adding self to replyTo's repliesFrom array");
                    return undefined;
                }
            }
        }

        unreply(){//remove reply and remove self from former replyTo's repliesFrom array
            if (this.replyTo){
                try {
                    const replyTosArray = this.replyTo.repliesFrom;
                    const index = replyTosArray.indexOf(this);
                    if (index >= 0) replyTosArray.splice(index, 1);
                    
                    this.replyTo = null;
                } catch {
                    console.error("TMFMessage.constructor(): Something went wrong when adding self to replyTo's repliesFrom array");
                    return undefined;
                }
            }
        }

        resetReactions(){
            this.reactions = new TMFReactions();
        }

        //clean up method for deleting this message
        //RETURN: array of TMFMessages that need their DOM replyTo componenents updated
        _onDeleteMessage(){
            this.unreply();

            for (let i=0; i<this.repliesFrom.length; i++){
                const thisMsg = this.repliesFrom[i].replyTo;
                if (thisMsg !== this) {
                    console.error("TMFMessage._onDeleteMessage(): this.repliesFrom["+i+"].replyTo !== this message!");
                    return undefined;
                }
                this.repliesFrom[i].replyTo = null;//reset replyTo attribute of messages that were formerly replying to this message
            }
            
            const formerRepliesFrom = this.repliesFrom;
            this.repliesFrom = [];//now no message is replying to it, alternatively make this null to mark it as deleted
            return formerRepliesFrom;
        }
    }

    class TMFReactions {
        constructor(){
            this.symbols = [];//array of symbols/emojis in reaction
            this.counts = [];//array of counters for each symbol (should be same length as above array)
            this.length = 0;//length of arrays (should be same for both)
            this._hasBeenAddedToDom = false;//used for DOM logic (whether or not we need to add this to the DOM)
            this._wasInteractedWith = [];//used for DOM logic: determine if reactionSymbolContainer should have "interacted" class
        }

        addReaction(symbol, interacted=false){
            const index = this.symbols.indexOf(symbol);
            if (index >= 0) {//if symbol is already there, increment its count
                this.counts[index]++;
                this._wasInteractedWith[index] = interacted;
                return;
            }
            this.symbols.push(symbol);
            this.counts.push(1);
            this._wasInteractedWith.push(interacted);
            this.length++;
        }

        increaseCountByIndex(index, increment=1, interacted=false){
            this.counts[index] += increment;
            this._wasInteractedWith[index] = interacted;
            if (this.counts[index] <= 0){
                this.deleteSymbolByIndex(index);
            }
        }

        deleteSymbolByIndex(index){
            if (index < 0) {//if symbol is not in array, exit
                return false;
            }
            this.symbols.splice(index, 1);
            this.counts.splice(index, 1);
            this._wasInteractedWith.splice(index, 1);
            this.length--;
            return true;
        }

        deleteSymbol(symbol){
            const index = this.symbols.indexOf(symbol);
            return this.deleteSymbolByIndex(index);
        }
        
        removeReaction(symbol, interacted=false){
            const index = this.symbols.indexOf(symbol);
            if (index < 0) {//if symbol is not in array, exit
                return;
            }
            if (this.counts[index] <= 1){//last reaction with that symbol being removed (delete from arrays)
                this.deleteSymbolByIndex(index);
            } else {
                this.counts[index]--;
                this._wasInteractedWith[index] = interacted;
            }
        }
    }

    class TMFSettings {//settings for our TextMessageFormatter instance
        constructor(showTimestamp=false, showNames=false, cleanTimestamps=false, messageEntranceAnimationIndex=2, 
                    enableReactions=true, enableReplies=true, maxReplyLength=40, maxNameLength=30, maxTimestampLength = 40, messageDeletedText="<Message was deleted>",
                    enableDoubleClickToReact=true, enableDoubleClickToUnreact=true, doubleClickToReactSymbol="❤️"){
            
            this.showNames = showNames;//boolean for if the message container is for more than 2 people
            this.showTimestamp = showTimestamp;

            //"extra" settings
            if (this.showTimestamp) {
                this.cleanTimestamps = cleanTimestamps;//remove timestamps on consecutive messages with same orientation and sender
            } else {
                this.cleanTimestamps = false;//this comination should not be allowed
            }

            //Choose message entrance animation (slideIn by default)
            this._animationClassNames = {//class names for animations
                slideIn: "_slideIn",
                fadeIn: "_fadeIn",
                fadeInAndSlideIn: "_fadeInAndSlideIn"
            }
            Object.freeze(this._animationClassNames);
            this.animations = Object.values(this._animationClassNames);
            if (0 <= messageEntranceAnimationIndex < this.animations.length){
                this.selectedAnimation = this.animations[messageEntranceAnimationIndex];
            } else {
                this.selectedAnimation = this._animationClassNames.slideIn;
            }

            this.enableReactions = enableReactions;
            this.enableReplies = enableReplies;
            this.maxReplyLength = maxReplyLength;//max number of characters allowed in a DOM message's replyContent string

            this.maxNameLength = maxNameLength;
            this.maxTimestampLength = maxTimestampLength;

            this.messageDeletedText = messageDeletedText;

            this.enableDoubleClickToReact = enableDoubleClickToReact;
            this.enableDoubleClickToUnreact = enableDoubleClickToUnreact;
            this.doubleClickToReactSymbol = doubleClickToReactSymbol;
        }
    }

    class TextMessageFormatter {
        constructor(settings=new TMFSettings()){
            this.messages = [];//array of Message instances
            this._messagesInDom = [];//array of text message DOM elements, 1 to 1 with messages array (ie one for each messsage)
            this.totalMessages = 0;//number of messages (should be same as size of each array), NOTE: might be unneeded

            //--------------- NOTE: nothing has been made for these yet, might not be needed, might just append elements to messages in DOM
            /*this.replies = []
            this._repliesInDom = [];

            this.reactions = [];
            this._reactionsInDom = [];
            
            this.dateDividers = [];
            this._dateDividersInDom = [];*/
            //----------------

            this._classNames = {//class names for DOM elements (animations excluded)
                container: "_container",
                messageBox: "_messageBox",
                senderName: "_senderName",
                messageContents: "_messsageContents",
                timestamp: "_timestamp",
                left: "_left",
                right: "_right",
                reactionBox: "_reactionBox",
                reactionSymbolContainer: "_reactionSymbolContainer",
                interacted: "_interacted",
                replyBox: "_replyBox",
                replyContents: "_replyContents"
            }
            Object.freeze(this._classNames);

            //"settings" for our library
            this._settings = settings;
            
            this._cssVars = {//used to keep track of css variables we may want to change
                msgBoxMarginTop: "--messageBoxMarginTop",
                msgBoxMarginBottom: "--messageBoxMarginBottom",
                leftMessageBoxWidth: "--leftMessageBoxMaxWidth",
                rightMessageBoxWidth: "--rightMessageBoxMaxWidth"
            }
            Object.freeze(this._cssVars);

            this._spacing = {//used to determine margin/paddding between messageBoxes (CSS units are in px)
                doubleTextBetween: "50px",//this might be unused now (TODO: maybe delete this)
                singleTextBetween: "32px",
                none: "0px",
                aboveClearing: "20px",
                reactionTimestampConflictResolve: 7,
                topReplySenderName: "-40px",
                marginTopReplySenderNameAddition: 60,
                marginTopReplyAddition: 30
            }
            Object.freeze(this._spacing);
            
            if (this._settings.showNames){
                document.documentElement.style.setProperty(this._cssVars.msgBoxMarginTop, this._spacing.aboveClearing);
            } else {
                document.documentElement.style.setProperty(this._cssVars.msgBoxMarginTop, this._spacing.none);
            }
            
            this.messageContainer = this._initializeContainer();//div that is the parent of all text message DOM elements
        }

        //"public" message methods

        addMessage(message){//(senderName, contents, timestamp, orientation){
            //internal
            //const message = new Message(senderName, contents, timestamp, orientation);
            this.messages.push(message);
            this.totalMessages++;

            //DOM
            this._addMessageToContainer(message);
        }

        deleteMessage(messageId){//messageId == index in either array (should be same)
            if (messageId >= this.totalMessages || messageId < 0){
                console.error("TextMessageFormatter.deleteMessage(): messageId out of range");
                return undefined;
            }

            //internal: part that needs to be done before DOM updates
            const messagesWithReplyComponenetsThatNeedUpdating = this.messages[messageId]._onDeleteMessage();
            //edit replies component of all messages that have replied to this one
            if (this._settings.enableReplies) this._updateReplyComponentOfRepliesFromArray(messagesWithReplyComponenetsThatNeedUpdating);
            
            //DOM
            this._removeMessageFromContainer(messageId);

            //internal
            this.messages.splice(messageId, 1);
            this.totalMessages--;
        }

        editMessage(messageId, contents){
            const message = this.messages[messageId];
            message.contents = contents;
            
            this._editMessageComponentInDom(messageId, "."+this._classNames.messageContents, contents);

            //edit replies component of all messages that have replied to this one
            const repliesFrom = message.repliesFrom;
            if (this._settings.enableReplies) this._updateReplyComponentOfRepliesFromArray(repliesFrom);
        }

        addReaction(messageId, symbol, interacted=false){
            if (!this._settings.enableReactions){
                return;
            }
            //internal
            const reactions = this.messages[messageId].reactions;
            reactions.addReaction(symbol, interacted);

            //DOM
            if (reactions._hasBeenAddedToDom) {
                this._updateReactionsComponent(messageId);
            } else {
                this._addReactionsComponentToMessage(messageId);
                reactions._hasBeenAddedToDom = true;
            }
        }

        removeReaction(messageId, symbol, interacted=false){
            if (!this._settings.enableReactions){
                return;
            }
            //internal
            const reactions = this.messages[messageId].reactions;
            reactions.removeReaction(symbol, interacted)

            //DOM
            if (reactions._hasBeenAddedToDom) {
                this._updateReactionsComponent(messageId);
            }
        }

        replyToMessage(replyMessage, messageId){//ignores the replyTo attribute of replyMessage if there is any, replaces it with the message at messageId
            replyMessage.replyToMessage(this.messages[messageId]);
            this.messages.push(replyMessage);
            this.totalMessages++;

            //DOM
            this._addMessageToContainer(replyMessage);
        }

        //"private" message data methods

        //DOM METHODS BELOW ------

        _initializeContainer(){
            const container = document.createElement('div');
            container.className = this._classNames.container;
            return container;
        }

        //"private" DOM message methods

        _addOrientationClassName(messageOrientation, domElement){
            switch (messageOrientation){
                case TMFOrientationEnum.left:
                    domElement.classList.add(this._classNames.left);
                    break;
                case TMFOrientationEnum.right:
                    domElement.classList.add(this._classNames.right);
                    break;
                default:
                    console.error("TextMessageFormatter._addOrientationClassName(): invalid message orientation");
                    //break;
                    return undefined;
            }
        }

        _processTextWithMaxLength(string, maxLength){
            if (string.length > maxLength){
                return string.slice(0, maxLength-3) + "...";
            }
            return string;
        }
        
        //generate DOM element for message
        _generateMessageElement(message){
            const newDomMessage = document.createElement('div');
            newDomMessage.className = this._classNames.messageBox;
            newDomMessage.classList.add(this._settings.selectedAnimation);

            //name of sender (inteded for group chats)
            if (this._settings.showNames && message.senderName){
                const domMsgSenderName = document.createElement('div');
                domMsgSenderName.className = this._classNames.senderName;
                const processedSenderName = this._processTextWithMaxLength(message.senderName, this._settings.maxNameLength);
                domMsgSenderName.appendChild(document.createTextNode(processedSenderName));
                this._addOrientationClassName(message.orientation, domMsgSenderName);

                //append to message chat box
                //if (this._settings.showNames){
                    newDomMessage.appendChild(domMsgSenderName);
                //}
            }

            //contents of message
            const domMessageContents = document.createElement('p');
            domMessageContents.className = this._classNames.messageContents;
            domMessageContents.appendChild(document.createTextNode(message.contents));

            //message timestamp
            if (this._settings.showTimestamp && message.timestamp){
                const domMsgTimestamp = document.createElement('div');
                domMsgTimestamp.className = this._classNames.timestamp;
                const processedTimestamp = this._processTextWithMaxLength(message.timestamp, this._settings.maxTimestampLength);
                domMsgTimestamp.appendChild(document.createTextNode(processedTimestamp));
                this._addOrientationClassName(message.orientation, domMsgTimestamp);

                //append to message chat box
                //if (this._settings.showTimestamp){
                    newDomMessage.appendChild(domMsgTimestamp);
                //}
            }

            switch (message.orientation){
                case TMFOrientationEnum.left:
                    newDomMessage.classList.add(this._classNames.left);
                    //domMsgSenderName.classList.add(this._classNames.left);
                    domMessageContents.classList.add(this._classNames.left);
                    //domMsgTimestamp.classList.add(this._classNames.left);
                    break;
                case TMFOrientationEnum.right:
                    newDomMessage.classList.add(this._classNames.right);
                    //domMsgSenderName.classList.add(this._classNames.right);
                    domMessageContents.classList.add(this._classNames.right);
                    //domMsgTimestamp.classList.add(this._classNames.right);
                    break;
                default:
                    console.error("TextMessageFormatter._generateMessageElement(): invalid message orientation");
                    //break;
                    return undefined;
            }

            //append to message chat box
            newDomMessage.appendChild(domMessageContents);
            
            if (this._settings.enableReactions){
                if (message.reactions.length > 0){
                    this._addReactionsComponentToMessage(this.totalMessages-1, newDomMessage);
                }
                
                if (this._settings.enableDoubleClickToReact) {//feature: double click to react (heart by default)
                    domMessageContents.ondblclick = () => {
                        const currMessageId = this.messages.indexOf(message);
                        if (!message._wasDoubleClicked){
                            message._wasDoubleClicked = true;
                            this.addReaction(currMessageId, this._settings.doubleClickToReactSymbol, true);
                            //toggle the symbol, have it started as "interacted" since we just reacted to it
                            /*const reactionContainers = newDomMessage.querySelectorAll("."+this._classNames.reactionSymbolContainer);
                            for (const s of reactionContainers){
                                if (s.textContent.includes(this._settings.doubleClickToReactSymbol)){
                                    s.classList.add(this._classNames.interacted);
                                    break;
                                }
                            }*/
                        } else if (this._settings.enableDoubleClickToUnreact){
                            message._wasDoubleClicked = false;
                            this.removeReaction(currMessageId, this._settings.doubleClickToReactSymbol);
                        }
                    }
                }
            }
            if (this._settings.enableReplies && message.replyTo){
                this._addReplyComponentToMessage(message, newDomMessage);
            }

            return newDomMessage;
        }

        _getMessageComponent(messageId, selector){
            const domMsg = this._messagesInDom[messageId];
            const componentInDomMsg = domMsg.querySelector(selector);
            return componentInDomMsg;
        }

        _removeMessageComponentInDom(messageId, selector){
            const domMsg = this._messagesInDom[messageId];
            const component = this._getMessageComponent(messageId, selector);
            if (component){
                domMsg.removeChild(component);
            }
        }

        _editMessageComponentInDom(messageId, selector, contents){
            const component = this._getMessageComponent(messageId, selector);
            if (component){
                component.textContent = contents;
            }
        }

        //remove the timestamp contents from previous message in DOM if previous message is same orientation
        _handleOnAddTimestamps(messageId){
            if (messageId < 1){
                return;
            }
            const currMsg = this.messages[messageId];
            const prevMsg = this.messages[messageId-1];
            const prevMsgDom = this._messagesInDom[messageId-1];

            if (currMsg.orientation === prevMsg.orientation){
                if (this._settings.cleanTimestamps){
                    this._removeMessageComponentInDom(messageId-1, "."+this._classNames.timestamp);
                } else {
                    //this._messagesInDom[messageId].style.marginTop = this._spacing.singleTextBetween;
                    this._addToCssProperty(prevMsgDom, "margin-bottom", this._spacing.singleTextBetween);
                }
            } else if (!this._settings.enableReplies) {//TODO: clean up this whole if block's logic
                //this._messagesInDom[messageId].style.marginTop = this._spacing.singleTextBetween;
                this._addToCssProperty(prevMsgDom, "margin-bottom", this._spacing.singleTextBetween);
            }
        }

        _handleOnAddSenderNames(messageId){
            if (messageId < 1){
                return;
            }
            const currMsg = this.messages[messageId];
            const prevMsg = this.messages[messageId-1];
            const prevMsgDom = this._messagesInDom[messageId-1];

            if (currMsg.senderName === prevMsg.senderName && currMsg.orientation === prevMsg.orientation){//case where we need to clean up sender name
                this._removeMessageComponentInDom(messageId, "."+this._classNames.senderName);
            } else if (!this._settings.cleanTimestamps){//case where we have a timestamp and then a sender name back to back
                //this._messagesInDom[messageId].style.marginTop = this._spacing.doubleTextBetween;
                this._addToCssProperty(prevMsgDom, "margin-bottom", this._spacing.singleTextBetween);
            } //else {
            //    this._messagesInDom[messageId].style.marginTop = this._spacing.singleTextBetween;
            //}
        }

        //generate message DOM element and put in message container and array
        _addMessageToContainer(message){
            const newDomMessage = this._generateMessageElement(message);
            this._messagesInDom.push(newDomMessage);
            this.messageContainer.appendChild(newDomMessage);

            //clean up timestamp above (if applicable)
            if (this._settings.showTimestamp){
                this._handleOnAddTimestamps(this.totalMessages-1);
            }
            if (this._settings.showNames) {
                this._handleOnAddSenderNames(this.totalMessages-1);
            }

            this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
            //newDomMessage.scrollIntoView();
        }

        //decides wether or not to restore the timestamp of prevMsg's DOM element based on the orientation
        //of the message being deleted (currMsg) and the message that would be after preMsg when currMsg is deleted (nextMsg)
        _shouldReinstateTimestampOnDelete(prevMsg, currMsg, nextMsg){
            if (nextMsg){
                return prevMsg.orientation === currMsg.orientation && prevMsg.orientation !== nextMsg.orientation;
            }
            return prevMsg.orientation === currMsg.orientation;
        }

        _shouldRemoveTimestampOnDelete(prevMsg, currMsg, nextMsg){
            if (nextMsg){
                return prevMsg.orientation !== currMsg.orientation && prevMsg.orientation === nextMsg.orientation ;
            }
            return prevMsg.orientation !== currMsg.orientation;
        }

        //when deleting a message we may want to put the timestamp of a previous message back
        //or we may want to put a timestamp back, depending on the orientation of the messages
        //that are adjacent to the one being deleted
        //basically, this is the opposite of _handleOnAddTimestamps()
        _reinstatePrevMsgTimestampInDom(messageId){//messageId of the message below the one being removed
            if (messageId < 1){
                return;
            }
            const currMsg = this.messages[messageId];//the message that is being removed
            const prevMsg = this.messages[messageId-1];
            const nextMsg = this.messages[messageId+1] || null;

            if (this._shouldReinstateTimestampOnDelete(prevMsg, currMsg, nextMsg)){
                const prevMsgDom = this._messagesInDom[messageId-1];
                const checkIfTimestamp = prevMsgDom.querySelector("."+this._classNames.timestamp);
                if (checkIfTimestamp == null) {//check if timestamp exists, if not make one
                    //message timestamp
                    const domMsgTimestamp = document.createElement('div');
                    domMsgTimestamp.className = this._classNames.timestamp;
                    domMsgTimestamp.appendChild(document.createTextNode(prevMsg.timestamp));

                    prevMsgDom.appendChild(domMsgTimestamp);

                    switch (prevMsg.orientation){
                        case TMFOrientationEnum.left:
                            domMsgTimestamp.classList.add(this._classNames.left);
                            break;
                        case TMFOrientationEnum.right:
                            domMsgTimestamp.classList.add(this._classNames.right);
                            break;
                        default:
                            console.error("TextMessageFormatter._reinstatePrevMsgTimestampInDom(): invalid message orientation");
                            //break;
                            return undefined;
                    }
                }
            } else if (this._shouldRemoveTimestampOnDelete(prevMsg, currMsg, nextMsg)){
                this._removeMessageComponentInDom(messageId-1, "."+this._classNames.timestamp);
            }
        }

        _removeMessageFromContainer(messageId){//messageId == index in either array (should be same)
            const domMessage = this._messagesInDom[messageId];
            this.messageContainer.removeChild(domMessage);

            //put timestamp of previous message back (if applicable)
            if (this._settings.showTimestamp){
                this._reinstatePrevMsgTimestampInDom(messageId);
            }

            this._messagesInDom.splice(messageId, 1);
        }

        //TODO: remaining "private" methods

        //"private" DOM reactions methods
        
        _processReactionsTextContent(symbol, count){
            let processedReaction = symbol;
            if (count > 1){
                processedReaction = processedReaction + count;
            }
            return processedReaction;
        }

        _generateReactionSymbolContainer(message, domMsg, reactionsindex){
            //const domMsg = this._messagesInDom[messageId];

            const reactions = message.reactions;

            const domSymbolContainer = document.createElement('div');
            domSymbolContainer.className = this._classNames.reactionSymbolContainer;
            if (reactions._wasInteractedWith[reactionsindex]) domSymbolContainer.classList.add(this._classNames.interacted);
            
            const symbol = reactions.symbols[reactionsindex];
            const symbolCount = reactions.counts[reactionsindex];
            const processedReaction = this._processReactionsTextContent(symbol, symbolCount);

            domSymbolContainer.appendChild(document.createTextNode(processedReaction));
            if (reactionsindex > 0) {
                domSymbolContainer.style.setProperty("margin-left", "5px");
            }

            //add way to react by clicking symbol
            domSymbolContainer.onclick = () => {
                //console.log(getComputedStyle(domSymbolContainer).getPropertyValue("background-color"))
                //domSymbolContainer.style.setProperty("background-color", "red");

                const currReactionIndex = reactions.symbols.indexOf(symbol);
                const currMessageId = this.messages.indexOf(message);
                if (!domSymbolContainer.classList.contains(this._classNames.interacted)){//(getComputedStyle(domSymbolContainer).getPropertyValue("background-color") === "rgba(0, 0, 0, 0)"){
                    //domSymbolContainer.style.setProperty("background-color", "red");
                    domSymbolContainer.classList.add(this._classNames.interacted);
                    //reactions.increaseCountByIndex(currReactionIndex, true);
                    this.addReaction(currMessageId, symbol, true);
                } else {
                    //domSymbolContainer.style.setProperty("background-color", "transparent");
                    domSymbolContainer.classList.remove(this._classNames.interacted);
                    //reactions.increaseCountByIndex(currReactionIndex, -1, false);
                    this.removeReaction(currMessageId, symbol, false);

                    if (reactions.counts[currReactionIndex] <= 0) {//edge case: should remove this dom element
                        domSymbolContainer.parentElement.removeChild(domSymbolContainer);
                        
                        if (domSymbolContainer.textContent.includes(this._settings.doubleClickToReactSymbol)){//if the symbol we removed was the double click reaction (another/part-of-same edge case)
                            message._wasDoubleClicked = false;
                        }
                    }
                }

                const processedReaction = this._processReactionsTextContent(symbol, reactions.counts[currReactionIndex]);
                
                domSymbolContainer.textContent = processedReaction;

                //need to handle reactionBox width changes
                this._handleMessageWidthWithReaction(domMsg);
                this._handleReactionTimestampOverlap(domMsg);
            }

            return domSymbolContainer;
        }

        _generateReactionsElement(messageId){
            const message = this.messages[messageId];
            const domMsg = this._messagesInDom[messageId];
            const reactions = message.reactions;
            
            const domReactionBox = document.createElement('div');
            domReactionBox.className = this._classNames.reactionBox;

            for (let i=0; i<reactions.length; i++){
                domReactionBox.appendChild(this._generateReactionSymbolContainer(message, domMsg, i));
            }

            this._addOrientationClassName(message.orientation, domReactionBox);

            return domReactionBox;
        }

        _addReactionsComponentToMessage(messageId, domMsg=this._messagesInDom[messageId]){
            //const message = this.messages[messageId];
            //const domMsg = this._messagesInDom[messageId];
            if (!domMsg) {
                console.error("TextMessageFormatter._addReactionsComponentToMessage(): domMsg is " + domMsg + ", aborting!");
                return undefined;
            }
            const domReactionBox = this._generateReactionsElement(messageId);
            domMsg.appendChild(domReactionBox);

            this._handleMessageWidthWithReaction(domMsg);
            this._handleReactionTimestampOverlap(domMsg);
        }

        _handleMessageWidthWithReaction(domMsg){
            //const domMsg = this._messagesInDom[messageId];
            //messageBox width may need to be extended to fit reaction properly
            let domMsgWidth = this._getCssIntValue("width", domMsg);//this._parseIntOrZero(getComputedStyle(domMsg).getPropertyValue("width"));
            
            const domReactionBox = domMsg.querySelector("."+this._classNames.reactionBox);
            if (domReactionBox){
                //const orientaionWidthCssVar = message.orientation === MsgOrientationEnum.left? this._cssVars.leftMessageBoxWidth : this._cssVars.rightMessageBoxWidth;//get correct width variable depending on msg orientation
                //const maxMsgBoxWidth = this._parseIntOrZero(getComputedStyle(document.documentElement).getPropertyValue(orientaionWidthCssVar));
                const maxMsgBoxWidth = this._getCssIntValue("--messageContainerWidth")/2 - this._getCssIntValue("--messageBoxMarginFromContainerSide");//getting css variables that use calc() is bugged, so until that is fixed we have to recreate the calculation here (when fixed use 2 lines above instead, after refeactoring them)
                const reactionsWidth = this._getCssIntValue("width", domReactionBox);//this._parseIntOrZero(getComputedStyle(domReactionBox).getPropertyValue("width"));//message.reactions.length * 2;//emojies are roughly 
                const widthDiff = reactionsWidth + 20 - domMsgWidth;//the 20 is a semi-arbitrary value, I just wanted something that looked "correct" 
                if (widthDiff > 0) {
                    const newWidthAddition = widthDiff + domMsgWidth > maxMsgBoxWidth? maxMsgBoxWidth - domMsgWidth: widthDiff;
                    this._addToCssProperty(domMsg, "width", newWidthAddition);

                    domMsgWidth = this._getCssIntValue("width", domMsg);//update with new length
                } else {//case where we might want to revert the previous size change
                    
                    //TODO: doesn't work as intended, fix this (maybe)
                    /*
                    console.log("domMsgWidth= " + domMsgWidth)
                    const domMsgContents = domMsg.querySelector("."+this._classNames.messageContents);
                    const domMsgContentWidth = this._getCssIntValue("width", domMsgContents);
                    console.log("domMsgContentWidth= "+ domMsgContentWidth)
                    domMsg.style.setProperty("width", domMsgContentWidth+"px");
                    */
                }
            }
        }

        _handleReactionTimestampOverlap(domMsg){
            //const domMsg = this._messagesInDom[messageId];
            //reaction box may overlap timestamp, so we need to handle this case (move timestamp down)
            if (this._settings.showTimestamp){
                const domMsgWidth = this._getCssIntValue("width", domMsg)

                const domReactionBox = domMsg.querySelector("."+this._classNames.reactionBox);
                const domTimestamp = domMsg.querySelector("."+this._classNames.timestamp);
                if (domTimestamp && domReactionBox){
                    const reactionsWidth = this._getCssIntValue("width", domReactionBox);
                    const timestampWidth = this._getCssIntValue("width", domTimestamp);              
                    
                    const underMsgBoxWidth = timestampWidth + reactionsWidth + this._getCssIntValue("--reactionBoxOffset");
                    const domMsgWidthWithPadding = domMsgWidth + this._getCssIntValue("padding-left", domMsg) + this._getCssIntValue("padding-right", domMsg);
                    if (underMsgBoxWidth + 3 > domMsgWidthWithPadding){//if reactions and timestamp touch eachother, move timestamp down a bit, the +3 is arbitrary, just something that looks "correct"
                        const newTimestampDown = (this._getCssIntValue("--timestampBottom")-this._spacing.reactionTimestampConflictResolve)+"px"//move down timestamp 3px
                        domTimestamp.style.setProperty("bottom", newTimestampDown);
                    } else {//case where we might want to revert moving it down
                        const newTimestampDown = this._getCssIntValue("--timestampBottom")+"px";
                        domTimestamp.style.setProperty("bottom", newTimestampDown);
                    }
                }
                
            }
        }

        _updateReactionsComponent(messageId){//this could probably be more efficient
            this._removeMessageComponentInDom(messageId, "."+this._classNames.reactionBox);
            this._addReactionsComponentToMessage(messageId);
        }

        //"private" DOM message replies methods

        _generateReplyElement(message){
            //const message = this.messages[messageId];
            const replyToMessage = message.replyTo;
            const replyToIndex = this.messages.indexOf(message.replyTo);
            const replyToDomMessage = this._messagesInDom[replyToIndex];

            //const replyToIndex = this._messagesInDom.indexOf(replyTo);

            if (replyToIndex < 0) {
                console.error("TextMessageFormatter._generateReplyElement(): replyToIndex is negative")
                return undefined;
            }
            //const domMsg = this._messagesInDom[messageId];

            //if (!replyTo) return null;

            const domReply = document.createElement('div');
            domReply.className = this._classNames.replyBox;
            this._addOrientationClassName(message.orientation, domReply);

            const domReplyContents =  document.createElement('p');
            domReplyContents.className = this._classNames.replyContents;
            this._addOrientationClassName(message.orientation, domReplyContents);

            const processedReplyContents = this._processTextWithMaxLength(replyToMessage.contents, this._settings.maxReplyLength);
            domReplyContents.appendChild(document.createTextNode(processedReplyContents));
            domReply.appendChild(domReplyContents);

            domReplyContents.onclick = () => {
                //replyToDomMessage.scrollIntoView({
                //    behaviour: "smooth",
                //    block: "center"
                //});//clicking on the reply takes you to the message being replied to
                replyToDomMessage.scrollIntoViewIfNeeded(true);

                const selectAnimation = [
                    { opacity: '0%' },
                    { transform: 'translateX(0px)' },
                    { transform: 'translateX(10px)' },
                    { transform: 'translateX(0px)' },
                    { transform: 'translateX(10px)' },
                    { transform: 'translateX(0px)' },
                    { opacity: '100%' }
                ]
                const animationTiming = {
                    duration: 300,
                    iterations: 1,
                }

                replyToDomMessage.animate(selectAnimation, animationTiming);
            }

            return domReply;
        }

        _addReplyComponentToMessage(message, domMsg){
            if (!message){
                console.error("TextMessageFormatter._addReplyComponentToMessage(): message is " + message);
                return undefined;
            }
            //const domMsg = this._messagesInDom[messageId];
            const domReply = this._generateReplyElement(message);
            //console.log(domReply)
            if (!domReply){
                console.error("TextMessageFormatter._addReplyComponentToMessage(): domReply is " + domReply + ", aborting!");
                return undefined;
            }
            domMsg.appendChild(domReply);

            //need to handle some cases
            //move senderName component up, increase top margin
            const domSenderName = domMsg.querySelector("."+this._classNames.senderName);
            if (domSenderName) {
                const h = getComputedStyle(domReply).getPropertyValue("height")
                //console.log(h)
                domSenderName.style.setProperty("top", this._spacing.topReplySenderName);
                this._addToCssProperty(domMsg, "margin-top", this._spacing.marginTopReplySenderNameAddition, "px");
            } else {//case with no sendername, we still need to increase top margin
                this._addToCssProperty(domMsg, "margin-top", this._spacing.marginTopReplyAddition, "px");
            }
        }

        _updateReplyComponent(message, domMsg){
            const domReplyContents = domMsg.querySelector("."+this._classNames.replyContents);
            const replyTo = message.replyTo;
            if (replyTo) domReplyContents.textContent = this._processTextWithMaxLength(replyTo.contents, this._settings.maxReplyLength);
            else domReplyContents.textContent = this._processTextWithMaxLength(this._settings.messageDeletedText, this._settings.maxReplyLength);
        }

        _updateReplyComponentOfRepliesFromArray(repliesFrom){
            for (let i=0; i< repliesFrom.length; i++){
                const msgIndexOfReply = this.messages.indexOf(repliesFrom[i]);
                if (msgIndexOfReply < 0) {
                    console.error("TextMessageFormatter._updateReplyComponentOfRepliesFromArray(): msgIndexOfReply is negative");
                    return undefined;
                }
                const domMsgOfReply = this._messagesInDom[msgIndexOfReply];
                this._updateReplyComponent(repliesFrom[i], domMsgOfReply);
            }
        }

        //CSS CHANGING METHODS BELOW ----------

        _getCssIntValue(variableName, element=document.documentElement){//get raw int value of a css property/variable
            return this._parseIntOrZero(getComputedStyle(element).getPropertyValue(variableName));
        }//TODO refactor other CSS methods to use this function

        _getCssProperty(domMsg, property=null){
            if (property) return getComputedStyle(domMsg).getPropertyValue(property);
            return getComputedStyle(domMsg); //if propery is null (default value), then return all css values
        }

        _setCssProperty(element, property, newValue){
            element.style.setProperty(property, newValue);
        }

        _parseIntOrZero(value){
            const parsedInt = parseInt(value) || 0;
            return parsedInt;
        }

        //add to an element's CSS value
        //intended to be used for extending margins or padding
        //ASSUMES cssUnits IS SAME AS CSS UNITS OF VALUE BEING EDITTED, OTHERWISE RESULT MAY BE UNEXPECTED
        _addToCssProperty(element, property, intValue, cssUnits="px"){

            //const property = "margin-"+direction;
            const parsedIntValue = this._parseIntOrZero(intValue);
            const currValue = this._parseIntOrZero(this._getCssProperty(element, property));//assumes you already know what CSS units are being used, otherwise you override that info with cssUnits argument
            const newValue = currValue + parsedIntValue;
            this._setCssProperty(element, property, newValue+cssUnits);
        }

        _getMessageComponentCss(messageId, selector, property=null){
            const component = this._getMessageComponent(messageId, selector);
            if (property) return getComputedStyle(component).getPropertyValue(property);
            return getComputedStyle(component); //if propery is null (default value), then return all css values
        }

        _editMessageComponentCss(messageId, selector, property, newValue){
            const component = this._getMessageComponent(messageId, selector);
            component.style.setProperty(property, newValue);
        }
    }



    //Adding to global scope
    global.TextMessageFormatter = global.TextMessageFormatter || TextMessageFormatter;
    global.TMFSettings = global.TMFSettings || TMFSettings;
    global.TMFMessage = global.TMFMessage || TMFMessage;
    global.TMFOrientationEnum = global.TMFOrientationEnum || TMFOrientationEnum;

})(window, window.document);