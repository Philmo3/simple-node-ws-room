import WebSocket from 'ws';
import url from 'url'
import { v4 as uuidv4 } from 'uuid'

interface Message{
  id: string
  type: 'Create' | 'Update' | 'Delete' | 'Position'
  componentName: string
  inputs?: any
  position?: {x: number, y: number}
}

class Room {
  name: string;
  clients: Set<WebSocket> = new Set();
  messages: Array<Message> = []
  constructor(name: string){
    this.name = name
  }

  broadcast(message: Message){

    if(message.type === 'Create'){
      message.id = uuidv4()
    }

    switch(message.type){

      case 'Create': {
        this.messages.push(message)
        break;
      }

      case 'Update': {
        const index = this.messages.findIndex( msg => msg.id === message.id)
        this.messages[index] = {...this.messages[index], inputs: message.inputs}
        break;
      }

      case 'Position' : {
        const index = this.messages.findIndex( msg => msg.id === message.id)
        this.messages[index] = {...this.messages[index], position: {x: message.position.x, y: message.position.y}}
        break;
      }
    }

    this.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message))
      }
    });
  }

  replayMessages(client: WebSocket){
    this.messages.forEach((msg) => {
      client.send(JSON.stringify(msg))
    })
  }
}

const rooms: Record<string, Room> = {};

function createRoom(name: string): Room {
  const room: Room = new Room(name)
  rooms[name] = room;
  return room;
}

function handleConnection(ws: WebSocket, req) {

  const roomName =  url.parse(req.url, true).query.roomName as string

  if (!roomName) {
    ws.close();
    return;
  }

  let room = rooms[roomName];
  if (!room) {
    room = createRoom(roomName);
  }

  room.clients.add(ws);

  room.replayMessages(ws)

  ws.on('message', (message) => {
    room.broadcast(JSON.parse(message.toString()));
  });

  ws.on('close', () => {
    room.clients.delete(ws);
    if (room.clients.size === 0) {
      delete rooms[roomName];
    }
  });
}

const server = new WebSocket.Server({ port: 8000 });
console.log('Server started on port 8000...');

server.on('connection', handleConnection);
