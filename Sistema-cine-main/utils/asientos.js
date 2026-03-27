function parseAsientos(rawValue) {
    if (!rawValue) {
        return [];
    }

    const values = String(rawValue)
        .split(',')
        .map((seat) => seat.trim().toUpperCase())
        .filter(Boolean);

    return [...new Set(values)];
}

function validarFormatoAsientos(asientos) {
    const invalidos = asientos.filter((seat) => !/^[A-Z]+\d+$/.test(seat));
    return {
        valido: invalidos.length === 0,
        invalidos
    };
}

function obtenerConflictosAsientos(solicitados, ocupados) {
    const ocupadosSet = new Set(ocupados);
    return solicitados.filter((seat) => ocupadosSet.has(seat));
}

function normalizarAsientosTexto(asientos) {
    if (!asientos.length) {
        return null;
    }

    return asientos.join(',');
}

function numeroAFila(index) {
    let current = index;
    let result = '';

    while (current >= 0) {
        result = String.fromCharCode((current % 26) + 65) + result;
        current = Math.floor(current / 26) - 1;
    }

    return result;
}

function generarAsientosPorCapacidad(capacidad, asientosPorFila = 10) {
    const capacidadNum = Number.parseInt(capacidad, 10);
    if (Number.isNaN(capacidadNum) || capacidadNum <= 0) {
        return [];
    }

    const seats = [];
    for (let i = 0; i < capacidadNum; i += 1) {
        const fila = numeroAFila(Math.floor(i / asientosPorFila));
        const numero = (i % asientosPorFila) + 1;
        seats.push(fila + numero);
    }

    return seats;
}

module.exports = {
    parseAsientos,
    validarFormatoAsientos,
    obtenerConflictosAsientos,
    normalizarAsientosTexto,
    generarAsientosPorCapacidad
};
