import { connect } from 'cloudflare:sockets';
import leb from 'leb';
import { Buffer } from 'buffer';

export type Chat = {
  text: string;
};

export type StatusResponse = {
  version: {
    name: string;
    protocol: number;
  };
  players: {
    max: number;
    online: number;
    sample?: Array<{ name: string; id: string }>;
  };
  description: string | Chat;
  favicon?: string;
  enforcesSecureChat: boolean;
};

export const getServerStatus = async (opts: {
  hostname: string;
  port: number;
  // TODO validate
  protocolVersion?: number;
}): Promise<StatusResponse> => {
  // https://wiki.vg/Protocol#Data_types
  const binaryPort = Buffer.alloc(2);
  binaryPort.writeUInt16BE(opts.port, 0);

  // https://wiki.vg/Server_List_Ping#Handshake
  const serverAddr = Buffer.from(opts.hostname);
  const handshake = Buffer.concat([
    // https://wiki.vg/Protocol_version_numbers
    leb.encodeInt32(opts.protocolVersion ?? 762), // 1.19.14
    leb.encodeInt32(serverAddr.length),
    serverAddr,
    binaryPort,
    leb.encodeInt32(1),
  ]);

  // I think we're using the uncompressed packet format since
  // the `Set Compression` packet is sent when in `Login` state
  // https://wiki.vg/Protocol#Packet_format
  const handshakePacket = Buffer.concat([
    // Packet size
    leb.encodeInt32(handshake.length + 1),
    // Packet ID
    Buffer.from('00', 'hex'),
    // Packet data
    handshake,
  ]);
  //   console.log('handshake packet', handshakePacket.toString('hex'));

  const statusRequestPacket = Buffer.concat([
    leb.encodeInt32(1),
    Buffer.from('00', 'hex'),
  ]);

  const socket = connect(opts);
  const chunks: Buffer[] = [];
  try {
    //   console.log('status request packet', statusRequestPacket.toString('hex'));
    const writer = socket.writable.getWriter();
    await writer.write(handshakePacket);
    await writer.write(statusRequestPacket);

    for await (const chunk of socket.readable) {
      chunks.push(chunk);
      if (chunk.subarray(-1)[0] === 0x7d) {
        console.log('helloing', chunk);
        break;
      }
    }
  } finally {
    socket.close();
  }

  const incoming = Buffer.concat(chunks);
  //   console.log('read status response packet (hopefully)', incoming);

  const packetLength = leb.decodeInt32(incoming, 0);
  const packetType = leb.decodeInt32(incoming, packetLength.nextIndex);
  const jsonLength = leb.decodeInt32(incoming, packetType.nextIndex);

  const payload = Buffer.from(incoming.subarray(jsonLength.nextIndex)).toString(
    'ascii'
  );
  return JSON.parse(payload);
};
