var backgroundName = ["blackbg", "redbg", "greenbg", "yellowbg", "bluebg", "magentabg", "cyanbg", "whitebg"];
var foregroundName = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
var defaultBackground = 0;
var defaultForeground = 7;

var rowNumber = 0;
var colNumber = 0;
var doubleHeight = false;
var doubleHeightThisRow = false;
var doubleHeightSecondRow = false; // Note: In BBC Mode 7 the colours can be different in the second row, with Teletext the row is copied
var doubleHeightPreviousRow = {};
var holdMode = false;
var heldCharacterVal = 32;
var flashingMode = false;
var concealMode = false;
var graphicsMode = false;
var separatedGraphics = false;
var foregroundColour = defaultForeground;
var backgroundColour = defaultBackground;
var inSpan = false;
var inFlashingSpan = false;
var lineData = "";
var outputData = "";
var charsPerRow=40;
var rowsPerScreen=25;

var initDone=false;
var loadingAsPartOfInit=false;
function initTeletext() {
	var initFrame = "1";
	var initPage = "100";
	var initSub = "1";
	var playStart=false;
	var playTime="";
	
	// parse parameters
    var decoded = decodeURIComponent(location.search);
	var paramstr=decoded.replace("?","");
	var params=paramstr.split("&");
	for (var i=0; i<params.length; i++) {
		var pair=params[i].split("=");
		if (pair[0]=="f") {
			initFrame = pair[1];
		} else if (pair[0]=="p") {
			var pagesubpair = pair[1].split("/");
			if (pagesubpair.length == 2) {
				initPage = pagesubpair[0];
				initSub = pagesubpair[1];
			} else {
				initPage = pagesubpair[0];
			}
		} else if (pair[0]=="t") {
			playStart = true;
			playTime = pair[1];
		}
	}
	
    // ugh, this is asyncronous- just add a nasty hack
    loadingAsPartOfInit = true;
	document.getElementById("sampleframes").selectedIndex=parseInt(initFrame);
	loadSampleFrame();
	
	var pagenum = document.getElementById("pagenum");
	var subpagenum = document.getElementById("subpagenum");	
	pagenum.value = initPage;
	subpagenum.value = initSub;
	updateFrameOutput();
	
	if (playStart) {
		var playdelay = document.getElementById("playdelay");
		playdelay.value=playTime;
		playClicked();
	}
    initDone=true;
}

var allowCurrentlyPlayingFirstTime = true;
function updateCurrentUrl() {
    if (!initDone) {
        return;
    }
    
    // Ugly hack to only update once when 'play'ing
    if (currentlyPlaying) {
        if (allowCurrentlyPlayingFirstTime) {
            allowCurrentlyPlayingFirstTime = false;
        } else {
            return;
        }
    } else {
        allowCurrentlyPlayingFirstTime = true;
    }
    
    // only really makes sense to customise the URL if we have selected from the dropdown list
    var baseurl = window.location.href.split("?")[0];
    var finalurl ="";
    var sampleframes = document.getElementById("sampleframes");
    if (sampleframes.selectedIndex > 0) {
        var pagenum = document.getElementById("pagenum");
        var subpagenum = document.getElementById("subpagenum");	
        finalurl = baseurl + "?f=" + sampleframes.selectedIndex.toString();
        finalurl += "&p=" + pagenum.value + "/" +subpagenum.value;
        if (currentlyPlaying) {
            var playdelay = document.getElementById("playdelay");
            finalurl += "&t="+ playdelay.value;
        }
    } else {
        finalurl = baseurl;
    }
    
    if (finalurl != window.location.href) {
        window.history.replaceState({"Galax":"Teletext"}, 'Galax Teletext', finalurl);
    }
}


