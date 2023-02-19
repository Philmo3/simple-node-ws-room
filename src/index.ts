import WebSocket from 'ws';
import url from 'url'

class Room {
  name: string;
  clients: Set<WebSocket> = new Set();

  constructor(name: string){
    this.name = name
  }

  broadcast(message: string){
    this.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

const rooms: Record<string, Room> = {};

function createRoom(name: string): Room {
  const room: Room = new Room(name)
  rooms[name] = room;
  console.log(`Created room "${name}"`);
  return room;
}

function handleConnection(ws: WebSocket, req) {
  console.log(req)
  const roomName =  url.parse(req.url, true).query.roomName as string
  console.log(roomName)
  if (!roomName) {
    console.log('Missing room parameter');
    ws.close();
    return;
  }

  let room = rooms[roomName];
  if (!room) {
    room = createRoom(roomName);
  }

  console.log(`Client joined room "${roomName}"`);
  room.clients.add(ws);

  ws.on('message', (message: string) => {
    console.log(`Received message from client in room "${roomName}":`, message);
    room.broadcast(message);
  });

  ws.on('close', () => {
    console.log(`Client left room "${roomName}"`);
    room.clients.delete(ws);
    if (room.clients.size === 0) {
      delete rooms[roomName];
      console.log(`Deleted room "${roomName}"`);
    }
  });
}

const server = new WebSocket.Server({ port: 8000 });
console.log('Server started on port 8000...');

server.on('connection', handleConnection);
