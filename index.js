const app = require('express')();
const http = require('http').Server(app);
var fs = require('fs');
const io = require('socket.io')(http);

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


var clients = []

io.on('connection', function(socket) {
   console.info(`Client connected [id=${socket.id}]`);
   clients.push(socket);

   socket.on('message', function(message) {
       console.log('received: %s', String(message));

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