function updateOutput() {
    charsPerRow = parseInt(document.getElementById("numcols").value)
    if (isNaN(charsPerRow) || charsPerRow<1) {
        charsPerRow = 40;
    }
    rowsPerScreen = parseInt(document.getElementById("numrows").value)
    if (isNaN(rowsPerScreen) || rowsPerScreen<1) {
        rowsPerScreen = 25;
    }

    rowNumber = 0;
    colNumber = 0;
    outputData = "";
    newLineSetDefaults();
    doubleHeightPreviousRow = {};
	
    var inputtext = document.getElementById("inputtext");
    var htmloutput = document.getElementById("htmloutput");
    var textoutput = document.getElementById("textoutput");
    var t40output = document.getElementById("t40output");
	var doubleecho = document.getElementById("doubleecho");
    textoutput.value = '<div class="teletext">';
	t40output.value ="";

    var slashFound = false;
    var slashHexFound = false;
    var slashDecFound = false;
    var slashChars = "";
    	
    var indata = inputtext.value;
    for (var x=0; x<indata.length; x++) {
        newchar = indata[x];
        newval = newchar.charCodeAt();
        
        // ugly escaping code
        if (slashFound) {
            if (newchar.toLowerCase() == "x") {
                slashHexFound = true;
                slashFound = false;
                continue;
            } else if (newchar.toLowerCase() == "d") {
                slashDecFound = true;
                slashFound = false;
                continue;
            } else {
                // let it through
                slashFound = false;
            }
        } else if (slashHexFound) {
            slashChars += newchar;
            if (slashChars.length == 2) {
                newval = parseInt("0x"+slashChars);
                newchar = String.fromCharCode(newval);
                slashHexFound = false;
                slashChars = "";
            } else {
                continue;
            }
        } else if (slashDecFound) {
            slashChars += newchar;
            if (slashChars.length == 3) {
                newval = parseInt(slashChars);
                newchar = String.fromCharCode(newval);
                slashDecFound = false;
                slashChars = "";
            } else {
                continue;
            }
        } else if (newval == 92) {
            slashFound = true;
            continue;
        }
        
        // Special characters less than 32 are moved up above 128
        // Characters above 159 are moved down into printable 
        // character range. Teletext ignores bit 7.
        if (newval < 32) {
            newval += 128
        } else if (newval > 159) {
            newval -= 128
        }
		
		// If selected, store the double height row characters and copy to the next row
		if (doubleHeightSecondRow) {
			if (doubleecho.checked && colNumber in doubleHeightPreviousRow) {
				newval = doubleHeightPreviousRow[colNumber];
			}
		} else {
			// store just in case we need the for a double height row
			doubleHeightPreviousRow[colNumber] = newval;
		}
	
		t40output.value += formatTwoDigitHex(newval);

        // handle control codes and special characters here
        switch (newval) {
            case 128: // Nothing
            case 138: // Nothing
            case 139: // Nothing
            case 142: // Nothing
            case 143: // Nothing
            case 144: // Nothing
            case 155: // Nothing
                addControlCodeSpace();
//                addValToLine(32); // Map to a space.
                break;              
            case 129: // Alpha Red
            case 130: // Alpha Green
            case 131: // Alpha Yellow
            case 132: // Alpha Blue
            case 133: // Alpha Magenta
            case 134: // Alpha Cyan
            case 135: // Alpha White
                addControlCodeSpace();
                if (graphicsMode) {
                    heldCharacterVal = 32; // reset held character if graphics mode changes
                }
                graphicsMode = false; // Set After
                concealMode = false;
                foregroundColour = newval - 128;
                enterSpan();
                break;
            case 136:
                // Flash
                addControlCodeSpace();
                flashingMode = true; // Set-After
                enterSpan();
                break;
            case 137:
                // Steady
                flashingMode = false; // Set-At
                enterSpan();
                addControlCodeSpace();
                break;
            case 140: // Normal Size
                if (doubleHeight) {
                    heldCharacterVal = 32; // reset held character if character size changes
                }
                doubleHeight = false; // Set-At
                addControlCodeSpace();
                break;
            case 141: // Double Height
                if (!doubleHeight) {
                    heldCharacterVal = 32; // reset held character if character size changes
                }
                addControlCodeSpace();
                doubleHeight = true; // Set After
                doubleHeightThisRow = true;
                break;
            case 145: // Mosaics Red
            case 146: // Mosaics Green
            case 147: // Mosaics Yellow
            case 148: // Mosaics Blue
            case 149: // Mosaics Magenta
            case 150: // Mosaics Cyan
            case 151: // Mosaics White
                if (!graphicsMode) {
                    heldCharacterVal = 32; // reset held character if graphics mode changes
                }
                foregroundColour = newval - 144;
                addControlCodeSpace();
                graphicsMode = true; // Set-After
                concealMode = false;
                enterSpan();
                break;
            case 152:
                // Conceal
                concealMode = true;  // Set-At
                enterSpan();
                addControlCodeSpace();
                break;
            case 153:
                // Contiguous Mosaic Graphics
                separatedGraphics = false; // Set-At
                addControlCodeSpace();
                break;
            case 154:
                // Separated Mosaic Graphics
                separatedGraphics = true; // Set At
                addControlCodeSpace();
                break;
            case 156:
                // Black Background
                backgroundColour = 0;
                enterSpan(); // Set-At
                addControlCodeSpace();
                break;
            case 157:
                // New Background 
                backgroundColour = foregroundColour;
                enterSpan(); // Set-At
                addControlCodeSpace();
                break;
            case 158:
                // Hold Mosaics
                holdMode = true; // Set-At
                addControlCodeSpace();
                break;
            case 159:
                // Release Mosaics
                addControlCodeSpace();
                holdMode = false; // Set-After
                break;
            default:
                handleNonControlCode(newval)
                break;
        }
    }
    
    finishLine(false);
    textoutput.value += "</div>"

	var outputWithLinks = outputData.replace(/([^0-9]|^)([0-9]{3})(?=[^0-9;]|$)/g, '$1<a href="javascript:goToPage($2)">$2</a>');
    htmloutput.innerHTML = outputWithLinks;
    
    if (!textConcealed) {
        revealClicked();
    }
    
    updateCurrentUrl();
}

