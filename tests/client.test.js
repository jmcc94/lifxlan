import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Client } from '../src/client.js';
import { Devices } from '../src/devices.js';
import { TYPE } from '../src/constants.js';
import { encode, decodeHeader } from '../src/encoding.js';
import { GetPowerCommand } from '../src/commands.js';

describe('client', () => {
  test('send', async () => {
    const devices = Devices({});
    const client = Client({
      devices,
      defaultTimeoutMs: 0,
      source: 2,
      onSend(messsage, port, address) {
        const packet = decodeHeader(messsage, { current: 0 });
        const payload = new Uint8Array(2);
        new DataView(payload.buffer).setUint16(0, 65535, true);
        assert.equal(packet.source, 2);
        assert.equal(packet.sequence, 0);
        client.onReceived(
          encode(
            packet.tagged,
            packet.source,
            packet.target,
            false,
            false,
            packet.sequence,
            TYPE.StatePower,
            payload,
          ),
          port,
          address,
        );
      },
    });

    const device = devices.register('abcdef123456', 1234, '1.2.3.4');

    const res = await client.send(GetPowerCommand(), device);

    assert.equal(res.on, true);
  });
  test('sendOnlyAcknowledgement', async () => {
    const devices = Devices({});
    const client = Client({
      devices,
      defaultTimeoutMs: 0,
      source: 2,
      onSend(messsage, port, address) {
        const packet = decodeHeader(messsage, { current: 0 });
        assert.equal(packet.source, 2);
        assert.equal(packet.sequence, 0);
        client.onReceived(
          encode(
            packet.tagged,
            packet.source,
            packet.target,
            false,
            false,
            packet.sequence,
            TYPE.Acknowledgement,
          ),
          port,
          address,
        );
      },
    });

    const device = devices.register('abcdef123456', 1234, '1.2.3.4');

    await client.sendOnlyAcknowledgement(GetPowerCommand(), device);
  });

  test('sendOnlyAcknowledgement with StateUnhandled response', async () => {
    const devices = Devices({});
    const client = Client({
      devices,
      defaultTimeoutMs: 0,
      source: 2,
      onSend(messsage, port, address) {
        const packet = decodeHeader(messsage, { current: 0 });
        assert.equal(packet.source, 2);
        assert.equal(packet.sequence, 0);
        const payload = new Uint8Array(2);
        new DataView(payload.buffer).setUint16(0, TYPE.StatePower, true);
        client.onReceived(
          encode(
            packet.tagged,
            packet.source,
            packet.target,
            false,
            false,
            packet.sequence,
            TYPE.StateUnhandled,
            payload,
          ),
          port,
          address,
        );
      },
    });

    const device = devices.register('abcdef123456', 1234, '1.2.3.4');

    try {
      await client.sendOnlyAcknowledgement(GetPowerCommand(), device);
      assert.fail('should throw');
    } catch (err) {
      assert(err instanceof Error);
      assert.match(err.message, /Unhandled/);
    }
  });
});
