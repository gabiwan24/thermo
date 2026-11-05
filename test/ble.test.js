import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLETransport } from '../vendor/ble.js';
test('Bluetooth wird nur mit einer tatsächlich nutzbaren Browser-API angeboten', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable:true, value:{} });
    assert.equal(BLETransport.isAvailable(), false);
    navigator.bluetooth = undefined;
    assert.equal(BLETransport.isAvailable(), false);
    navigator.bluetooth = { requestDevice:async () => {} };
    assert.equal(BLETransport.isAvailable(), true);
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else delete globalThis.navigator;
  }
});