function handleNonControlCode(newval)
{
    var convertedVal = 0;
    var isalpha = false;
    if (graphicsMode) {
        if (newval >=  32 && newval <= 63) {
            convertedVal = newval + 0xE200 - 32; // map graphics blocks directly                
        } else if (newval >= 64 && newval <= 94) {
            convertedVal = newval;
            isalpha = true;
        } else if (newval >= 95 && newval <= 127) {
            // subtract 96 because first glyph had bit 1, not empty
            convertedVal = newval + 0xE200 - 96 + 32; // bottom right square value changed from 64 to 32
        }
        if (!isalpha){
            if (doubleHeight) {
                if (doubleHeightSecondRow) {
                    convertedVal += 0x80; // bottom half
                } else {
                    convertedVal += 0x40; // top half
                }
            }
            if (separatedGraphics) {
                convertedVal += 0xC0;
            }
        }
        heldCharacterVal = convertedVal; // save it for later
    } else {
        isalpha = true;
        if (newval ==  92) {
            convertedVal = 0xBD; // 1/2 symbol
        //} else if (newval == 96) {
            //convertedVal = 0x60; // em dash (shifted up one place due to browser weirdness)
        } else if (newval == 35) {
            convertedVal = 0xA3;  // pound currency symbol
        } else if (newval == 123) {
            convertedVal = 0xBC;  // 1/4 symbol
        } else if (newval == 125) {
            convertedVal = 0xBE;  // 3/4 symbol
        } else if (newval == 126) {
            convertedVal = 0xF7; // division symbol
        } else if (newval == 95) {
            convertedVal = 0x23; // # sign
        } else if (newval == 127) {
            convertedVal = 0xB6; // box character, uses paragraph mark
        } else {
            // assume the character is otherwise OK
            convertedVal = newval;
        }
    }
    
    if (isalpha && doubleHeight) {
        if (doubleHeightSecondRow) {
            convertedVal += 0xE100; // bottom half
        } else {
            convertedVal += 0xE000; // top half
        }
    }

    if (!doubleHeight && doubleHeightSecondRow) {
        // On the second double height row, can only output double height characters
        addValToLine(32);               
    } else {
        addValToLine(convertedVal);            
    }
}

