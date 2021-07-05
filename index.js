const app = require('express')();
const http = require('http').Server(app);
var fs = require('fs');
const io = require('socket.io')(http);

var EditingText = `
# hhoge 
## header 1
### header 2
#### header3
##### header 4
###### header 5
> aa
aaa
Some test....
|テーブル|左寄せ|中央寄せ|右寄せ|
|---|:---|:---:|---:|
| 行1 | かきくけこ | あいうえお | 123 |
| 行2 | けこ       | えお       | 45  |

スペース4つで文書になります。
タブ一つでもOK

> >は引用です。;
`


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



app.get('/', function(req, res) {
   fs.readFile("./index.html", function (err, data) {
       res.writeHead(200, { "Content-Type": "text/html" });
       res.write(data);
       res.end();
   });
});

app.get('/fastdiff.js', function(req, res) {
    fs.readFile("./fastdiff/diff.js", function (err, data) {
        res.writeHead(200, { "Content-Type": "text/javascript" });
        res.write(data);
        res.end();
    });
 });

app.get('/getAllText', function(req, res){
    res.writeHead(200, { "Content-Type": "text/text" });
    res.write(EditingText);
    res.end();
});

app.get("/editor.css",function(req, res){
  fs.readFile("./editor.css", function (err, data) {
    res.writeHead(200, { "Content-Type": "text/css" });
    res.write(data);
    res.end();
  });
})

app.get('/editor_client.js', function(req, res) {
  fs.readFile("./editor_client.js", function (err, data) {
    res.writeHead(200, { "Content-Type": "text/javascript" });
    res.write(data);
    res.end();
  });
});


var clients = []

io.on('connection', function(socket) {
   console.info(`Client connected [id=${socket.id}]`);
   clients.push(socket);

   socket.on('message', function(message) {
       console.log('received: %s', String(message));

       const jmsg = JSON.parse(message);
       jmsg.data.forEach(change => {
        switch(change.type){
          case "insert":
            EditingText = strIns(EditingText, change.index, change.str)
          break;

          case "delete":
            EditingText = strDel(EditingText, change.index, change.strlen)
          break;
        }
      });

       for (var j = 0; j < clients.length; j++) {
           //他の接続しているクライアントにメッセージを一斉送信
           if (socket !== clients[j]) { clients[j].send(message); }
       }
   });

    socket.on("disconnect", () => {
        console.info(`Client gone [id=${socket.id}]`);
        var index = clients.indexOf(socket);
        if (index > -1) { clients.splice(index, 1); }
    });
});

http.listen(8080, function() {
   console.log('listening on *:8080');
});


