const path = require('path')
const express = require('express')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage,generateLocationMessage} = require('./utils/messages.js')
const {addUser,removeUser,getUser,getUsersInRoom} = require('./utils/users.js')

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname,'../public')

const app = express()
const server = http.createServer(app) // this is done behind the scene // but we want the server to listen on it // this refactoring is needed to be able to use socket.io with express
const io = socketio(server)

app.use(express.static(publicDirectoryPath))
app.use(express.json())


io.on('connection', (socket) => { // triggers when a new client connects to the server // socket contains methods about the connection
   console.log('New websocket connection')

   // socket.emit('message',generateMessage('Welcome')) // sends the message to the connection with the corresponding socket
   // socket.broadcast.emit('message',generateMessage('New user has joined')) // broadcast sends the message to all connection expect the one that corresponds to the socket instance

   socket.on('sendMessage' , (message,callback) => {
      const user = getUser(socket.id)
      if(!user)
         return callback('User does not exist')
      const filter = new Filter()
      if(filter.isProfane(message)){
         return callback('Profanity is not allowed!')
      }
      io.to(user.room).emit('message',generateMessage(user.username,message)) // sends the message to all the connections
      callback() // gets called in the client
   })

   socket.on('disconnect', () => { // built in event that triggers when the client disconnects
      const user = removeUser(socket.id)
      if(user){
         io.to(user.room).emit('message',generateMessage(user.username,user.username + ' has disconnected'))
         io.to(user.room).emit('roomData',{
            room:user.room,
            users: getUsersInRoom(user.room)
         })
      }
   }) 

   socket.on('sendLocation',({latitude,longitude},callback) => {
      const user = getUser(socket.id)
      if(!user)
         return callback('User does not exist')
      io.to(user.room).emit('locationMessage',generateLocationMessage(user.username,user.username,`https://google.com/maps?q=${latitude},${longitude}`))
      callback() // gets called in the client
   })

   socket.on('join',({username,room},callback) => {
      const {error,user} = addUser({id: socket.id,username,room})

      if(error){
         return callback(error)
      }

      socket.join(user.room)
      // io.to.emit() // emits to everybody in the room
      // socket.broadcast.to.emit // emits to everybody in the room except for the specific client
      socket.emit('message',generateMessage('Welcome'))
      socket.broadcast.to(user.room).emit('message',generateMessage(`${user.username} has joined!`))
      io.to(user.room).emit('roomData',{
         room:user.room,
         users: getUsersInRoom(user.room)
      })
      callback() // acknowledgment that the user was able to connect to the room successfuly
   })
})


server.listen(port, () => {
   console.log(`listening to port ${port}`)
})



// to fix : join room bullshit