function enterSpan() {
    if (inSpan) {
        lineData += "</span>";
		inSpan = false;
    }
    if (inFlashingSpan) {
        lineData += "</span>";
		inFlashingSpan = false;
    }
    if (   backgroundColour != defaultBackground
        || foregroundColour != defaultForeground
        || concealMode) {
        var span = ""
        if (foregroundColour != defaultForeground) {
            if (span.length) { span += " "; }
            span += foregroundName[foregroundColour];
        }
        if (backgroundColour != defaultBackground) {
            if (span.length) { span += " "; }
            span += backgroundName[backgroundColour];
        }
        if (concealMode) {
            if (span.length) { span += " "; }
            span += "conceal";
        }
        span = '<span class="' + span + '">';
        lineData += span;
        inSpan = true;
    }
	
	if (flashingMode) {
		lineData += '<span class="flashing">';
        inFlashingSpan = true;
	}
}    

function addControlCodeSpace() {
    if (!doubleHeight && doubleHeightSecondRow) {
        // On the second double height row, can only output double height characters
        lineData += " ";
    } else {
        if (holdMode) {
            lineData += String.fromCharCode(heldCharacterVal);
        } else {
            lineData += " ";
        }
    }
    colNumber += 1;
    if (colNumber >= charsPerRow) {
        finishLine(true);
    }
}

function addValToLine(val) {
    if (val >= 32 && val <= 125) {
        // output common characters and newlines without encoding
        var outchar = String.fromCharCode(val);
        if (outchar == "<") {
            outchar = "&lt;";
        } else if (outchar == ">") {
            outchar = "&gt;";
        } else if (outchar == '"') {
            outchar = "&quot;";
        } else if (outchar == "&") {
            outchar = "&amp;";
        }

        lineData += outchar;
    } else {
        var entity = "&#x" + val.toString(16) + ";";
        lineData += entity;
    }
    colNumber += 1;
    if (colNumber >= charsPerRow) {
        finishLine(true);
    }
}

function finishLine(addNewline) {
    if (inSpan) {
        lineData += "</span>"
    }
    if (inFlashingSpan) {
        lineData += "</span>"
    }
    if (addNewline) {
        lineData += "\n";
    }
    textoutput.value += lineData;
    outputData += lineData;
    
    rowNumber += 1;
    colNumber = 0;
    
    if (doubleHeightThisRow && !doubleHeightSecondRow) {
        doubleHeightSecondRow = true;
    } else if (doubleHeightSecondRow) {
        doubleHeightSecondRow = false;
		doubleHeightPreviousRow = {};
    } else {
		doubleHeightPreviousRow = {};
	}
    
    newLineSetDefaults();
}

function newLineSetDefaults() {
    // defaults
    doubleHeight = false;
    doubleHeightThisRow = false;
    holdMode = false;
    heldCharacterVal = 32;
    flashingMode = false;
    concealMode = false;
    graphicsMode = false;
    separatedGraphics = false;
    backgroundColour = defaultBackground;
    foregroundColour = defaultForeground;
    inSpan = false;
    inFlashingSpan = false;
    lineData = "";    
}

function handleFileSelect(evt) {
    var inputtext = document.getElementById("inputtext");
    var cleared = false;
    
    var files = evt.target.files; // FileList object
    // files is a FileList of File objects. List some properties.

    for (var i = 0, f; f = files[i]; i++) {
      var reader = new FileReader();
      reader.onload = function(e) { 
        var contents = e.target.result;
        if (!cleared) {
            inputtext.value = "";
            cleared = true;
        }
        var fileExt = this.name.split(".").pop().toUpperCase();        
        processRawFile(contents, true, fileExt != "M7");         
      }.bind(f)
      reader.readAsBinaryString(f);

      // protect against too many files
      if (i==10) {
          break;
      }
    }
}

function handleFrameSelect(evt) {
    var inputtext = document.getElementById("inputtext");
    var cleared = false;
    
    var files = evt.target.files; // FileList object
    // files is a FileList of File objects. List some properties.

    for (var i = 0, f; f = files[i]; i++) {
      var reader = new FileReader();
      reader.onload = function(e) { 
        var contents = e.target.result;
        if (!cleared) {
            inputtext.value = "";
            cleared = true;
        }
        var fileExt = this.name.split(".").pop().toUpperCase();        
        processFrames(contents);         
      }.bind(f)
      reader.readAsBinaryString(f);

      // protect against too many files
      if (i==10) {
          break;
      }
    }
}

