const crypto = require('crypto');

const TOKEN_SECRET = process.env.API_TOKEN_SECRET || process.env.SESSION_SECRET || 'cine-api-token-secret';
const TOKEN_TTL_SECONDS = Number(process.env.API_TOKEN_TTL_SECONDS || 60 * 60 * 8);

function encodeSegment(value) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decodeSegment(value) {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function signPayload(unsignedValue) {
    return crypto.createHmac('sha256', TOKEN_SECRET).update(unsignedValue).digest('base64url');
}

function buildApiToken(user) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        sub: user.id,
        nombre: user.nombre,
        email: user.email,
        role: user.role,
        iat: now,
        exp: now + TOKEN_TTL_SECONDS
    };

    const unsignedValue = `${encodeSegment({ alg: 'HS256', typ: 'JWT' })}.${encodeSegment(payload)}`;
    const signature = signPayload(unsignedValue);

    return `${unsignedValue}.${signature}`;
}

function verifyApiToken(token) {
    if (!token || typeof token !== 'string') {
        return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        return null;
    }

    const [headerPart, payloadPart, signaturePart] = parts;
    const unsignedValue = `${headerPart}.${payloadPart}`;
    const expectedSignature = signPayload(unsignedValue);

    if (signaturePart.length !== expectedSignature.length) {
        return null;
    }

    const isValidSignature = crypto.timingSafeEqual(
        Buffer.from(signaturePart),
        Buffer.from(expectedSignature)
    );

    if (!isValidSignature) {
        return null;
    }

    try {
        const header = decodeSegment(headerPart);
        const payload = decodeSegment(payloadPart);

        if (header.alg !== 'HS256' || header.typ !== 'JWT') {
            return null;
        }

        if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return {
            id: payload.sub,
            nombre: payload.nombre,
            email: payload.email,
            role: payload.role
        };
    } catch (error) {
        return null;
    }
}

function getApiTokenTtlSeconds() {
    return TOKEN_TTL_SECONDS;
}

module.exports = {
    buildApiToken,
    verifyApiToken,
    getApiTokenTtlSeconds
};