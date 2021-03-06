

const socket = io.connect("http://localhost:8080");
console.log("Connecting to server .......");


function strIns(str, idx, val){
  return  (str.slice(0, idx) + val + str.slice(idx));
};
function strDel(str, idx, num=1){
  var res = str.slice(0, idx) + str.slice(idx + num);
  return res;
};
function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

socket.on('connect', function () {
  const isNullJSON = function(obj) {
    return obj && obj.constructor === Object
  }

  console.log("Success!!");
  
  socket.on('message',function(msg){//サーバからのレスポンスを受け取る
    var jmsg = JSON.parse(msg);
    let val = document.getElementById('EditorTextArea');

    switch(jmsg.type){
      case "text-change":
        console.log("new change!");
        jmsg.data.forEach(change => {
          switch(change.type){
            case "insert":
            val.innerText = strIns(val.innerText, change.index, change.str)
            break;

            case "delete":
            val.innerText = strDel(val.innerText, change.index, change.strlen)
            break;
          }
        });

      // case "curMove":
      //   if(jmsg.delete !== 0){
      //     console.log(jmsg.delete);
      //     val.innerHTML = strDel(val.innerHTML, jmsg.c.start-1, jmsg.delete);
      //   }
      //   if(jmsg.insert !== ""){
      //     val.innerHTML = strIns(val.innerHTML, jmsg.c.start, jmsg.insert);
      //   }
    }
    HighlightingEditor();
  });

  socket.on('exit',function(msg){//終了を受け取ったらSocket通信を終了する
    console.log(msg);
    socket.disconnect()
  });
});



var cursor_pos; // 現在のカーソル位置を指定するグローバル変数。
var cmdNum = 0;
var nowIME = false;
var lastIMEstr = "";

function updateCursorPos(element) {
    var startOffset = 0, endOffset = 0;
    if (typeof window.getSelection != "undefined") {
        var range = window.getSelection().getRangeAt(0);
        var preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        startOffset = preCaretRange.toString().length;
        endOffset = startOffset + range.toString().length;
    } else if (typeof document.selection != "undefined" &&
        document.selection.type != "Control") {
        var textRange = document.selection.createRange();
        var preCaretTextRange = document.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToStart", textRange);
        startOffset = preCaretTextRange.text.length;
        endOffset = startOffset + textRange.text.length;
    }

    // 行と行内の位置を取得する
    var p = element.innerHTML.substr(0, startOffset).split("\n");
    var _line = p.length;
    var _col = p[p.length-1].length;

    cursor_pos = { start: startOffset, end: endOffset, line:_line, col:_col, isSelectingRange: startOffset !== endOffset };
}


