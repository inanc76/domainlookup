// Birim testlerinde gerçek ağ YASAK: fetch ve net.connect çağrılırsa test düşer.
// package.json: node --test --import ./tests/ag-yasak.mjs
import net from 'node:net';
import { syncBuiltinESMExports } from 'node:module';

const yasak = (ne) => () => { throw new Error(`birim testinde gerçek ağ yasak (${ne}) — sahte ağ kullan`); };
globalThis.fetch = yasak('fetch');
net.connect = yasak('net.connect');
net.createConnection = yasak('net.createConnection');
syncBuiltinESMExports();