var formatTwoDigitHex = function(val) {
    return (val < 16 ? "0" : "") + val.toString(16); 
}

function addCharToInput(inputtext, val) {
	newval = val & 0xff; // throw away high-order byte (f7)
	newchar = String.fromCharCode(newval);
	
	if (newval == 92 && escapeBackslashes) {
		inputtext.value += "\\\\"; // escape slash with a double slash
	} else if (newval >= 32 && newval <= 125) {
		inputtext.value += newchar;
	} else {
		inputtext.value += "\\x"+formatTwoDigitHex(newval);
	}
}  

function processRawFile(contents, leaveInputAlone, escapeBackslashes) {
    var inputtext = document.getElementById("inputtext");
    
    if (!leaveInputAlone) {
        inputtext.value = "";
    }
    
    var newval = 0;
    var unprocessedval = 0;
    var newchar = "";
    var unprocessedChar = "";
    
    for (x in contents) {
        // have to take the low byte only like this due to the weird result
        // that comes back from the HTTP request when getting binary data.
        unprocessedchar = contents[x];
        unprocessedval = unprocessedchar.charCodeAt();
		
		addCharToInput(inputtext, unprocessedval)

        if (x > 5000) {
            // protect against huge files
            break;
        }            
    }
      
    // inputtext.value += "\n";
    updateOutput(); 
}

var frames = {}
function processFrames(contents) {
    frames = {}
	var framesparse = contents.split("\n")
	for (var i = 0; i < framesparse.length; i++) {
		var frame = framesparse[i];		
		var fields=frame.split(",");
		var page=parseInt(fields[0])
		var subPage = parseInt(fields[1])
		if (!(page in frames)) {
			frames[page] = {} 
		}
		frames[page][subPage] = fields[3];
	}

	// Assume double echo is needed for frames
	document.getElementById("doubleecho").checked=true;
	
    if (loadingAsPartOfInit) {
        loadingAsPartOfInit = false;
        updateFrameOutput(); 
    } else {
        goToPage(100);
    }
}

function makeHttpObject() {
  try {return new XMLHttpRequest();}
  catch (error) {}
  try {return new ActiveXObject("Msxml2.XMLHTTP");}
  catch (error) {}
  try {return new ActiveXObject("Microsoft.XMLHTTP");}
  catch (error) {}

  throw new Error("Could not create HTTP request object.");
}

function simpleHttpRequest(url, success, failure) {
  var request = makeHttpObject();
  request.open("GET", url, true);
  request.overrideMimeType('text\/plain; charset=x-user-defined');
  request.send(null);
  request.onreadystatechange = function() {
    if (request.readyState == 4) {
      if (request.status == 200) {
        var fileExt = request.responseURL.split(".").pop().toUpperCase();
        success(request.responseText, false, fileExt != "M7");
      }
      else if (failure) {
        failure(request.status, request.statusText);
      }
    }
  };
}

function loadSampleFile() {
    var samplefiles = document.getElementById("samplefiles");
    simpleHttpRequest(samplefiles.value, processRawFile);
}

function loadSampleFrame() {
    var sampleframes = document.getElementById("sampleframes");
    simpleHttpRequest(sampleframes.value, processFrames);
}

var textConcealed=true;
function revealClicked() {
    var oldclass = "";
    var newclass = "";
    if (textConcealed) {
        document.getElementById("revealButton").innerHTML="Conceal";
        textConcealed = false;
        oldclass = "conceal";
        newclass = "reveal";
    } else {
        document.getElementById("revealButton").innerHTML="Reveal";
        textConcealed = true;
        oldclass = "reveal";
        newclass = "conceal";
    }
    var clsElements = document.querySelectorAll("." + oldclass);
    for (var i=0, max=clsElements.length; i < max; i++) {
        var element = clsElements[i];
        element.classList.add(newclass)
        element.classList.remove(oldclass)
    }   
}

