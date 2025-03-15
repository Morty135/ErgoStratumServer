var ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
var ALPHABET_ZERO = ALPHABET[0];
var ALPHABET_INV = {};
for (var i = 0; i < ALPHABET.length; i++) {
  ALPHABET_INV[ALPHABET[i]] = i;
}

function bufferToBigInt(buf) {
  let hex = '0x' + [...buf].map(b => b.toString(16).padStart(2, '0')).join('');
  return BigInt(hex);
}

function bigIntToBuffer(bigInt, size) {
  let hex = bigInt.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  let buffer = new Uint8Array(size || Math.ceil(hex.length / 2));
  let hexBytes = hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
  buffer.set(hexBytes, buffer.length - hexBytes.length);
  return buffer;
}

var base58 = {
  encode: function (buf) {
    let x = bufferToBigInt(buf);
    let result = '';
    while (x > 0) {
      let remainder = x % 58n;
      x = x / 58n;
      result = ALPHABET[Number(remainder)] + result;
    }
    for (let i = 0; i < buf.length && buf[i] === 0; i++) {
      result = ALPHABET_ZERO + result;
    }
    return result;
  },

  decode: function (str) {
    let x = 0n;
    for (let char of str) {
      x = x * 58n + BigInt(ALPHABET_INV[char]);
    }
    let bytes = bigIntToBuffer(x);
    let leadingZeros = 0;
    for (let i = 0; i < str.length && str[i] === ALPHABET_ZERO; i++) {
      leadingZeros++;
    }
    let fullBuffer = new Uint8Array(leadingZeros + bytes.length);
    fullBuffer.set(bytes, leadingZeros);
    return fullBuffer;
  }
};

function sha256(data) {
  let buffer = new TextEncoder().encode(data);
  return crypto.subtle.digest('SHA-256', buffer).then(hash => new Uint8Array(hash));
}

async function doubleSHA256(data) {
  return sha256(await sha256(data));
}

var base58Check = {
  encode: async function (buf) {
    let checksum = await doubleSHA256(buf);
    let checkedBuf = new Uint8Array(buf.length + 4);
    checkedBuf.set(buf);
    checkedBuf.set(checksum.slice(0, 4), buf.length);
    return base58.encode(checkedBuf);
  },

  decode: async function (str) {
    let buf = base58.decode(str);
    if (buf.length < 4) throw new Error("invalid input: too short");
    let data = buf.slice(0, -4);
    let checksum = buf.slice(-4);
    let hash = (await doubleSHA256(data)).slice(0, 4);
    if (!checksum.every((val, i) => val === hash[i])) {
      throw new Error("checksum mismatch");
    }
    return data;
  }
};

exports.base58 = base58;
exports.base58Check = base58Check;
exports.encode = base58.encode;
exports.decode = base58.decode;
