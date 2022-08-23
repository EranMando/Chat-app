// this is the client code
const socket = io()

// Elements
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = document.querySelector('input')
const $messageFormButton = document.querySelector('#send-message')
const $locationButton = document.querySelector('#send-location')
const $message = document.querySelector('#messages')

// templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Options
const {username,room} = Qs.parse(location.search,{ignoreQueryPrefix: true}) // Qs is from chat.html

const autoscroll = () => {
   // new message element
   const $newMessage = $message.lastElementChild
   // Height of the new message
   const newMessageStyles = getComputedStyle($newMessage)
   const newMessageMargin = parseInt(newMessageStyles.marginBottom)
   const newMessageHeight = $newMessage.offsetHeight + newMessageMargin
   // visible height
   const visibleHeight = $message.offsetHeight
   // Height of messsages container 
   const containerHeight = $message.scrollHeight
   // How far have i scrolled
   const scrollOffset = $message.scrollTop + visibleHeight

   if(containerHeight - newMessageHeight <= scrollOffset){
      $message.scrollTop = $message.scrollHeight
   }
}


socket.on('message',({text,createdAt,username}) => {
   console.log(text)
   const html = Mustache.render(messageTemplate,{
      message: text,
      createdAt: moment(createdAt).format('h:mm a'), // moment is library that helps with time // its included in the scripts at the bottom of index.html file
      username
   })
   $message.insertAdjacentHTML('beforeend',html)
   autoscroll()
})

socket.on('locationMessage',({url,createdAt,username}) => {
   const html = Mustache.render(locationTemplate,{
      url,
      createdAt: moment(createdAt).format('h:mm a'),
      username
   })
   $message.insertAdjacentHTML('beforeend',html)
   autoscroll()
})

socket.on('roomData', ({room,users}) => {
   const html = Mustache.render(sidebarTemplate,{
      room,
      users
   })
   document.querySelector('#sidebar').innerHTML = html
})
document.querySelector('form').addEventListener('submit', (e) => {
   e.preventDefault()
   // disable form
   $messageFormButton.setAttribute('disabled','disabled')
   
   const message = e.target.elements.message.value
   socket.emit('sendMessage',message , (error) => { // the last arg (func) is for acknowledgment => telling the sender that we recieved his message
      $messageFormButton.removeAttribute('disabled')
      e.target.elements.message.value = ''
      $messageFormInput.focus()
      if(error){
         console.log(error)
         return
      }
      console.log('The message was delivered!')
   })
})

$locationButton.addEventListener('click', (e) => {
   if(!navigator.geolocation){
      return alert('Geolocation is not supported by your browser')
   }
   $locationButton.setAttribute('disabled','disabled')
   navigator.geolocation.getCurrentPosition((position) => {
      const latitude = position.coords.latitude
      const longitude = position.coords.longitude
      socket.emit('sendLocation',{latitude,longitude}, () => {
         $locationButton.removeAttribute('disabled')
         console.log("Location shared")
      })
   })
   e.preventDefault()
})


socket.emit('join',{username,room}, (error) => {
   if(error){
      alert(error)
      location.href = '/'
   }
})