var currentlyPlaying=false;
function playClicked() {
	if (currentlyPlaying) {
        document.getElementById("playButton").innerHTML="Play";
		currentlyPlaying = false;
        updateCurrentUrl();
	} else {
        document.getElementById("playButton").innerHTML="Stop";
		currentlyPlaying = true;
        var playdelay = document.getElementById("playdelay");
        var interval = playdelay.value;
        window.setTimeout(updateAnimation, parseInt(interval));
	}
}

function updateAnimation() {
    if (currentlyPlaying) {
        subpageupClicked();
        var playdelay = document.getElementById("playdelay");
        var interval = playdelay.value;
        window.setTimeout(updateAnimation, parseInt(interval));
    }
}

function updateFrameOutput() {
    var inputtext = document.getElementById("inputtext");
	var pagenum = document.getElementById("pagenum");
	var subpagenum = document.getElementById("subpagenum");	
	var page = parseInt(pagenum.value);
	var subpage = parseInt(subpagenum.value);
	if (page>0 && page in frames) {
		inputtext.value = "";
		var carousel = frames[page];
		if (subpage in carousel) {
			framedata = carousel[subpage];
			var splitdata = framedata.match(/.{1,2}/g);
			for (var i=0; i<splitdata.length; i++) {
				var hexchar = splitdata[i];
				var intchar = parseInt("0x"+hexchar);				
				addCharToInput(inputtext, intchar);
			}
		}
	}
    updateOutput(); 
}

function pageupClicked() {
	var pagenum = document.getElementById("pagenum");
	var subpagenum = document.getElementById("subpagenum");
	var page = parseInt(pagenum.value);
	var testpage = page+1;
	while (testpage != page) {
		if (testpage > 999) {
			testpage = 100;
		}
		if (testpage in frames) {
			var carousel = frames[testpage];
			var len=Object.keys(carousel).length;
			document.getElementById("numsubpages").innerHTML = len.toString();
			pagenum.value = testpage.toString();
			subpagenum.value = "0";
			subpageupClicked();
			break;
		}
		testpage +=1;
	}
}
function pagedownClicked(subpagedown) {
	subpagedown = typeof subpagedown == 'boolean' ? subpagedown : false; // default value
	var pagenum = document.getElementById("pagenum");
	var subpagenum = document.getElementById("subpagenum");
	var page = parseInt(pagenum.value);
	var testpage = page-1;
	while (testpage != page) {
		if (testpage < 100) {
			testpage = 999;
		}
		if (testpage in frames) {
			var carousel = frames[testpage];
			var len=Object.keys(carousel).length;
			document.getElementById("numsubpages").innerHTML = len.toString();
			pagenum.value = testpage.toString();
			if (subpagedown) {
				subpagenum.value = "1000";
				subpagedownClicked();
			} else {
				subpagenum.value = "0";
				subpageupClicked();
			}
			break;
		}
		testpage -=1;
	}
}
function subpageupClicked() {
	var pagenum = document.getElementById("pagenum");
	var subpagenum = document.getElementById("subpagenum");
	var page = parseInt(pagenum.value);
	var subpage = parseInt(subpagenum.value);
	if (page in frames) {
		var carousel = frames[page];
		var testsubpage = subpage+1;
		while (testsubpage != subpage) {
			if (testsubpage > 999) {
				pageupClicked();
				break;
			}
			if (testsubpage in carousel) {
				subpagenum.value = testsubpage.toString();
				updateFrameOutput();
				break;
			}
			testsubpage +=1;
		}
	}
}
function subpagedownClicked() {
	var pagenum = document.getElementById("pagenum");
	var subpagenum = document.getElementById("subpagenum");
	var page = parseInt(pagenum.value);
	var subpage = parseInt(subpagenum.value);
	if (page in frames) {
		var carousel = frames[page];
		var testsubpage = subpage-1;
		while (testsubpage != subpage) {
			if (testsubpage < 0) {
				pagedownClicked(true);
				break;
			}
			if (testsubpage in carousel) {
				subpagenum.value = testsubpage.toString();
				updateFrameOutput();
				break;
			}
			testsubpage -=1;
		}
	}
}
function goToPage(newpage) {
	var pageBefore = newpage-1;
	var pagenum = document.getElementById("pagenum");
	pagenum.value=pageBefore.toString();
	pageupClicked();
}
