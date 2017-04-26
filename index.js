// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

var numUsers = new Object();

io.on('connection', function (socket){
   console.log('someone connected');
   var addedUser = false;

   // when the client emits 'new message', this listens and executes
   socket.on('new message', function (data) {
     // we tell the client to execute 'new message'
     socket.broadcast.to(socket.room).emit('new message', {
       username: socket.username,
       message: data
     });
   });

   // when the client emits 'add user', this listens and executes
   socket.on('add user', function (username, room) {
    //  if (addedUser) return;

     // we store the username in the socket session for this client
     socket.username = username;
     socket.room = room;
     socket.join(room);
     if (!numUsers[room] || numUsers[room] < 0) {
       numUsers[room] = 0;
     };

     socket.emit('login', {
       numUsers: numUsers[socket.room]
     });

     ++numUsers[room];
     addedUser = true;

     io.to(room).emit('user joined', {
       username: socket.username,
       numUsers: numUsers[socket.room]
     });
     console.log(`Someone enter ${room} room`);
   });

   // when the client emits 'typing', we broadcast it to others
   socket.on('typing', function () {
     socket.broadcast.to(socket.room).emit('typing', {
       username: socket.username
     });
   });

   socket.on('leave room', function(){
    --numUsers[socket.room];

    // echo globally that this client has left
    socket.broadcast.to(socket.room).emit('user left', {
    username: socket.username,
      numUsers: numUsers[socket.room]
    });

    socket.leave(socket.room);
    socket.room = '';
   });

   // when the client emits 'stop typing', we broadcast it to others
   socket.on('stop typing', function () {
     socket.broadcast.to(socket.room).emit('stop typing', {
       username: socket.username
     });
   });

   // when the user disconnects.. perform this
   socket.on('disconnect', function () {
     if (addedUser) {
       --numUsers[socket.room];

       // echo globally that this client has left
       if (!socket.room) {
         socket.broadcast.to(socket.room).emit('user left', {
           username: socket.username,
           numUsers: numUsers[socket.room]
         });
       }
     }
   });
});