function HighlightingEditor(){
  var output_html = "";
  var markdown_txt = document.getElementById('EditorTextArea').innerText;

  // while(true){
  //   var l = getNextLine();
  //   if(l === null) break;
  //   output_html += l;
  // }

  // console.log(output_html)

  // //ul
  // md = md.replace(/^\s*\n\*/gm, '<ul>\n*');
  // md = md.replace(/^(\*.+)\s*\n([^\*])/gm, '$1\n</ul>\n\n$2');
  // md = md.replace(/^\*(.+)/gm, '<li>$1</li>');
  
  // //ol
  // md = md.replace(/^\s*\n\d\./gm, '<ol>\n1.');
  // md = md.replace(/^(\d\..+)\s*\n([^\d\.])/gm, '$1\n</ol>\n\n$2');
  // md = md.replace(/^\d\.(.+)/gm, '<li>$1</li>');
  
  // //blockquote
  // md = md.replace(/^\>(.+)/gm, '<blockquote>$1</blockquote>');
  
  // //font styles
  // md = md.replace(/[\*\_]{2}([^\*\_]+)[\*\_]{2}/g, '<b>$1</b>');
  // md = md.replace(/[\*\_]{1}([^\*\_]+)[\*\_]{1}/g, '<i>$1</i>');
  // md = md.replace(/[\~]{2}([^\~]+)[\~]{2}/g, '<del>$1</del>');
  
  // //pre
  // md = md.replace(/^\s*\n\`\`\`(([^\s]+))?/gm, '<pre class="$2">');
  // md = md.replace(/^\`\`\`\s*\n/gm, '</pre>\n\n');
  
  // //code
  // md = md.replace(/[\`]{1}([^\`]+)[\`]{1}/g, '<code>$1</code>');
  
  // //p
  // md = md.replace(/^\s*(\n)?(.+)/gm, function(m){
  //   return  /\<(\/)?(h\d|ul|ol|li|blockquote|pre|img)/.test(m) ? m : '<p>'+m+'</p>';
  // });
  
  // //strip p from pre
  // md = md.replace(/(\<pre.+\>)\s*\n\<p\>(.+)\<\/p\>/gm, '$1$2');
  

  var escapes = [
      [/&/g, "&amp;"],
      [/\\\\/g, "&#92"],
      [/\\\(/g, "&#40"],
      [/\\\)/g, "&#41"],
      [/\\\*/g, "&#42"],
      [/\\\[/g, "&#91"],
      [/\\\]/g, "&#93"],
      [/\\_/g, "&#95"],
      [/\\`/g, "&#96"],
      [/\\~/g, "&#126"],
      [/>/g, "&gt;"],
      [/</g, "&lt;"],
  ];

  var inner_tags = [
      [/\*{2}(.+?)\*{2}/g, "<cpan class=\"e-strong\">**$1**</span>"],
      [/ _{2}(.+?)_{2} /g, "<cpan class=\"e-strong\">__$1__</span>"],
      [/~(\*)\*(.+?)\*~(\*)/g, "<cpan class=\"e-em\">*$1*</span>"],
      [/ _(.+?)_ /g, "<cpan class=\"e-em\">_$1_</span>"],
      [/`(.+?)`/g, "<cpan class=\"e-code\">`$1`</span>"],
      [/~~(.+?)~~/, "<cpan class=\"e-del\">~~$1~~</span>"],

      //image
      [/!\[(.*?)\]\((.*?)\)/g, "<span class=\"e-img\">![$1](<a href=\"$2\"><span class=\"e-link\">$2</span></a>)</span>"],
      
      // link
      [/~(\!)\[(.*?)\]\((.*?)\)/g, "<span class=\"e-link\">[$1](<a href=\"$2\"><span class=\"e-link\">$2</span></a>)</span>"],

      // native url
      [/~(<span class=\"e-link\">)(\b(https?|ftp|file|http):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, "<a href=\"$1\" class=\"e-link\">$1</a>"],

  ];

  var line_tags = [
      [/^\# (.+)\n/gm, "<span class=\"e-h1\"># $1</span>\n"],
      [/^[\#]{2} (.+)\n/gm, "<span class=\"e-h2\">## $1</span>\n"],
      [/^[\#]{3} (.+)\n/gm, "<span class=\"e-h3\">### $1</span>\n"],
      [/^[\#]{4} (.+)\n/gm, "<span class=\"e-h4\">#### $1</span>\n"],
      [/^[\#]{5} (.+)\n/gm, "<span class=\"e-h5\">##### $1</span>\n"],
      [/^[\#]{6} (.+)\n/gm, "<span class=\"e-h6\">###### $1</span>\n"],
      
      [/^(.+)\n\===(.+)/gm, "<span class=\"e-h1\">$1</span>\n===$2"],
      [/^(.+)\n\---(.+)/gm, "<span class=\"e-h2\">$1</span>\n---$2"],

      // blockquote
      [/^&gt; (.*?)\n/gm, "<span class=\"e-blockquote\">&gt; $1</span>\n"],

      // Listing
      [/^\- (.+)\n/gm, "<span class=\"e-li1\">- $1</span>\n"],
      [/^\* (.+)\n/gm, "<span class=\"e-li1\">* $1</span>\n"],
      [/^\+ (.+)\n/gm, "<span class=\"e-li1\">+ $1</span>\n"],

      [/^  \- (.+)\n/gm, "<span class=\"e-li2\">  - $1</span>\n"],
      [/^  \* (.+)\n/gm, "<span class=\"e-li2\">  * $1</span>\n"],
      [/^  \+ (.+)\n/gm, "<span class=\"e-li2\">  + $1</span>\n"],

      [/^    \- (.+)\n/gm, "<span class=\"e-li3\">    - $1</span>\n"],
      [/^    \* (.+)\n/gm, "<span class=\"e-li3\">    * $1</span>\n"],
      [/^    \+ (.+)\n/gm, "<span class=\"e-li3\">    + $1</span>\n"],
  ];

  escapes.forEach(function(x){ markdown_txt = markdown_txt.replace(x[0], x[1]) });
  line_tags.forEach(function(x){ markdown_txt = markdown_txt.replace(x[0], x[1]) });
  inner_tags.forEach(function(x){ markdown_txt = markdown_txt.replace(x[0], x[1]) });

  curTag = {tag:null, index:0, index_str:0}

  // inner_tags.forEach(function(x){ output_html = output_html.replace(x[0], x[1]) });

  document.getElementById('EditorTextArea').innerHTML = "<pre>" + markdown_txt  + "</pre>";
}


// function HighlightingEditor(){
//   var output_html = "";
//   var markdown_txt = document.getElementById('EditorTextArea').innerText;

//   // while(true){
//   //   var l = getNextLine();
//   //   if(l === null) break;
//   //   output_html += l;
//   // }

//   // console.log(output_html)

//   // //ul
//   // md = md.replace(/^\s*\n\*/gm, '<ul>\n*');
//   // md = md.replace(/^(\*.+)\s*\n([^\*])/gm, '$1\n</ul>\n\n$2');
//   // md = md.replace(/^\*(.+)/gm, '<li>$1</li>');
  
//   // //ol
//   // md = md.replace(/^\s*\n\d\./gm, '<ol>\n1.');
//   // md = md.replace(/^(\d\..+)\s*\n([^\d\.])/gm, '$1\n</ol>\n\n$2');
//   // md = md.replace(/^\d\.(.+)/gm, '<li>$1</li>');
  
//   // //blockquote
//   // md = md.replace(/^\>(.+)/gm, '<blockquote>$1</blockquote>');
  
//   // //font styles
//   // md = md.replace(/[\*\_]{2}([^\*\_]+)[\*\_]{2}/g, '<b>$1</b>');
//   // md = md.replace(/[\*\_]{1}([^\*\_]+)[\*\_]{1}/g, '<i>$1</i>');
//   // md = md.replace(/[\~]{2}([^\~]+)[\~]{2}/g, '<del>$1</del>');
  
//   // //pre
//   // md = md.replace(/^\s*\n\`\`\`(([^\s]+))?/gm, '<pre class="$2">');
//   // md = md.replace(/^\`\`\`\s*\n/gm, '</pre>\n\n');
  
//   // //code
//   // md = md.replace(/[\`]{1}([^\`]+)[\`]{1}/g, '<code>$1</code>');
  
//   // //p
//   // md = md.replace(/^\s*(\n)?(.+)/gm, function(m){
//   //   return  /\<(\/)?(h\d|ul|ol|li|blockquote|pre|img)/.test(m) ? m : '<p>'+m+'</p>';
//   // });
  
//   // //strip p from pre
//   // md = md.replace(/(\<pre.+\>)\s*\n\<p\>(.+)\<\/p\>/gm, '$1$2');
  

//   var escapes = [
//       [/&/g, "&amp;"],
//       [/\\\\/g, "&#92"],
//       [/\\\(/g, "&#40"],
//       [/\\\)/g, "&#41"],
//       [/\\\*/g, "&#42"],
//       [/\\\[/g, "&#91"],
//       [/\\\]/g, "&#93"],
//       [/\\_/g, "&#95"],
//       [/\\`/g, "&#96"],
//       [/\\~/g, "&#126"],
//       [/>/g, "&gt;"],
//       [/</g, "&lt;"],
//   ];

//   var inner_tags = [
//       [/\*{2}(.+?)\*{2}/g, "<cpan class=\"e-strong\">**$1**</span>"],
//       [/ _{2}(.+?)_{2} /g, "<cpan class=\"e-strong\">__$1__</span>"],
//       [/\*(.+?)\*/g, "<cpan class=\"e-em\">*$1*</span>"],
//       [/ _(.+?)_ /g, "<cpan class=\"e-em\">_$1_</span>"],
//       [/`(.+?)`/g, "<cpan class=\"e-code\">`$1`</span>"],
//       [/~~(.+?)~~/, "<cpan class=\"e-del\">~~$1~~</span>"],

//       //image
//       [/!\[(.+?)\]\((.+?)\)/g, "<span class=\"e-img\">![$1](<a href=$2><span class=\"e-link\">$2</span></a>)</span>"],
      
//       // link
//       [/\[(.+?)\]\((.+?)\)/g, "<span class=\"e-link\">[$1](<a href=$2><span class=\"e-link\">$2</span></a>)</span>"],

//       // native url
//       [/(\b(https?|ftp|file|http):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, "<a href=\"$1\" class=\"e-link\">$1</a>"],

//   ];

//   var line_tags = [
//       // headers
//       [/^\# (.+)/gm, "<span class=\"e-h1\"># $1</span>\n"],
//       [/^[\#]{2} (.+)/gm, "<span class=\"e-h2\">## $1</span>\n"],
//       [/^[\#]{3} (.+)/gm, "<span class=\"e-h3\">### $1</span>\n"],
//       [/^[\#]{4} (.+)/gm, "<span class=\"e-h4\">#### $1</span>\n"],
//       [/^[\#]{5} (.+)/gm, "<span class=\"e-h5\">##### $1</span>\n"],
//       [/^[\#]{6} (.+)/gm, "<span class=\"e-h6\">###### $1</span>\n"],
      
//       // [/^\# (.+)\n/gm, "<span class=\"e-h1\"># $1</span>\n"],
//       // [/^[\#]{2} (.+)\n/gm, "<span class=\"e-h2\">## $1</span>\n"],
//       // [/^[\#]{3} (.+)\n/gm, "<span class=\"e-h3\">### $1</span>\n"],
//       // [/^[\#]{4} (.+)\n/gm, "<span class=\"e-h4\">#### $1</span>\n"],
//       // [/^[\#]{5} (.+)\n/gm, "<span class=\"e-h5\">##### $1</span>\n"],
//       // [/^[\#]{6} (.+)\n/gm, "<span class=\"e-h6\">###### $1</span>\n"],
      
//       // [/^(.+)\n\===(.+)/gm, "<span class=\"e-h1\">$1</span>\n===$2"],
//       // [/^(.+)\n\---(.+)/gm, "<span class=\"e-h2\">$1</span>\n---$2"],

//       // blockquote
//       [/^\> (.+)\n/gm, "<span class=\"e-blockquote\">$1</span>"],


//       // Listing
//       [/^\- (.+)/gm, "<span class=\"e-li\">- $1</span>\n"],
//       [/^\* (.+)/gm, "<span class=\"e-li\">* $1</span>\n"],
//       [/^\+ (.+)/gm, "<span class=\"e-li\">+ $1</span>\n"],
//   ];

//   escapes.forEach(function(x){ markdown_txt = markdown_txt.replace(x[0], x[1]) });

//   // input = markdown.trim();
//   var lines = markdown_txt.split(/\r?\n/);
//   var curLine = 0;
//   lines.forEach(lstr => {
//     var lstr_2 = lstr;
//     line_tags.forEach(function(x){ lstr_2 = lstr_2.replace(x[0], x[1]) });
//   });

//   inner_tags.forEach(function(x){ output_html = output_html.replace(x[0], x[1]) });

//   curTag = {tag:null, index:0, index_str:0}

//   // inner_tags.forEach(function(x){ output_html = output_html.replace(x[0], x[1]) });

//   document.getElementById('EditorTextArea').innerHTML = output_html;
// }


// function getCursorPos(element) {
//   var sel, range;
//   var res = {start:0, end:0};
//   if (window.getSelection) {
//     sel = window.getSelection();
//     if (sel.rangeCount) {
//       range = sel.getRangeAt(0);
//       if (range.commonAncestorContainer.parentNode == element) {
//         res.start = range.endOffset;
//       }
//     }
//   } else if (document.selection && document.selection.createRange) {
//     range = document.selection.createRange();
//     if (range.parentElement() == element) {
//       var tempEl = document.createElement("span");
//       element.insertBefore(tempEl, element.firstChild);
//       var tempRange = range.duplicate();
//       tempRange.moveToElementText(tempEl);
//       tempRange.setEndPoint("EndToEnd", range);
//       res.start = tempRange.text.length;
//     }
//   }
//   return res;
// }

function getCursorPos(element, keycode) {
  const range = window.getSelection().getRangeAt(0);
  const prefix = range.cloneRange();
  prefix.selectNodeContents(element);
  prefix.setEnd(range.endContainer, range.endOffset);

  var ll = prefix.toString().length;
  if(keycode === 13){
    // console.log(prefix.toString()[ll-1], prefix.toString()[ll], prefix.toString()[ll+1],)
    ll += 1;
  }
  return ll;
};


// function setCursorPos(element, pos){
//   console.log(pos);
//     if(pos < 0) pos = 0;
//     if(pos > element.innerHTML.length) pos = element.innerHTML.length;
//     var range = document.createRange()
//     var sel = window.getSelection()
//     range.setStart(element.childNodes[0], pos)
//     range.collapse(true)
//     sel.removeAllRanges()
//     sel.addRange(range)
// }

function setCursorPos(pos, element){
  console.log(pos)
  for (const node of element.childNodes) {
    if (node.nodeType == Node.TEXT_NODE) {
      if (node.length >= pos) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(node, pos);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return -1;
      } else {
        pos = pos - node.length;
      }
    } else {
      pos = setCursorPos(pos, node);
      if (pos < 0) {
        return pos;
      }
    }
  }
  return pos;
};




// function setCaretPos(el, pos) {
// }
// function setCaretGoDown(element){
//   var i = element.innerHTML.IndexOf("\n", cursor_pos.start);
//   var j = element.innerHTML.IndexOf("\n", i);
//   setCaretPos(element, Math.min(i + cursor_pos.col, j));
// }
// function setCaretGoUp(element){
//   if(cursor_pos.start - cursor_pos.col - 1 < 0){
//     setCaretPos(element, 0);
//   }
//   var i = element.innerHTML.lastIndexOf("\n", cursor_pos.start - cursor_pos.col - 1);
//   setCaretPos(element, Math.min(i + cursor_pos.col, cursor_pos.start - cursor_pos.col - 1));
// }

var last_text = "";
function _onChange(e){
  let val = document.getElementById('EditorTextArea');
  // updateCursorPos(val);
  if(val.innerText === last_text) return {};

  var result_diff = diff(val.innerText, last_text, 0);

  var index = 0;
  var diff2 = [];
  result_diff.forEach(dd => {
    switch(dd[0]){
      case 0:
        break;
      case -1:
        diff2.push({ type:"insert", str:dd[1], strlen:dd[1].length, index:index })
        break;
      case 1:
        diff2.push({ type:"delete", str:dd[1], strlen:dd[1].length, index:index })
        break;
    }

    index += dd[1].length;
  });
  console.log(diff2);
  last_text = val.innerText;

  return diff2;
}


//----------------------  binding  -------------------------------
function _onKeyUp(e) {
  let val = document.getElementById('EditorTextArea');
  // updateCursorPos(val);
  // var result_diff = diff(val.innerHTML, last_text, 0);
  // console.log(result_diff);
  // last_text = val.innerHTML;
 
  var editor_diff = _onChange();

  var ws_msg = {};
   
  if(!isEmpty(editor_diff)){
    ws_msg =  {type:"text-change", user:"guest", fname:"temp", "data":editor_diff };
    
    if(! e.isComposing){
        var cursor_pos = getCursorPos(val, e.keyCode);
        HighlightingEditor();
        console.log(e.type)
        // document.querySelectorAll('pre code').forEach((block) => {
        //   hljs.highlightBlock(block);
        // });
        setCursorPos(cursor_pos,val);
    }else{
      console.log("HOGEEEEEEEEEEEE", e.type)
    }
  }else{

  }
  
  if(!isEmpty(ws_msg)){
    console.log(ws_msg);
    socket.emit("message", JSON.stringify(ws_msg));
    cmdNum += 1;
  }
  return true;
}


function _onPaste(){ return true; }
function _onCut()  { return true; }
function _onDrop(e){ return true; }
function _scroll() { 
  // console.log("text changed");

  let evtobj = window.event ? event : e
  let val = document.getElementById('EditorTextArea');
  var cursor_pos = val.selectionStart;
  var cursor_end = val.selectionEnd;
  var isCursorSelectingRange = cursor_end !== cursor_pos.start;

  console.log(cursor_pos.start, cursor_end, isCursorSelectingRange);

  return true; 
}

