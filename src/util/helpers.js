export function hexToRgb(hex) {
    var bigint = parseInt(hex, 16)
    var r = (bigint >> 16) & 255
    var g = (bigint >> 8) & 255
    var b = bigint & 255

    return [r, g, b]
}

function makeRandomHexColor(brightness) {
    function randomChannel(brightness) {
        var r = 255 - brightness
        var n = 0 | (Math.random() * r + brightness)
        var s = n.toString(16)
        return s.length == 1 ? '0' + s : s
    }
    return '#' + randomChannel(brightness) + randomChannel(brightness) + randomChannel(brightness)
}

export function generateColorArray() {
    var colorArray = []

    colorArray.push(makeRandomHexColor(100))
    colorArray.push(makeRandomHexColor(100))
    colorArray.push(makeRandomHexColor(100))
    colorArray.push(makeRandomHexColor(100))

    return colorArray
}
